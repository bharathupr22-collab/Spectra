"""Application settings loaded from environment variables."""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    YOUTUBE_API_KEY: str = ""
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    DATABASE_URL: str = "sqlite:///./spectra.db"
    SECRET_KEY: str = "change-me-to-a-random-string"
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/google/callback"

    @property
    def is_demo_mode(self) -> bool:
        """True when no YouTube API key is configured — all data is demo."""
        return not self.YOUTUBE_API_KEY

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
