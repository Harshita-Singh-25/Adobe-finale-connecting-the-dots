# backend/services/semantic_search.py
import numpy as np
import pickle
import json
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from sentence_transformers import SentenceTransformer
import faiss
from sklearn.metrics.pairwise import cosine_similarity
import torch
import time
import logging

from backend.core.config import settings
from backend.services.snippet_extractor import SnippetExtractor

logger = logging.getLogger(__name__)

class SemanticSearchEngine:
    """High-performance semantic search with FAISS indexing"""
    
    def __init__(self):
        self.model = None
        self.index = None
        self.doc_metadata = {}
        self.section_metadata = []
        self.snippet_extractor = SnippetExtractor()
        self.device = 'cuda' if torch.cuda.is_available() and settings.USE_GPU else 'cpu'
        self.initialized = False
        
        logger.info(f"SemanticSearchEngine initializing with device: {self.device}")
    
    async def initialize(self):
        """Initialize the search engine and load model"""
        try:
            logger.info("Loading sentence transformer model...")
            self.model = SentenceTransformer(settings.EMBEDDING_MODEL)
            self.model.to(self.device)
            
            # Initialize FAISS index
            self._initialize_index()
            
            # Try to load existing index
            await self._load_existing_index()
            
            self.initialized = True
            logger.info(f"SemanticSearchEngine initialized successfully with {len(self.section_metadata)} sections")
            
        except Exception as e:
            logger.error(f"Failed to initialize SemanticSearchEngine: {e}")
            # Fallback initialization
            self._initialize_index()
            self.initialized = True
    
    def _initialize_index(self):
        """Initialize new FAISS index"""
        # Use IndexFlatIP for inner product (normalized vectors = cosine similarity)
        self.index = faiss.IndexFlatIP(settings.EMBEDDING_DIM)
        logger.info(f"Initialized FAISS index with dimension {settings.EMBEDDING_DIM}")
    
    async def _load_existing_index(self):
        """Load existing index if available"""
        index_path = settings.EMBEDDINGS_DIR / "faiss.index"
        metadata_path = settings.EMBEDDINGS_DIR / "metadata.pkl"
        
        if index_path.exists() and metadata_path.exists():
            try:
                self.index = faiss.read_index(str(index_path))
                with open(metadata_path, 'rb') as f:
                    data = pickle.load(f)
                    self.doc_metadata = data['docs']
                    self.section_metadata = data['sections']
                logger.info(f"Loaded existing index with {len(self.section_metadata)} sections")
            except Exception as e:
                logger.warning(f"Failed to load existing index: {e}")
                self._initialize_index()
    
    def add_document(self, doc_structure: Dict[str, Any]):
        """Add document sections to search index"""
        if not self.initialized:
            logger.warning("SemanticSearchEngine not initialized, initializing now...")
            self._sync_initialize()
        
        doc_id = doc_structure['doc_id']
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
                text_to_embed = f"{section['heading']} {section['content'][:1500]}"  # Limit content length
                embedding = self._generate_embedding(text_to_embed)
                
                if embedding is not None:
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
                logger.error(f"Error processing section {section.get('heading', 'Unknown')}: {e}")
                continue
        
        # Add to FAISS index
        if embeddings:
            embeddings_array = np.array(embeddings, dtype=np.float32)
            self.index.add(embeddings_array)
            self.section_metadata.extend(new_sections)
            logger.info(f"Added {len(embeddings)} sections to search index")
        
        # Save index
        self._save_index()
    
    def _sync_initialize(self):
        """Synchronous fallback initialization"""
        try:
            logger.info("Performing sync initialization...")
            self.model = SentenceTransformer(settings.EMBEDDING_MODEL)
            self.model.to(self.device)
            self._initialize_index()
            self.initialized = True
            logger.info("Sync initialization completed")
        except Exception as e:
            logger.error(f"Sync initialization failed: {e}")
            self.initialized = False
    
    def search_related_sections(self, selected_text: str, 
                              current_doc_id: Optional[str] = None,
                              top_k: int = 5) -> List[Dict[str, Any]]:
        """Find related sections across all documents"""
        if not self.initialized:
            logger.error("Search engine not initialized!")
            return []
            
        if self.index is None or self.index.ntotal == 0:
            logger.warning("No documents in search index!")
            return []
        
        logger.info(f"Searching for: '{selected_text[:50]}...' across {self.index.ntotal} sections")
        
        try:
            # Generate query embedding
            query_embedding = self._generate_embedding(selected_text)
            if query_embedding is None:
                logger.error("Failed to generate query embedding")
                return []
                
            query_embedding = query_embedding / np.linalg.norm(query_embedding)
            query_embedding = np.array([query_embedding], dtype=np.float32)
            
            # Search with FAISS
            k = min(top_k * 3, self.index.ntotal)  # Search more to filter later
            distances, indices = self.index.search(query_embedding, k)
            
            logger.info(f"FAISS search returned {len(indices[0])} results")
            
            # Process results
            results = []
            seen_sections = set()
            
            for idx, distance in zip(indices[0], distances[0]):
                if idx < 0 or idx >= len(self.section_metadata):
                    continue
                
                section = self.section_metadata[idx]
                doc_id = section['doc_id']
                
                # Skip if from same section
                section_key = f"{doc_id}_{section['section_id']}"
                if section_key in seen_sections:
                    continue
                    
                # Optionally skip sections from current document
                if current_doc_id and doc_id == current_doc_id:
                    continue
                    
                seen_sections.add(section_key)
                
                # Calculate similarity score (cosine similarity from inner product)
                similarity = float(distance)
                
                logger.debug(f"Section: {section['heading'][:50]} - Score: {similarity:.3f}")
                
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
                
                results.append({
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
                })
                
                if len(results) >= top_k:
                    break
            
            # Sort by relevance
            results.sort(key=lambda x: x['similarity_score'], reverse=True)
            
            logger.info(f"Returning {len(results)} relevant sections")
            return results[:top_k]
            
        except Exception as e:
            logger.error(f"Search error: {e}")
            return []
    
    def _generate_embedding(self, text: str) -> Optional[np.ndarray]:
        """Generate embedding for text"""
        if not self.model:
            logger.error("Model not loaded!")
            return None
            
        try:
            # Truncate to max length
            if len(text) > settings.MAX_SEQUENCE_LENGTH * 4:
                text = text[:settings.MAX_