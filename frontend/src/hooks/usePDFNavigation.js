import { useState, useRef, useCallback } from "react";

export const usePDFNavigation = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const adobeDCViewRef = useRef(null);
  const apiRef = useRef(null);

  // Initialize PDF using Adobe Embed API
  const initializePDF = useCallback((divId, pdfUrl, fileName = "Document.pdf") => {
    try {
      setIsLoading(true);
      setError(null);

      if (!window.AdobeDC) {
        throw new Error("AdobeDC SDK not loaded");
      }

      const adobeDCView = new window.AdobeDC.View({ clientId: process.env.REACT_APP_ADOBE_CLIENT_ID, divId });
      adobeDCViewRef.current = adobeDCView;

      const preview = adobeDCView.previewFile(
        {
          content: { location: { url: pdfUrl } },
          metaData: { fileName },
        },
        { embedMode: "SIZED_CONTAINER" }
      );

      preview.getAPIs().then((apis) => {
        apiRef.current = apis;

        // Listen to page changes
        apis.getPDFMetadata().then((meta) => setTotalPages(meta.numPages));
        apis.addEventListener("PAGE_VIEW", (event) => {
          setCurrentPage(event.data.pageNumber);
        });
      });
    } catch (err) {
      setError(`Failed to load PDF: ${err.message}`);
      console.error("Adobe PDF loading error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const goToPage = useCallback((pageNumber) => {
    if (apiRef.current) {
      apiRef.current.gotoLocation(pageNumber);
      setCurrentPage(pageNumber);
    }
  }, []);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) goToPage(currentPage + 1);
  }, [currentPage, totalPages, goToPage]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const zoom = useCallback((newScale) => {
    if (apiRef.current) {
      apiRef.current.setZoomLevel(newScale * 100); // Adobe API uses percentage
      setScale(newScale);
    }
  }, []);

  const fitToWidth = useCallback(() => {
    if (apiRef.current) {
      apiRef.current.setZoomMode("FIT_WIDTH");
    }
  }, []);

  return {
    currentPage,
    totalPages,
    scale,
    isLoading,
    error,
    initializePDF,
    goToPage,
    nextPage,
    prevPage,
    zoom,
    fitToWidth,
    isFirstPage: currentPage === 1,
    isLastPage: currentPage === totalPages,
  };
};
