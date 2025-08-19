# backend/services/document_indexer.py
import json
import uuid
import asyncio
from pathlib import Path
from typing import Dict, List, Optional, Any
import time
import logging
from datetime import datetime

from backend.core.config import settings
from backend.services.pdf_processor import PDFProcessor
from backend.utils.text_processing import TextProcessor

logger = logging.getLogger(__name__)

class DocumentIndexer:
    def __init__(self):
        self.indexed_docs: Dict[str, Dict] = {}
        self.pdf_processor = PDFProcessor()
        self.text_processor = TextProcessor()
        self.index_file = settings.PROCESSED_DIR / "document_index.json"
        self.load_index()
    
    async def initialize(self):
        """Initialize the document indexer"""
        # Load any existing processed documents
        self.load_index()
        print(f"DocumentIndexer initialized with {len(self.indexed_docs)} documents")
    
    async def cleanup(self):
        """Cleanup and save index"""
        self.save_index()
    
    def load_index(self):
        """Load existing document index from file"""
        try:
            if self.index_file.exists():
                with open(self.index_file, 'r', encoding='utf-8') as f:
                    self.indexed_docs = json.load(f)
                logger.info(f"Loaded {len(self.indexed_docs)} documents from index")
            else:
                self.indexed_docs = {}
                logger.info("No existing index found, starting fresh")
        except Exception as e:
            logger.error(f"Error loading index: {e}")
            self.indexed_docs = {}
    
    def save_index(self):
        """Save document index to file"""
        try:
            with open(self.index_file, 'w', encoding='utf-8') as f:
                json.dump(self.indexed_docs, f, indent=2, ensure_ascii=False)
            logger.info(f"Saved index with {len(self.indexed_docs)} documents")
        except Exception as e:
            logger.error(f"Error saving index: {e}")
    
    async def process_bulk_upload(self, file_paths: List[Path]) -> Dict[str, Any]:
        """Process multiple PDF files for bulk upload"""
        start_time = time.time()
        successful = []
        failed = []
        
        for file_path in file_paths:
            try:
                result = await self._process_single_document(file_path, is_fresh=False)
                successful.append({
                    'doc_id': result['doc_id'],
                    'title': result['title'],
                    'pages': result['pages'],
                    'sections': len(result['sections']),
                    'path': str(result['path'])
                })
                logger.info(f"Successfully processed: {result['title']}")
                
            except Exception as e:
                logger.error(f"Failed to process {file_path.name}: {e}")
                failed.append({
                    'filename': file_path.name,
                    'error': str(e)
                })
        
        # Save updated index
        self.save_index()
        
        total_time = time.time() - start_time
        
        return {
            'successful': successful,
            'failed': failed,
            'total_time': total_time
        }
    
    async def process_fresh_document(self, file_path: Path) -> Dict[str, Any]:
        """Process a single fresh document"""
        result = await self._process_single_document(file_path, is_fresh=True)
        self.save_index()
        return result
    
    async def _process_single_document(self, file_path: Path, is_fresh: bool = False) -> Dict[str, Any]:
        """Process a single PDF document"""
        doc_id = str(uuid.uuid4())
        
        # Extract PDF content
        pdf_data = await self.pdf_processor.extract_pdf_content(file_path)
        
        # Process sections and add snippets
        sections = []
        for section_data in pdf_data['sections']:
            section_id = str(uuid.uuid4())
            
            # Clean content
            content = self.text_processor.clean_text(section_data['content'])
            
            # Extract snippets from content
            snippets = self.text_processor.extract_snippets(
                content,
                max_sentences=settings.SNIPPET_LENGTH
            )
            
            section = {
                'section_id': section_id,
                'doc_id': doc_id,
                'heading': section_data['heading'],
                'level': section_data['level'],
                'content': content,
                'page_num': section_data['page_num'],
                'start_page': section_data.get('start_page', section_data['page_num']),
                'end_page': section_data.get('end_page', section_data['page_num']),
                'snippets': snippets,
                'word_count': len(content.split())
            }
            sections.append(section)
        
        # Copy file to uploads directory
        final_path = settings.UPLOAD_DIR / f"{doc_id}_{file_path.name}"
        import shutil
        shutil.copy2(file_path, final_path)
        
        # Store document
        document = {
            'doc_id': doc_id,
            'title': pdf_data['title'],
            'pages': pdf_data['pages'],
            'sections': sections,
            'path': str(final_path),
            'is_fresh': is_fresh,
            'metadata': pdf_data.get('metadata', {}),
            'created_at': datetime.now().isoformat(),
            'processed_at': datetime.now().isoformat()
        }
        
        self.indexed_docs[doc_id] = document
        
        # Save individual document file
        doc_file = settings.PROCESSED_DIR / f"{doc_id}.json"
        with open(doc_file, 'w', encoding='utf-8') as f:
            json.dump(document, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Processed document: {document['title']} with {len(sections)} sections")
        
        return document
    
    def get_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """Get document by ID"""
        return self.indexed_docs.get(doc_id)
    
    def get_all_documents(self) -> List[Dict[str, Any]]:
        """Get all indexed documents"""
        return list(self.indexed_docs.values())
    
    def get_section(self, doc_id: str, section_id: str) -> Optional[Dict[str, Any]]:
        """Get specific section from document"""
        doc = self.get_document(doc_id)
        if not doc:
            return None
        
        for section in doc['sections']:
            if section['section_id'] == section_id:
                return section
        
        return None
    
    def get_all_sections(self) -> List[Dict[str, Any]]:
        """Get all sections from all documents"""
        all_sections = []
        for doc in self.indexed_docs.values():
            for section in doc['sections']:
                section_copy = section.copy()
                section_copy['doc_title'] = doc['title']
                section_copy['doc_path'] = doc['path']
                all_sections.append(section_copy)
        return all_sections
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get indexer statistics"""
        total_docs = len(self.indexed_docs)
        total_sections = sum(len(doc['sections']) for doc in self.indexed_docs.values())
        total_pages = sum(doc['pages'] for doc in self.indexed_docs.values())
        
        return {
            'total_documents': total_docs,
            'total_sections': total_sections,
            'total_pages': total_pages,
            'index_file_exists': self.index_file.exists(),
            'last_updated': datetime.now().isoformat()
        }