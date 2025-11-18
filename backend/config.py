import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # ==========================================
    # AUTHENTICATION DATABASE (WebApp Level)
    # ==========================================
    # Auth database is ALWAYS separate from PyArchInit data
    # Stores: users, sessions, user_databases (connection mappings)
    # Default: SQLite at /data/auth.db (Railway) or ./auth.db (local)
    AUTH_DB_PATH: str = os.getenv("AUTH_DB_PATH", "/data/auth.db")

    # ==========================================
    # PYARCHINIT DATABASE (Archaeological Data)
    # ==========================================
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
    # Railway uses /data for persistent volumes
    PYARCHINIT_MEDIA_ROOT: Path = Path(os.getenv("PYARCHINIT_MEDIA_ROOT", "/data/pyarchinit_media"))
    PYARCHINIT_MEDIA_THUMB: Path = PYARCHINIT_MEDIA_ROOT / "thumb"
    PYARCHINIT_MEDIA_RESIZE: Path = PYARCHINIT_MEDIA_ROOT / "resize"
    PYARCHINIT_MEDIA_ORIGINAL: Path = PYARCHINIT_MEDIA_ROOT / "original"

    # 3D Models storage paths
    PYARCHINIT_3D_MODELS_ROOT: Path = PYARCHINIT_MEDIA_ROOT / "3d_models"
    PYARCHINIT_3D_MODELS_ORIGINAL: Path = PYARCHINIT_3D_MODELS_ROOT / "original"  # OBJ, GLTF uploads
    PYARCHINIT_3D_MODELS_WEB: Path = PYARCHINIT_3D_MODELS_ROOT / "web"  # Optimized GLTF/GLB
    PYARCHINIT_3D_MODELS_AR: Path = PYARCHINIT_3D_MODELS_ROOT / "ar"  # USDZ for iOS AR Quick Look
    PYARCHINIT_3D_MODELS_THUMBS: Path = PYARCHINIT_3D_MODELS_ROOT / "thumbs"  # Preview images

    # Dimensioni immagini (compatibili con PyArchInit)
    THUMB_SIZE: tuple = (150, 150)
    RESIZE_SIZE: tuple = (800, 600)
    
    # AI Services
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    
    # Upload
    MAX_AUDIO_SIZE: int = 25 * 1024 * 1024  # 25MB
    MAX_IMAGE_SIZE: int = 10 * 1024 * 1024  # 10MB
    MAX_3D_MODEL_SIZE: int = 100 * 1024 * 1024  # 100MB for 3D models
    ALLOWED_AUDIO_FORMATS: list = [".mp3", ".wav", ".m4a", ".ogg", ".webm"]
    ALLOWED_IMAGE_FORMATS: list = [".jpg", ".jpeg", ".png", ".tiff", ".tif"]
    ALLOWED_3D_MODEL_FORMATS: list = [".obj", ".gltf", ".glb", ".usdz"]
    
    # Redis per queue
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    # CORS Origins - Comma-separated string that will be parsed into a list
    # Example: "http://localhost:5173,https://pyarchinit-mobile-pwa.vercel.app"
    CORS_ORIGINS_STR: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000,https://pyarchinit-mobile-pwa.vercel.app"
    )

    @property
    def CORS_ORIGINS(self) -> list:
        """Parse comma-separated CORS origins into a list"""
        return [origin.strip() for origin in self.CORS_ORIGINS_STR.split(",") if origin.strip()]
    
    class Config:
        env_file = ".env"
        extra = "ignore"  # Allow extra fields from environment variables

settings = Settings()

# Crea directory media e 3D models se non esistono
for path in [settings.PYARCHINIT_MEDIA_THUMB,
             settings.PYARCHINIT_MEDIA_RESIZE,
             settings.PYARCHINIT_MEDIA_ORIGINAL,
             settings.PYARCHINIT_3D_MODELS_ORIGINAL,
             settings.PYARCHINIT_3D_MODELS_WEB,
             settings.PYARCHINIT_3D_MODELS_AR,
             settings.PYARCHINIT_3D_MODELS_THUMBS]:
    try:
        path.mkdir(parents=True, exist_ok=True)
    except (OSError, PermissionError) as e:
        print(f"⚠️  Warning: Could not create directory {path}: {e}")
