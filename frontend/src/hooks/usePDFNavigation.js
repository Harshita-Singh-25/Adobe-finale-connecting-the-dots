import { useState, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Set the worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

export const usePDFNavigation = (initialPage = 1) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const pdfContainerRef = useRef(null);
  const pdfDocumentRef = useRef(null);

  // Initialize PDF document
  const initializePDF = useCallback(async (pdfSource) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const loadingTask = pdfjsLib.getDocument(pdfSource);
      const pdf = await loadingTask.promise;
      
      pdfDocumentRef.current = pdf;
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
    } catch (err) {
      setError(`Failed to load PDF: ${err.message}`);
      console.error('PDF loading error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Go to a specific page
  const goToPage = useCallback((pageNumber) => {
    if (!pdfDocumentRef.current) return;
    
    const page = Math.max(1, Math.min(pageNumber, totalPages));
    if (page !== currentPage) {
      setCurrentPage(page);
    }
  }, [currentPage, totalPages]);

  // Navigate to next page
  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  // Navigate to previous page
  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  // Zoom in/out
  const zoom = useCallback((newScale) => {
    const minScale = 0.5;
    const maxScale = 3.0;
    const scaleValue = Math.max(minScale, Math.min(maxScale, newScale));
    setScale(scaleValue);
  }, []);

  // Fit to width
  const fitToWidth = useCallback(() => {
    if (pdfContainerRef.current) {
      const containerWidth = pdfContainerRef.current.offsetWidth;
      const calculatedScale = containerWidth / 800; // Adjust denominator based on your PDF width
      setScale(calculatedScale);
    }
  }, []);

  return {
    // State
    currentPage,
    totalPages,
    scale,
    isLoading,
    error,
    
    // Refs
    pdfContainerRef,
    
    // Methods
    initializePDF,
    goToPage,
    nextPage,
    prevPage,
    zoom,
    fitToWidth,
    
    // Convenience properties
    isFirstPage: currentPage === 1,
    isLastPage: currentPage === totalPages,
  };
};