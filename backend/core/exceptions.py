# backend/core/exceptions.py
from typing import Any, Dict, Optional

class DocumentProcessingError(Exception):
    """Exception raised during document processing"""
    
    def __init__(self, message: str, doc_id: Optional[str] = None, 
                 details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.doc_id = doc_id
        self.details = details or {}
        super().__init__(self.message)

class SearchEngineError(Exception):
    """Exception raised during search operations"""
    
    def __init__(self, message: str, query: Optional[str] = None,
                 details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.query = query
        self.details = details or {}
        super().__init__(self.message)

class PDFProcessingError(Exception):
    """Exception raised during PDF processing"""
    
    def __init__(self, message: str, file_path: Optional[str] = None,
                 page_num: Optional[int] = None):
        self.message = message
        self.file_path = file_path
        self.page_num = page_num
        super().__init__(self.message)

class EmbeddingError(Exception):
    """Exception raised during embedding generation"""
    
    def __init__(self, message: str, text: Optional[str] = None):
        self.message = message
        self.text = text
        super().__init__(self.message)

class CacheError(Exception):
    """Exception raised during cache operations"""
    
    def __init__(self, message: str, cache_key: Optional[str] = None):
        self.message = message
        self.cache_key = cache_key
        super().__init__(self.message)

class ValidationError(Exception):
    """Exception raised during data validation"""
    
    def __init__(self, message: str, field: Optional[str] = None, 
                 value: Optional[Any] = None):
        self.message = message
        self.field = field
        self.value = value
        super().__init__(self.message)