// frontend/src/context/SelectionContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';

// Define context internally (not exported)
const SelectionContext = createContext();

// Main Provider Component (only export this)
export function SelectionProvider({ children }) {
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState(null);
  const [selectionMetadata, setSelectionMetadata] = useState({
    pageNumber: null,
    sectionId: null,
    documentId: null
  });
  const [isSelecting, setIsSelecting] = useState(false);

  const clearSelection = useCallback(() => {
    setSelectedText('');
    setSelectionPosition(null);
    setSelectionMetadata({
      pageNumber: null,
      sectionId: null,
      documentId: null
    });
    setIsSelecting(false);
  }, []);

  const handleTextSelection = useCallback((text, position, metadata) => {
    if (!text || text.trim().length === 0) {
      clearSelection();
      return;
    }

    setIsSelecting(true);
    setSelectedText(text.trim());
    setSelectionPosition(position);
    setSelectionMetadata({
      pageNumber: metadata?.pageNumber || null,
      sectionId: metadata?.sectionId || null,
      documentId: metadata?.documentId || null
    });
    setIsSelecting(false);
  }, [clearSelection]);

  const hasSelection = useCallback(() => {
    return selectedText.length > 0;
  }, [selectedText]);

  return (
    <SelectionContext.Provider
      value={{
        selectedText,
        selectionPosition,
        selectionMetadata,
        isSelecting,
        handleTextSelection,
        clearSelection,
        hasSelection
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
}

SelectionProvider.propTypes = {
  children: PropTypes.node.isRequired
};

// Define hook internally
function useSelection() {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return context;
}

// Attach hook to Provider (this is the key change)
SelectionProvider.useSelection = useSelection;