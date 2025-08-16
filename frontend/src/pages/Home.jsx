import React, { useState, useEffect } from 'react';
import { usePDFNavigation } from "../hooks/usePDFNavigation";
import { usePDFSelection } from "../hooks/usePDFSelection";
import { useSemanticSearch } from "../hooks/useSemanticSearch";
import * as pdfjsLib from 'pdfjs-dist';

const Home = () => {
  // PDF Navigation
  const {
    currentPage,
    totalPages,
    scale,
    isLoading: isPdfLoading,
    error: pdfError,
    pdfContainerRef,
    initializePDF,
    goToPage,
    nextPage,
    prevPage,
    zoom,
    fitToWidth,
    isFirstPage,
    isLastPage,
  } = usePDFNavigation();

  // PDF Selection
  const {
    selections,
    currentSelection,
    initializePDF: initSelection,
    clearSelections,
    removeSelection,
    getSelectionRects,
  } = usePDFSelection();

  // Semantic Search
  const {
    query,
    results,
    isLoading: isSearchLoading,
    error: searchError,
    searchType,
    threshold,
    setQuery,
    setSearchType,
    setThreshold,
    search,
    clearResults,
  } = useSemanticSearch();

  // State for uploaded PDF
  const [pdfFile, setPdfFile] = useState(null);
  const [highlights, setHighlights] = useState([]);

  // Initialize PDF when file is selected
  useEffect(() => {
    if (!pdfFile) return;

    const loadPDF = async () => {
      try {
        const url = URL.createObjectURL(pdfFile);
        const loadingTask = pdfjsLib.getDocument(url);
        const pdfDocument = await loadingTask.promise;
        
        initializePDF(url);
        initSelection(pdfDocument);
      } catch (err) {
        console.error('PDF loading error:', err);
      }
    };

    loadPDF();

    return () => {
      if (pdfFile) {
        URL.revokeObjectURL(pdfFile);
      }
    };
  }, [pdfFile, initializePDF, initSelection]);

  // Update highlights when selections change
  useEffect(() => {
    setHighlights(getSelectionRects());
  }, [selections, getSelectionRects]);

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      clearSelections();
      clearResults();
    }
  };

  // Handle search from selection
  const handleSearchFromSelection = () => {
    if (currentSelection?.text) {
      setQuery(currentSelection.text);
      search(currentSelection.text);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-800 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Document Intelligence Platform</h1>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            id="pdf-upload"
            className="hidden"
          />
          <label 
            htmlFor="pdf-upload" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded cursor-pointer transition-colors"
          >
            Upload PDF
          </label>
          {pdfFile && (
            <span className="text-sm text-blue-100 truncate max-w-xs">
              {pdfFile.name}
            </span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* PDF Viewer */}
        <div className="flex-1 p-4 overflow-auto border-r border-gray-200">
          {!pdfFile ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Upload a PDF document to begin</p>
            </div>
          ) : (
            <>
              {/* PDF Controls */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <button 
                  onClick={prevPage} 
                  disabled={isFirstPage || isPdfLoading}
                  className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <button 
                  onClick={nextPage} 
                  disabled={isLastPage || isPdfLoading}
                  className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                >
                  Next
                </button>
                <button 
                  onClick={() => zoom(scale + 0.1)} 
                  className="px-3 py-1 bg-gray-200 rounded"
                >
                  Zoom In
                </button>
                <button 
                  onClick={() => zoom(scale - 0.1)} 
                  className="px-3 py-1 bg-gray-200 rounded"
                >
                  Zoom Out
                </button>
                <button 
                  onClick={fitToWidth} 
                  className="px-3 py-1 bg-gray-200 rounded"
                >
                  Fit Width
                </button>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => goToPage(parseInt(e.target.value))}
                  disabled={isPdfLoading}
                  className="w-16 px-2 py-1 border rounded"
                />
              </div>

              {/* PDF Container */}
              <div
                ref={pdfContainerRef}
                className="relative bg-white shadow-md overflow-hidden"
                style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }}
              >
                {/* PDF content would be rendered here */}
                {isPdfLoading && (
                  <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                    <p className="text-white">Loading PDF...</p>
                  </div>
                )}
                {pdfError && (
                  <div className="p-2 bg-red-100 text-red-800">
                    {pdfError}
                  </div>
                )}

                {/* Highlights */}
                {highlights.map((highlight) => (
                  <div
                    key={highlight.id}
                    className="absolute pointer-events-none"
                    style={{
                      left: `${highlight.rects[0].left}px`,
                      top: `${highlight.rects[0].top}px`,
                      width: `${highlight.rects[0].width}px`,
                      height: `${highlight.rects[0].height}px`,
                      backgroundColor: highlight.color,
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Search Panel */}
        <div className="w-96 p-4 overflow-auto bg-gray-50">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Semantic Search</h2>
            
            {/* Search Input */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter search query..."
                disabled={!pdfFile}
                className="flex-1 px-3 py-2 border rounded disabled:opacity-50"
              />
              <button 
                onClick={() => search(query)} 
                disabled={!pdfFile || isSearchLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isSearchLoading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {currentSelection && (
              <button 
                onClick={handleSearchFromSelection}
                className="w-full mb-3 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Search Selection
              </button>
            )}

            {/* Search Options */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2">
                <label className="text-sm">Search Type:</label>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="flex-1 px-2 py-1 border rounded"
                >
                  <option value="semantic">Semantic</option>
                  <option value="keyword">Keyword</option>
                </select>
              </div>

              {searchType === 'semantic' && (
                <div className="flex items-center gap-2">
                  <label className="text-sm">Similarity Threshold:</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm w-10">{threshold.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Search Results */}
          <div>
            {searchError && (
              <div className="p-2 mb-3 bg-red-100 text-red-800 rounded">
                {searchError}
              </div>
            )}

            {results.length > 0 ? (
              <ul className="space-y-3">
                {results.map((result, index) => (
                  <li key={index} className="p-3 bg-white rounded shadow">
                    <h3 className="font-medium">
                      {result.title || `Result ${index + 1}`}
                    </h3>
                    {result.similarity && (
                      <div className="text-sm text-blue-600 mb-1">
                        Similarity: {(result.similarity * 100).toFixed(1)}%
                      </div>
                    )}
                    <p className="text-sm text-gray-700 mb-2">{result.content}</p>
                    {result.page && (
                      <button 
                        onClick={() => goToPage(result.page)}
                        className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                      >
                        Go to Page {result.page}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center text-gray-500 p-4">
                {query ? 'No results found' : 'Enter a search query'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selection Info Panel */}
      {currentSelection && (
        <div className="p-3 bg-white border-t border-gray-200">
          <h3 className="font-medium mb-1">Current Selection</h3>
          <p className="text-sm mb-2">{currentSelection.text}</p>
          <button 
            onClick={() => removeSelection(currentSelection.id)}
            className="px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 text-sm"
          >
            Remove Selection
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;