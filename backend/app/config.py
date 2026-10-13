from functools import lru_cache
from zoneinfo import ZoneInfo

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_SECRET_KEY = "dev-only-insecure-secret-key-change-me-before-deploying"


class Settings(BaseSettings):
    # Reads backend/.env first, then the repo-root .env (first file wins per key).
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        extra="ignore",
    )

    database_url: str = "sqlite:///./crm.db"
    # HS256 needs a key of at least 32 bytes (RFC 7518 §3.2).
    secret_key: str = Field(DEV_SECRET_KEY, min_length=32)
    access_token_expire_minutes: int = 480
    app_timezone: str = "Asia/Vientiane"

    @field_validator("app_timezone")
    @classmethod
    def _known_timezone(cls, value: str) -> str:
        ZoneInfo(value)  # raises if unknown
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
