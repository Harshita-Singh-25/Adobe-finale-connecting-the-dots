# backend/services/semantic_search.py
import numpy as np
import pickle
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from sentence_transformers import SentenceTransformer
import faiss
from sklearn.metrics.pairwise import cosine_similarity
import torch
from backend.core.config import settings
from backend.services.snippet_extractor import SnippetExtractor

logger = logging.getLogger(__name__)

class SemanticSearchEngine:
    """High-performance semantic search with FAISS indexing"""
    
    def __init__(self):
        logger.info("Initializing Semantic Search Engine...")
        
        # Initialize model
        self.model = SentenceTransformer(settings.EMBEDDING_MODEL)
        self.device = 'cuda' if torch.cuda.is_available() and settings.USE_GPU else 'cpu'
        self.model.to(self.device)
        logger.info(f"Model loaded on {self.device}")
        
        # Initialize index and metadata
        self.index = None
        self.doc_metadata = {}
        self.section_metadata = []
        self.snippet_extractor = SnippetExtractor()
        
        # Initialize FAISS index
        self._initialize_index()
    
    async def initialize(self):
        """Load existing index if available"""
        index_path = settings.EMBEDDINGS_DIR / "faiss.index"
        metadata_path = settings.EMBEDDINGS_DIR / "metadata.pkl"
        
        if index_path.exists() and metadata_path.exists():
            try:
                logger.info("Loading existing FAISS index...")
                self.index = faiss.read_index(str(index_path))
                
                with open(metadata_path, 'rb') as f:
                    data = pickle.load(f)
                    self.doc_metadata = data.get('docs', {})
                    self.section_metadata = data.get('sections', [])
                
                logger.info(f"Loaded index with {len(self.section_metadata)} sections from {len(self.doc_metadata)} documents")
                
                # Verify index integrity
                if self.index.ntotal != len(self.section_metadata):
                    logger.warning(f"Index mismatch: {self.index.ntotal} vectors vs {len(self.section_metadata)} metadata entries. Rebuilding...")
                    self._rebuild_index()
                    
            except Exception as e:
                logger.error(f"Failed to load index: {e}. Creating new index...")
                self._initialize_index()
        else:
            logger.info("No existing index found. Creating new index...")
    
    def _initialize_index(self):
        """Initialize new FAISS index"""
        logger.info(f"Creating new FAISS index with dimension {settings.EMBEDDING_DIM}")
        
        # Use IndexFlatIP for inner product (normalized vectors = cosine similarity)
        self.index = faiss.IndexFlatIP(settings.EMBEDDING_DIM)
        
        # Add IVF for faster search on large datasets (optional)
        if settings.USE_GPU and torch.cuda.is_available():
            try:
                res = faiss.StandardGpuResources()
                self.index = faiss.index_cpu_to_gpu(res, 0, self.index)
                logger.info("FAISS index moved to GPU")
            except Exception as e:
                logger.warning(f"Failed to use GPU for FAISS: {e}")
    
    def _rebuild_index(self):
        """Rebuild index from metadata"""
        logger.info("Rebuilding FAISS index from metadata...")
        
        self._initialize_index()
        
        if not self.section_metadata:
            return
        
        # Re-generate embeddings for all sections
        embeddings = []
        valid_metadata = []
        
        for section in self.section_metadata:
            try:
                text = f"{section['heading']} {section['content'][:1000]}"
                embedding = self._generate_embedding(text)
                embedding = embedding / np.linalg.norm(embedding)
                embeddings.append(embedding)
                valid_metadata.append(section)
            except Exception as e:
                logger.error(f"Failed to rebuild embedding for section {section.get('section_id')}: {e}")
        
        if embeddings:
            embeddings_array = np.array(embeddings, dtype=np.float32)
            self.index.add(embeddings_array)
            self.section_metadata = valid_metadata
            logger.info(f"Rebuilt index with {len(embeddings)} sections")
            self._save_index()
    
    def add_document(self, doc_structure: Dict[str, Any]):
        """Add document sections to search index"""
        doc_id = doc_structure['doc_id']
        logger.info(f"Adding document {doc_id} to search index")
        
        # Store document metadata
        self.doc_metadata[doc_id] = {
            'title': doc_structure['title'],
            'path': doc_structure['path'],
            'pages': doc_structure['pages'],
            'metadata': doc_structure.get('metadata', {})
        }
        
        # Process sections
        embeddings = []
        new_sections = []
        
        for section in doc_structure['sections']:
            try:
                # Generate embedding for heading + content
                text = f"{section['heading']} {section['content'][:1000]}"
                embedding = self._generate_embedding(text)
                
                # Normalize for cosine similarity
                embedding = embedding / np.linalg.norm(embedding)
                embeddings.append(embedding)
                
                # Store metadata
                section_meta = {
                    'doc_id': doc_id,
                    'section_id': section['section_id'],
                    'heading': section['heading'],
                    'level': section['level'],
                    'page_num': section['page_num'],
                    'content': section['content'],
                    'start_page': section.get('start_page', section['page_num']),
                    'end_page': section.get('end_page', section['page_num'])
                }
                new_sections.append(section_meta)
                
            except Exception as e:
                logger.error(f"Failed to process section {section.get('section_id')}: {e}")
        
        # Add to FAISS index
        if embeddings:
            embeddings_array = np.array(embeddings, dtype=np.float32)
            self.index.add(embeddings_array)
            self.section_metadata.extend(new_sections)
            
            logger.info(f"Added {len(embeddings)} sections from document {doc_id}")
            logger.info(f"Total sections in index: {self.index.ntotal}")
            
            # Save index after adding
            self._save_index()
        else:
            logger.warning(f"No valid sections to add from document {doc_id}")
    
    def search_related_sections(self, selected_text: str, 
                              current_doc_id: Optional[str] = None,
                              top_k: int = 5) -> List[Dict[str, Any]]:
        """Find related sections across all documents"""
        logger.info(f"Searching for: '{selected_text[:50]}...' (top_k={top_k})")
        
        if self.index is None or self.index.ntotal == 0:
            logger.warning("Search index is empty")
            return []
        
        try:
            # Generate query embedding
            query_embedding = self._generate_embedding(selected_text)
            query_embedding = query_embedding / np.linalg.norm(query_embedding)
            query_embedding = np.array([query_embedding], dtype=np.float32)
            
            # Search with FAISS
            k = min(top_k * 3, self.index.ntotal)  # Search more to filter later
            distances, indices = self.index.search(query_embedding, k)
            
            logger.info(f"FAISS returned {len(indices[0])} results")
            
            # Process results
            results = []
            seen_sections = set()
            
            for idx, distance in zip(indices[0], distances[0]):
                if idx < 0 or idx >= len(self.section_metadata):
                    continue
                
                section = self.section_metadata[idx]
                doc_id = section['doc_id']
                
                # Skip current document if specified
                if current_doc_id and doc_id == current_doc_id:
                    continue
                
                # Skip if from same section (deduplication)
                section_key = f"{doc_id}_{section['section_id']}"
                if section_key in seen_sections:
                    continue
                seen_sections.add(section_key)
                
                # Calculate similarity score (cosine similarity from inner product)
                similarity = float(distance)
                
                # Skip if below threshold
                if similarity < settings.MIN_SIMILARITY_SCORE:
                    continue
                
                # Get document metadata
                doc_meta = self.doc_metadata.get(doc_id, {})
                
                # Extract relevant snippet
                snippet = self.snippet_extractor.extract_snippet(
                    section['content'],
                    selected_text,
                    max_sentences=settings.SNIPPET_LENGTH
                )
                
                result = {
                    'doc_id': doc_id,
                    'doc_title': doc_meta.get('title', 'Unknown'),
                    'doc_path': doc_meta.get('path', ''),
                    'section_id': section['section_id'],
                    'heading': section['heading'],
                    'level': section['level'],
                    'page_num': section['page_num'],
                    'start_page': section['start_page'],
                    'end_page': section['end_page'],
                    'snippet': snippet,
                    'similarity_score': similarity,
                    'relevance_type': self._determine_relevance_type(
                        selected_text, section['content']
                    )
                }
                
                results.append(result)
                
                if len(results) >= top_k:
                    break
            
            # Sort by relevance
            results.sort(key=lambda x: x['similarity_score'], reverse=True)
            
            logger.info(f"Returning {len(results)} related sections")
            return results[:top_k]
            
        except Exception as e:
            logger.error(f"Search failed: {e}", exc_info=True)
            return []
    
    def _generate_embedding(self, text: str) -> np.ndarray:
        """Generate embedding for text"""
        # Truncate to max length
        if len(text) > settings.MAX_SEQUENCE_LENGTH * 4:
            text = text[:settings.MAX_SEQUENCE_LENGTH * 4]
        
        # Generate embedding
        with torch.no_grad():
            embedding = self.model.encode(
                text,
                convert_to_numpy=True,
                normalize_embeddings=False,
                show_progress_bar=False
            )
        
        return embedding
    
    def _determine_relevance_type(self, query: str, content: str) -> str:
        """Determine type of relevance between texts"""
        query_lower = query.lower()
        content_lower = content.lower()
        
        # Check for direct mentions
        if query_lower in content_lower:
            return "direct_match"
        
        # Check for contradictions
        contradiction_indicators = ['however', 'but', 'contrary', 'opposite', 
                                   'disagree', 'conflict', 'whereas', 'although']
        for indicator in contradiction_indicators:
            if indicator in content_lower and any(word in content_lower for word in query_lower.split()):
                return "contradiction"
        
        # Check for examples
        example_indicators = ['for example', 'for instance', 'such as', 
                             'e.g.', 'i.e.', 'specifically', 'like']
        for indicator in example_indicators:
            if indicator in content_lower:
                return "example"
        
        # Check for extensions
        extension_indicators = ['furthermore', 'moreover', 'additionally', 
                               'extends', 'builds upon', 'also', 'further']
        for indicator in extension_indicators:
            if indicator in content_lower:
                return "extension"
        
        # Check for definitions
        if 'define' in content_lower or 'definition' in content_lower or 'means' in content_lower:
            return "definition"
        
        return "related"
    
    def _save_index(self):
        """Save FAISS index and metadata"""
        try:
            index_path = settings.EMBEDDINGS_DIR / "faiss.index"
            metadata_path = settings.EMBEDDINGS_DIR / "metadata.pkl"
            
            # Create directory if needed
            settings.EMBEDDINGS_DIR.mkdir(parents=True, exist_ok=True)
            
            # Save FAISS index
            if settings.USE_GPU and torch.cuda.is_available():
                # Transfer to CPU for saving
                cpu_index = faiss.index_gpu_to_cpu(self.index)
                faiss.write_index(cpu_index, str(index_path))
            else:
                faiss.write_index(self.index, str(index_path))
            
            # Save metadata
            with open(metadata_path, 'wb') as f:
                pickle.dump({
                    'docs': self.doc_metadata,
                    'sections': self.section_metadata
                }, f)
            
            logger.info(f"Saved index with {self.index.ntotal} vectors")
            
        except Exception as e:
            logger.error(f"Failed to save index: {e}")
    
    async def cleanup(self):
        """Cleanup resources"""
        self._save_index()
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get search engine statistics"""
        return {
            'total_documents': len(self.doc_metadata),
            'total_sections': len(self.section_metadata),
            'index_size': self.index.ntotal if self.index else 0,
            'embedding_dim': settings.EMBEDDING_DIM,
            'model': settings.EMBEDDING_MODEL
        }