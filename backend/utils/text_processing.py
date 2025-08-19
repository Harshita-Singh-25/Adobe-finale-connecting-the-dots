# backend/utils/text_processing.py
import re
import nltk
from typing import List, Dict, Any
from pathlib import Path

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)

class TextProcessor:
    """Text processing utilities for document analysis"""
    
    def __init__(self):
        pass
    
    def extract_snippets(self, text: str, max_sentences: int = 3) -> List[str]:
        """Extract meaningful snippets from text"""
        try:
            sentences = nltk.sent_tokenize(text)
            
            # Clean sentences
            clean_sentences = []
            for sent in sentences:
                sent = sent.strip()
                if len(sent) > 20:  # Filter out too short sentences
                    clean_sentences.append(sent)
            
            # Return first few sentences as snippets
            if len(clean_sentences) <= max_sentences:
                return clean_sentences
            
            # Take first few sentences
            snippets = clean_sentences[:max_sentences]
            
            return snippets
            
        except Exception as e:
            print(f"Error extracting snippets: {e}")
            # Fallback: split by periods
            sentences = text.split('.')
            clean_sentences = [s.strip() + '.' for s in sentences if len(s.strip()) > 20]
            return clean_sentences[:max_sentences]
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove special characters
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', text)
        
        # Remove page numbers and headers/footers
        lines = text.split('\n')
        cleaned_lines = []
        
        for line in lines:
            line = line.strip()
            
            # Skip page numbers
            if re.match(r'^\d+$', line):
                continue
                
            # Skip common header/footer patterns
            if re.match(r'^(page \d+|chapter \d+|\d+\s*$)', line.lower()):
                continue
            
            if len(line) > 5:
                cleaned_lines.append(line)
        
        return ' '.join(cleaned_lines).strip()
    
    def extract_key_phrases(self, text: str, max_phrases: int = 10) -> List[str]:
        """Extract key phrases from text"""
        # Simple keyword extraction
        words = text.lower().split()
        
        # Remove common stop words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must', 'shall', 'this', 'that', 'these', 'those'}
        
        # Count word frequency
        word_freq = {}
        for word in words:
            word = re.sub(r'[^\w]', '', word)
            if len(word) > 3 and word not in stop_words:
                word_freq[word] = word_freq.get(word, 0) + 1
        
        # Get top words
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        
        return [word for word, freq in sorted_words[:max_phrases]]