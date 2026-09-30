from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.agents.report_agent import ReportAgent
from app.api.routes.reports_ask import (
    get_report_agent,
    process_report_query,
    require_authorization,
)
from app.core.config import get_settings
from app.schemas.report_agent import ReportVoiceResponse
from app.services.speech_service import (
    EmptyAudioError,
    EmptyTranscriptionError,
    SpeechService,
    SpeechUnavailableError,
    UnsupportedAudioError,
)

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])
bearer_scheme = HTTPBearer(auto_error=False)
UPLOAD_CHUNK_SIZE = 64 * 1024


def get_speech_service(request: Request) -> SpeechService:
    return request.app.state.speech_service


async def _read_limited(file: UploadFile, max_size_bytes: int) -> bytes:
    chunks: list[bytes] = []
    size = 0
    while chunk := await file.read(min(UPLOAD_CHUNK_SIZE, max_size_bytes + 1 - size)):
        size += len(chunk)
        if size > max_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail="El audio supera el tamaño máximo permitido.",
            )
        chunks.append(chunk)
    if size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes enviar un archivo de audio no vacío.",
        )
    return b"".join(chunks)


@router.post("/voice", response_model=ReportVoiceResponse)
async def voice_report(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ],
    report_agent: Annotated[ReportAgent, Depends(get_report_agent)],
    speech_service: Annotated[SpeechService, Depends(get_speech_service)],
    file: Annotated[UploadFile | None, File()] = None,
) -> ReportVoiceResponse:
    authorization = require_authorization(credentials)
    if file is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes adjuntar un archivo de audio en el campo 'file'.",
        )
    settings = get_settings()
    max_size_bytes = settings.max_audio_size_mb * 1024 * 1024
    try:
        audio = await _read_limited(file, max_size_bytes)
        transcription = await speech_service.transcribe(audio, file.content_type)
    except EmptyAudioError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes enviar un archivo de audio no vacío.",
        ) from error
    except UnsupportedAudioError as error:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="El formato del archivo de audio no está soportado.",
        ) from error
    except EmptyTranscriptionError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="No se reconoció voz útil en el audio.",
        ) from error
    except SpeechUnavailableError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El servicio de transcripción no está disponible temporalmente.",
        ) from error
    finally:
        await file.close()

    result = await process_report_query(transcription, authorization, report_agent)
    return ReportVoiceResponse(
        transcription=transcription,
        answer=result.answer,
        data=result.data,
    )
