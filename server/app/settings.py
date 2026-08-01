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


settings = Settings()
