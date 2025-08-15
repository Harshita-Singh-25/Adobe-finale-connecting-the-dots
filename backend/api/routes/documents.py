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

# Get service instances
indexer = DocumentIndexer()
search_engine = SemanticSearchEngine()

@router.post("/upload/bulk", response_model=BulkUploadResponse)
async def upload_bulk_documents(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...)
):
    """Upload multiple PDFs (past documents)"""
    if len(files) > settings.MAX_UPLOAD_FILES:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {settings.MAX_UPLOAD_FILES} files allowed"
        )
    
    # Save uploaded files temporarily
    temp_files = []
    
    try:
        for file in files:
            if not file.filename.endswith('.pdf'):
                raise HTTPException(
                    status_code=400,
                    detail=f"File {file.filename} is not a PDF"
                )
            
            # Check file size
            content = await file.read()
            if len(content) > settings.MAX_PDF_SIZE_MB * 1024 * 1024:
                raise HTTPException(
                    status_code=400,
                    detail=f"File {file.filename} exceeds {settings.MAX_PDF_SIZE_MB}MB limit"
                )
            
            # Save to temp file
            temp_file = Path(tempfile.mktemp(suffix='.pdf'))
            temp_file.write_bytes(content)
            temp_files.append(temp_file)
        
        # Process documents
        results = await indexer.process_bulk_upload(temp_files)
        
        # Add to search index in background
        for doc_summary in results['successful']:
            doc = indexer.get_document(doc_summary['doc_id'])
            if doc:
                background_tasks.add_task(search_engine.add_document, doc)
        
        return BulkUploadResponse(
            success=True,
            message=f"Processed {len(results['successful'])} documents successfully",
            documents=results['successful'],
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
        result = await indexer.process_fresh_document(temp_file)
        
        # Add to search index in background
        doc = indexer.get_document(result['doc_id'])
        if doc:
            background_tasks.add_task(search_engine.add_document, doc)
        
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

@router.get("/list", response_model=DocumentListResponse)
async def list_documents():
    """Get list of all indexed documents"""
    documents = indexer.get_all_documents()
    
    doc_list = []
    for doc in documents:
        doc_list.append({
            'doc_id': doc['doc_id'],
            'title': doc['title'],
            'pages': doc['pages'],
            'sections': len(doc['sections']),
            'path': doc['path']
        })
    
    return DocumentListResponse(
        documents=doc_list,
        total=len(doc_list)
    )

@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str):
    """Get specific document details"""
    doc = indexer.get_document(doc_id)
    
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
    section = indexer.get_section(doc_id, section_id)
    
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
    doc = indexer.get_document(doc_id)
    
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
    del indexer.indexed_docs[doc_id]
    
    return JSONResponse(
        content={"message": f"Document {doc_id} deleted successfully"}
    )

@router.get("/statistics/overview")
async def get_statistics():
    """Get system statistics"""
    indexer_stats = indexer.get_statistics()
    search_stats = search_engine.get_statistics()
    
    return {
        "indexer": indexer_stats,
        "search_engine": search_stats
    }