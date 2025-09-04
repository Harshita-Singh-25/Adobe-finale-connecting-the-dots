# backend/api/routes/documents.py
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import List, Optional
from pathlib import Path
import shutil
import tempfile

from backend.services.document_indexer import DocumentIndexer
from backend.services.semantic_search import SemanticSearchEngine
from backend.core.config import settings
from backend.models.schemas import (
    DocumentResponse, BulkUploadResponse, 
    DocumentListResponse, SectionResponse
)

router = APIRouter()

# Get service instances from main.py
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

@router.post("/upload/bulk", response_model=BulkUploadResponse)
async def upload_bulk_documents(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(alias="files")
):
    """Upload multiple PDFs (past documents)"""
    print(f"DEBUG: Upload endpoint called with {len(files) if files else 0} files")
    print(f"DEBUG: Files type: {type(files)}")
    if files:
        for i, file in enumerate(files):
            print(f"DEBUG: File {i}: {file.filename}, size: {file.size}, content_type: {file.content_type}")
    
    if not files:
        raise HTTPException(
            status_code=422,
            detail="No files provided"
        )
    
    if len(files) > settings.MAX_UPLOAD_FILES:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {settings.MAX_UPLOAD_FILES} files allowed"
        )
    
    # Save uploaded files temporarily
    temp_files = []
    
    try:
        print(f"DEBUG: Starting to process {len(files)} files")
        for i, file in enumerate(files):
            print(f"DEBUG: Processing file {i}: {file.filename}")
            
            if not file.filename or not file.filename.endswith('.pdf'):
                print(f"DEBUG: File {i} is not a PDF: {file.filename}")
                raise HTTPException(
                    status_code=400,
                    detail=f"File {file.filename} is not a PDF"
                )
            
            # Check file size
            print(f"DEBUG: Reading file content for {file.filename}")
            content = await file.read()
            print(f"DEBUG: File {file.filename} content size: {len(content)} bytes")
            
            if len(content) > settings.MAX_PDF_SIZE_MB * 1024 * 1024:
                print(f"DEBUG: File {file.filename} exceeds size limit")
                raise HTTPException(
                    status_code=400,
                    detail=f"File {file.filename} exceeds {settings.MAX_PDF_SIZE_MB}MB limit"
                )
            
            # Save to temp file
            temp_file = Path(tempfile.mktemp(suffix='.pdf'))
            temp_file.write_bytes(content)
            temp_files.append(temp_file)
            print(f"DEBUG: Saved {file.filename} to temp file: {temp_file}")
        
        # Process documents
        print(f"DEBUG: Getting indexer instance")
        indexer_instance = get_indexer()
        print(f"DEBUG: Getting search engine instance")
        search_engine_instance = get_search_engine()
        print(f"DEBUG: Both services initialized successfully")
        
        results = await indexer_instance.process_bulk_upload(temp_files)
        
        # Add to search index in background
        for doc_summary in results['successful']:
            doc = indexer_instance.get_document(doc_summary['doc_id'])
            if doc:
                background_tasks.add_task(search_engine_instance.add_document, doc)
        
        # Normalize document summaries to match schema (sections must be int)
        normalized_docs = []
        for doc in results['successful']:
            try:
                normalized_docs.append({
                    'doc_id': doc.get('doc_id'),
                    'title': doc.get('title'),
                    'pages': doc.get('pages', 0),
                    'sections': len(doc.get('sections', [])) if isinstance(doc.get('sections'), list) else int(doc.get('sections', 0)),
                    'path': doc.get('path'),
                    'is_fresh': bool(doc.get('is_fresh', False))
                })
            except Exception:
                # Fallback if anything unexpected appears
                normalized_docs.append({
                    'doc_id': doc.get('doc_id'),
                    'title': doc.get('title', 'Untitled Document'),
                    'pages': int(doc.get('pages', 0)),
                    'sections': 0,
                    'path': doc.get('path', ''),
                    'is_fresh': False
                })

        return BulkUploadResponse(
            success=True,
            message=f"Processed {len(normalized_docs)} documents successfully",
            documents=normalized_docs,
            failed=results['failed'],
            processing_time=results['total_time']
        )
        
    finally:
        # Cleanup temp files
        for temp_file in temp_files:
            if temp_file.exists():
                temp_file.unlink()

@router.post("/upload/fresh", response_model=DocumentResponse)
async def upload_fresh_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """Upload a new PDF (current reading document)"""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="File must be a PDF"
        )
    
    # Check file size
    content = await file.read()
    if len(content) > settings.MAX_PDF_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds {settings.MAX_PDF_SIZE_MB}MB limit"
        )
    
    # Save to temp file
    temp_file = Path(tempfile.mktemp(suffix='.pdf'))
    
    try:
        temp_file.write_bytes(content)
        
        # Process document
        indexer_instance = get_indexer()
        search_engine_instance = get_search_engine()
        
        result = await indexer_instance.process_fresh_document(temp_file)
        
        # Add to search index in background
        doc = indexer_instance.get_document(result['doc_id'])
        if doc:
            background_tasks.add_task(search_engine_instance.add_document, doc)
        
        return DocumentResponse(
            doc_id=result['doc_id'],
            title=result['title'],
            pages=result['pages'],
            sections=result['sections'],
            path=result['path'],
            is_fresh=True
        )
        
    finally:
        if temp_file.exists():
            temp_file.unlink()

@router.get("/statistics/overview")
async def get_statistics():
    """Get system statistics"""
    indexer_stats = indexer.get_statistics()
    search_stats = search_engine.get_statistics()
    
    return {
        "indexer": indexer_stats,
        "search_engine": search_stats
    }

@router.get("/list", response_model=DocumentListResponse)
async def list_documents():
    """Get list of all indexed documents"""
    indexer_instance = get_indexer()
    documents = indexer_instance.get_all_documents()
    
    # Debug: Log the actual document structure
    print(f"DEBUG: Found {len(documents)} documents")
    if documents:
        print(f"DEBUG: First document keys: {list(documents[0].keys())}")
        print(f"DEBUG: First document: {documents[0]}")
    
    doc_list = []
    for i, doc in enumerate(documents):
        try:
            # Make the route more robust by handling missing fields
            doc_info = {
                'doc_id': doc.get('doc_id', f'unknown_{i}'),
                'title': doc.get('title', 'Untitled Document'),
                'pages': doc.get('pages', 0),
                'sections': len(doc.get('sections', [])),
                'path': doc.get('path', 'Unknown path')
            }
            doc_list.append(doc_info)
        except Exception as e:
            print(f"DEBUG: Error processing document {i}: {e}")
            print(f"DEBUG: Document data: {doc}")
            # Add a fallback document entry
            doc_list.append({
                'doc_id': f'error_{i}',
                'title': 'Error Processing Document',
                'pages': 0,
                'sections': 0,
                'path': 'Error'
            })
    
    return DocumentListResponse(
        documents=doc_list,
        total=len(doc_list)
    )

@router.get("/test")
async def test_route():
    """Test route to verify routing is working"""
    return {"message": "Test route working", "status": "success"}

@router.post("/test-upload")
async def test_upload():
    """Test upload endpoint to verify it's accessible"""
    return {"message": "Upload endpoint accessible", "status": "success"}

@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str):
    """Get specific document details"""
    indexer_instance = get_indexer()
    doc = indexer_instance.get_document(doc_id)
    
    if not doc:
        raise HTTPException(
            status_code=404,
            detail=f"Document {doc_id} not found"
        )
    
    return DocumentResponse(
        doc_id=doc['doc_id'],
        title=doc['title'],
        pages=doc['pages'],
        sections=len(doc['sections']),
        path=doc['path'],
        metadata=doc.get('metadata', {}),
        outline=doc['sections']
    )

@router.get("/{doc_id}/sections/{section_id}", response_model=SectionResponse)
async def get_section(doc_id: str, section_id: str):
    """Get specific section from document"""
    indexer_instance = get_indexer()
    section = indexer_instance.get_section(doc_id, section_id)
    
    if not section:
        raise HTTPException(
            status_code=404,
            detail=f"Section {section_id} not found in document {doc_id}"
        )
    
    return SectionResponse(
        section_id=section['section_id'],
        doc_id=section['doc_id'],
        heading=section['heading'],
        level=section['level'],
        content=section['content'],
        page_num=section['page_num'],
        start_page=section.get('start_page'),
        end_page=section.get('end_page')
    )

@router.delete("/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document from the index"""
    indexer_instance = get_indexer()
    doc = indexer_instance.get_document(doc_id)
    
    if not doc:
        raise HTTPException(
            status_code=404,
            detail=f"Document {doc_id} not found"
        )
    
    # Remove files
    upload_path = Path(doc['path'])
    if upload_path.exists():
        upload_path.unlink()
    
    processed_path = settings.PROCESSED_DIR / f"{doc_id}.json"
    if processed_path.exists():
        processed_path.unlink()
    
    # Remove from index
    del indexer_instance.indexed_docs[doc_id]
    
    return JSONResponse(
        content={"message": f"Document {doc_id} deleted successfully"}
    )