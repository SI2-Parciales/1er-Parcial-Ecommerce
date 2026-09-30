from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.agents.report_agent import (
    ReportAgent,
    ReportAgentInvalidQuery,
    ReportAgentToolLimitExceeded,
)
from app.clients.gemini_client import GeminiRateLimitError, GeminiUnavailableError
from app.clients.nestjs_client import (
    NestJSBadGatewayError,
    NestJSHTTPError,
    NestJSUnavailableError,
)
from app.schemas.report_agent import ReportAskRequest, ReportAskResponse

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])
bearer_scheme = HTTPBearer(auto_error=False)


def get_report_agent(request: Request) -> ReportAgent:
    return request.app.state.report_agent


@router.post("/ask", response_model=ReportAskResponse)
async def ask_report(
    request: ReportAskRequest,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ],
    report_agent: Annotated[ReportAgent, Depends(get_report_agent)],
) -> ReportAskResponse:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere un token Bearer válido.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    authorization = f"{credentials.scheme} {credentials.credentials}"
    try:
        return await report_agent.ask(request.query, authorization)
    except GeminiRateLimitError as error:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Gemini está limitando temporalmente las solicitudes. Inténtalo más tarde.",
        ) from error
    except GeminiUnavailableError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El agente de reportes no está disponible temporalmente.",
        ) from error
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
    except (ReportAgentInvalidQuery, ReportAgentToolLimitExceeded) as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No se pudo construir una consulta de reportes válida y acotada.",
        ) from error
