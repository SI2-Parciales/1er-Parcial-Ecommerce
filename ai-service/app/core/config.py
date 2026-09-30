from functools import lru_cache
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import AnyHttpUrl, Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    nestjs_api_url: AnyHttpUrl = "http://localhost:1234"
    nestjs_api_timeout_seconds: float = Field(default=10.0, gt=0)
    gemini_api_key: SecretStr | None = None
    gemini_model: str | None = None
    gemini_timeout_seconds: float = Field(default=30.0, gt=0)
    app_timezone: str = "America/La_Paz"

    @field_validator("app_timezone")
    @classmethod
    def validate_app_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as error:
            raise ValueError("APP_TIMEZONE debe ser una zona horaria IANA válida.") from error
        return value

    @property
    def nestjs_reports_query_url(self) -> str:
        return f"{str(self.nestjs_api_url).rstrip('/')}/internal/reports/query"


@lru_cache
def get_settings() -> Settings:
    return Settings()
