# backend/utils/pdf_embed.py
from typing import Dict, Any
from backend.core.config import settings

class PDFEmbedAPI:
    """Wrapper for Adobe PDF Embed API"""
    
    @staticmethod
    def get_embed_config(doc_url: str, default_view_mode: str = "FIT_WIDTH") -> Dict[str, Any]:
        """Generate configuration for PDF Embed API"""
        return {
            "clientId": settings.ADOBE_EMBED_API_KEY,
            "divId": "pdf-viewer",
            "pdfHandler": {
                "initialView": {
                    "viewMode": default_view_mode,
                    "showAnnotationTools": False,
                    "enableFormFilling": False,
                    "showLeftHandPanel": False
                },
                "ui": {
                    "showDownloadPDF": True,
                    "showPrintPDF": True,
                    "showFullScreen": True,
                    "showZoomControls": True,
                    "showBookmarks": False,
                    "showThumbnails": False
                },
                "annotations": {
                    "enabled": False
                },
                "events": {
                    "onSelection": True,
                    "onSelectionEnd": True,
                    "onAnnotationChanged": False
                }
            },
            "pdfURL": doc_url
        }
    
    @staticmethod
    def get_navigation_config(doc_url: str, page_num: int, x: int = 0, y: int = 100) -> Dict[str, Any]:
        """Generate navigation configuration"""
        return {
            "type": "goToPage",
            "pageNumber": page_num,
            "offset": {
                "x": x,
                "y": y
            },
            "pdfURL": doc_url
        }