# backend/services/pdf_processor.py
import hashlib
import json
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import fitz  # PyMuPDF
import re
from dataclasses import dataclass
import numpy as np
from collections import defaultdict

@dataclass
class Section:
    """Represents a document section with metadata"""
    doc_id: str
    doc_title: str
    section_id: str
    level: str  # H1, H2, H3
    heading: str
    content: str
    page_num: int
    start_char: int
    end_char: int
    embedding: Optional[np.ndarray] = None

class PDFProcessor:
    """High-performance PDF processing with intelligent section extraction"""
    
    def __init__(self):
        self.heading_patterns = {
            'numbered': [
                (r'^\d+\.?\s+[A-Z]', 'H1'),
                (r'^\d+\.\d+\.?\s+', 'H2'),
                (r'^\d+\.\d+\.\d+\.?\s+', 'H3'),
            ],
            'lettered': [
                (r'^[A-Z]\.\s+[A-Z]', 'H1'),
                (r'^[a-z]\.\s+', 'H2'),
                (r'^[ivx]+\.\s+', 'H3'),
            ],
            'keywords': [
                (r'^(Chapter|CHAPTER|Section|SECTION)\s+\d+', 'H1'),
                (r'^(Introduction|Conclusion|Abstract|Summary|References)', 'H1'),
                (r'^(Background|Methods|Results|Discussion)', 'H2'),
            ]
        }
        
    def extract_document_structure(self, pdf_path: Path) -> Dict[str, Any]:
        """Extract hierarchical structure from PDF"""
        doc = fitz.open(str(pdf_path))
        doc_id = self._generate_doc_id(pdf_path)
        
        # Extract title
        title = self._extract_title(doc)
        
        # Extract sections with smart heading detection
        sections = self._extract_sections(doc, doc_id, title)
        
        # Build hierarchical structure
        structure = {
            'doc_id': doc_id,
            'title': title,
            'path': str(pdf_path),
            'pages': len(doc),
            'sections': sections,
            'metadata': self._extract_metadata(doc)
        }
        
        doc.close()
        return structure
    
    def _generate_doc_id(self, pdf_path: Path) -> str:
        """Generate unique document ID"""
        content = pdf_path.read_bytes()
        return hashlib.md5(content).hexdigest()[:12]
    
    def _extract_title(self, doc: fitz.Document) -> str:
        """Extract document title using multiple strategies"""
        # Try metadata first
        metadata = doc.metadata
        if metadata and metadata.get('title'):
            return metadata['title']
        
        # Try first page large text
        if len(doc) > 0:
            page = doc[0]
            blocks = page.get_text("dict")
            
            # Find largest font size text
            max_size = 0
            title_text = ""
            
            for block in blocks.get("blocks", []):
                if block.get("type") == 0:  # Text block
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            if span.get("size", 0) > max_size:
                                max_size = span["size"]
                                title_text = span.get("text", "").strip()
            
            if title_text and len(title_text) > 5:
                return title_text[:100]
        
        # Fallback to filename
        return pdf_path.stem.replace("_", " ").title()
    
    def _extract_sections(self, doc: fitz.Document, doc_id: str, title: str) -> List[Dict]:
        """Extract sections with intelligent heading detection"""
        sections = []
        current_section = None
        section_counter = 0
        
        for page_num, page in enumerate(doc):
            text = page.get_text()
            lines = text.split('\n')
            
            for i, line in enumerate(lines):
                line = line.strip()
                if not line:
                    continue
                
                # Detect heading
                heading_level = self._detect_heading(line, page, i)
                
                if heading_level:
                    # Save previous section
                    if current_section and current_section['content'].strip():
                        sections.append(current_section)
                    
                    # Start new section
                    section_counter += 1
                    current_section = {
                        'section_id': f"{doc_id}_s{section_counter}",
                        'doc_id': doc_id,
                        'doc_title': title,
                        'level': heading_level,
                        'heading': line,
                        'content': "",
                        'page_num': page_num + 1,
                        'start_page': page_num + 1,
                        'end_page': page_num + 1
                    }
                elif current_section:
                    # Add content to current section
                    current_section['content'] += " " + line
                    current_section['end_page'] = page_num + 1
        
        # Add last section
        if current_section and current_section['content'].strip():
            sections.append(current_section)
        
        # Post-process sections
        return self._post_process_sections(sections)
    
    def _detect_heading(self, line: str, page: fitz.Page, line_idx: int) -> Optional[str]:
        """Detect if a line is a heading using multiple heuristics"""
        if len(line) < 3 or len(line) > 150:
            return None
        
        # Check patterns
        for pattern_type, patterns in self.heading_patterns.items():
            for pattern, level in patterns:
                if re.match(pattern, line):
                    return level
        
        # Check formatting (font size, bold, etc.)
        blocks = page.get_text("dict")
        for block in blocks.get("blocks", []):
            if block.get("type") == 0:
                for b_line in block.get("lines", []):
                    for span in b_line.get("spans", []):
                        if line in span.get("text", ""):
                            # Check if bold or larger font
                            flags = span.get("flags", 0)
                            is_bold = bool(flags & 2**4)
                            size = span.get("size", 0)
                            
                            if is_bold or size > 14:
                                if size > 18:
                                    return "H1"
                                elif size > 14:
                                    return "H2"
                                elif is_bold:
                                    return "H3"
        
        return None
    
    def _post_process_sections(self, sections: List[Dict]) -> List[Dict]:
        """Clean and enhance sections"""
        processed = []
        
        for section in sections:
            # Clean content
            content = section['content'].strip()
            content = re.sub(r'\s+', ' ', content)
            content = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', content)
            
            # Skip too short sections
            if len(content) < 50:
                continue
            
            section['content'] = content
            section['word_count'] = len(content.split())
            processed.append(section)
        
        return processed
    
    def _extract_metadata(self, doc: fitz.Document) -> Dict:
        """Extract document metadata"""
        metadata = doc.metadata or {}
        return {
            'author': metadata.get('author', 'Unknown'),
            'subject': metadata.get('subject', ''),
            'keywords': metadata.get('keywords', ''),
            'creator': metadata.get('creator', ''),
            'producer': metadata.get('producer', ''),
            'creation_date': str(metadata.get('creationDate', '')),
            'modification_date': str(metadata.get('modDate', ''))
        }
    
    def extract_text_chunk(self, doc_path: Path, page_num: int, 
                          start_char: int, end_char: int) -> str:
        """Extract specific text chunk from PDF"""
        doc = fitz.open(str(doc_path))
        
        if page_num > len(doc):
            doc.close()
            return ""
        
        page = doc[page_num - 1]
        text = page.get_text()
        doc.close()
        
        # Simple character-based extraction
        if end_char > len(text):
            end_char = len(text)
        
        return text[start_char:end_char]