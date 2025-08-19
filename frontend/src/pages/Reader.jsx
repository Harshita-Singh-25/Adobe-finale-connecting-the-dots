import React, { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { usePDF } from '../context/PDFContext';
import { useSelection } from '../context/SelectionContext';
import InsightBulb from "../components/insights/InsightBulb";
import { RelatedSnippetsList as SnippetPanel } from "../components/insights/RelatedSnippetsList";

const Reader = () => {
  const { documentId } = useParams();
  const { currentDocument, getRelevantSections, pdfDocuments, setAsCurrentDocument } = usePDF();
  const { selectedText } = useSelection();
  const [snippets, setSnippets] = useState([]);
  const [isLoadingSnippets, setIsLoadingSnippets] = useState(false);

  // Load the document when documentId changes
  useEffect(() => {
    if (documentId && pdfDocuments.length > 0) {
      // Find the document in your uploaded documents
      const document = pdfDocuments.find(doc => 
        doc.id === documentId || doc.id.toString() === documentId
      );
      
      if (document) {
        setAsCurrentDocument(document);
      } else {
        console.warn('Document not found in uploaded documents:', documentId);
      }
    }
  }, [documentId, pdfDocuments, setAsCurrentDocument]);

  const fetchRelevantSections = useCallback(async (text) => {
    if (!text || text.trim().length < 3) {
      setSnippets([]);
      return;
    }

    setIsLoadingSnippets(true);
    try {
      const relevantSections = await getRelevantSections(text, documentId);
      setSnippets(relevantSections || []);
    } catch (error) {
      console.error('Error fetching relevant sections:', error);
      setSnippets([]);
    } finally {
      setIsLoadingSnippets(false);
    }
  }, [documentId, getRelevantSections]);

  useEffect(() => {
    if (selectedText) {
      const timer = setTimeout(() => {
        fetchRelevantSections(selectedText);
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setSnippets([]);
    }
  }, [selectedText, fetchRelevantSections]);

  if (!currentDocument) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📄</span>
          </div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Document Selected</h3>
          <p className="text-gray-500">Please select a PDF document to view</p>
          {pdfDocuments.length === 0 && (
            <p className="text-sm text-gray-400 mt-2">No documents uploaded yet</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Main PDF Viewer Area */}
      <div className="flex-1 p-4">
        <div className="bg-white rounded-lg shadow-md h-full flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📄</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {currentDocument.name}
            </h3>
            <p className="text-gray-600 mb-4">
              PDF document ready for analysis
            </p>
            <div className="text-sm text-gray-500">
              <p>Size: {(currentDocument.size / 1024 / 1024).toFixed(2)} MB</p>
              <p>Uploaded: {new Date(currentDocument.uploadDate).toLocaleDateString()}</p>
            </div>
            
            {/* Add your actual PDF viewer component here */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">
                PDF viewer component will be integrated here
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Document ID: {currentDocument.id}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Snippets Sidebar */}
      <div className="w-96 bg-white border-l border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Related Content</h3>
          <p className="text-sm text-gray-600">
            Select text in the PDF to find related sections across your documents
          </p>
        </div>
        
        {selectedText && (
          <div className="p-4 bg-blue-50 border-b border-blue-100">
            <p className="text-sm font-medium text-blue-800 mb-1">Selected Text:</p>
            <p className="text-sm text-blue-700 line-clamp-2">
              {selectedText.length > 120 
                ? selectedText.substring(0, 120) + '...' 
                : selectedText
              }
            </p>
          </div>
        )}
        
        <div className="p-4">
          <SnippetPanel 
            snippets={snippets}
            isLoading={isLoadingSnippets}
            onSnippetClick={(snippet) => {
              console.log('Navigate to snippet:', snippet);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Reader;