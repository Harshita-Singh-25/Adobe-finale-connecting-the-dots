import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getDocumentDetails } from '../../services/documentService';
import { usePDFSelection } from '../../hooks/usePDFSelection';
import Loader from '../common/Loader';
import Button from '../common/Button';
import SelectionHighlighter from './SelectionHighlighter';
import { ReactComponent as AdobePDFIcon } from '../../assets/icons/adobe-pdf.svg';
import { ReactComponent as ExpandIcon } from '../../assets/icons/expand.svg';
import { ReactComponent as CompressIcon } from '../../assets/icons/compress.svg';

const PDFViewer = ({ onTextSelected }) => {
  const { docId } = useParams();
  const viewerRef = useRef(null);
  const [pdfInstance, setPdfInstance] = useState(null);
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectionActive, setSelectionActive] = useState(true);
  const { selectedText } = usePDFSelection();

  // Get text from a specific page
  const getPageText = useCallback(async (pageNum) => {
    if (!pdfInstance) return '';
    try {
      const response = await pdfInstance.getAPIs().getPageText({
        pageNumber: pageNum,
      });
      return response.text || '';
    } catch (err) {
      console.error(`Error getting text for page ${pageNum}:`, err);
      return '';
    }
  }, [pdfInstance]);

  // Get surrounding text for context
  const getSelectionContext = useCallback(async () => {
    if (!pdfInstance) return {};
    try {
      const pageInfo = await pdfInstance.getAPIs().getPageInfo();
      const currentPage = pageInfo.pageNumber;
      
      const contextBefore = await getPageText(Math.max(1, currentPage - 1));
      const contextAfter = await getPageText(Math.min(pageInfo.totalPages, currentPage + 1));
      
      return { before: contextBefore, after: contextAfter };
    } catch (err) {
      console.error('Error getting context:', err);
      return {};
    }
  }, [pdfInstance, getPageText]);

  // Handle text selection
  const handleTextSelection = useCallback(async (event) => {
    if (!selectionActive) return;

    const selected = event.data;
    if (selected?.text?.length > 10) {
      const context = await getSelectionContext();
      onTextSelected?.(selected.text, docId, context);
    }
  }, [selectionActive, onTextSelected, docId, getSelectionContext]);

  // Handle page change events
  const handlePageChange = useCallback((data) => {
    console.log('Current page:', data.pageNumber);
  }, []);

  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(() => {
    if (pdfInstance) {
      const mode = isFullscreen ? 'SIZED_CONTAINER' : 'FULL_WINDOW';
      pdfInstance.getAPIs().setMode({ mode });
      setIsFullscreen(!isFullscreen);
    }
  }, [pdfInstance, isFullscreen]);

  // Initialize Adobe PDF Embed API
  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true);
        
        const docData = await getDocumentDetails(docId);
        setDocument(docData);

        if (typeof window !== 'undefined' && window.AdobeDC?.View) {
          const adobeDC = new window.AdobeDC.View({
            clientId: import.meta.env.VITE_ADOBE_EMBED_API_KEY,
            divId: 'pdf-viewer-container',
          });

          const previewConfig = {
            embedMode: 'SIZED_CONTAINER',
            defaultViewMode: 'FIT_PAGE',
            showDownloadPDF: false,
            showPrintPDF: false,
            showAnnotationTools: false,
            enableFormFilling: false,
            showLeftHandPanel: false,
          };

          const instance = await adobeDC.previewFile(
            {
              content: { location: { url: docData.path } },
              metaData: { fileName: docData.title },
            },
            previewConfig
          );

          setPdfInstance(instance);

          instance.registerCallback(
            window.AdobeDC.View.Enum.CallbackType.GET_PAGE_INFO,
            handlePageChange
          );

          instance.registerCallback(
            window.AdobeDC.View.Enum.CallbackType.TEXT_SELECTION_END,
            handleTextSelection
          );
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (docId) loadPDF();

    return () => {
      if (pdfInstance) {
        pdfInstance.unregisterCallback(
          window.AdobeDC.View.Enum.CallbackType.GET_PAGE_INFO
        );
        pdfInstance.unregisterCallback(
          window.AdobeDC.View.Enum.CallbackType.TEXT_SELECTION_END
        );
      }
    };
  }, [docId, handlePageChange, handleTextSelection, pdfInstance]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        Error loading PDF: {error}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full bg-gray-100">
      <div className="flex items-center justify-between p-2 bg-white border-b border-gray-200">
        <div className="flex items-center">
          <AdobePDFIcon className="h-6 w-6 mr-2 text-red-500" />
          <h2 className="text-lg font-medium truncate max-w-xs">
            {document?.title || 'Document'}
          </h2>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectionActive(!selectionActive)}
            active={selectionActive}
          >
            {selectionActive ? 'Disable Selection' : 'Enable Selection'}
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            icon={isFullscreen ? <CompressIcon className="h-4 w-4" /> : <ExpandIcon className="h-4 w-4" />}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </Button>
        </div>
      </div>

      <div
        id="pdf-viewer-container"
        ref={viewerRef}
        className="flex-1 w-full overflow-hidden relative"
      >
        <SelectionHighlighter 
          documentId={docId}
          onRelatedSectionsFound={() => {}} // Will be handled by parent
          onInsightsRequest={() => {}} // Will be handled by parent
        />
      </div>

      {selectedText && (
        <div className="absolute bottom-4 left-4 bg-white p-2 rounded shadow-md text-xs opacity-0 hover:opacity-100">
          <pre>{JSON.stringify(selectedText, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default PDFViewer;