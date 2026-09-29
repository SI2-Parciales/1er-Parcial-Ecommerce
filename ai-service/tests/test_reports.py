import asyncio
import unittest

import httpx
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.clients.nestjs_client import (
    NestJSBadGatewayError,
    NestJSClient,
    NestJSHTTPError,
    NestJSUnavailableError,
)
from app.api.routes.reports import get_report_service
from app.core.config import Settings
from app.main import app
from app.schemas.report_query import ReportQuery
from app.services.report_service import ReportService


REPORT_RESPONSE = {
    "metrics": ["revenue"],
    "groupBy": ["branch"],
    "period": {"from": None, "to": None, "timeZone": "America/La_Paz"},
    "data": [{"branch": "Central", "revenue": 125.5}],
}


class ReportQuerySchemaTests(unittest.TestCase):
    def test_valid_query_uses_nestjs_aliases_and_omits_null_options(self) -> None:
        query = ReportQuery.model_validate(
            {
                "metrics": ["revenue"],
                "groupBy": ["branch"],
                "dateFrom": "2026-09-01",
                "filters": {"branchId": 2},
            }
        )

        self.assertEqual(
            query.model_dump(mode="json", by_alias=True, exclude_none=True),
            {
                "metrics": ["revenue"],
                "groupBy": ["branch"],
                "dateFrom": "2026-09-01",
                "filters": {"branchId": 2},
                "order": "desc",
                "limit": 20,
            },
        )

    def test_invalid_metric_fails_validation(self) -> None:
        with self.assertRaises(ValidationError):
            ReportQuery.model_validate({"metrics": ["profit"]})

    def test_invalid_group_by_fails_validation(self) -> None:
        with self.assertRaises(ValidationError):
            ReportQuery.model_validate(
                {"metrics": ["revenue"], "groupBy": ["customer"]}
            )

    def test_limit_out_of_range_fails_validation(self) -> None:
        for limit in (0, 101):
            with self.subTest(limit=limit), self.assertRaises(ValidationError):
                ReportQuery.model_validate({"metrics": ["revenue"], "limit": limit})

    def test_duplicates_dates_filters_and_unknown_fields_are_validated(self) -> None:
        invalid_queries = [
            {"metrics": ["revenue", "revenue"]},
            {"metrics": ["revenue"], "groupBy": ["branch", "branch"]},
            {"metrics": ["revenue"], "select": []},
            {
                "metrics": ["revenue"],
                "dateFrom": "2026-09-30",
                "dateTo": "2026-09-01",
            },
            {"metrics": ["revenue"], "filters": {"branchId": 0}},
            {"metrics": ["revenue"], "dateFrom": "2026-09-01T00:00:00"},
            {"metrics": ["revenue"], "unknown": True},
        ]
        for payload in invalid_queries:
            with self.subTest(payload=payload), self.assertRaises(ValidationError):
                ReportQuery.model_validate(payload)


class NestJSClientTests(unittest.IsolatedAsyncioTestCase):
    def settings(self) -> Settings:
        return Settings(nestjs_api_url="http://nestjs.test")

    async def test_posts_serialized_query_and_forwards_bearer_token(self) -> None:
        captured: list[httpx.Request] = []

        def handler(request: httpx.Request) -> httpx.Response:
            captured.append(request)
            return httpx.Response(200, json=REPORT_RESPONSE)

        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
            client = NestJSClient(self.settings(), http)
            result = await client.query_report(
                ReportQuery(metrics=["revenue"], groupBy=["branch"]),
                "Bearer user-jwt",
            )

        self.assertEqual(result, REPORT_RESPONSE)
        self.assertEqual(len(captured), 1)
        self.assertEqual(
            str(captured[0].url),
            "http://nestjs.test/internal/reports/query",
        )
        self.assertEqual(captured[0].headers["Authorization"], "Bearer user-jwt")
        self.assertEqual(
            captured[0].read(),
            b'{"metrics":["revenue"],"groupBy":["branch"],"order":"desc","limit":20}',
        )

    async def test_maps_nestjs_400_and_403_without_changing_status(self) -> None:
        for status_code in (400, 403):
            def handler(request: httpx.Request, code: int = status_code) -> httpx.Response:
                return httpx.Response(code, json={"message": "Permiso o consulta inválida"})

            async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
                client = NestJSClient(self.settings(), http)
                with self.subTest(status=status_code), self.assertRaises(NestJSHTTPError) as ctx:
                    await client.query_report(ReportQuery(metrics=["revenue"]), "Bearer jwt")
            self.assertEqual(ctx.exception.status_code, status_code)
            self.assertEqual(ctx.exception.detail, "Permiso o consulta inválida")

    async def test_connection_timeout_becomes_unavailable(self) -> None:
        def offline(request: httpx.Request) -> httpx.Response:
            raise httpx.ConnectError("offline", request=request)

        async with httpx.AsyncClient(transport=httpx.MockTransport(offline)) as http:
            client = NestJSClient(self.settings(), http)
            with self.assertRaises(NestJSUnavailableError):
                await client.query_report(ReportQuery(metrics=["revenue"]), "Bearer jwt")

        def timed_out(request: httpx.Request) -> httpx.Response:
            raise httpx.ReadTimeout("timed out", request=request)

        async with httpx.AsyncClient(transport=httpx.MockTransport(timed_out)) as http:
            client = NestJSClient(self.settings(), http)
            with self.assertRaises(NestJSUnavailableError):
                await client.query_report(ReportQuery(metrics=["revenue"]), "Bearer jwt")

    async def test_unexpected_upstream_status_is_sanitized(self) -> None:
        def failed(request: httpx.Request) -> httpx.Response:
            return httpx.Response(500, json={"message": "private database detail"})

        async with httpx.AsyncClient(transport=httpx.MockTransport(failed)) as http:
            client = NestJSClient(self.settings(), http)
            with self.assertRaises(NestJSBadGatewayError):
                await client.query_report(ReportQuery(metrics=["revenue"]), "Bearer jwt")


class ReportsEndpointTests(unittest.TestCase):
    def tearDown(self) -> None:
        app.dependency_overrides.pop(get_report_service, None)

    def test_endpoint_returns_mocked_nestjs_response_and_forwards_auth(self) -> None:
        requests: list[httpx.Request] = []

        def handler(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            return httpx.Response(200, json=REPORT_RESPONSE)

        async_http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        service = ReportService(
            NestJSClient(Settings(nestjs_api_url="http://nestjs.test"), async_http)
        )
        app.dependency_overrides[get_report_service] = lambda: service
        try:
            with TestClient(app) as client:
                response = client.post(
                    "/api/v1/reports/query",
                    headers={"Authorization": "Bearer user-jwt"},
                    json={"metrics": ["revenue"], "groupBy": ["branch"]},
                )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json(), REPORT_RESPONSE)
            self.assertEqual(requests[0].headers["Authorization"], "Bearer user-jwt")
        finally:
            asyncio.run(async_http.aclose())

    def test_endpoint_returns_401_without_bearer_token(self) -> None:
        with TestClient(app) as client:
            response = client.post(
                "/api/v1/reports/query", json={"metrics": ["revenue"]}
            )
        self.assertEqual(response.status_code, 401)

    def test_endpoint_maps_upstream_errors_to_safe_http_responses(self) -> None:
        cases = [
            (NestJSHTTPError(400, "Fecha inválida"), 400, "Fecha inválida"),
            (NestJSHTTPError(403, "Permiso insuficiente"), 403, "Permiso insuficiente"),
            (
                NestJSUnavailableError(),
                503,
                "El servicio de reportes no está disponible temporalmente.",
            ),
            (
                NestJSBadGatewayError(),
                502,
                "NestJS no pudo procesar la consulta de reportes.",
            ),
        ]

        for error, expected_status, expected_detail in cases:
            class FailingService:
                async def query_report(self, query: ReportQuery, authorization: str):
                    raise error

            app.dependency_overrides[get_report_service] = lambda: FailingService()
            with self.subTest(status=expected_status), TestClient(app) as client:
                response = client.post(
                    "/api/v1/reports/query",
                    headers={"Authorization": "Bearer user-jwt"},
                    json={"metrics": ["revenue"]},
                )
            self.assertEqual(response.status_code, expected_status)
            self.assertEqual(response.json()["detail"], expected_detail)

    def test_health_check_does_not_call_nestjs(self) -> None:
        with TestClient(app) as client:
            response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})
