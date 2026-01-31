from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "Finance Manager"
    debug: bool = True

    # Database
    database_url: str = "postgresql://finance:finance@localhost:5432/finance_db"

    # Security
    secret_key: str = "change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # Ollama
    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "mistral"

    # Upload
    upload_dir: str = "/app/uploads"
    max_upload_size: int = 50 * 1024 * 1024  # 50MB

    # NAS Sync
    nas_host: str = ""
    nas_user: str = ""
    nas_path: str = ""
    sync_interval_minutes: int = 30

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
