from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.clients.nestjs_client import (
    NestJSBadGatewayError,
    NestJSHTTPError,
    NestJSUnavailableError,
)
from app.schemas.report_query import ReportQuery, ReportQueryResponse
from app.services.report_service import ReportService

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])
bearer_scheme = HTTPBearer(auto_error=False)


def get_report_service(request: Request) -> ReportService:
    return request.app.state.report_service


@router.post("/query", response_model=ReportQueryResponse)
async def query_report(
    query: ReportQuery,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ],
    report_service: Annotated[ReportService, Depends(get_report_service)],
) -> ReportQueryResponse:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere un token Bearer válido.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    authorization = f"{credentials.scheme} {credentials.credentials}"
    try:
        return await report_service.query_report(query, authorization)
    except NestJSHTTPError as error:
        raise HTTPException(
            status_code=error.status_code,
            detail=error.detail,
            headers={"WWW-Authenticate": "Bearer"}
            if error.status_code == status.HTTP_401_UNAUTHORIZED
            else None,
        ) from error
    except NestJSUnavailableError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El servicio de reportes no está disponible temporalmente.",
        ) from error
    except NestJSBadGatewayError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="NestJS no pudo procesar la consulta de reportes.",
        ) from error
