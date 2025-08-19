# backend/api/routes/selection.py
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Optional, List
import time

from backend.services.semantic_search import SemanticSearchEngine
from backend.services.document_indexer import DocumentIndexer
from backend.services.cache_manager import CacheManager
from backend.core.config import settings
from backend.models.schemas import (
    SelectionRequest, RelatedSectionsResponse,
    RelatedSection
)

router = APIRouter()

# Get service instances
search_engine = SemanticSearchEngine()
indexer = DocumentIndexer()
cache_manager = CacheManager()

@router.post("/related", response_model=RelatedSectionsResponse)
async def find_related_sections(request: SelectionRequest):
    """Find related sections based on text selection"""
    start_time = time.time()
    
    # Validate input
    if not request.selected_text or len(request.selected_text) < 10:
        raise HTTPException(
            status_code=400,
            detail="Selected text must be at least 10 characters"
        )
    
    # Check cache
    query_hash = cache_manager.get_query_hash(
        request.selected_text, 
        request.current_doc_id
    )
    
    cached_results = await cache_manager.get_cached_search(query_hash)
    if cached_results:
        return RelatedSectionsResponse(
            selected_text=request.selected_text,
            current_doc_id=request.current_doc_id,
            related_sections=cached_results,
            processing_time=0.01,
            from_cache=True
        )
    
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
            section_id=result['section_id'],
            heading=result['heading'],
            level=result['level'],
            page_num=result['page_num'],
            start_page=result['start_page'],
            end_page=result['end_page'],
            snippet=result['snippet'],
            similarity_score=result['similarity_score'],
            relevance_type=result['relevance_type'],
            doc_path=result['doc_path']
        )
        related_sections.append(section)
    
    # Cache results
    await cache_manager.cache_search(query_hash, related_sections)
    
    processing_time = time.time() - start_time
    
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
    page_num: Optional[int] = None
):
    """Get navigation information for a specific section"""
    section = indexer.get_section(doc_id, section_id)
    
    if not section:
        raise HTTPException(
            status_code=404,
            detail=f"Section {section_id} not found"
        )
    
    doc = indexer.get_document(doc_id)
    if not doc:
        raise HTTPException(
            status_code=404,
            detail=f"Document {doc_id} not found"
        )
    
    # Return navigation data
    return {
        "doc_id": doc_id,
        "doc_path": doc['path'],
        "section_id": section_id,
        "page_num": page_num or section['page_num'],
        "heading": section['heading'],
        "start_page": section.get('start_page', section['page_num']),
        "end_page": section.get('end_page', section['page_num']),
        "scroll_to": {
            "page": section['page_num'],
            "x": 0,
            "y": 100  # Approximate Y position
        }
    }

# @router.get("/context/{doc_id}/{section_id}")
# async def get_section_context(
#     doc_id: str,
#     section_id: str,
#     context_size: int = Query(default=2, ge=0, le=5)
# ):
#     """Get section with surrounding context"""
#     doc = indexer.get_document(doc_id)
    
#     if not doc:
#         raise HTTPException(
#             status_code=404,
#             detail=f"Document {doc_id} not found"
#         )
    
#     # Find section index
#     section_idx = None
#     for i, section in enumerate(doc['sections']):




# backend/api/routes/selection.py (continued)

@router.post("/insights")
async def generate_insights(request: SelectionRequest):
    """Generate insights from selected text and related sections"""
    from backend.utils.chat_with_llm import LLMClient
    
    # First find related sections
    related_response = await find_related_sections(request)
    
    if not related_response.related_sections:
        return JSONResponse(
            content={
                "selected_text": request.selected_text,
                "insights": [],
                "error": "No related sections found"
            }
        )
    
    # Generate insights using LLM
    llm_client = LLMClient()
    insights = await llm_client.generate_insights(
        request.selected_text,
        related_response.related_sections
    )
    
    return {
        "selected_text": request.selected_text,
        "related_sections": related_response.related_sections,
        "insights": insights
    }

@router.post("/audio")
async def generate_audio_summary(request: SelectionRequest):
    """Generate audio summary from selected text and related sections"""
    from backend.utils.generate_audio import AudioGenerator
    
    # First find related sections
    related_response = await find_related_sections(request)
    
    if not related_response.related_sections:
        return JSONResponse(
            status_code=404,
            content={
                "error": "No related sections found to generate audio"
            }
        )
    
    # Generate summary text
    summary_text = "\n".join([
        f"From {section.doc_title}, section {section.heading}: {section.snippet}"
        for section in related_response.related_sections
    ])
    
    # Generate audio
    audio_generator = AudioGenerator()
    audio_path = await audio_generator.generate_audio(
        f"Summary of related content for: {request.selected_text}\n\n{summary_text}"
    )
    
    return {
        "audio_path": audio_path,
        "duration_seconds": audio_generator.get_audio_duration(audio_path)
    }