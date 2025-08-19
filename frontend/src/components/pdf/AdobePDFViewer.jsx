// components/AdobePDFViewer.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';

import { usePDF } from '../../context/PDFContext';
import { useSelection } from '../../context/SelectionContext';
import Loader from '../common/Loader';
import { Button } from '../common/Button';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Maximize, Minus, Search } from 'lucide-react';

// Helper function to wait for Adobe API
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const { currentDocument: currentPDF } = usePDF();
  const { handleTextSelection } = useSelection();

  // Initialize Adobe Viewer
  const initializeAdobeViewer = useCallback(async () => {
    if (!currentPDF || !viewerRef.current) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Wait for Adobe API to be ready
      await waitForAdobeAPI();
      
      const clientId =
        import.meta.env.VITE_ADOBE_EMBED_API_KEY ||
        import.meta.env.VITE_ADOBE_API_KEY ||
        import.meta.env.REACT_APP_ADOBE_API_KEY;
      
      if (!clientId) {
        throw new Error('Adobe API key not found. Please set VITE_ADOBE_API_KEY environment variable.');
      }

      // Clear previous viewer if it exists
      if (viewerRef.current) {
        viewerRef.current.innerHTML = '';
      }

      // Create a new viewer instance
      const adobeDCView = new window.AdobeDC.View({
        clientId: clientId,
        divId: 'adobe-dc-view',
      });

      // Prepare file as an ArrayBuffer promise for local file usage
      const filePromise = currentPDF.file?.arrayBuffer
        ? currentPDF.file.arrayBuffer()
        : new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(currentPDF.file);
          });

      const previewConfig = {
        embedMode: 'SIZED_CONTAINER',
        defaultViewMode: 'FIT_WIDTH',
        showDownloadPDF: false,
        showPrintPDF: false,
        showLeftHandPanel: false,
        showAnnotationTools: false,
        enableFormFilling: false,
        showBookmarks: false,
        showThumbnails: false,
        enableAnnotationAPIs: false,
        enableFormFillingAPIs: false,
        enableDigitalSignatures: false,
        enableEditingAPIs: false,
        enableAccessibility: false
      };

      // Register feature flag callbacks to prevent errors
      const registerFeatureFlagCallbacks = () => {
        const featureFlags = [
          'enable-tools-multidoc',
          'edit-config',
          'enable-accessibility',
          'preview-config',
          'enable-inline-organize',
          'enable-pdf-request-signatures',
          'DCWeb_edit_image_experiment'
        ];

        featureFlags.forEach(flag => {
          try {
            adobeDCView.registerCallback(
              `GET_FEATURE_FLAG:${flag}`,
              () => false,
              false
            );
          } catch (error) {
            console.warn(`Could not register callback for feature flag: ${flag}`);
          }
        });
      };

      registerFeatureFlagCallbacks();

      // Preview the file using a promise for local files
      const previewPromise = adobeDCView.previewFile(
        {
          content: {
            promise: filePromise,
            mimeType: 'application/pdf'
          },
          metaData: {
            fileName: currentPDF.name
          }
        },
        previewConfig
      );

      // Set up event listeners only if supported by this SDK build
      const CallbackType =
        (window.AdobeDC && window.AdobeDC.View && window.AdobeDC.View.Enum && window.AdobeDC.View.Enum.CallbackType) || {};

      // Page info callback with error handling
      try {
        if (CallbackType.GET_PAGE_INFO) {
          adobeDCView.registerCallback(
            CallbackType.GET_PAGE_INFO,
            (data) => {
              if (data && typeof data.pageNumber === 'number') {
                setCurrentPage(data.pageNumber);
              }
              if (data && typeof data.totalPages === 'number') {
                setTotalPages(data.totalPages);
              }
            },
            false
          );
        } else if (CallbackType.PAGE_VIEW_CHANGE) {
          adobeDCView.registerCallback(
            CallbackType.PAGE_VIEW_CHANGE,
            (data) => {
              if (data && typeof data.pageNumber === 'number') {
                setCurrentPage(data.pageNumber);
              }
              if (data && typeof data.totalPages === 'number') {
                setTotalPages(data.totalPages);
              }
            },
            false
          );
        }
      } catch (error) {
        console.warn('Could not register page info callback:', error);
      }

      // Text selection callback with error handling
      try {
        if (CallbackType.TEXT_SELECTION_END) {
          adobeDCView.registerCallback(
            CallbackType.TEXT_SELECTION_END,
            (event) => {
              if (event && event.data && event.data.text) {
                handleTextSelection(
                  event.data.text,
                  { x: event.clientX, y: event.clientY },
                  { pageNumber: currentPage, documentId: documentId }
                );
              }
            },
            false
          );
        } else if (CallbackType.TEXT_SELECTED) {
          adobeDCView.registerCallback(
            CallbackType.TEXT_SELECTED,
            (event) => {
              if (event && event.data && event.data.text) {
                handleTextSelection(
                  event.data.text,
                  { x: event.clientX, y: event.clientY },
                  { pageNumber: currentPage, documentId: documentId }
                );
              }
            },
            false
          );
        }
      } catch (error) {
        console.warn('Could not register text selection callback:', error);
      }

      // Store the viewer instance and set initial zoom level
      await previewPromise;
      setAdobeViewer(adobeDCView);
      try {
        const apis = await adobeDCView.getAPIs();
        const zoom = await apis.getZoomLevel();
        setZoomLevel(Math.round(zoom * 100));
      } catch (_) {
        // ignore initial zoom fetch failures
      }
      setError(null);

    } catch (error) {
      console.error('Error initializing Adobe PDF viewer:', error);
      setError(error.message || 'Failed to initialize PDF viewer. Please check your Adobe API key and internet connection.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPDF, documentId, handleTextSelection, currentPage]);

  // Adobe API functions
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

  // Re-initialize when currentPDF changes
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
      {/* Toolbar */}
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
          {/* Page Navigation */}
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

          {/* Zoom Controls */}
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

          {/* Full Screen Toggle */}
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

      {/* PDF Viewer Container */}
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

      {/* Status Bar */}
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <span>Powered by Adobe PDF Embed API</span>
          <span>Page {currentPage} of {totalPages}</span>
        </div>
      </div>
    </div>
  );
};

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default AdobePDFViewer;