# backend/services/snippet_extractor.py
import re
import nltk
from typing import List, Tuple, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)

class SnippetExtractor:
    """Extract relevant snippets from text sections"""
    
    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            max_features=100,
            stop_words='english',
            ngram_range=(1, 2)
        )
    
    def extract_snippet(self, content: str, query: str, 
                       max_sentences: int = 3) -> str:
        """Extract most relevant snippet from content based on query"""
        # Split into sentences
        sentences = self._split_sentences(content)
        
        if len(sentences) <= max_sentences:
            return content
        
        # Score sentences
        scored_sentences = self._score_sentences(sentences, query)
        
        # Get top sentences
        top_indices = self._get_top_consecutive_sentences(
            scored_sentences, max_sentences
        )
        
        # Build snippet
        snippet = " ".join([sentences[i] for i in top_indices])
        
        # Add ellipsis if needed
        if top_indices[0] > 0:
            snippet = "..." + snippet
        if top_indices[-1] < len(sentences) - 1:
            snippet = snippet + "..."
        
        return snippet
    
    def _split_sentences(self, text: str) -> List[str]:
        """Split text into sentences"""
        # Use NLTK for better sentence splitting
        sentences = nltk.sent_tokenize(text)
        
        # Clean sentences
        cleaned = []
        for sent in sentences:
            sent = sent.strip()
            if len(sent) > 20:  # Filter out too short sentences
                cleaned.append(sent)
        
        return cleaned
    
    def _score_sentences(self, sentences: List[str], query: str) -> List[Tuple[int, float]]:
        """Score sentences based on relevance to query"""
        if not sentences:
            return []
        
        # Combine query and sentences for vectorization
        texts = [query] + sentences
        
        try:
            # Create TF-IDF matrix
            tfidf_matrix = self.vectorizer.fit_transform(texts)
            
            # Calculate similarity between query and each sentence
            query_vector = tfidf_matrix[0:1]
            similarities = cosine_similarity(query_vector, tfidf_matrix[1:]).flatten()
            
            # Create scored list
            scored = [(i, float(similarities[i])) for i in range(len(sentences))]
            
        except Exception:
            # Fallback to keyword matching
            scored = []
            query_words = set(query.lower().split())
            
            for i, sent in enumerate(sentences):
                sent_words = set(sent.lower().split())
                overlap = len(query_words.intersection(sent_words))
                score = overlap / max(len(query_words), 1)
                scored.append((i, score))
        
        return scored
    
    def _get_top_consecutive_sentences(self, scored_sentences: List[Tuple[int, float]], 
                                      max_sentences: int) -> List[int]:
        """Get top consecutive sentences with highest combined score"""
        if not scored_sentences:
            return []
        
        # Sort by score
        sorted_sentences = sorted(scored_sentences, key=lambda x: x[1], reverse=True)
        
        # Get top sentence index
        top_idx = sorted_sentences[0][0]
        
        # Build consecutive range around top sentence
        indices = [top_idx]
        
        # Add sentences before and after
        for i in range(1, max_sentences):
            if len(indices) >= max_sentences:
                break
            
            # Try adding before
            if top_idx - i >= 0 and (top_idx - i) not in indices:
                indices.insert(0, top_idx - i)
            
            if len(indices) >= max_sentences:
                break
            
            # Try adding after
            if top_idx + i < len(scored_sentences) and (top_idx + i) not in indices:
                indices.append(top_idx + i)
        
        return sorted(indices)