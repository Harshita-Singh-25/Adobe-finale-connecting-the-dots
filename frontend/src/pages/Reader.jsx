import React, { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Document, Page } from 'react-pdf';
import { ZoomInIcon, ZoomOutIcon, ArrowLeftIcon, ArrowRightIcon, SearchIcon } from '@heroicons/react/outline';

// Set worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const Reader = () => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfFile, setPdfFile] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const canvasRef = useRef(null);

  // Load PDF file
  const onFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setPageNumber(1);
    }
  };

  // Document load success handler
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  // Go to previous page
  const goToPrevPage = () => {
    setPageNumber(prevPage => Math.max(prevPage - 1, 1));
  };

  // Go to next page
  const goToNextPage = () => {
    setPageNumber(prevPage => Math.min(prevPage + 1, numPages));
  };

  // Zoom in
  const zoomIn = () => {
    setScale(prevScale => Math.min(prevScale + 0.25, 3.0));
  };

  // Zoom out
  const zoomOut = () => {
    setScale(prevScale => Math.max(prevScale - 0.25, 0.5));
  };

  // Search text in PDF
  const handleSearch = async () => {
    if (!pdfFile || !searchText) return;

    try {
      const url = URL.createObjectURL(pdfFile);
      const pdf = await pdfjsLib.getDocument(url).promise;
      const results = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const textItems = textContent.items.map(item => item.str).join(' ');
        
        if (textItems.toLowerCase().includes(searchText.toLowerCase())) {
          results.push({
            page: i,
            text: textItems.substring(0, 100) + '...' // Show preview
          });
        }
      }

      setSearchResults(results);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  // Jump to search result page
  const goToSearchResult = (pageNum) => {
    setPageNumber(pageNum);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Toolbar */}
      <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <input
            type="file"
            accept="application/pdf"
            onChange={onFileChange}
            className="hidden"
            id="pdf-upload"
          />
          <label
            htmlFor="pdf-upload"
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 cursor-pointer transition-colors"
          >
            Open PDF
          </label>
          
          {pdfFile && (
            <span className="text-sm text-gray-300 truncate max-w-xs">
              {pdfFile.name}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search in PDF..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="px-4 py-2 pr-10 rounded text-gray-800"
            />
            <button
              onClick={handleSearch}
              className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
            >
              <SearchIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* PDF Viewer */}
        <div className="flex-1 overflow-auto p-4 flex flex-col items-center">
          {pdfFile ? (
            <>
              <Document
                file={pdfFile}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={<div className="text-gray-500">Loading PDF...</div>}
                error={<div className="text-red-500">Failed to load PDF</div>}
                className="shadow-lg"
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  canvasRef={canvasRef}
                  loading={<div className="text-gray-500">Loading page...</div>}
                />
              </Document>

              {/* Page Controls */}
              <div className="mt-4 flex items-center justify-center space-x-6">
                <button
                  onClick={goToPrevPage}
                  disabled={pageNumber <= 1}
                  className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 transition-colors"
                >
                  <ArrowLeftIcon className="h-6 w-6" />
                </button>
                
                <span className="text-lg font-medium">
                  Page {pageNumber} of {numPages || '--'}
                </span>
                
                <button
                  onClick={goToNextPage}
                  disabled={pageNumber >= numPages}
                  className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 transition-colors"
                >
                  <ArrowRightIcon className="h-6 w-6" />
                </button>
                
                <div className="flex space-x-2">
                  <button
                    onClick={zoomOut}
                    disabled={scale <= 0.5}
                    className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 transition-colors"
                  >
                    <ZoomOutIcon className="h-6 w-6" />
                  </button>
                  
                  <span className="flex items-center px-2">
                    {Math.round(scale * 100)}%
                  </span>
                  
                  <button
                    onClick={zoomIn}
                    disabled={scale >= 3.0}
                    className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 transition-colors"
                  >
                    <ZoomInIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <p className="text-xl mb-4">No PDF file selected</p>
              <p>Please open a PDF file to begin reading</p>
            </div>
          )}
        </div>

        {/* Search Results Sidebar */}
        {searchResults.length > 0 && (
          <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto p-4">
            <h3 className="font-bold text-lg mb-4">Search Results</h3>
            <div className="space-y-3">
              {searchResults.map((result, index) => (
                <div
                  key={index}
                  onClick={() => goToSearchResult(result.page)}
                  className="p-3 hover:bg-gray-100 rounded cursor-pointer border border-gray-100"
                >
                  <div className="font-medium text-blue-600">Page {result.page}</div>
                  <p className="text-sm text-gray-600 mt-1">{result.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reader;