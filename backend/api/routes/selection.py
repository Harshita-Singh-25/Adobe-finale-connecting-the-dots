# backend/api/routes/selection.py
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse, FileResponse
from typing import Optional, List
import time
import logging

from backend.services.semantic_search import SemanticSearchEngine
from backend.services.document_indexer import DocumentIndexer
from backend.core.config import settings
from backend.models.schemas import (
    SelectionRequest, RelatedSectionsResponse,
    RelatedSection, TextSelectionRequest, TextSelectionResponse
)
from backend.utils.chat_with_llm import LLMClient
from backend.utils.generate_audio import AudioGenerator

logger = logging.getLogger(__name__)
router = APIRouter()

# Dependency to get services
def get_document_indexer():
    from backend.main import document_indexer
    return document_indexer

def get_search_engine():
    from backend.main import search_engine
    return search_engine

@router.post("/related", response_model=RelatedSectionsResponse)
async def find_related_sections(
    request: SelectionRequest,
    search_engine: SemanticSearchEngine = Depends(get_search_engine)
):
    """Find related sections based on text selection"""
    start_time = time.time()
    
    # Validate input
    if not request.selected_text or len(request.selected_text.strip()) < 5:
        raise HTTPException(
            status_code=400,
            detail="Selected text must be at least 5 characters"
        )
    
    logger.info(f"Finding related sections for: {request.selected_text[:50]}...")
    
    # Perform search
    results = search_engine.search_related_sections(
        selected_text=request.selected_text,
        current_doc_id=request.current_doc_id,
        top_k=request.top_k if request.top_k is not None else settings.TOP_K_SECTIONS
    )
    
    # Format results
    related_sections = []
    for result in results:
        section = RelatedSection(
            doc_id=result['doc_id'],
            doc_title=result['doc_title'],
            doc_path=result['doc_path'],
            section_id=result['section_id'],
            heading=result['heading'],
            level=result['level'],
            page_num=result['page_num'],
            start_page=result['start_page'],
            end_page=result['end_page'],
            snippet=result['snippet'],
            similarity_score=result['similarity_score'],
            relevance_type=result['relevance_type']
        )
        related_sections.append(section)
    
    processing_time = time.time() - start_time
    
    logger.info(f"Found {len(related_sections)} related sections in {processing_time:.3f}s")
    
    return RelatedSectionsResponse(
        selected_text=request.selected_text,
        current_doc_id=request.current_doc_id,
        related_sections=related_sections,
        processing_time=processing_time,
        from_cache=False
    )

@router.post("/navigate")
async def navigate_to_section(
    doc_id: str,
    section_id: str,
    indexer: DocumentIndexer = Depends(get_document_indexer)
):
    """Get navigation information for a specific section"""
    section = indexer.get_section(doc_id, section_id)
    
    if not section:
        raise HTTPException(
            status_code=404,
            detail=f"Section {section_id} not found in document {doc_id}"
        )
    
    doc = indexer.get_document(doc_id)
    if not doc:
        raise HTTPException(
            status_code=404,
            detail=f"Document {doc_id} not found"
        )
    
    # Return navigation data for Adobe PDF Embed API
    return {
        "doc_id": doc_id,
        "doc_path": doc['path'],
        "doc_title": doc['title'],
        "section_id": section_id,
        "page_num": section['page_num'],
        "heading": section['heading'],
        "start_page": section.get('start_page', section['page_num']),
        "end_page": section.get('end_page', section['page_num']),
        "navigation": {
            "page": section['page_num'],
            "location": {
                "left": 0,
                "top": 100  # Approximate scroll position
            }
        }
    }

@router.post("/insights")
async def generate_insights(
    request: SelectionRequest,
    search_engine: SemanticSearchEngine = Depends(get_search_engine)
):
    """Generate insights from selected text and related sections"""
    # First find related sections
    related_response = await find_related_sections(request, search_engine)
    
    if not related_response.related_sections:
        return JSONResponse(
            content={
                "selected_text": request.selected_text,
                "insights": [],
                "message": "No related sections found"
            }
        )
    
    # Generate insights using LLM
    llm_client = LLMClient()
    insights = await llm_client.generate_insights(
        request.selected_text,
        [section.dict() for section in related_response.related_sections]
    )
    
    return {
        "selected_text": request.selected_text,
        "related_sections": related_response.related_sections,
        "insights": insights,
        "processing_time": related_response.processing_time
    }

@router.post("/audio")
async def generate_audio_summary(
    request: SelectionRequest,
    search_engine: SemanticSearchEngine = Depends(get_search_engine)
):
    """Generate audio summary from selected text and related sections"""
    # First find related sections
    related_response = await find_related_sections(request, search_engine)
    
    if not related_response.related_sections:
        return JSONResponse(
            status_code=404,
            content={
                "error": "No related sections found to generate audio"
            }
        )
    
    # Generate summary text
    summary_parts = [f"Summary for: {request.selected_text}"]
    
    for i, section in enumerate(related_response.related_sections[:3]):  # Limit to 3
        summary_parts.append(
            f"From {section.doc_title}, section {section.heading}: {section.snippet}"
        )
    
    summary_text = "\n\n".join(summary_parts)
    
    # Generate audio
    audio_generator = AudioGenerator()
    audio_path = await audio_generator.generate_audio(summary_text)
    
    return {
        "audio_path": audio_path,
        "duration_seconds": audio_generator.get_audio_duration(audio_path),
        "summary_text": summary_text
    }

@router.get("/audio/{file_id}")
async def serve_audio(file_id: str):
    """Serve generated audio file"""
    audio_path = Path(f"/tmp/audio_{file_id}.mp3")
    
    if not audio_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Audio file not found"
        )
    
    return FileResponse(
        path=audio_path,
        media_type="audio/mpeg",
        filename=f"summary_{file_id}.mp3"
    )