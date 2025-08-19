import re
import nltk
from typing import List, Dict, Any
from nltk.tokenize import sent_tokenize, word_tokenize

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords', quiet=True)

class TextProcessor:
    """Text processing utilities"""
    
    def __init__(self):
        pass
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        if not text:
            return ""
        
        # Remove control characters
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', text)
        
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove excessive newlines
        text = re.sub(r'\n+', '\n', text)
        
        return text.strip()
    
    def extract_snippets(self, content: str, max_sentences: int = 3) -> List[str]:
        """Extract meaningful snippets from content"""
        if not content:
            return []
        
        # Split into sentences
        sentences = sent_tokenize(content)
        
        # If content is short enough, return as is
        if len(sentences) <= max_sentences:
            return [content]
        
        # Extract snippets by taking consecutive sentence groups
        snippets = []
        for i in range(0, len(sentences), max_sentences):
            snippet = ' '.join(sentences[i:i + max_sentences])
            if len(snippet.strip()) > 30:  # Only meaningful snippets
                snippets.append(snippet.strip())
        
        return snippets[:5]  # Limit to 5 snippets max