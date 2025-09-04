// src/pages/Home.jsx
import React, { useState, useRef } from 'react';
import { usePDF } from '../context/PDFContext';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, ChevronRight, Search } from 'lucide-react';
import { Button } from '../components/common/Button'; // CORRECTED IMPORT PATH

const Home = () => {
  const { uploadPDFs, isLoading, pdfDocuments, hasDocuments } = usePDF();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    try {
      const uploadedDocuments = await uploadPDFs(files);
      if (uploadedDocuments.length > 0) {
        navigate(`/reader/${uploadedDocuments[0].doc_id}`);
      }
    } catch (error) {
      console.error('Error processing files:', error);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf'
    );
    
    if (files.length > 0) {
      fileInputRef.current.files = e.dataTransfer.files;
      handleFileChange({ target: { files: e.dataTransfer.files } });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Document Insight System
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Upload PDFs to discover connections and insights across your documents using Adobe's powerful PDF technology
          </p>
        </div>
        
        <div 
          className={`border-3 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
            isDragging 
              ? 'border-blue-500 bg-blue-50 scale-105' 
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="application/pdf"
            multiple
            className="hidden"
          />
          
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className={`p-4 rounded-full ${
              isDragging ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              {isLoading ? (
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className={`w-12 h-12 ${
                  isDragging ? 'text-blue-600' : 'text-gray-400'
                }`} />
              )}
            </div>
            
            <div className="space-y-3">
              <p className="text-2xl font-semibold text-gray-800">
                {isLoading ? 'Processing your PDFs...' : 'Drag & drop PDFs here'}
              </p>
              <p className="text-gray-500 text-lg">
                or click to browse your files
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              disabled={isLoading}
              className="pointer-events-none"
            >
              {isLoading ? 'Uploading...' : 'Choose PDF Files'}
            </Button>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-6">
            Supported: PDF files • Max 100MB per file
          </p>
          
          {hasDocuments && (
            <div className="bg-white rounded-lg p-6 border border-gray-200 mb-8 text-left">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Your Library</h3>
                <button
                  onClick={() => navigate('/reader')}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Open Reader
                </button>
              </div>
              <ul className="divide-y divide-gray-100">
                {pdfDocuments.slice(0, 8).map((doc) => (
                  <li key={doc.id} className="py-2 flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
                        {doc.size && (
                          <p className="text-xs text-gray-500">{Math.round(doc.size / 1024)} KB</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/reader/${doc.id}`)}
                      className="text-blue-600 hover:text-blue-800 text-sm inline-flex items-center"
                    >
                      Open <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              How it works:
            </h3>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Upload PDFs</h4>
                  <p className="text-sm text-gray-600">Add multiple PDF documents to your library</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <span className="text-blue-600 font-bold">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Select Text</h4>
                  <p className="text-sm text-gray-600">Highlight text in any document</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <span className="text-blue-600 font-bold">3</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Discover Insights</h4>
                  <p className="text-sm text-gray-600">Find related content across all your documents</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;