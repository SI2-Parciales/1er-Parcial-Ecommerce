from typing import Any

from app.clients.nestjs_client import NestJSClient
from app.schemas.report_query import ReportQuery


class ReportService:
    def __init__(self, nestjs_client: NestJSClient) -> None:
        self._nestjs_client = nestjs_client

    async def query_report(
        self, query: ReportQuery, authorization: str
    ) -> dict[str, Any]:
        return await self._nestjs_client.query_report(query, authorization)
