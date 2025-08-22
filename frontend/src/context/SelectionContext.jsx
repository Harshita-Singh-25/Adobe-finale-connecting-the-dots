// src/context/SelectionContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import selectionService from '../services/selectionService';
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
      const results = await selectionService.findRelatedContent(currentDocId, text);
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

  // Find contradictions for selected text
  const findContradictions = useCallback(async (documentId) => {
    if (!selectedText || !documentId) return [];

    try {
      const contradictions = await selectionService.findContradictions(documentId, selectedText);
      return contradictions || [];
    } catch (error) {
      console.error('Error finding contradictions:', error);
      toast.error('Failed to find contradictions');
      return [];
    }
  }, [selectedText]);

  // Find examples for selected text
  const findExamples = useCallback(async (documentId) => {
    if (!selectedText || !documentId) return [];

    try {
      const examples = await selectionService.findExamples(documentId, selectedText);
      return examples || [];
    } catch (error) {
      console.error('Error finding examples:', error);
      toast.error('Failed to find examples');
      return [];
    }
  }, [selectedText]);

  // Generate summary for selected text
  const generateSummary = useCallback(async (documentId) => {
    if (!selectedText || !documentId) return null;

    try {
      const summary = await selectionService.generateSummary(documentId, selectedText);
      return summary;
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Failed to generate summary');
      return null;
    }
  }, [selectedText]);

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