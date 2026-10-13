from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Reads backend/.env first, then the repo-root .env (first file wins per key).
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        extra="ignore",
    )

    database_url: str = "sqlite:///./crm.db"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 480
    app_timezone: str = "Asia/Vientiane"


@lru_cache
def get_settings() -> Settings:
    return Settings()
