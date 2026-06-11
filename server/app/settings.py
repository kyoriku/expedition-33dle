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


settings = Settings()
