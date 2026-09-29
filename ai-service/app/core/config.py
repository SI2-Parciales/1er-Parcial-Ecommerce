from functools import lru_cache

from pydantic import AnyHttpUrl, Field
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

    @property
    def nestjs_reports_query_url(self) -> str:
        return f"{str(self.nestjs_api_url).rstrip('/')}/internal/reports/query"


@lru_cache
def get_settings() -> Settings:
    return Settings()
