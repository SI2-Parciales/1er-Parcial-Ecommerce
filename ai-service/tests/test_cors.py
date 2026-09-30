import unittest

from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import Settings
from app.main import app


class FastAPICorsTests(unittest.TestCase):
    def test_configured_origins_are_normalized_and_validated(self) -> None:
        settings = Settings(cors_origins=" https://shop.example.com/ ,https://shop.example.com ")
        self.assertEqual(settings.allowed_cors_origins, ["https://shop.example.com"])

        for invalid in ("", "https://shop.example.com/path", "*"):
            with self.subTest(origin=invalid), self.assertRaises(ValidationError):
                Settings(cors_origins=invalid)

    def test_expo_web_origin_can_preflight_authorization_and_json(self) -> None:
        with TestClient(app) as client:
            response = client.options(
                "/api/v1/reports/ask",
                headers={
                    "Origin": "http://localhost:8081",
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "authorization,content-type",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers["access-control-allow-origin"], "http://localhost:8081"
        )
        allowed_headers = response.headers["access-control-allow-headers"].lower()
        self.assertIn("authorization", allowed_headers)
        self.assertIn("content-type", allowed_headers)

    def test_unconfigured_origin_is_not_allowed(self) -> None:
        with TestClient(app) as client:
            response = client.options(
                "/api/v1/reports/voice",
                headers={
                    "Origin": "https://not-allowed.example",
                    "Access-Control-Request-Method": "POST",
                },
            )

        self.assertEqual(response.status_code, 400)
        self.assertNotIn("access-control-allow-origin", response.headers)
