import React, { useContext, useEffect, useState, useCallback } from 'react';
import { Button } from '../common/Button';
import { Loader } from '../common/Loader';
import { Toast } from '../common/Toast';
import { PDFContext } from '../../context/PDFContext';
import { SelectionContext } from '../../context/SelectionContext';
import { InsightsContext } from '../../context/InsightsContext';
import { highlightText } from '../../utils/highlightText';
import useSemanticSearch from '../../hooks/useSemanticSearch';
import usePDFNavigation from '../../hooks/usePDFNavigation';

export const RelatedSnippetsList = () => {
  const { currentPDF, allDocuments } = useContext(PDFContext);
  const { selectedText } = useContext(SelectionContext); // Removed unused selectionPosition
  const { setActiveInsight } = useContext(InsightsContext);
  
  const [snippets, setSnippets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSnippet, setExpandedSnippet] = useState(null);
  
  const { findRelatedSections } = useSemanticSearch();
  const { navigateToPDFSection } = usePDFNavigation();

  const fetchRelatedSnippets = useCallback(async () => {
    if (!selectedText || selectedText.trim().length === 0) {
      setSnippets([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const relatedSections = await findRelatedSections(
        selectedText, 
        currentPDF?.id, 
        allDocuments
      );
      
      setSnippets(relatedSections);
      if (relatedSections.length > 0) {
        setActiveInsight('related');
      }
    } catch (err) {
      setError('Failed to fetch related snippets. Please try again.');
      console.error('Error fetching snippets:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedText, currentPDF?.id, allDocuments, findRelatedSections, setActiveInsight]);

  useEffect(() => {
    fetchRelatedSnippets();
  }, [fetchRelatedSnippets]);

  const handleSnippetClick = (snippet) => {
    navigateToPDFSection(snippet.documentId, snippet.sectionId);
  };

  const toggleSnippetExpand = (snippetId) => {
    setExpandedSnippet(expandedSnippet === snippetId ? null : snippetId);
  };

  const getDocumentTitle = (documentId) => {
    return allDocuments.find(doc => doc.id === documentId)?.title || 'Unknown Document';
  };

  if (!selectedText) {
    return (
      <div className="p-4 text-center text-gray-500">
        Select text in the PDF to find related content
      </div>
    );
  }

  return (
    <div 
      className="relative h-full overflow-y-auto"
      style={{ maxHeight: 'calc(100vh - 200px)' }}
    >
      {isLoading && <Loader className="absolute top-4 left-1/2 transform -translate-x-1/2" />}
      
      {error && (
        <Toast 
          message={error} 
          type="error" 
          onClose={() => setError(null)}
          className="mb-4"
        />
      )}

      {!isLoading && snippets.length === 0 && (
        <div className="p-4 text-center text-gray-500">
          No related content found for the selected text
        </div>
      )}

      <div className="space-y-4 p-2">
        {snippets.map((snippet) => (
          <div 
            key={`${snippet.documentId}-${snippet.sectionId}`}
            className={`p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer ${expandedSnippet === `${snippet.documentId}-${snippet.sectionId}` ? 'bg-blue-50' : 'bg-white'}`}
            onClick={() => handleSnippetClick(snippet)}
          >
            <div className="flex justify-between items-start">
              <h4 className="font-medium text-blue-600 mb-1">
                {getDocumentTitle(snippet.documentId)}
              </h4>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {snippet.similarityScore.toFixed(2)} match
              </span>
            </div>
            
            <h5 className="text-sm font-semibold text-gray-700 mb-2">
              {snippet.sectionTitle}
            </h5>
            
            <div 
              className="text-gray-600 text-sm mb-2 line-clamp-3"
              dangerouslySetInnerHTML={{
                __html: highlightText(
                  expandedSnippet === `${snippet.documentId}-${snippet.sectionId}` 
                    ? snippet.fullText 
                    : snippet.snippet,
                  selectedText
                )
              }}
            />
            
            <div className="flex justify-between items-center mt-2">
              <Button 
                size="xs"
                variant="text"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSnippetExpand(`${snippet.documentId}-${snippet.sectionId}`);
                }}
              >
                {expandedSnippet === `${snippet.documentId}-${snippet.sectionId}` ? 'Show less' : 'Show more'}
              </Button>
              
              <span className="text-xs text-gray-500">
                Page {snippet.pageNumber}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};