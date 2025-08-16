import { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Set the worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

export const usePDFSelection = () => {
  const [selections, setSelections] = useState([]);
  const [currentSelection, setCurrentSelection] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const pdfContainerRef = useRef(null);
  const selectionStartRef = useRef(null);
  const pdfDocumentRef = useRef(null);

  // Get page number from mouse event
  const getPageFromEvent = useCallback((event) => {
    if (!event || !event.target) return 1;
    const pageElement = event.target.closest('.pdf-page');
    return pageElement ? parseInt(pageElement.dataset.pageNumber) : 1;
  }, []);

  // Generate random highlight color
  const getRandomHighlightColor = useCallback(() => {
    const colors = [
      'rgba(255, 255, 0, 0.3)',
      'rgba(0, 255, 0, 0.3)',
      'rgba(0, 0, 255, 0.3)',
      'rgba(255, 0, 0, 0.3)',
      'rgba(0, 255, 255, 0.3)',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }, []);

  // Extract text from PDF selection
  const extractTextFromSelection = useCallback(async (selection) => {
    try {
      const page = await pdfDocumentRef.current.getPage(selection.start.page);
      const viewport = page.getViewport({ scale: 1.0 });
      
      const start = {
        x: (selection.start.x / pdfContainerRef.current.offsetWidth) * viewport.width,
        y: viewport.height - ((selection.start.y / pdfContainerRef.current.offsetHeight) * viewport.height)
      };
      
      const end = {
        x: (selection.end.x / pdfContainerRef.current.offsetWidth) * viewport.width,
        y: viewport.height - ((selection.end.y / pdfContainerRef.current.offsetHeight) * viewport.height)
      };

      const textContent = await page.getTextContent();
      const selectedTextItems = textContent.items.filter(item => {
        const itemX = item.transform[4];
        const itemY = item.transform[5];
        return (
          itemX >= Math.min(start.x, end.x) &&
          itemX <= Math.max(start.x, end.x) &&
          itemY >= Math.min(start.y, end.y) &&
          itemY <= Math.max(start.y, end.y)
        );
      });

      return selectedTextItems.map(item => item.str).join(' ');
    } catch (error) {
      console.error('Error extracting text:', error);
      return null;
    }
  }, []);

  // Calculate selection rectangles for rendering
  const calculateSelectionRects = useCallback((selection) => {
    return [{
      left: Math.min(selection.start.x, selection.end.x),
      top: Math.min(selection.start.y, selection.end.y),
      width: Math.abs(selection.end.x - selection.start.x),
      height: Math.abs(selection.end.y - selection.start.y),
      page: selection.start.page
    }];
  }, []);

  // Clear all selections
  const clearSelections = useCallback(() => {
    setSelections([]);
    setCurrentSelection(null);
  }, []);

  // Remove a specific selection
  const removeSelection = useCallback((id) => {
    setSelections(prev => prev.filter(sel => sel.id !== id));
  }, []);

  // Initialize PDF document reference
  const initializePDF = useCallback((pdfDocument) => {
    pdfDocumentRef.current = pdfDocument;
  }, []);

  // Handle text selection start
  const handleSelectionStart = useCallback((event) => {
    if (!pdfDocumentRef.current) return;
    
    setIsSelecting(true);
    const page = getPageFromEvent(event);
    selectionStartRef.current = {
      page,
      x: event.clientX,
      y: event.clientY,
      timestamp: Date.now()
    };
  }, [getPageFromEvent]);

  // Handle text selection end
  const handleSelectionEnd = useCallback((event) => {
    if (!isSelecting || !selectionStartRef.current) {
      setIsSelecting(false);
      return;
    }

    const page = getPageFromEvent(event);
    const endPosition = {
      page,
      x: event.clientX,
      y: event.clientY
    };

    const newSelection = {
      id: Date.now().toString(),
      start: selectionStartRef.current,
      end: endPosition,
      text: '',
      color: getRandomHighlightColor(),
      createdAt: new Date().toISOString()
    };

    extractTextFromSelection(newSelection)
      .then(extractedText => {
        if (extractedText) {
          newSelection.text = extractedText;
          setSelections(prev => [...prev, newSelection]);
          setCurrentSelection(newSelection);
        }
      });

    setIsSelecting(false);
    selectionStartRef.current = null;
  }, [isSelecting, getPageFromEvent, getRandomHighlightColor, extractTextFromSelection]);

  // Set up event listeners
  useEffect(() => {
    const container = pdfContainerRef.current;
    if (!container) return;

    container.addEventListener('mousedown', handleSelectionStart);
    container.addEventListener('mouseup', handleSelectionEnd);

    return () => {
      container.removeEventListener('mousedown', handleSelectionStart);
      container.removeEventListener('mouseup', handleSelectionEnd);
    };
  }, [handleSelectionStart, handleSelectionEnd]);

  return {
    selections,
    currentSelection,
    isSelecting,
    pdfContainerRef,
    initializePDF,
    clearSelections,
    removeSelection,
    getSelectionRects: useCallback(() => {
      return selections.map(selection => ({
        id: selection.id,
        rects: calculateSelectionRects(selection),
        color: selection.color
      }));
    }, [selections, calculateSelectionRects])
  };
};