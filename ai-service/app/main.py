from contextlib import asynccontextmanager

from fastapi import FastAPI
from httpx import AsyncClient

from app.api.routes.reports import router as reports_router
from app.clients.nestjs_client import NestJSClient
from app.core.config import get_settings
from app.services.report_service import ReportService


@asynccontextmanager
async def lifespan(application: FastAPI):
    settings = get_settings()
    async with AsyncClient(timeout=settings.nestjs_api_timeout_seconds) as http_client:
        application.state.report_service = ReportService(
            NestJSClient(settings, http_client)
        )
        yield


app = FastAPI(lifespan=lifespan)
app.include_router(reports_router)


@app.get("/")
def root():
    return {
        "message": "FastAPI funcionando correctamente"
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }
