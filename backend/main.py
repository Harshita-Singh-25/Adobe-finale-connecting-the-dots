# main.py
import asyncio
import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List, Optional
import logging
import sys
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Import services and schemas
from backend.services.document_indexer import DocumentIndexer
from backend.services.semantic_search import SemanticSearchEngine
from backend.models.schemas import (
    SelectionRequest, 
    RelatedSectionsResponse,
    DocumentListResponse,
    DocumentResponse
)
from backend.core.config import settings
from fastapi.staticfiles import StaticFiles

# Global service instances
indexer = None
search_engine = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    global indexer, search_engine
    
    logger.info("Starting Document Intelligence System...")
    
    # Initialize services
    indexer = DocumentIndexer()
    search_engine = SemanticSearchEngine()
    
    # Initialize in proper order
    await indexer.initialize()
    await search_engine.initialize()
    
    # Process any existing documents in the uploads directory
    existing_pdfs = list(settings.UPLOAD_DIR.glob("*.pdf"))
    if existing_pdfs:
        logger.info(f"Found {len(existing_pdfs)} existing PDFs to index")
        for pdf_path in existing_pdfs:
            try:
                doc_id = indexer._get_file_hash(pdf_path)
                
                # Check if already indexed
                if doc_id not in indexer.indexed_docs:
                    logger.info(f"Indexing existing document: {pdf_path.name}")
                    result = await indexer._process_single_document(pdf_path)
                    
                    # Add to search engine
                    doc_structure = indexer.get_document(result['doc_id'])
                    if doc_structure:
                        search_engine.add_document(doc_structure)
                        logger.info(f"Added {pdf_path.name} to search index")
            except Exception as e:
                logger.error(f"Failed to index {pdf_path.name}: {e}")
    
    logger.info(f"Search engine initialized with {search_engine.get_statistics()['total_sections']} sections")
    
    yield  # Application runs here
    
    # Cleanup
    logger.info("Shutting down Document Intelligence System...")
    await indexer.cleanup()
    await search_engine.cleanup()

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan
)

# ====================================================================
# Middleware Configuration
# ====================================================================

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====================================================================
# API Routes - Import and include routers
# ====================================================================

# Import API routers
try:
    from backend.api.routes.health import router as health_router
    from backend.api.routes.documents import router as documents_router
    from backend.api.routes.selection import router as selection_router
    
    # Include routers with proper prefixes
    app.include_router(health_router, prefix="/api/health", tags=["health"])
    app.include_router(documents_router, prefix="/api/documents", tags=["documents"])
    app.include_router(selection_router, prefix="/api/search", tags=["search"])
    
except ImportError as e:
    logger.error(f"Failed to import routers: {e}")
    # If routers can't be imported, the application should fail fast
    raise

# ====================================================================
# Static File Serving - Mount LAST to serve frontend
# ====================================================================

# Define the directory where your frontend's static files are located
FRONTEND_BUILD_DIR = Path(__file__).parent / "static"
logger.info(f"Frontend static files will be served from: {FRONTEND_BUILD_DIR}")

# Check if static directory exists
if not FRONTEND_BUILD_DIR.exists():
    logger.warning(f"Frontend static directory not found: {FRONTEND_BUILD_DIR}")
    # Create a simple root endpoint for API-only mode
    @app.get("/")
    async def root():
        return {
            "message": "Frontend static files not found. Running in API-only mode.",
            "docs": "/docs",
            "api_health": "/api/health"
        }
else:
    # Mount the static files directory LAST
    app.mount("/", StaticFiles(directory=FRONTEND_BUILD_DIR, html=True), name="static")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )