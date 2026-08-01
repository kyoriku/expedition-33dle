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

    # Sentry error reporting. When unset (local dev, CI), init is skipped
    # entirely in app.main — no patching, no network calls.
    sentry_dsn: str | None = None

    # Tags Sentry events with the deploy environment (SENTRY_ENVIRONMENT —
    # the SDK's own conventional var name); Railway sets it to production.
    sentry_environment: str = "development"

    # BOOM_ENABLED=1 arms /api/_boom, the Sentry pipeline check. Unset, the
    # route is indistinguishable from any unknown /api/ path.
    boom_enabled: str | None = None

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
