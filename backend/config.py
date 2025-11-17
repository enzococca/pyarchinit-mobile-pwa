import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database Mode Selection
    # Options: "separate" | "hybrid" | "sqlite"
    # Default to SQLite for mobile-first offline capability
    DB_MODE: str = os.getenv("DB_MODE", "sqlite")

    # Database PyArchInit
    USE_SQLITE: bool = os.getenv("USE_SQLITE", "false").lower() == "true"
    SQLITE_DB_PATH: str = os.getenv("SQLITE_DB_PATH", "")  # Optional: override default SQLite path
    PYARCHINIT_DB_HOST: str = os.getenv("PYARCHINIT_DB_HOST", "localhost")
    PYARCHINIT_DB_PORT: int = int(os.getenv("PYARCHINIT_DB_PORT", "5432"))
    PYARCHINIT_DB_NAME: str = os.getenv("PYARCHINIT_DB_NAME", "pyarchinit_db")
    PYARCHINIT_DB_USER: str = os.getenv("PYARCHINIT_DB_USER", "postgres")
    PYARCHINIT_DB_PASSWORD: str = os.getenv("PYARCHINIT_DB_PASSWORD", "")

    # Separate Mode Configuration
    SEPARATE_DB_NAME_TEMPLATE: str = os.getenv("SEPARATE_DB_NAME_TEMPLATE", "pyarchinit_user")
    
    # Percorsi PyArchInit Media
    PYARCHINIT_MEDIA_ROOT: Path = Path(os.getenv("PYARCHINIT_MEDIA_ROOT", "/tmp/pyarchinit_media"))
    PYARCHINIT_MEDIA_THUMB: Path = PYARCHINIT_MEDIA_ROOT / "thumb"
    PYARCHINIT_MEDIA_RESIZE: Path = PYARCHINIT_MEDIA_ROOT / "resize"
    PYARCHINIT_MEDIA_ORIGINAL: Path = PYARCHINIT_MEDIA_ROOT / "original"
    
    # Dimensioni immagini (compatibili con PyArchInit)
    THUMB_SIZE: tuple = (150, 150)
    RESIZE_SIZE: tuple = (800, 600)
    
    # AI Services
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    
    # Upload
    MAX_AUDIO_SIZE: int = 25 * 1024 * 1024  # 25MB
    MAX_IMAGE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_AUDIO_FORMATS: list = [".mp3", ".wav", ".m4a", ".ogg", ".webm"]
    ALLOWED_IMAGE_FORMATS: list = [".jpg", ".jpeg", ".png", ".tiff", ".tif"]
    
    # Redis per queue
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000"]
    
    class Config:
        env_file = ".env"

settings = Settings()

# Crea directory media se non esistono
for path in [settings.PYARCHINIT_MEDIA_THUMB, 
             settings.PYARCHINIT_MEDIA_RESIZE, 
             settings.PYARCHINIT_MEDIA_ORIGINAL]:
    path.mkdir(parents=True, exist_ok=True)
