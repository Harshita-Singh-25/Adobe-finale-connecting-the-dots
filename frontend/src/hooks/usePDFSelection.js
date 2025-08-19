import { useState, useRef, useEffect, useCallback } from "react";

export const usePDFSelection = () => {
  const [selections, setSelections] = useState([]);
  const [currentSelection, setCurrentSelection] = useState(null);
  const apiRef = useRef(null);

  // Initialize API reference
  const initializePDF = useCallback((preview) => {
    preview.getAPIs().then((apis) => {
      apiRef.current = apis;

      // Listen to text selections
      apis.addEventListener("SELECTION_CHANGE", (event) => {
        if (event.data && event.data.selection) {
          const newSelection = {
            id: Date.now().toString(),
            text: event.data.selection,
            color: "yellow",
            createdAt: new Date().toISOString(),
          };
          setSelections((prev) => [...prev, newSelection]);
          setCurrentSelection(newSelection);
        }
      });
    });
  }, []);

  const clearSelections = useCallback(() => {
    setSelections([]);
    setCurrentSelection(null);
  }, []);

  const removeSelection = useCallback((id) => {
    setSelections((prev) => prev.filter((sel) => sel.id !== id));
  }, []);

  return {
    selections,
    currentSelection,
    initializePDF,
    clearSelections,
    removeSelection,
    getSelectionRects: () => [], // With Adobe API you don’t get bounding boxes easily
  };
};
