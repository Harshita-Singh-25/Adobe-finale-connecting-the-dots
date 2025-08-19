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
from backend.core.config import settings
from backend.services.snippet_extractor import SnippetExtractor

class SemanticSearchEngine:
    """High-performance semantic search with FAISS indexing"""
    
    def __init__(self):
        self.model = SentenceTransformer(settings.EMBEDDING_MODEL)
        self.index = None
        self.doc_metadata = {}
        self.section_metadata = []
        self.snippet_extractor = SnippetExtractor()
        self.device = 'cuda' if torch.cuda.is_available() and settings.USE_GPU else 'cpu'
        self.model.to(self.device)
        
        # Initialize FAISS index
        self._initialize_index()
    
    async def initialize(self):
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
                print(f"Loaded index with {len(self.section_metadata)} sections")
            except Exception as e:
                print(f"Failed to load index: {e}")
                self._initialize_index()
    
    def _initialize_index(self):
        """Initialize new FAISS index"""
        # Use IndexFlatIP for inner product (normalized vectors = cosine similarity)
        self.index = faiss.IndexFlatIP(settings.EMBEDDING_DIM)
        
        # Add IVF for faster search on large datasets
        if settings.USE_GPU and torch.cuda.is_available():
            res = faiss.StandardGpuResources()
            self.index = faiss.index_cpu_to_gpu(res, 0, self.index)
    
    def add_document(self, doc_structure: Dict[str, Any]):
        """Add document sections to search index"""
        doc_id = doc_structure['doc_id']
        self.doc_metadata[doc_id] = {
            'title': doc_structure['title'],
            'path': doc_structure['path'],
            'pages': doc_structure['pages'],
            'metadata': doc_structure.get('metadata', {})
        }
        
        # Process sections
        embeddings = []
        for section in doc_structure['sections']:
            # Generate embedding for heading + content
            text = f"{section['heading']} {section['content'][:1000]}"
            embedding = self._generate_embedding(text)
            
            # Normalize for cosine similarity
            embedding = embedding / np.linalg.norm(embedding)
            embeddings.append(embedding)
            
            # Store metadata
            self.section_metadata.append({
                'doc_id': doc_id,
                'section_id': section['section_id'],
                'heading': section['heading'],
                'level': section['level'],
                'page_num': section['page_num'],
                'content': section['content'],
                'start_page': section.get('start_page', section['page_num']),
                'end_page': section.get('end_page', section['page_num'])
            })
        
        # Add to FAISS index
        if embeddings:
            embeddings_array = np.array(embeddings, dtype=np.float32)
            self.index.add(embeddings_array)
        
        # Save index
        self._save_index()
    
    def search_related_sections(self, selected_text: str, 
                              current_doc_id: Optional[str] = None,
                              top_k: int = 5) -> List[Dict[str, Any]]:
        """Find related sections across all documents"""
        if self.index.ntotal == 0:
            return []
        
        # Generate query embedding
        query_embedding = self._generate_embedding(selected_text)
        query_embedding = query_embedding / np.linalg.norm(query_embedding)
        query_embedding = np.array([query_embedding], dtype=np.float32)
        
        # Search with FAISS
        k = min(top_k * 2, self.index.ntotal)  # Search more to filter later
        distances, indices = self.index.search(query_embedding, k)
        
        # Process results
        results = []
        seen_sections = set()
        
        for idx, distance in zip(indices[0], distances[0]):
            if idx < 0 or idx >= len(self.section_metadata):
                continue
            
            section = self.section_metadata[idx]
            doc_id = section['doc_id']
            
            # Skip if from same section
            section_key = f"{doc_id}_{section['heading']}"
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

            print(f"\nSearching for: '{selected_text}'")
            print(f"Total sections in index: {self.index.ntotal}")

            if distances is not None:
                print("Top raw matches:")
                for i, (idx, score) in enumerate(zip(indices[0], distances[0])):
                    section = self.section_metadata[idx]
                    print(f"{i+1}. {section['heading']} (score: {score:.3f})")

            
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
        
        return results[:top_k]
    
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
        
        # Check for contradictions
        contradiction_indicators = ['however', 'but', 'contrary', 'opposite', 
                                   'disagree', 'conflict', 'whereas']
        for indicator in contradiction_indicators:
            if indicator in content_lower:
                return "contradiction"
        
        # Check for examples
        example_indicators = ['for example', 'for instance', 'such as', 
                             'e.g.', 'i.e.', 'specifically']
        for indicator in example_indicators:
            if indicator in content_lower:
                return "example"
        
        # Check for extensions
        extension_indicators = ['furthermore', 'moreover', 'additionally', 
                               'extends', 'builds upon']
        for indicator in extension_indicators:
            if indicator in content_lower:
                return "extension"
        
        return "related"
    
    def _save_index(self):
        """Save FAISS index and metadata"""
        try:
            index_path = settings.EMBEDDINGS_DIR / "faiss.index"
            metadata_path = settings.EMBEDDINGS_DIR / "metadata.pkl"
            
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
        except Exception as e:
            print(f"Failed to save index: {e}")
    
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