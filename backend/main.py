# main.py
import asyncio
import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List, Optional
import logging
import sys

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

# Import services
from backend.services.document_indexer import DocumentIndexer
from backend.services.semantic_search import SemanticSearchEngine
from backend.models.schemas import (
    SelectionRequest, 
    RelatedSectionsResponse,
    DocumentListResponse,
    DocumentResponse
)
from backend.api.routes.health import router as health_router
from backend.core.config import settings

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

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router, prefix="/api", tags=["health"])

@app.post("/api/documents/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    is_current: bool = Form(False)
):
    """Upload and process a PDF document"""
    global indexer, search_engine
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(400, "Only PDF files are supported")
    
    # Check file size
    contents = await file.read()
    if len(contents) > settings.MAX_PDF_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"File size exceeds {settings.MAX_PDF_SIZE_MB}MB limit")
    
    # Save file temporarily
    temp_path = settings.UPLOAD_DIR / file.filename
    with open(temp_path, 'wb') as f:
        f.write(contents)
    
    try:
        # Process document
        if is_current:
            result = await indexer.process_fresh_document(temp_path)
        else:
            results = await indexer.process_bulk_upload([temp_path])
            if results['failed']:
                raise HTTPException(500, f"Failed to process: {results['failed'][0]['error']}")
            result = results['successful'][0]
        
        # Add to search index
        doc_structure = indexer.get_document(result['doc_id'])
        if doc_structure:
            search_engine.add_document(doc_structure)
            logger.info(f"Document {result['title']} added to search index")
        
        # Get document with outline
        sections = doc_structure.get('sections', [])
        outline = [
            {
                'section_id': s['section_id'],
                'heading': s['heading'],
                'level': s['level'],
                'page_num': s['page_num'],
                'word_count': s.get('word_count', 0)
            }
            for s in sections[:10]  # First 10 sections for outline
        ]
        
        return DocumentResponse(
            doc_id=result['doc_id'],
            title=result['title'],
            pages=result['pages'],
            sections=result['sections'],
            path=result['path'],
            is_fresh=result['is_fresh'],
            metadata=doc_structure.get('metadata'),
            outline=outline
        )
        
    except Exception as e:
        logger.error(f"Document processing failed: {e}")
        if temp_path.exists() and not temp_path.name.startswith(result.get('doc_id', '')):
            temp_path.unlink()  # Clean up temp file
        raise HTTPException(500, f"Document processing failed: {str(e)}")

@app.post("/api/documents/upload-bulk")
async def upload_bulk_documents(files: List[UploadFile] = File(...)):
    """Upload multiple PDF documents"""
    global indexer, search_engine
    
    if len(files) > settings.MAX_UPLOAD_FILES:
        raise HTTPException(400, f"Maximum {settings.MAX_UPLOAD_FILES} files allowed")
    
    results = {
        'successful': [],
        'failed': []
    }
    
    for file in files:
        if not file.filename.endswith('.pdf'):
            results['failed'].append({
                'filename': file.filename,
                'error': 'Not a PDF file'
            })
            continue
        
        try:
            # Save file
            contents = await file.read()
            temp_path = settings.UPLOAD_DIR / file.filename
            with open(temp_path, 'wb') as f:
                f.write(contents)
            
            # Process
            result = await indexer._process_single_document(temp_path)
            
            # Add to search index
            doc_structure = indexer.get_document(result['doc_id'])
            if doc_structure:
                search_engine.add_document(doc_structure)
            
            results['successful'].append({
                'filename': file.filename,
                'doc_id': result['doc_id'],
                'title': result['title']
            })
            
        except Exception as e:
            logger.error(f"Failed to process {file.filename}: {e}")
            results['failed'].append({
                'filename': file.filename,
                'error': str(e)
            })
    
    return JSONResponse(content=results)

@app.post("/api/search/related-sections", response_model=RelatedSectionsResponse)
async def search_related_sections(request: SelectionRequest):
    """Search for related sections based on selected text"""
    global search_engine
    
    if not request.selected_text or len(request.selected_text.strip()) < 5:
        raise HTTPException(400, "Selected text must be at least 5 characters")
    
    try:
        logger.info(f"Searching for: '{request.selected_text[:50]}...'")
        
        # Perform search
        top_k = request.top_k or settings.TOP_K_SECTIONS
        results = search_engine.search_related_sections(
            selected_text=request.selected_text,
            current_doc_id=request.current_doc_id,
            top_k=top_k
        )
        
        logger.info(f"Found {len(results)} related sections")
        
        return RelatedSectionsResponse(
            selected_text=request.selected_text,
            current_doc_id=request.current_doc_id,
            related_sections=results,
            processing_time=0.0,  # You can add timing if needed
            from_cache=False
        )
        
    except Exception as e:
        logger.error(f"Search failed: {e}", exc_info=True)
        raise HTTPException(500, f"Search failed: {str(e)}")

@app.get("/api/documents", response_model=DocumentListResponse)
async def list_documents():
    """List all indexed documents"""
    global indexer
    
    try:
        all_docs = indexer.get_all_documents()
        
        summaries = []
        for doc in all_docs:
            summaries.append({
                'doc_id': doc['doc_id'],
                'title': doc['title'],
                'pages': doc['pages'],
                'sections': len(doc.get('sections', [])),
                'path': doc['path'],
                'is_fresh': False
            })
        
        return DocumentListResponse(
            documents=summaries,
            total=len(summaries)
        )
        
    except Exception as e:
        logger.error(f"Failed to list documents: {e}")
        raise HTTPException(500, "Failed to retrieve documents")

@app.get("/api/documents/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str):
    """Get specific document details"""
    global indexer
    
    doc = indexer.get_document(doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    
    sections = doc.get('sections', [])
    outline = [
        {
            'section_id': s['section_id'],
            'heading': s['heading'],
            'level': s['level'],
            'page_num': s['page_num'],
            'word_count': s.get('word_count', 0)
        }
        for s in sections[:20]
    ]
    
    return DocumentResponse(
        doc_id=doc['doc_id'],
        title=doc['title'],
        pages=doc['pages'],
        sections=len(sections),
        path=doc['path'],
        is_fresh=False,
        metadata=doc.get('metadata'),
        outline=outline
    )

@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document from the index"""
    global indexer, search_engine
    
    doc = indexer.get_document(doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    
    try:
        # Remove from indexer
        del indexer.indexed_docs[doc_id]
        
        # Remove file
        pdf_path = Path(doc['path'])
        if pdf_path.exists():
            pdf_path.unlink()
        
        # Remove processed data
        processed_path = settings.PROCESSED_DIR / f"{doc_id}.json"
        if processed_path.exists():
            processed_path.unlink()
        
        # Rebuild search index (simple approach - could be optimized)
        search_engine._initialize_index()
        search_engine.section_metadata = []
        
        # Re-add remaining documents
        for remaining_doc in indexer.get_all_documents():
            search_engine.add_document(remaining_doc)
        
        return {"message": f"Document {doc_id} deleted successfully"}
        
    except Exception as e:
        logger.error(f"Failed to delete document: {e}")
        raise HTTPException(500, f"Failed to delete document: {str(e)}")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )