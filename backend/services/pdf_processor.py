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
import logging

logger = logging.getLogger(__name__)

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
    
    async def extract_pdf_content(self, file_path: Path) -> Dict[str, Any]:
        """Main method to extract PDF content"""
        return self.extract_document_structure(file_path)
        
    def extract_document_structure(self, pdf_path: Path) -> Dict[str, Any]:
        """Extract hierarchical structure from PDF"""
        try:
            doc = fitz.open(str(pdf_path))
            doc_id = self._generate_doc_id(pdf_path)
            
            # Extract title
            title = self._extract_title(doc, pdf_path)
            
            # Extract sections with smart heading detection
            sections = self._extract_sections(doc, doc_id, title)
            
            # If no sections found, create a default section per page
            if not sections:
                sections = self._create_default_sections(doc, doc_id, title)
            
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
            
        except Exception as e:
            logger.error(f"Error processing PDF {pdf_path}: {e}")
            raise
    
    def _create_default_sections(self, doc: fitz.Document, doc_id: str, title: str) -> List[Dict]:
        """Create default sections when no headings are detected"""
        sections = []
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            
            if text.strip():  # Only create section if page has content
                section = {
                    'section_id': f"{doc_id}_page_{page_num + 1}",
                    'doc_id': doc_id,
                    'doc_title': title,
                    'level': 'H1',
                    'heading': f"Page {page_num + 1}",
                    'content': text.strip(),
                    'page_num': page_num + 1,
                    'start_page': page_num + 1,
                    'end_page': page_num + 1
                }
                sections.append(section)
        
        return self._post_process_sections(sections)
    
    def _generate_doc_id(self, pdf_path: Path) -> str:
        """Generate unique document ID based on file content"""
        try:
            content = pdf_path.read_bytes()
            return hashlib.md5(content).hexdigest()[:12]
        except:
            return str(uuid.uuid4())[:12]
    
    def _extract_title(self, doc: fitz.Document, pdf_path: Path) -> str:
        """Extract document title using multiple strategies"""
        # Try metadata first
        try:
            metadata = doc.metadata
            if metadata and metadata.get('title'):
                title = metadata['title'].strip()
                if title and len(title) > 3:
                    return title
        except:
            pass
        
        # Try first page large text
        try:
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
                                text = span.get("text", "").strip()
                                size = span.get("size", 0)
                                if size > max_size and len(text) > 5 and len(text) < 100:
                                    max_size = size
                                    title_text = text
                
                if title_text:
                    return title_text
        except:
            pass
        
        # Fallback to filename
        return pdf_path.stem.replace("_", " ").replace("-", " ").title()
    
    def _extract_sections(self, doc: fitz.Document, doc_id: str, title: str) -> List[Dict]:
        """Extract sections with intelligent heading detection"""
        sections = []
        current_section = None
        section_counter = 0
        all_text = ""
        
        # Extract all text first
        for page_num, page in enumerate(doc):
            try:
                page_text = page.get_text()
                all_text += f"\n--- PAGE {page_num + 1} ---\n{page_text}"
            except Exception as e:
                logger.warning(f"Failed to extract text from page {page_num + 1}: {e}")
                continue
        
        # Split into lines
        lines = all_text.split('\n')
        current_content = []
        current_page = 1
        
        for line in lines:
            line = line.strip()
            
            # Check for page markers
            page_match = re.match(r'--- PAGE (\d+) ---', line)
            if page_match:
                current_page = int(page_match.group(1))
                continue
            
            if not line:
                if current_content:
                    current_content.append("")
                continue
            
            # Detect heading
            heading_level = self._detect_heading_simple(line)
            
            if heading_level and len(line) > 5 and len(line) < 200:
                # Save previous section
                if current_section and current_content:
                    content_text = ' '.join(current_content).strip()
                    if len(content_text) > 50:  # Only save substantial sections
                        current_section['content'] = content_text
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
                    'page_num': current_page,
                    'start_page': current_page,
                    'end_page': current_page
                }
                current_content = []
            else:
                # Add content to current section
                if current_section:
                    current_content.append(line)
                    current_section['end_page'] = current_page
        
        # Add last section
        if current_section and current_content:
            content_text = ' '.join(current_content).strip()
            if len(content_text) > 50:
                current_section['content'] = content_text
                sections.append(current_section)
        
        # Post-process sections
        return self._post_process_sections(sections)
    
    def _detect_heading_simple(self, line: str) -> Optional[str]:
        """Simplified heading detection"""
        if len(line) < 3 or len(line) > 200:
            return None
            
        # Check for numbered patterns
        if re.match(r'^\d+\.?\s+[A-Z]', line):
            return "H1"
        if re.match(r'^\d+\.\d+\.?\s+', line):
            return "H2"
        if re.match(r'^\d+\.\d+\.\d+\.?\s+', line):
            return "H3"
            
        # Check for keyword patterns
        keywords = ['chapter', 'section', 'introduction', 'conclusion', 
                   'abstract', 'summary', 'background', 'methods', 'results']
        line_lower = line.lower()
        for keyword in keywords:
            if line_lower.startswith(keyword):
                return "H1"
        
        # Check if line is all caps (common for headings)
        if line.isupper() and len(line.split()) <= 10:
            return "H2"
            
        # Check if starts with capital and has no period at end
        if line[0].isupper() and not line.endswith('.') and len(line.split()) <= 15:
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
            if len(content) < 30:
                continue
            
            section['content'] = content
            section['word_count'] = len(content.split())
            processed.append(section)
        
        return processed
    
    def _extract_metadata(self, doc: fitz.Document) -> Dict:
        """Extract document metadata"""
        try:
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
        except:
            return {}