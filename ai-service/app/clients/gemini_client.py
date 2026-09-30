import logging
from typing import Any

import httpx
from google import genai
from google.genai import errors, types

from app.core.config import Settings

logger = logging.getLogger(__name__)


class GeminiUnavailableError(Exception):
    pass


class GeminiRateLimitError(Exception):
    pass


class GeminiClient:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client: genai.Client | None = None

    async def generate_content(
        self,
        *,
        contents: list[types.Content],
        config: types.GenerateContentConfig,
    ) -> types.GenerateContentResponse:
        client = self._get_client()
        try:
            return await client.aio.models.generate_content(
                model=self._settings.gemini_model or "",
                contents=contents,
                config=config,
            )
        except errors.APIError as error:
            logger.warning("Gemini API request failed (HTTP %s).", error.code)
            if error.code == 429:
                raise GeminiRateLimitError from error
            raise GeminiUnavailableError from error
        except (httpx.TimeoutException, httpx.RequestError) as error:
            logger.warning(
                "Gemini transport failed (%s).", type(error).__name__
            )
            raise GeminiUnavailableError from error
        except Exception as error:
            logger.warning("Gemini request failed (%s).", type(error).__name__)
            raise GeminiUnavailableError from error

    def _get_client(self) -> genai.Client:
        api_key = self._settings.gemini_api_key
        if api_key is None or not api_key.get_secret_value().strip():
            raise GeminiUnavailableError
        if not self._settings.gemini_model or not self._settings.gemini_model.strip():
            raise GeminiUnavailableError
        if self._client is None:
            try:
                self._client = genai.Client(
                    api_key=api_key.get_secret_value(),
                    http_options=types.HttpOptions(
                        timeout=int(self._settings.gemini_timeout_seconds * 1000)
                    ),
                )
            except Exception as error:
                logger.warning(
                    "Gemini client initialization failed (%s).",
                    type(error).__name__,
                )
                raise GeminiUnavailableError from error
        return self._client

    async def aclose(self) -> None:
        if self._client is not None:
            try:
                await self._client.aio.aclose()
            finally:
                self._client.close()
