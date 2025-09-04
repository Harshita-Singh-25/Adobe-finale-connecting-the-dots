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

      // The backend returns BulkUploadResponse with `documents` array
      const uploadResponse = await documentService.uploadDocuments(pdfFiles);
      const uploadedDocs = uploadResponse.documents || [];

      // Update state with the newly uploaded documents
      setPdfDocuments(prev => [
        ...prev,
        ...uploadedDocs.map(doc => ({
          id: doc.doc_id,
          name: doc.title || doc.filename,
          processed: true,
          sectionsCount: doc.sections,
          metadata: {}
        }))
      ]);
      
      toast.success(`Successfully uploaded ${uploadedDocs.length} documents`);
      return uploadedDocs;

    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload documents: ' + (error.message || 'Network error'));
      return [];
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  }, []);


  // Set current document for viewing
  const setAsCurrentDocument = useCallback(async (documentId) => {
    if (documentStructures[documentId]) {
      setCurrentDocument(documentStructures[documentId]);
      return;
    }
    
    try {
      // First get document details
      const documentDetails = await documentService.getDocumentDetails(documentId);
      console.log('Document details received:', documentDetails);
      
      if (!documentDetails) {
        throw new Error('Document details not found');
      }
      
      // Try to fetch the actual PDF file, but don't fail if it's not available
      let file = null;
      const fileName = documentDetails?.title || 'document.pdf';
      
      try {
        const pdfFile = await documentService.getPDFFile(documentId);
        // Create a File object from the blob
        file = new File([pdfFile], fileName, {
          type: 'application/pdf'
        });
        console.log('PDF file loaded successfully:', { name: fileName, size: pdfFile.size, type: pdfFile.type });
      } catch (fileError) {
        console.warn('Could not load PDF file, will use URL instead:', fileError);
        // Fallback: create a URL-based file reference
        file = {
          name: fileName,
          type: 'application/pdf',
          url: `http://localhost:8000/api/documents/${documentId}/file`
        };
        console.log('Using URL fallback for PDF file:', file.url);
      }
      
      const documentWithFile = {
        ...documentDetails,
        file: file,
        name: documentDetails?.title || fileName
      };
      
      setDocumentStructures(prev => ({
        ...prev,
        [documentId]: documentWithFile
      }));
      setCurrentDocument(documentWithFile);
    } catch (error) {
      console.error('Failed to set current document:', error);
      
      // Fallback: try to create a minimal document object and load PDF directly
      try {
        console.log('Attempting fallback: loading PDF directly');
        const pdfFile = await documentService.getPDFFile(documentId);
        const file = new File([pdfFile], 'document.pdf', {
          type: 'application/pdf'
        });
        
        const fallbackDocument = {
          doc_id: documentId,
          title: 'Document',
          file: file,
          name: 'Document'
        };
        
        setCurrentDocument(fallbackDocument);
        console.log('Fallback document loaded successfully');
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        toast.error('Failed to load document. Please try again.');
      }
    }
  }, [documentStructures]);

  // Get related sections for selected text
  const getRelevantSections = useCallback(async (selectedText, currentDocId) => {
    if (!selectedText || selectedText.length < 10) {
      return [];
    }

    try {
      // Call the documentService directly as it now contains the logic
      const results = await documentService.findRelatedSections({
        selected_text: selectedText,
        current_doc_id: currentDocId
      });
      return results;
      
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
      // The `documentService` should have a search function that your backend supports
      const results = await documentService.searchDocuments(query, documentIds);
      return results;
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed');
      return [];
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
      
      if (currentDocument?.doc_id === documentId) {
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
        // Assuming the backend returns documents with `doc_id`
        setPdfDocuments(documents.map(doc => ({
          ...doc,
          id: doc.doc_id,
          name: doc.title,
          processed: true
        })) || []);
      } catch (error) {
        console.error('Failed to load documents:', error);
        toast.error('Failed to load documents.');
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
    deleteDocument,

    // Computed values
    hasDocuments: pdfDocuments.length > 0,
    processedDocuments: pdfDocuments.filter(doc => doc.processed),
    failedDocuments: pdfDocuments.filter(doc => doc.error),
  };

  return <PDFContext.Provider value={value}>{children}</PDFContext.Provider>;
};