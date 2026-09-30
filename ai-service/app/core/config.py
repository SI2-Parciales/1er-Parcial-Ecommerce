from functools import lru_cache
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import AnyHttpUrl, Field, SecretStr, TypeAdapter, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_HTTP_URL_ADAPTER = TypeAdapter(AnyHttpUrl)
_DEFAULT_CORS_ORIGINS = (
    "http://localhost:3000,http://127.0.0.1:3000,"
    "http://localhost:5173,http://127.0.0.1:5173,"
    "http://localhost:8081,http://127.0.0.1:8081,"
    "http://localhost:19006,http://127.0.0.1:19006"
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    nestjs_api_url: AnyHttpUrl = "http://localhost:1234"
    nestjs_api_timeout_seconds: float = Field(default=10.0, gt=0)
    cors_origins: str = _DEFAULT_CORS_ORIGINS
    gemini_api_key: SecretStr | None = None
    gemini_model: str | None = None
    gemini_timeout_seconds: float = Field(default=30.0, gt=0)
    app_timezone: str = "America/La_Paz"
    whisper_model: str = "small"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"
    whisper_language: str = "es"
    max_audio_size_mb: int = Field(default=10, gt=0)
    whisper_max_concurrent: int = Field(default=1, gt=0)

    @field_validator("app_timezone")
    @classmethod
    def validate_app_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as error:
            raise ValueError("APP_TIMEZONE debe ser una zona horaria IANA válida.") from error
        return value

    @field_validator("cors_origins")
    @classmethod
    def validate_cors_origins(cls, value: str) -> str:
        origins = [origin.strip() for origin in value.split(",") if origin.strip()]
        if not origins:
            raise ValueError("CORS_ORIGINS debe contener al menos un origen válido.")

        normalized: list[str] = []
        for origin in origins:
            try:
                url = _HTTP_URL_ADAPTER.validate_python(origin)
            except Exception as error:
                raise ValueError(
                    f"CORS_ORIGINS contiene un origen inválido: {origin}"
                ) from error
            if (
                url.scheme not in {"http", "https"}
                or url.username is not None
                or url.password is not None
                or url.path not in {"", "/"}
                or url.query is not None
                or url.fragment is not None
            ):
                raise ValueError(
                    f"CORS_ORIGINS debe contener solo orígenes, sin rutas: {origin}"
                )
            normalized.append(str(url).rstrip("/"))

        return ",".join(dict.fromkeys(normalized))

    @property
    def allowed_cors_origins(self) -> list[str]:
        return self.cors_origins.split(",")

    @property
    def nestjs_reports_query_url(self) -> str:
        return f"{str(self.nestjs_api_url).rstrip('/')}/internal/reports/query"


@lru_cache
def get_settings() -> Settings:
    return Settings()
