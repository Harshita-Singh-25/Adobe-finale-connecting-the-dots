import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, ChevronRight, Trash2 } from 'lucide-react';
import { usePDF } from '../../context/PDFContext';

const DocumentLibrary = ({ variant = 'full' }) => {
  const { pdfDocuments, deleteDocument, isLoading } = usePDF();
  const { documentId } = useParams();
  const navigate = useNavigate();

  if (isLoading && pdfDocuments.length === 0) {
    return <div className="p-4 text-center text-gray-500 animate-pulse">Syncing Library...</div>;
  }

  if (pdfDocuments.length === 0) {
    return <div className="p-8 text-center text-gray-400 border-2 border-dashed rounded-lg">No documents found. Upload some to get started!</div>;
  }

  return (
    <ul className="divide-y divide-gray-100">
      {pdfDocuments.map((doc) => (
        <li 
          key={doc.id} 
          className={`group flex items-center justify-between p-3 cursor-pointer hover:bg-blue-50 transition-colors ${
            documentId === doc.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
          }`}
          onClick={() => navigate(`/reader/${doc.id}`)}
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className={`p-2 rounded ${documentId === doc.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
              {variant === 'full' && (
                <p className="text-xs text-gray-500">{doc.pages} Pages • {doc.sectionsCount} Sections</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if(window.confirm('Delete this document?')) deleteDocument(doc.id);
              }}
              className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>
        </li>
      ))}
    </ul>
  );
};

export default DocumentLibrary;