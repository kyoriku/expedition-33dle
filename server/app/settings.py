from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, sourced from environment variables.

    The dev container injects DATABASE_URL (and CORS_ORIGINS). `extra="ignore"`
    is required so undeclared env vars like CORS_ORIGINS don't raise at startup.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
    )

    database_url: str

    @field_validator("database_url")
    @classmethod
    def _asyncpg_scheme(cls, v: str) -> str:
        """Normalize managed-Postgres URL schemes to the async driver's.

        Railway (and most hosts) hand out postgres:// or postgresql://, but
        create_async_engine needs postgresql+asyncpg://. An already-correct
        URL (the dev container's) passes through untouched.
        """
        for prefix in ("postgres://", "postgresql://"):
            if v.startswith(prefix):
                return "postgresql+asyncpg://" + v.removeprefix(prefix)
        return v


settings = Settings()
