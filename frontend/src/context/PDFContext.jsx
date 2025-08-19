// context/PDFContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';

const PDFContext = createContext();

export const usePDF = () => {
  const context = useContext(PDFContext);
  if (!context) {
    throw new Error('usePDF must be used within a PDFProvider');
  }
  return context;
};

export const PDFProvider = ({ children }) => {
  const [pdfDocuments, setPdfDocuments] = useState([]);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const uploadPDFs = async (files) => {
    setIsLoading(true);
    try {
      // Simulate API call - replace with your actual backend
      const newDocuments = files.map(file => ({
        id: Date.now() + Math.random(),
        name: file.name,
        file: file,
        size: file.size,
        uploadDate: new Date().toISOString(),
      }));
      
      setPdfDocuments(prev => [...prev, ...newDocuments]);
      return newDocuments;
    } catch (error) {
      console.error('Error uploading PDFs:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const setAsCurrentDocument = (document) => {
    setCurrentDocument(document);
  };

  const getRelevantSections = async (selectedText, documentId) => {
    // This would call your backend API
    return [
      {
        id: 1,
        documentId: 'doc1',
        documentName: 'Related Research.pdf',
        heading: 'Methodology',
        content: 'The experimental setup followed a similar approach...',
        pageNumber: 12,
        similarity: 0.87
      }
    ];
  };

  const value = {
    pdfDocuments,
    currentDocument,
    currentPDF: currentDocument, // Add this alias
    isLoading,
    uploadPDFs,
    setAsCurrentDocument,
    getRelevantSections
  };

  return (
    <PDFContext.Provider value={value}>
      {children}
    </PDFContext.Provider>
  );
};


export { PDFContext }; // ✅ This fixes the error
