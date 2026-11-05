"""
Configuration and Environment Variable Management for Quivers.
Uses Pydantic BaseSettings to enforce strict typing, default fallbacks,
and validation without leaking secrets.
"""

from functools import lru_cache
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application Settings loaded from environment variables and .env files.
    """
    # Core Application
    PROJECT_NAME: str = "Quivers"
    VERSION: str = "0.1.0"
    API_PREFIX: str = "/api"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Server Binding
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS Origins (Allow list for frontend Next.js dev & prod)
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # LLM Service (Anthropic Claude API - Never exposed to frontend)
    ANTHROPIC_API_KEY: str | None = Field(default=None, description="Claude API Key")

    # Database & Auth (Supabase PostgreSQL)
    SUPABASE_URL: str | None = Field(default=None, description="Supabase project URL")
    SUPABASE_KEY: str | None = Field(default=None, description="Legacy Supabase API key")
    SUPABASE_ANON_KEY: str | None = Field(default=None, description="Supabase publishable anon key")
    SUPABASE_SERVICE_ROLE_KEY: str | None = Field(default=None, description="Supabase secret service role key (backend only)")
    SUPABASE_ROLE_KEY: str | None = Field(default=None, description="Alias for service role key")
    SUPABASE_JWT_SECRET: str | None = Field(default=None, description="Supabase JWT secret for offline validation")

    @property
    def effective_supabase_key(self) -> str | None:
        """Returns the most privileged backend key available (service role > anon > generic key)."""
        return (
            self.SUPABASE_SERVICE_ROLE_KEY
            or self.SUPABASE_ROLE_KEY
            or self.SUPABASE_ANON_KEY
            or self.SUPABASE_KEY
        )

    # OCR Optional Executable Path (Windows / Linux)
    TESSERACT_CMD: str | None = Field(default=None, description="Path to Tesseract OCR executable")

    # Upload Limits (Strict 10 MB limit as specified in Phase 2)
    MAX_UPLOAD_SIZE_MB: int = 10

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v  # type: ignore
        raise ValueError(f"Invalid CORS_ORIGINS: {v}")

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "backend.env", "../backend.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )


@lru_cache()
def get_settings() -> Settings:
    """
    Returns cached instance of Settings to avoid re-reading disk on every request.
    """
    return Settings()
