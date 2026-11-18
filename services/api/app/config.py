from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    database_url: str = "sqlite:///data/invoice.db"
    secret_key: str = "change-me-in-production"
    session_cookie_name: str = "session"
    session_max_age_seconds: int = 60 * 60 * 24 * 30  # 30 days
    cors_origins: list[str] = ["http://localhost:5173"]
    debug: bool = False

    model_config = {"env_prefix": "VTI_", "env_file": ".env"}


settings = Settings()
