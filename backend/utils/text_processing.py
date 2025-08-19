# backend/utils/text_processing.py
import re
from typing import List, Tuple
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize

# Download NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords', quiet=True)

class TextProcessor:
    """Handles text processing utilities"""
    
    @staticmethod
    def clean_text(text: str) -> str:
        """Clean and normalize text"""
        if not text:
            return ""
        
        # Remove special characters
        text = re.sub(r'[^\w\s-]', ' ', text)
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        return text.lower()
    
    @staticmethod
    def extract_key_phrases(text: str, top_n: int = 5) -> List[Tuple[str, float]]:
        """Extract key phrases from text using TF-IDF"""
        from sklearn.feature_extraction.text import TfidfVectorizer
        
        # Tokenize sentences
        sentences = nltk.sent_tokenize(text)
        if not sentences:
            return []
        
        # Create TF-IDF model
        vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            stop_words=stopwords.words('english'),
            max_features=100
        )
        
        try:
            tfidf_matrix = vectorizer.fit_transform(sentences)
            feature_names = vectorizer.get_feature_names_out()
            
            # Get top features
            sums = tfidf_matrix.sum(axis=0)
            data = []
            
            for col, term in enumerate(feature_names):
                data.append((term, sums[0, col]))
            
            # Sort by score
            data.sort(key=lambda x: x[1], reverse=True)
            
            return data[:top_n]
        except:
            # Fallback to simple word frequency
            words = [word for word in word_tokenize(text) 
                    if word.lower() not in stopwords.words('english')]
            freq = nltk.FreqDist(words)
            return freq.most_common(top_n)
    
    @staticmethod
    def find_contradictions(text1: str, text2: str) -> List[str]:
        """Find potential contradictions between two texts"""
        contradictions = []
        
        # Simple contradiction detection
        negation_words = {'not', 'no', 'never', 'none', 'neither', 'nor'}
        
        words1 = set(word_tokenize(text1.lower()))
        words2 = set(word_tokenize(text2.lower()))
        
        # Check for negated concepts
        for word in words1:
            if word in negation_words:
                for other_word in words2:
                    if other_word not in negation_words and word in words1:
                        contradictions.append(f"{word} vs {other_word}")
        
        return contradictions