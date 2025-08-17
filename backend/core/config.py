# backend/core/config.py
import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application configuration with environment variable support"""
    
    # Application settings
    APP_NAME: str = "Document Intelligence System"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8080
    
    # File paths
    BASE_DIR: Path = Path(__file__).parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    UPLOAD_DIR: Path = DATA_DIR / "uploads"
    PROCESSED_DIR: Path = DATA_DIR / "processed"
    EMBEDDINGS_DIR: Path = DATA_DIR / "embeddings"
    CACHE_DIR: Path = DATA_DIR / "cache"
    
    # PDF processing limits
    MAX_PDF_SIZE_MB: int = 50
    MAX_PAGES: int = 50
    MAX_UPLOAD_FILES: int = 10
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 128
    
    # Model settings
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_DIM: int = 384
    MAX_SEQUENCE_LENGTH: int = 512
    
    # Search settings
    TOP_K_SECTIONS: int = 5
    MIN_SIMILARITY_SCORE: float = 0.3
    SNIPPET_LENGTH: int = 3  # sentences
    CONTEXT_WINDOW: int = 2  # sentences before/after
    
    # Performance settings
    BATCH_SIZE: int = 32
    NUM_WORKERS: int = 4
    CACHE_TTL: int = 3600  # 1 hour
    USE_GPU: bool = False
    
    # External APIs (from environment)
    #ADOBE_EMBED_API_KEY: Optional[str] = os.getenv("ADOBE_EMBED_API_KEY")
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "gemini")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    
    # Redis cache (optional)
    USE_REDIS: bool = os.getenv("USE_REDIS", "false").lower() == "true"
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# Create directories if they don't exist
for dir_path in [settings.UPLOAD_DIR, settings.PROCESSED_DIR, 
                 settings.EMBEDDINGS_DIR, settings.CACHE_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)