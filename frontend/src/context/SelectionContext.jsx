// context/SelectionContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';

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

  const handleTextSelection = useCallback((text, position, metadata) => {
    if (!text || text.trim().length === 0) {
      setSelectedText('');
      setSelectionPosition(null);
      return;
    }

    setSelectedText(text.trim());
    setSelectionPosition(position);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedText('');
    setSelectionPosition(null);
  }, []);

  return (
    <SelectionContext.Provider
      value={{
        selectedText,
        selectionPosition,
        handleTextSelection,
        clearSelection,
        hasSelection: selectedText.length > 0
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
};


export { SelectionContext }; // ✅ This fixes the error
