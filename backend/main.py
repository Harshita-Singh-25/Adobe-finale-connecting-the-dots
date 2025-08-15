# backend/main.py
import os
import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent))

from backend.api.routes import documents, selection, health
from backend.core.config import settings
from backend.services.document_indexer import DocumentIndexer
from backend.services.semantic_search import SemanticSearchEngine

# Initialize services
document_indexer = None
search_engine = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup, cleanup on shutdown"""
    global document_indexer, search_engine
    
    # Startup
    print("Initializing Document Processing System...")
    
    # Create necessary directories
    for dir_path in [settings.UPLOAD_DIR, settings.PROCESSED_DIR, 
                     settings.EMBEDDINGS_DIR, settings.CACHE_DIR]:
        Path(dir_path).mkdir(parents=True, exist_ok=True)
    
    # Initialize services
    document_indexer = DocumentIndexer()
    search_engine = SemanticSearchEngine()
    
    # Load existing documents if any
    await document_indexer.initialize()
    await search_engine.initialize()
    
    print("System initialized successfully!")
    
    yield
    
    # Shutdown
    print("Shutting down services...")
    if document_indexer:
        await document_indexer.cleanup()
    if search_engine:
        await search_engine.cleanup()

# Create FastAPI app
app = FastAPI(
    title="Adobe Hackathon - Document Intelligence System",
    description="High-performance document insight and connection system",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploaded documents
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/processed", StaticFiles(directory=settings.PROCESSED_DIR), name="processed")

# Include routers
app.include_router(health.router, prefix="/api/health", tags=["health"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(selection.router, prefix="/api/selection", tags=["selection"])

# Export for Docker
def get_app():
    return app

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8080,
        reload=settings.DEBUG,
        workers=1 if settings.DEBUG else 4,
        log_level="debug" if settings.DEBUG else "info"
    )