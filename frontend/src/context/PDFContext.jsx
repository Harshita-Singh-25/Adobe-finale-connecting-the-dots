import React, { createContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

const PDFContext = createContext();

export const PDFProvider = ({ children }) => {
  const [currentPDF, setCurrentPDF] = useState(null);
  const [pdfCollection, setPDFCollection] = useState([]);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedText, setSelectedText] = useState('');
  const [isDocumentReady, setIsDocumentReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load PDF collection from local storage on initial render
  useEffect(() => {
    const savedPDFs = localStorage.getItem('pdfCollection');
    if (savedPDFs) {
      try {
        setPDFCollection(JSON.parse(savedPDFs));
      } catch (err) {
        console.error('Failed to parse saved PDFs', err);
      }
    }
  }, []);

  // Save PDF collection to local storage when it changes
  useEffect(() => {
    localStorage.setItem('pdfCollection', JSON.stringify(pdfCollection));
  }, [pdfCollection]);

  const uploadPDFs = useCallback(async (files) => {
    setLoading(true);
    setError(null);
    
    try {
      const newPDFs = await Promise.all(
        Array.from(files).map(async (file) => {
          return {
            id: crypto.randomUUID(),
            name: file.name,
            size: file.size,
            lastModified: file.lastModified,
            file,
            uploadDate: new Date().toISOString(),
          };
        })
      );

      setPDFCollection((prev) => [...prev, ...newPDFs]);
      if (!currentPDF && newPDFs.length > 0) {
        setCurrentPDF(newPDFs[0]);
      }
    } catch (err) {
      setError('Failed to upload PDFs. Please try again.');
      console.error('PDF upload error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPDF]);

  const removePDF = useCallback((id) => {
    setPDFCollection((prev) => prev.filter((pdf) => pdf.id !== id));
    if (currentPDF?.id === id) {
      setCurrentPDF(pdfCollection.length > 1 ? pdfCollection[0] : null);
    }
  }, [currentPDF, pdfCollection]);

  const setActivePDF = useCallback((pdf) => {
    setCurrentPDF(pdf);
    setIsDocumentReady(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedText('');
  }, []);

  const performSearch = useCallback((query) => {
    if (!currentPDF) return;
    
    // Mock search results
    const results = [
      { page: 1, text: `Example result for "${query}" on page 1`, match: query },
      { page: 3, text: `Another match for "${query}" on page 3`, match: query },
    ];
    
    setSearchResults(results);
  }, [currentPDF]);

  const handleTextSelection = useCallback((text) => { // Removed unused context parameter
    setSelectedText(text);
  }, []);

  const value = {
    currentPDF,
    pdfCollection,
    zoomLevel,
    searchQuery,
    searchResults,
    selectedText,
    isDocumentReady,
    loading,
    error,
    actions: {
      uploadPDFs,
      removePDF,
      setActivePDF,
      setZoomLevel,
      setSearchQuery,
      performSearch,
      handleTextSelection,
      setDocumentReady: setIsDocumentReady,
    },
  };

  return (
    <PDFContext.Provider value={value}>
      {children}
    </PDFContext.Provider>
  );
};

PDFProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// Moved to a separate hooks file to comply with react-refresh/only-export-components
// export const usePDFContext = () => {
//   const context = useContext(PDFContext);
//   if (!context) {
//     throw new Error('usePDFContext must be used within a PDFProvider');
//   }
//   return context;
// };

export default PDFProvider;