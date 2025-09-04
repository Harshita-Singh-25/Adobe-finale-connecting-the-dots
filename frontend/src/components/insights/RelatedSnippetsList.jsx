import React, { useState } from 'react';
import { Button } from '../common/Button';
import Loader from '../common/Loader';

export const RelatedSnippetsList = ({ snippets = [], isLoading = false, onSnippetClick }) => {
  const [expandedSnippet, setExpandedSnippet] = useState(null);

  const toggleSnippetExpand = (snippetId) => {
    setExpandedSnippet(expandedSnippet === snippetId ? null : snippetId);
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <Loader />
      </div>
    );
  }

  if (!snippets || snippets.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No related content found
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2" style={{ maxHeight: 'calc(100vh - 200px)' }}>
      {snippets.map((snippet, index) => {
        const key = `${snippet.documentId || snippet.doc_id || index}-${snippet.sectionId || snippet.section_id || index}`;
        const title = snippet.sectionTitle || snippet.heading || 'Related Section';
        const score = snippet.similarityScore || snippet.similarity_score;
        const page = snippet.pageNumber || snippet.page_num;
        const preview = snippet.snippet || snippet.preview || '';

        return (
          <div
            key={key}
            className={`p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer ${expandedSnippet === key ? 'bg-blue-50' : 'bg-white'}`}
            onClick={() => onSnippetClick && onSnippetClick(snippet)}
          >
            <div className="flex justify-between items-start">
              <h4 className="font-medium text-blue-600 mb-1">
                {snippet.doc_title || 'Document'}
              </h4>
              {typeof score === 'number' && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {score.toFixed(2)} match
                </span>
              )}
            </div>

            <h5 className="text-sm font-semibold text-gray-700 mb-2">{title}</h5>
            <p className="text-gray-600 text-sm mb-2 line-clamp-3">
              {expandedSnippet === key ? (snippet.fullText || snippet.content || preview) : preview}
            </p>

            <div className="flex justify-between items-center mt-2">
              <Button
                size="xs"
                variant="text"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSnippetExpand(key);
                }}
              >
                {expandedSnippet === key ? 'Show less' : 'Show more'}
              </Button>
              {page && (
                <span className="text-xs text-gray-500">Page {page}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};