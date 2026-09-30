import asyncio
from io import BytesIO
import logging
import tempfile
import threading
import time
from pathlib import Path
from typing import Any

import av

from app.core.config import Settings

logger = logging.getLogger(__name__)


class SpeechServiceError(Exception):
    pass


class EmptyAudioError(SpeechServiceError):
    pass


class UnsupportedAudioError(SpeechServiceError):
    pass


class EmptyTranscriptionError(SpeechServiceError):
    pass


class SpeechUnavailableError(SpeechServiceError):
    pass


_FORMAT_MIME_GROUPS: dict[str, set[str]] = {
    "wav": {"wav"},
    "mpeg": {"mp3"},
    "mp3": {"mp3"},
    "mp4": {"mov", "mp4", "m4a", "3gp", "3g2", "mj2"},
    "x-m4a": {"mov", "mp4", "m4a", "3gp", "3g2", "mj2"},
    "m4a": {"mov", "mp4", "m4a", "3gp", "3g2", "mj2"},
    "webm": {"matroska", "webm"},
    "ogg": {"ogg"},
}
_CONTENT_TYPE_GROUPS: dict[str, str] = {
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/mpeg": "mpeg",
    "audio/mp3": "mp3",
    "audio/mp4": "mp4",
    "audio/x-m4a": "x-m4a",
    "audio/m4a": "m4a",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
}
_FORMAT_SUFFIXES: tuple[tuple[set[str], str], ...] = (
    ({"wav"}, ".wav"),
    ({"mp3"}, ".mp3"),
    ({"mov", "mp4", "m4a", "3gp", "3g2", "mj2"}, ".m4a"),
    ({"matroska", "webm"}, ".webm"),
    ({"ogg"}, ".ogg"),
)


class SpeechService:
    """Local speech-to-text adapter; it has no reporting or provider dependencies."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._model: Any | None = None
        self._model_lock = threading.Lock()
        self._concurrency = asyncio.Semaphore(settings.whisper_max_concurrent)

    async def transcribe(self, audio: bytes, content_type: str | None = None) -> str:
        if not audio:
            raise EmptyAudioError

        started = time.perf_counter()
        normalized_type = self._normalize_content_type(content_type)
        async with self._concurrency:
            try:
                transcription = await asyncio.to_thread(
                    self._transcribe_sync, audio, normalized_type
                )
            except (UnsupportedAudioError, EmptyTranscriptionError):
                raise
            except Exception as error:
                logger.warning("Whisper processing failed (%s).", type(error).__name__)
                raise SpeechUnavailableError from error

        elapsed_ms = int((time.perf_counter() - started) * 1000)
        logger.info(
            "Audio transcription completed (content_type=%s, size_bytes=%d, elapsed_ms=%d).",
            normalized_type or "detected",
            len(audio),
            elapsed_ms,
        )
        return transcription

    def _transcribe_sync(self, audio: bytes, content_type: str | None) -> str:
        temp_path: Path | None = None
        try:
            suffix = self._inspect_audio(audio, content_type)
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
                temp_path = Path(temp_file.name)
                temp_file.write(audio)
            model = self._get_model()
            segments, _info = model.transcribe(
                str(temp_path), language=self._settings.whisper_language
            )
            transcription = " ".join(
                segment.text.strip() for segment in segments if segment.text.strip()
            ).strip()
            if not transcription:
                raise EmptyTranscriptionError
            return transcription
        finally:
            if temp_path is not None:
                temp_path.unlink(missing_ok=True)

    def _inspect_audio(
        self, audio: bytes, content_type: str | None
    ) -> str:
        try:
            with av.open(BytesIO(audio), mode="r") as container:
                format_names = {
                    name.strip().lower()
                    for name in container.format.name.split(",")
                }
                has_audio = any(stream.type == "audio" for stream in container.streams)
        except Exception as error:
            raise UnsupportedAudioError from error

        if not has_audio:
            raise UnsupportedAudioError

        if not any(
            format_names.intersection(supported_formats)
            for supported_formats in _FORMAT_MIME_GROUPS.values()
        ):
            raise UnsupportedAudioError

        if content_type is not None:
            declared_group = _CONTENT_TYPE_GROUPS.get(content_type)
            if declared_group is None or not format_names.intersection(
                _FORMAT_MIME_GROUPS[declared_group]
            ):
                raise UnsupportedAudioError

        suffix = next(
            suffix
            for formats, suffix in _FORMAT_SUFFIXES
            if format_names.intersection(formats)
        )
        return suffix

    def _get_model(self) -> Any:
        if self._model is None:
            with self._model_lock:
                if self._model is None:
                    from faster_whisper import WhisperModel

                    self._model = WhisperModel(
                        self._settings.whisper_model,
                        device=self._settings.whisper_device,
                        compute_type=self._settings.whisper_compute_type,
                    )
        return self._model

    @staticmethod
    def _normalize_content_type(content_type: str | None) -> str | None:
        if content_type is None:
            return None
        normalized = content_type.split(";", 1)[0].strip().lower()
        if normalized in {"", "application/octet-stream"}:
            return None
        if normalized not in _CONTENT_TYPE_GROUPS:
            raise UnsupportedAudioError
        return normalized
