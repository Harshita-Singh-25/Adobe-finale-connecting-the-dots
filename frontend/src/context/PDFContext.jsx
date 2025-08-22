// src/context/PDFContext.jsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import documentService from '../services/documentService';
import selectionService from '../services/selectionService';
import { toast } from 'react-hot-toast';

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [documentStructures, setDocumentStructures] = useState({});

  // Upload multiple PDFs
  const uploadPDFs = useCallback(async (files) => {
    if (!files || files.length === 0) return [];

    setIsLoading(true);
    setUploadProgress(0);

    try {
      // Filter PDF files
      const pdfFiles = Array.from(files).filter(
        file => file.type === 'application/pdf'
      );

      if (pdfFiles.length === 0) {
        toast.error('Please select PDF files only');
        return [];
      }

      // Upload documents
      const uploadedDocuments = await documentService.uploadDocuments(pdfFiles);
      
      // Process documents in background
      const processedDocuments = await Promise.all(
        uploadedDocuments.map(async (doc) => {
          try {
            const processed = await documentService.processDocument(doc.id);
            
            // Store document structure
            setDocumentStructures(prev => ({
              ...prev,
              [doc.id]: processed
            }));

            return {
              ...doc,
              file: pdfFiles.find(f => f.name === doc.name),
              processed: true,
              sections: processed.sections || [],
              metadata: processed.metadata || {}
            };
          } catch (error) {
            console.error(`Failed to process document ${doc.name}:`, error);
            return {
              ...doc,
              file: pdfFiles.find(f => f.name === doc.name),
              processed: false,
              error: error.message
            };
          }
        })
      );

      // Update state
      setPdfDocuments(prev => [...prev, ...processedDocuments]);
      
      toast.success(`Successfully uploaded ${processedDocuments.length} documents`);
      return processedDocuments;

    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload documents: ' + error.message);
      return [];
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  }, []);

  // Set current document for viewing
  const setAsCurrentDocument = useCallback((document) => {
    setCurrentDocument(document);
  }, []);

  // Get related sections for selected text
  const getRelevantSections = useCallback(async (selectedText, currentDocId) => {
    if (!selectedText || selectedText.length < 10) {
      return [];
    }

    try {
      // Call the selection service to find related content
      const results = await selectionService.findRelatedContent(
        currentDocId, 
        selectedText
      );

      // Transform results to match expected format
      return results.map(result => ({
        id: result.section_id,
        documentId: result.documentId,
        documentTitle: result.documentTitle || result.doc_title,
        heading: result.heading,
        snippet: result.snippet || result.excerpt,
        preview: result.preview,
        similarity: result.similarity || result.similarity_score,
        pageNumber: result.page_num || result.pageNumber,
        relevanceType: result.relevance_type || 'related',
        level: result.level || 'section'
      }));
      
    } catch (error) {
      console.error('Error fetching relevant sections:', error);
      toast.error('Failed to find related content');
      return [];
    }
  }, []);

  // Search within documents
  const searchDocuments = useCallback(async (query, documentIds = []) => {
    if (!query || query.trim().length < 3) {
      return [];
    }

    try {
      const results = [];
      const targetDocs = documentIds.length > 0 ? documentIds : pdfDocuments.map(doc => doc.id);

      for (const docId of targetDocs) {
        const docResults = await documentService.searchDocument(docId, query);
        results.push(...docResults.map(result => ({
          ...result,
          documentId: docId,
          documentTitle: pdfDocuments.find(d => d.id === docId)?.name || 'Unknown'
        })));
      }

      return results.sort((a, b) => (b.score || 0) - (a.score || 0));
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed');
      return [];
    }
  }, [pdfDocuments]);

  // Get document statistics
  const getDocumentStats = useCallback(async (documentId) => {
    try {
      return await documentService.getDocumentStats(documentId);
    } catch (error) {
      console.error('Failed to get document stats:', error);
      return null;
    }
  }, []);

  // Delete document
  const deleteDocument = useCallback(async (documentId) => {
    try {
      await documentService.deleteDocument(documentId);
      
      setPdfDocuments(prev => prev.filter(doc => doc.id !== documentId));
      setDocumentStructures(prev => {
        const updated = { ...prev };
        delete updated[documentId];
        return updated;
      });
      
      if (currentDocument?.id === documentId) {
        setCurrentDocument(null);
      }
      
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete document');
    }
  }, [currentDocument]);

  // Load all documents on mount
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const documents = await documentService.getAllDocuments();
        setPdfDocuments(documents || []);
      } catch (error) {
        console.error('Failed to load documents:', error);
      }
    };

    loadDocuments();
  }, []);

  const value = {
    // State
    pdfDocuments,
    currentDocument,
    isLoading,
    uploadProgress,
    documentStructures,

    // Actions
    uploadPDFs,
    setAsCurrentDocument,
    getRelevantSections,
    searchDocuments,
    getDocumentStats,
    deleteDocument,

    // Computed values
    hasDocuments: pdfDocuments.length > 0,
    processedDocuments: pdfDocuments.filter(doc => doc.processed),
    failedDocuments: pdfDocuments.filter(doc => doc.error),
  };

  return <PDFContext.Provider value={value}>{children}</PDFContext.Provider>;
};