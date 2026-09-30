import asyncio
import io
import unittest
import wave
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from app.api.routes.reports_ask import get_report_agent
from app.api.routes.reports_voice import get_speech_service
from app.clients.gemini_client import GeminiUnavailableError
from app.core.config import Settings
from app.main import app
from app.schemas.report_agent import ReportAskResponse
from app.services.speech_service import (
    EmptyTranscriptionError,
    SpeechService,
    SpeechUnavailableError,
    UnsupportedAudioError,
)


def wav_bytes() -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(16000)
        audio.writeframes(b"\x00\x00" * 1600)
    return buffer.getvalue()


class FakeSpeechService:
    def __init__(self, result="ventas de hoy", error=None):
        self.result = result
        self.error = error
        self.calls = []

    async def transcribe(self, audio, content_type=None):
        self.calls.append((audio, content_type))
        if self.error:
            raise self.error
        return self.result


class FakeAgent:
    def __init__(self, error=None):
        self.error = error
        self.calls = []

    async def ask(self, query, authorization):
        self.calls.append((query, authorization))
        if self.error:
            raise self.error
        return ReportAskResponse(
            query=query,
            answer="Se encontraron resultados.",
            data=[],
        )


class VoiceEndpointTests(unittest.TestCase):
    def tearDown(self) -> None:
        app.dependency_overrides.pop(get_report_agent, None)
        app.dependency_overrides.pop(get_speech_service, None)

    def test_voice_uses_transcription_and_same_agent_with_existing_bearer(self) -> None:
        speech = FakeSpeechService("ventas por sucursal este mes")
        agent = FakeAgent()
        app.dependency_overrides[get_speech_service] = lambda: speech
        app.dependency_overrides[get_report_agent] = lambda: agent

        with TestClient(app) as client:
            response = client.post(
                "/api/v1/reports/voice",
                headers={"Authorization": "Bearer user-jwt"},
                files={"file": ("user-name.wav", wav_bytes(), "audio/wav")},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "transcription": "ventas por sucursal este mes",
                "answer": "Se encontraron resultados.",
                "data": [],
            },
        )
        self.assertEqual(speech.calls[0][1], "audio/wav")
        self.assertEqual(agent.calls, [("ventas por sucursal este mes", "Bearer user-jwt")])

    def test_missing_auth_file_and_empty_file_are_rejected(self) -> None:
        speech = FakeSpeechService()
        app.dependency_overrides[get_speech_service] = lambda: speech
        app.dependency_overrides[get_report_agent] = FakeAgent
        with TestClient(app) as client:
            missing_auth = client.post(
                "/api/v1/reports/voice",
                files={"file": ("voice.wav", wav_bytes(), "audio/wav")},
            )
            missing_file = client.post(
                "/api/v1/reports/voice",
                headers={"Authorization": "Bearer user-jwt"},
            )
            empty_file = client.post(
                "/api/v1/reports/voice",
                headers={"Authorization": "Bearer user-jwt"},
                files={"file": ("empty.wav", b"", "audio/wav")},
            )

        self.assertEqual(missing_auth.status_code, 401)
        self.assertEqual(missing_file.status_code, 400)
        self.assertEqual(empty_file.status_code, 400)
        self.assertEqual(speech.calls, [])

    def test_oversized_audio_is_rejected_before_transcription(self) -> None:
        speech = FakeSpeechService()
        app.dependency_overrides[get_speech_service] = lambda: speech
        app.dependency_overrides[get_report_agent] = FakeAgent
        small_limit = Settings(max_audio_size_mb=1)
        with patch("app.api.routes.reports_voice.get_settings", return_value=small_limit):
            with TestClient(app) as client:
                response = client.post(
                    "/api/v1/reports/voice",
                    headers={"Authorization": "Bearer user-jwt"},
                    files={"file": ("large.wav", b"x" * (1024 * 1024 + 1), "audio/wav")},
                )

        self.assertEqual(response.status_code, 413)
        self.assertEqual(speech.calls, [])

    def test_unsupported_and_mismatched_media_types_return_415(self) -> None:
        app.dependency_overrides[get_speech_service] = lambda: SpeechService(Settings())
        app.dependency_overrides[get_report_agent] = FakeAgent
        with TestClient(app) as client:
            unsupported = client.post(
                "/api/v1/reports/voice",
                headers={"Authorization": "Bearer user-jwt"},
                files={"file": ("voice.wav", wav_bytes(), "application/zip")},
            )
            mismatched = client.post(
                "/api/v1/reports/voice",
                headers={"Authorization": "Bearer user-jwt"},
                files={"file": ("voice.wav", wav_bytes(), "audio/mp3")},
            )

        self.assertEqual(unsupported.status_code, 415)
        self.assertEqual(mismatched.status_code, 415)

    def test_transcription_and_agent_errors_keep_safe_statuses(self) -> None:
        for speech_error, agent_error, expected_status in (
            (EmptyTranscriptionError(), None, 422),
            (SpeechUnavailableError(), None, 503),
            (None, GeminiUnavailableError("private-key"), 503),
        ):
            with self.subTest(status=expected_status):
                app.dependency_overrides[get_speech_service] = lambda e=speech_error: FakeSpeechService(error=e)
                app.dependency_overrides[get_report_agent] = lambda e=agent_error: FakeAgent(error=e)
                with TestClient(app) as client:
                    response = client.post(
                        "/api/v1/reports/voice",
                        headers={"Authorization": "Bearer user-jwt"},
                        files={"file": ("voice.wav", wav_bytes(), "audio/wav")},
                    )
                self.assertEqual(response.status_code, expected_status)
                self.assertNotIn("private-key", response.text)


class SpeechServiceTests(unittest.IsolatedAsyncioTestCase):
    def service(self) -> SpeechService:
        return SpeechService(
            Settings(
                whisper_model="small",
                whisper_device="cpu",
                whisper_compute_type="int8",
                whisper_language="es",
            )
        )

    async def test_model_is_created_once_and_transcription_is_offloaded(self) -> None:
        model = SimpleNamespace(
            transcribe=lambda _path, language: (
                iter([SimpleNamespace(text="  ventas "), SimpleNamespace(text=" por sucursal  ")]),
                SimpleNamespace(language=language),
            )
        )
        with patch("faster_whisper.WhisperModel", return_value=model) as constructor:
            service = self.service()
            first = await service.transcribe(wav_bytes(), "audio/wav")
            second = await service.transcribe(wav_bytes(), "audio/x-wav")

        self.assertEqual(first, "ventas por sucursal")
        self.assertEqual(second, first)
        constructor.assert_called_once_with("small", device="cpu", compute_type="int8")

    async def test_temp_audio_is_removed_when_model_raises(self) -> None:
        seen_paths: list[Path] = []

        class BrokenModel:
            def transcribe(self, path, language):
                seen_paths.append(Path(path))
                raise RuntimeError("internal decoder failure")

        with patch("faster_whisper.WhisperModel", return_value=BrokenModel()):
            with self.assertRaises(SpeechUnavailableError):
                await self.service().transcribe(wav_bytes(), "audio/wav")

        self.assertEqual(len(seen_paths), 1)
        self.assertFalse(seen_paths[0].exists())

    async def test_empty_speech_and_unsupported_content_type_are_controlled(self) -> None:
        empty_model = SimpleNamespace(transcribe=lambda *_args, **_kwargs: (iter([]), None))
        with patch("faster_whisper.WhisperModel", return_value=empty_model):
            with self.assertRaises(EmptyTranscriptionError):
                await self.service().transcribe(wav_bytes(), "audio/wav")

        with self.assertRaises(UnsupportedAudioError):
            await self.service().transcribe(wav_bytes(), "audio/x-unsupported")

    async def test_transcription_invokes_asyncio_thread_worker(self) -> None:
        service = self.service()
        with patch(
            "app.services.speech_service.asyncio.to_thread",
            new_callable=AsyncMock,
            return_value="texto transcrito",
        ) as to_thread:
            result = await service.transcribe(b"audio", "audio/wav")

        self.assertEqual(result, "texto transcrito")
        self.assertTrue(to_thread.awaited)

    async def test_semaphore_limits_concurrent_transcriptions(self) -> None:
        active = 0
        peak_active = 0

        async def fake_thread(_function, *_args):
            nonlocal active, peak_active
            active += 1
            peak_active = max(peak_active, active)
            await asyncio.sleep(0.01)
            active -= 1
            return "texto"

        service = SpeechService(Settings(whisper_max_concurrent=1))
        with patch("app.services.speech_service.asyncio.to_thread", side_effect=fake_thread):
            await asyncio.gather(
                service.transcribe(b"audio", "audio/wav"),
                service.transcribe(b"audio", "audio/wav"),
            )

        self.assertEqual(peak_active, 1)
