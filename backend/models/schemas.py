# backend/models/schemas.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class DocumentSummary(BaseModel):
    doc_id: str
    title: str
    pages: int
    sections: int
    path: str
    is_fresh: bool = False

class SectionInfo(BaseModel):
    section_id: str
    heading: str
    level: str
    page_num: int
    word_count: Optional[int] = None

class DocumentResponse(BaseModel):
    doc_id: str
    title: str
    pages: int
    sections: int
    path: str
    is_fresh: bool = False
    metadata: Optional[Dict[str, Any]] = None
    outline: Optional[List[SectionInfo]] = None

class BulkUploadResponse(BaseModel):
    success: bool
    message: str
    documents: List[DocumentSummary]
    failed: List[Dict[str, str]]
    processing_time: float

class DocumentListResponse(BaseModel):
    documents: List[DocumentSummary]
    total: int

class SectionResponse(BaseModel):
    section_id: str
    doc_id: str
    heading: str
    level: str
    content: str
    page_num: int
    start_page: Optional[int] = None
    end_page: Optional[int] = None
    word_count: Optional[int] = None

class RelatedSection(BaseModel):
    doc_id: str
    doc_title: str
    doc_path: str
    section_id: str
    heading: str
    level: str
    page_num: int
    start_page: int
    end_page: int
    snippet: str
    similarity_score: float = Field(..., ge=0.0, le=1.0)
    relevance_type: str

class TextSelectionRequest(BaseModel):
    selected_text: str = Field(..., min_length=5)
    doc_id: Optional[str] = None
    context_before: Optional[str] = None
    context_after: Optional[str] = None
    page_num: Optional[int] = None

class TextSelectionResponse(BaseModel):
    query_text: str
    related_sections: List[RelatedSection]
    total_found: int
    processing_time: float

class NavigationInfo(BaseModel):
    page_to_navigate: int
    heading_text: str
    section_start: Optional[int] = None
    section_end: Optional[int] = None

class SectionLocationResponse(BaseModel):
    doc_id: str
    doc_title: str
    doc_path: str
    section_id: str
    heading: str
    page_num: int
    start_page: int
    end_page: int
    content: str
    navigation_info: NavigationInfo

class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    timestamp: datetime

class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    app_name: str
    version: str

class SystemStatus(BaseModel):
    status: str
    timestamp: datetime
    system: Dict[str, Any]
    services: Dict[str, Any]
    storage: Dict[str, Any]
    configuration: Dict[str, Any]

class MetricsResponse(BaseModel):
    documents: Dict[str, Any]
    search: Dict[str, Any]
    performance: Dict[str, Any]

class BatchSelectionRequest(BaseModel):
    selections: List[TextSelectionRequest] = Field(..., max_items=10)

class BatchResult(BaseModel):
    query: str
    success: bool
    data: Optional[TextSelectionResponse] = None
    error: Optional[str] = None

class BatchSelectionResponse(BaseModel):
    batch_results: List[BatchResult]
    total_processed: int
    successful: int

class SelectionRequest(BaseModel):
    selected_text: str = Field(..., min_length=5)
    current_doc_id: Optional[str] = None
    context_before: Optional[str] = None
    context_after: Optional[str] = None
    page_num: Optional[int] = None

class RelatedSectionsResponse(BaseModel):
    selected_text: str
    current_doc_id: Optional[str]
    related_sections: List[RelatedSection]
    processing_time: float
    from_cache: bool = False