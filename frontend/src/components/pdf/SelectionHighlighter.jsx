import React, { useEffect, useState } from 'react';
import { usePDFSelection } from '../../hooks/usePDFSelection';
import { findRelatedSections } from '../../services/selectionService';
import Button from '../common/Button';
import { ReactComponent as HighlightIcon } from '../../assets/icons/highlight.svg';
import { ReactComponent as LinkIcon } from '../../assets/icons/link.svg';

const SelectionHighlighter = ({ documentId, onInsightsRequest, onRelatedSectionsFound }) => {
  const { selectedText, clearSelection, selectionPosition } = usePDFSelection();
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Handle text selection with debounce
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (selectedText && selectedText.length > 10) {
        setShowTooltip(true);
      } else {
        setShowTooltip(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [selectedText]);

  const handleFindRelated = async () => {
    if (!selectedText || !documentId) return;
    
    setIsLoading(true);
    try {
      const response = await findRelatedSections({
        selected_text: selectedText,
        current_doc_id: documentId
      });
      
      onRelatedSectionsFound?.(response.related_sections);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
      setShowTooltip(false);
      clearSelection();
    }
  };

  const handleGenerateInsights = () => {
    onInsightsRequest?.(selectedText);
    clearSelection();
    setShowTooltip(false);
  };

  if (!showTooltip || !selectionPosition) return null;

  return (
    <div 
      className="absolute bg-white shadow-lg rounded-md p-2 flex space-x-2 z-50 transition-all"
      style={{
        left: `${selectionPosition.x}px`,
        top: `${selectionPosition.y - 50}px`,
        transform: 'translateX(-50%)'
      }}
    >
      <Button 
        variant="ghost"
        size="sm"
        onClick={handleFindRelated}
        disabled={isLoading}
        icon={<LinkIcon className="w-4 h-4" />}
        tooltip="Find related sections"
      />

      <Button
        variant="ghost"
        size="sm"
        onClick={handleGenerateInsights}
        icon={<HighlightIcon className="w-4 h-4" />}
        tooltip="Generate insights"
      />
    </div>
  );
};

export default SelectionHighlighter;