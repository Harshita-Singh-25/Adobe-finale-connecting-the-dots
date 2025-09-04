# backend/services/document_indexer.py
import asyncio
import json
import shutil
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
import hashlib
from concurrent.futures import ThreadPoolExecutor

from backend.services.pdf_processor import PDFProcessor
from backend.services.cache_manager import CacheManager
from backend.core.config import settings

class DocumentIndexer:
    """Manages document indexing and processing pipeline"""
    
    def __init__(self):
        self.pdf_processor = PDFProcessor()
        self.cache_manager = CacheManager()
        self.executor = ThreadPoolExecutor(max_workers=settings.NUM_WORKERS)
        self.indexed_docs = {}
        self.processing_queue = asyncio.Queue()
        self._load_index()
    
    async def initialize(self):
        """Initialize indexer and load existing documents"""
        # Load previously indexed documents
        existing_docs = list(settings.PROCESSED_DIR.glob("*.json"))
        
        for doc_path in existing_docs:
            try:
                with open(doc_path, 'r') as f:
                    doc_data = json.load(f)
                    
                    # Fix path if it's pointing to temp directory
                    if 'AppData\\Local\\Temp' in doc_data.get('path', '') or 'tmp' in doc_data.get('path', ''):
                        doc_id = doc_data['doc_id']
                        correct_path = settings.UPLOAD_DIR / f"{doc_id}.pdf"
                        if correct_path.exists():
                            doc_data['path'] = str(correct_path)
                            # Save the corrected data
                            with open(doc_path, 'w') as f:
                                json.dump(doc_data, f, indent=2)
                            print(f"Fixed path for document: {doc_data['title']}")
                    
                    self.indexed_docs[doc_data['doc_id']] = doc_data
                    print(f"Loaded indexed document: {doc_data['title']}")
            except Exception as e:
                print(f"Failed to load {doc_path}: {e}")
    
    async def process_bulk_upload(self, pdf_files: List[Path]) -> Dict[str, Any]:
        """Process multiple PDFs (past documents)"""
        results = {
            'successful': [],
            'failed': [],
            'total_time': 0
        }
        
        start_time = datetime.now()
        
        # Process in parallel with asyncio
        tasks = []
        for pdf_file in pdf_files[:settings.MAX_UPLOAD_FILES]:
            task = self._process_single_document(pdf_file)
            tasks.append(task)
        
        # Wait for all processing
        processed = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Collect results
        for i, result in enumerate(processed):
            if isinstance(result, Exception):
                results['failed'].append({
                    'file': str(pdf_files[i].name),
                    'error': str(result)
                })
            else:
                results['successful'].append(result)
        
        results['total_time'] = (datetime.now() - start_time).total_seconds()
        
        return results
    
    async def process_fresh_document(self, pdf_file: Path) -> Dict[str, Any]:
        """Process a new document (current reading document)"""
        return await self._process_single_document(pdf_file, is_fresh=True)
    
    async def _process_single_document(self, pdf_file: Path, 
                                      is_fresh: bool = False) -> Dict[str, Any]:
        """Process a single PDF document"""
        try:
            # Check if already processed
            doc_hash = self._get_file_hash(pdf_file)
            cached_result = await self.cache_manager.get_cached_document(doc_hash)
            
            if cached_result and not is_fresh:
                print(f"Using cached result for {pdf_file.name}")
                return cached_result
            
            # Process PDF in thread pool (CPU-bound task)
            loop = asyncio.get_event_loop()
            doc_structure = await loop.run_in_executor(
                self.executor,
                self.pdf_processor.extract_document_structure,
                pdf_file
            )
            
            # Save processed document
            doc_id = doc_structure['doc_id']
            
            # Copy PDF to uploads directory
            upload_path = settings.UPLOAD_DIR / f"{doc_id}.pdf"
            if not upload_path.exists():
                shutil.copy2(pdf_file, upload_path)
            
            # Update the document structure with the correct upload path
            doc_structure['path'] = str(upload_path)
            
            # Save processed structure
            processed_path = settings.PROCESSED_DIR / f"{doc_id}.json"
            with open(processed_path, 'w') as f:
                json.dump(doc_structure, f, indent=2)
            
            # Update index
            self.indexed_docs[doc_id] = doc_structure
            
            # Cache result
            await self.cache_manager.cache_document(doc_hash, doc_structure)
            
            # Return summary
            return {
                'doc_id': doc_id,
                'title': doc_structure['title'],
                'pages': doc_structure['pages'],
                'sections': len(doc_structure['sections']),
                'path': str(upload_path),
                'is_fresh': is_fresh,
                'processed_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"Error processing {pdf_file.name}: {e}")
            raise
    
    def get_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """Get processed document by ID"""
        return self.indexed_docs.get(doc_id)
    
    def get_all_documents(self) -> List[Dict[str, Any]]:
        """Get all indexed documents"""
        return list(self.indexed_docs.values())
    
    def get_section(self, doc_id: str, section_id: str) -> Optional[Dict[str, Any]]:
        """Get specific section from document"""
        doc = self.indexed_docs.get(doc_id)
        if not doc:
            return None
        
        for section in doc['sections']:
            if section['section_id'] == section_id:
                return section
        
        return None
    
    def _get_file_hash(self, file_path: Path) -> str:
        """Generate hash of file content"""
        hasher = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b''):
                hasher.update(chunk)
        return hasher.hexdigest()
    
    def _load_index(self):
        """Load document index from disk"""
        index_file = settings.DATA_DIR / "document_index.json"
        if index_file.exists():
            try:
                with open(index_file, 'r') as f:
                    self.indexed_docs = json.load(f)
            except Exception as e:
                print(f"Failed to load index: {e}")
                self.indexed_docs = {}
    
    def _save_index(self):
        """Save document index to disk"""
        index_file = settings.DATA_DIR / "document_index.json"
        try:
            # Create summary index
            index_data = {}
            for doc_id, doc in self.indexed_docs.items():
                index_data[doc_id] = {
                    'title': doc['title'],
                    'pages': doc['pages'],
                    'sections': len(doc['sections']),
                    'path': doc['path']
                }
            
            with open(index_file, 'w') as f:
                json.dump(index_data, f, indent=2)
        except Exception as e:
            print(f"Failed to save index: {e}")
    
    async def cleanup(self):
        """Cleanup resources"""
        self._save_index()
        self.executor.shutdown(wait=True)
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get indexing statistics"""
        total_sections = sum(len(doc['sections']) for doc in self.indexed_docs.values())
        total_pages = sum(doc['pages'] for doc in self.indexed_docs.values())
        
        return {
            'total_documents': len(self.indexed_docs),
            'total_sections': total_sections,
            'total_pages': total_pages,
            'average_sections_per_doc': total_sections / max(len(self.indexed_docs), 1),
            'average_pages_per_doc': total_pages / max(len(self.indexed_docs), 1)
        }