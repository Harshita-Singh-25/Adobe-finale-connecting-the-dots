// components/pdf/AdobePDFViewer.jsx - NATIVE SELECTION VERSION

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePDF } from '../../context/PDFContext';
import { useSelection } from '../../context/SelectionContext';
import Loader from '../common/Loader';
import { Button } from '../common/Button';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Maximize, Minus, Search } from 'lucide-react';

const waitForAdobeAPI = () => {
  return new Promise((resolve, reject) => {
    if (window.AdobeDC && window.AdobeDC.View) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error('Adobe PDF Embed API failed to load within 10 seconds'));
    }, 10000);

    const readyHandler = () => {
      clearTimeout(timeout);
      window.removeEventListener('adobe_dc_view_sdk.ready', readyHandler);
      resolve();
    };

    window.addEventListener('adobe_dc_view_sdk.ready', readyHandler);
  });
};

const AdobePDFViewer = ({ documentId }) => {
  const viewerRef = useRef(null);
  const [adobeViewer, setAdobeViewer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const { currentDocument: currentPDF } = usePDF();
  const { handleTextSelection } = useSelection();
  const [currentPage, setCurrentPage] = useState(1);
  const currentPageRef = useRef(1);

  const initializeAdobeViewer = useCallback(async () => {
    if (!currentPDF || !viewerRef.current) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await waitForAdobeAPI();
      
      const clientId = import.meta.env.VITE_ADOBE_EMBED_API_KEY || import.meta.env.VITE_ADOBE_API_KEY;
      if (!clientId) throw new Error('Adobe API key missing from .env');

      viewerRef.current.innerHTML = ''; 

      const adobeDCView = new window.AdobeDC.View({
        clientId: clientId,
        divId: 'adobe-dc-view',
      });

      const fileUrl = currentPDF.file?.url || currentPDF.url || `http://localhost:8000/api/documents/${documentId}/file`;

      console.log("🔧 Initializing Adobe PDF Viewer...");
      console.log("📄 File URL:", fileUrl);

      const adobeViewerInstance = await adobeDCView.previewFile(
        {
          content: { location: { url: fileUrl } },
          metaData: { fileName: currentPDF.name }
        },
        { 
          embedMode: 'SIZED_CONTAINER', 
          defaultViewMode: 'FIT_WIDTH'
        }
      );

      console.log("✅ PDF successfully rendered");

      adobeViewerInstance.getAPIs().then((apis) => {
        console.log("✅ APIs obtained");
        
        apis.getPDFMetadata().then((metadata) => {
          setTotalPages(metadata.numPages);
          console.log("📊 Total pages:", metadata.numPages);
        }).catch(err => {
          console.warn("⚠️ Could not get metadata:", err);
        });

        // Set up periodic page monitoring
        const pageMonitorInterval = setInterval(() => {
          if (apis && apis.getCurrentPage) {
            apis.getCurrentPage()
              .then((page) => {
                if (currentPageRef.current !== page) {
                  currentPageRef.current = page;
                  setCurrentPage(page);
                  console.log("📄 Current page:", page);
                }
              })
              .catch(() => {});
          }
        }, 1000);

        apis._pageMonitorInterval = pageMonitorInterval;

      }).catch((err) => {
        console.error("❌ Failed to get APIs:", err);
      });

      setAdobeViewer(adobeViewerInstance);

    } catch (err) {
      console.error('❌ Adobe Init Error:', err);
      setError(err?.message || 'Failed to initialize PDF viewer.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPDF?.id, documentId]);

  // ==========================================
  // NATIVE BROWSER SELECTION - THE REAL SOLUTION
  // ==========================================
  useEffect(() => {
    console.log("🎯 Setting up NATIVE selection handlers...");

    let selectionTimeout;

    const captureSelection = () => {
      // Clear any pending timeout
      clearTimeout(selectionTimeout);
      
      // Wait a bit for selection to stabilize
      selectionTimeout = setTimeout(() => {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();
        
        console.log("🔍 Selection captured:");
        console.log("  - Text length:", selectedText?.length || 0);
        console.log("  - Text preview:", selectedText?.substring(0, 50) || "(empty)");
        console.log("  - Current page:", currentPageRef.current);
        console.log("  - Document ID:", documentId);
        
        if (selectedText && selectedText.length > 5) {
          console.log("✅ VALID SELECTION - Calling handleTextSelection");
          console.log("📝 Full text:", selectedText);
          
          handleTextSelection(
            selectedText,
            { x: 0, y: 0 },
            {
              pageNumber: currentPageRef.current,
              documentId: documentId,
              source: 'native-browser',
              timestamp: new Date().toISOString()
            }
          );
        } else {
          console.log("❌ Selection too short, ignoring");
        }
      }, 200); // Wait 200ms after selection ends
    };

    // Listen for selection changes
    document.addEventListener('selectionchange', () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        console.log("📌 Selection in progress...");
      }
    });

    // Listen for mouseup (when user releases mouse after selecting)
    document.addEventListener('mouseup', captureSelection);
    
    // Listen for touchend (for mobile/tablet)
    document.addEventListener('touchend', captureSelection);

    console.log("✅ Native selection handlers attached to document");

    return () => {
      console.log("🧹 Cleaning up selection handlers");
      clearTimeout(selectionTimeout);
      document.removeEventListener('mouseup', captureSelection);
      document.removeEventListener('touchend', captureSelection);
    };
  }, [documentId, handleTextSelection]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (adobeViewer && adobeViewer.getAPIs) {
        adobeViewer.getAPIs().then(apis => {
          if (apis._pageMonitorInterval) {
            clearInterval(apis._pageMonitorInterval);
          }
        }).catch(() => {});
      }
    };
  }, [adobeViewer]);

  const zoomIn = useCallback(async () => {
    if (!adobeViewer) return;
    try {
      const apis = await adobeViewer.getAPIs();
      const currentZoom = await apis.getZoomLevel();
      const newZoom = Math.min(currentZoom + 0.25, 3.0);
      await apis.setZoomLevel(newZoom);
      setZoomLevel(Math.round(newZoom * 100));
    } catch (error) {
      console.error('Error zooming in:', error);
    }
  }, [adobeViewer]);

  const zoomOut = useCallback(async () => {
    if (!adobeViewer) return;
    try {
      const apis = await adobeViewer.getAPIs();
      const currentZoom = await apis.getZoomLevel();
      const newZoom = Math.max(currentZoom - 0.25, 0.5);
      await apis.setZoomLevel(newZoom);
      setZoomLevel(Math.round(newZoom * 100));
    } catch (error) {
      console.error('Error zooming out:', error);
    }
  }, [adobeViewer]);

  const goToPage = useCallback(async (pageNumber) => {
    if (!adobeViewer || pageNumber < 1 || pageNumber > totalPages) return;
    try {
      const apis = await adobeViewer.getAPIs();
      await apis.gotoLocation({ page: pageNumber });
    } catch (error) {
      console.error('Error navigating to page:', error);
    }
  }, [adobeViewer, totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const toggleFullScreen = useCallback(async () => {
    if (!adobeViewer) return;
    try {
      const apis = await adobeViewer.getAPIs();
      if (isFullScreen) {
        await apis.setMode({ mode: 'SIZED_CONTAINER' });
      } else {
        await apis.setMode({ mode: 'FULL_WINDOW' });
      }
      setIsFullScreen(!isFullScreen);
    } catch (error) {
      console.error('Error toggling full screen:', error);
    }
  }, [adobeViewer, isFullScreen]);

  useEffect(() => {
    initializeAdobeViewer();
    return () => {};
  }, [initializeAdobeViewer, currentPDF]);

  if (!currentPDF) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-100 p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">No PDF Selected</h3>
          <p className="text-gray-500">Please upload or select a PDF document to begin reading</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <h2 className="text-sm font-medium text-gray-900 truncate">
            {currentPDF.name}
          </h2>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {currentPDF.size ? formatFileSize(currentPDF.size) : 'PDF Document'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-white border border-gray-300 rounded-md p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevPage}
              disabled={currentPage <= 1}
              className="h-7 w-7 p-0"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center text-xs text-gray-600 mx-2">
              <span className="font-medium">{currentPage}</span>
              <span className="mx-1">/</span>
              <span>{totalPages}</span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={nextPage}
              disabled={currentPage >= totalPages}
              className="h-7 w-7 p-0"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-1 bg-white border border-gray-300 rounded-md p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={zoomOut}
              disabled={zoomLevel <= 50}
              className="h-7 w-7 p-0"
              aria-label="Zoom out"
            >
              <Minus className="w-4 h-4" />
            </Button>
            
            <span className="text-xs text-gray-600 px-2 font-medium">
              {zoomLevel}%
            </span>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={zoomIn}
              disabled={zoomLevel >= 300}
              className="h-7 w-7 p-0"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullScreen}
            className="h-8 px-2"
            aria-label={isFullScreen ? "Exit full screen" : "Enter full screen"}
          >
            <Maximize className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
            <div className="text-center">
              <Loader size="lg" />
              <p className="mt-2 text-sm text-gray-600">Loading PDF viewer...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10 p-4">
            <div className="text-center max-w-md">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-red-600 text-xl">⚠️</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading PDF</h3>
              <p className="text-gray-600 text-sm mb-4">{error}</p>
              <div className="space-y-2">
                <Button onClick={initializeAdobeViewer} variant="primary" size="sm">
                  Try Again
                </Button>
                <p className="text-xs text-gray-500">
                  Make sure your Adobe API key is set in environment variables
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div 
          id="adobe-dc-view"
          ref={viewerRef}
          className="w-full h-full"
          style={{ minHeight: '500px' }}
        />
      </div>

      <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <span>Powered by Adobe PDF Embed API</span>
          <span>Page {currentPage} of {totalPages}</span>
        </div>
      </div>
    </div>
  );
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default AdobePDFViewer;