import React, { createContext, useContext, useState, useCallback } from 'react';
import documentService from '../services/documentService'; // Use documentService for all calls
import { toast } from 'react-hot-toast';

const SelectionContext = createContext();

export const useSelection = () => {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return context;
};

export const SelectionProvider = ({ children }) => {
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState(null);
  const [relatedSections, setRelatedSections] = useState([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);
  const [selectionContext, setSelectionContext] = useState(null);

  // Handle text selection from PDF viewer
  const handleTextSelection = useCallback(async (text, position, context = {}) => {
    if (!text || text.trim().length < 3) {
      clearSelection();
      return;
    }

    setSelectedText(text.trim());
    setSelectionPosition(position);
    setSelectionContext(context);

    // Auto-fetch related sections after a short delay
    if (text.trim().length >= 10 && context.documentId) {
      setTimeout(() => {
        fetchRelatedSections(text.trim(), context.documentId);
      }, 500);
    }
  }, []);

  // Fetch related sections from backend
  const fetchRelatedSections = useCallback(async (text, currentDocId) => {
    if (!text || text.length < 10) {
      setRelatedSections([]);
      return [];
    }

    setIsLoadingRelated(true);
    try {
      const results = await documentService.findRelatedSections({
        selected_text: text,
        current_doc_id: currentDocId
      });
      setRelatedSections(results || []);
      return results || [];
    } catch (error) {
      console.error('Error fetching related sections:', error);
      toast.error('Failed to find related content');
      setRelatedSections([]);
      return [];
    } finally {
      setIsLoadingRelated(false);
    }
  }, []);

  // The following functions are not supported by the backend code you provided.
  // They are left as placeholders and will likely fail with 404 errors.
  const findContradictions = useCallback(async (documentId) => {
    console.error("Backend route for contradictions not implemented.");
    toast.error('Feature not available');
    return [];
  }, []);

  const findExamples = useCallback(async (documentId) => {
    console.error("Backend route for examples not implemented.");
    toast.error('Feature not available');
    return [];
  }, []);

  const generateSummary = useCallback(async (documentId) => {
    console.error("Backend route for summary not implemented.");
    toast.error('Feature not available');
    return null;
  }, []);

  // Clear selection state
  const clearSelection = useCallback(() => {
    setSelectedText('');
    setSelectionPosition(null);
    setSelectionContext(null);
    setRelatedSections([]);
  }, []);

  // Manually trigger related sections search
  const searchRelated = useCallback(async (text, documentId) => {
    return await fetchRelatedSections(text, documentId);
  }, [fetchRelatedSections]);

  const value = {
    // State
    selectedText,
    selectionPosition,
    selectionContext,
    relatedSections,
    isLoadingRelated,

    // Actions
    handleTextSelection,
    fetchRelatedSections,
    findContradictions,
    findExamples,
    generateSummary,
    clearSelection,
    searchRelated,

    // Utilities
    hasSelection: Boolean(selectedText),
    isValidSelection: Boolean(selectedText && selectedText.length >= 10),
  };

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
};

export { SelectionContext };