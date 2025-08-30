# backend/api/routes/health.py
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import psutil
import torch
from pathlib import Path
from datetime import datetime

from backend.core.config import settings
from backend.services.document_indexer import DocumentIndexer
from backend.services.semantic_search import SemanticSearchEngine

router = APIRouter()

# Service instances from main.py
# These will be initialized in the lifespan context manager
indexer = None
search_engine = None

def get_indexer():
    """Get the initialized indexer instance"""
    if indexer is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    return indexer

def get_search_engine():
    """Get the initialized search engine instance"""
    if search_engine is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    return search_engine

@router.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return JSONResponse(
        content={
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "app_name": settings.APP_NAME,
            "version": "1.0.0"
        }
    )

@router.get("/status")
async def system_status():
    """Detailed system status including resource usage"""
    try:
        # System resources
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage(str(settings.BASE_DIR))
        
        # GPU information
        gpu_info = {}
        if torch.cuda.is_available():
            gpu_info = {
                "available": True,
                "device_count": torch.cuda.device_count(),
                "current_device": torch.cuda.current_device(),
                "device_name": torch.cuda.get_device_name(0),
                "memory_allocated": torch.cuda.memory_allocated(0),
                "memory_reserved": torch.cuda.memory_reserved(0)
            }
        else:
            gpu_info = {"available": False}
        
        # Service status
        indexer_instance = get_indexer()
        search_engine_instance = get_search_engine()
        
        indexer_stats = indexer_instance.get_statistics()
        search_stats = search_engine_instance.get_statistics()
        
        # Directory sizes
        dir_sizes = {}
        for dir_name, dir_path in [
            ("uploads", settings.UPLOAD_DIR),
            ("processed", settings.PROCESSED_DIR),
            ("embeddings", settings.EMBEDDINGS_DIR),
            ("cache", settings.CACHE_DIR)
        ]:
            if dir_path.exists():
                total_size = sum(f.stat().st_size for f in dir_path.rglob('*') if f.is_file())
                dir_sizes[dir_name] = {
                    "size_bytes": total_size,
                    "size_mb": round(total_size / (1024 * 1024), 2),
                    "file_count": len(list(dir_path.rglob('*')))
                }
            else:
                dir_sizes[dir_name] = {"size_bytes": 0, "size_mb": 0, "file_count": 0}
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "system": {
                "cpu_percent": cpu_percent,
                "memory": {
                    "total_gb": round(memory.total / (1024**3), 2),
                    "available_gb": round(memory.available / (1024**3), 2),
                    "used_percent": memory.percent
                },
                "disk": {
                    "total_gb": round(disk.total / (1024**3), 2),
                    "free_gb": round(disk.free / (1024**3), 2),
                    "used_percent": round((disk.used / disk.total) * 100, 2)
                },
                "gpu": gpu_info
            },
            "services": {
                "document_indexer": indexer_stats,
                "search_engine": search_stats
            },
            "storage": dir_sizes,
            "configuration": {
                "embedding_model": settings.EMBEDDING_MODEL,
                "max_upload_files": settings.MAX_UPLOAD_FILES,
                "max_pdf_size_mb": settings.MAX_PDF_SIZE_MB,
                "use_gpu": settings.USE_GPU,
                "debug_mode": settings.DEBUG
            }
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
        )

@router.get("/readiness")
async def readiness_check():
    """Check if system is ready to handle requests"""
    checks = {}
    overall_ready = True
    
    # Check if directories exist
    for dir_name, dir_path in [
        ("uploads", settings.UPLOAD_DIR),
        ("processed", settings.PROCESSED_DIR),
        ("embeddings", settings.EMBEDDINGS_DIR),
        ("cache", settings.CACHE_DIR)
    ]:
        checks[f"directory_{dir_name}"] = dir_path.exists()
        if not dir_path.exists():
            overall_ready = False
    
    # Check if services are initialized
    try:
        indexer_stats = indexer.get_statistics()
        checks["document_indexer"] = True
    except Exception:
        checks["document_indexer"] = False
        overall_ready = False
    
    try:
        search_stats = search_engine.get_statistics()
        checks["search_engine"] = True
    except Exception:
        checks["search_engine"] = False
        overall_ready = False
    
    # Check embedding model
    try:
        if hasattr(search_engine, 'model'):
            checks["embedding_model"] = True
        else:
            checks["embedding_model"] = False
            overall_ready = False
    except Exception:
        checks["embedding_model"] = False
        overall_ready = False
    
    status_code = 200 if overall_ready else 503
    
    return JSONResponse(
        status_code=status_code,
        content={
            "ready": overall_ready,
            "checks": checks,
            "timestamp": datetime.now().isoformat()
        }
    )

@router.get("/metrics")
async def get_metrics():
    """Get performance metrics"""
    try:
        # Get service metrics
        indexer_stats = indexer.get_statistics()
        search_stats = search_engine.get_statistics()
        
        # Calculate derived metrics
        if indexer_stats['total_documents'] > 0:
            avg_sections_per_doc = indexer_stats['total_sections'] / indexer_stats['total_documents']
            avg_pages_per_doc = indexer_stats['total_pages'] / indexer_stats['total_documents']
        else:
            avg_sections_per_doc = 0
            avg_pages_per_doc = 0
        
        return {
            "documents": {
                "total": indexer_stats['total_documents'],
                "total_sections": indexer_stats['total_sections'],
                "total_pages": indexer_stats['total_pages'],
                "average_sections_per_document": round(avg_sections_per_doc, 2),
                "average_pages_per_document": round(avg_pages_per_doc, 2)
            },
            "search": {
                "index_size": search_stats.get('index_size', 0),
                "embedding_dimension": search_stats.get('embedding_dim', settings.EMBEDDING_DIM),
                "model": search_stats.get('model', settings.EMBEDDING_MODEL)
            },
            "performance": {
                "top_k_sections": settings.TOP_K_SECTIONS,
                "min_similarity_score": settings.MIN_SIMILARITY_SCORE,
                "snippet_length": settings.SNIPPET_LENGTH
            }
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "error": f"Failed to get metrics: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
        )