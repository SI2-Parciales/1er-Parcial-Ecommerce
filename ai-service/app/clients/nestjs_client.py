from typing import Any

import httpx

from app.core.config import Settings
from app.schemas.report_query import ReportQuery


class NestJSHTTPError(Exception):
    def __init__(self, status_code: int, detail: Any) -> None:
        super().__init__(str(detail))
        self.status_code = status_code
        self.detail = detail


class NestJSUnavailableError(Exception):
    pass


class NestJSBadGatewayError(Exception):
    pass


class NestJSClient:
    def __init__(self, settings: Settings, http_client: httpx.AsyncClient) -> None:
        self._settings = settings
        self._http_client = http_client

    async def query_report(
        self, query: ReportQuery, authorization: str
    ) -> dict[str, Any]:
        payload = query.model_dump(mode="json", by_alias=True, exclude_none=True)
        try:
            response = await self._http_client.post(
                self._settings.nestjs_reports_query_url,
                json=payload,
                headers={"Authorization": authorization},
            )
        except httpx.RequestError as error:
            raise NestJSUnavailableError from error

        if response.status_code in {400, 401, 403}:
            try:
                body = response.json()
            except ValueError:
                body = None
            detail = (
                body.get("message", "La consulta fue rechazada por NestJS.")
                if isinstance(body, dict)
                else "La consulta fue rechazada por NestJS."
            )
            raise NestJSHTTPError(response.status_code, detail)

        if response.status_code != 200:
            raise NestJSBadGatewayError

        try:
            result = response.json()
        except ValueError as error:
            raise NestJSBadGatewayError from error
        if not isinstance(result, dict):
            raise NestJSBadGatewayError
        return result
