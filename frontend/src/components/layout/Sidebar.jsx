import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { listDocuments, getDocumentDetails } from '../../services/documentService';
import { ReactComponent as DocumentsIcon } from '../../assets/icons/documents.svg';
import { ReactComponent as BookmarkIcon } from '../../assets/icons/bookmark.svg';
import { ReactComponent as InsightsIcon } from '../../assets/icons/insights.svg';
import { ReactComponent as AudioIcon } from '../../assets/icons/audio.svg';
import { ReactComponent as ChevronRightIcon } from '../../assets/icons/chevron-right.svg';
import { ReactComponent as ChevronDownIcon } from '../../assets/icons/chevron-down.svg';
import Loader from '../common/Loader';

const Sidebar = ({ currentDocId, onDocumentSelect }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedDoc, setExpandedDoc] = useState(currentDocId || null);
  const [expandedSections, setExpandedSections] = useState({});

  // Fetch documents on mount
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const response = await listDocuments();
        setDocuments(response.documents);
        
        // Expand current document by default
        if (currentDocId) {
          setExpandedDoc(currentDocId);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [currentDocId]);

  // Toggle document expansion
  const toggleDocument = async (docId) => {
    if (expandedDoc === docId) {
      setExpandedDoc(null);
      return;
    }

    // Fetch document details if not already loaded
    const doc = documents.find(d => d.doc_id === docId);
    if (!doc.sections) {
      try {
        const details = await getDocumentDetails(docId);
        setDocuments(prev => prev.map(d => 
          d.doc_id === docId ? { ...d, sections: details.sections } : d
        ));
      } catch (err) {
        setError('Failed to load document details');
      }
    }

    setExpandedDoc(docId);
  };

  // Toggle section expansion
  const toggleSection = (docId, sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [docId]: {
        ...prev[docId],
        [sectionId]: !prev[docId]?.[sectionId]
      }
    }));
  };

  // Navigation items
  const navItems = [
    { id: 'documents', icon: <DocumentsIcon className="h-5 w-5" />, label: 'My Documents', path: '/library' },
    { id: 'bookmarks', icon: <BookmarkIcon className="h-5 w-5" />, label: 'Bookmarks', path: '/bookmarks' },
    { id: 'insights', icon: <InsightsIcon className="h-5 w-5" />, label: 'Saved Insights', path: '/insights' },
    { id: 'audio', icon: <AudioIcon className="h-5 w-5" />, label: 'Audio Summaries', path: '/audio' }
  ];

  if (loading) return (
    <div className="flex justify-center items-center h-full">
      <Loader size="md" />
    </div>
  );

  if (error) return (
    <div className="p-4 text-red-500 text-sm">
      Error loading documents: {error}
    </div>
  );

  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto">
        <ul className="space-y-1 p-4">
          {navItems.map(item => (
            <li key={item.id}>
              <button
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center px-3 py-2 text-sm rounded-md ${location.pathname.startsWith(item.path) ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        {/* Document List */}
        <div className="border-t border-gray-200 pt-4 px-4">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Document Library
          </h3>
          <ul className="mt-2 space-y-1">
            {documents.map(doc => (
              <li key={doc.doc_id}>
                <div className="flex flex-col">
                  <button
                    onClick={() => toggleDocument(doc.doc_id)}
                    className={`flex items-center justify-between px-3 py-2 text-sm rounded-md ${expandedDoc === doc.doc_id ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                  >
                    <span className="truncate">{doc.title}</span>
                    {expandedDoc === doc.doc_id ? (
                      <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                    )}
                  </button>

                  {/* Document Sections */}
                  {expandedDoc === doc.doc_id && doc.sections && (
                    <ul className="ml-4 mt-1 space-y-1">
                      {doc.sections.map(section => (
                        <li key={section.section_id}>
                          <button
                            onClick={() => {
                              toggleSection(doc.doc_id, section.section_id);
                              onDocumentSelect?.(doc.doc_id, section.section_id);
                            }}
                            className={`flex items-center px-3 py-1.5 text-xs rounded-md w-full text-left ${currentDocId === doc.doc_id && expandedSections[doc.doc_id]?.[section.section_id] ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                          >
                            <span className="truncate">{section.heading}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Current Document Status */}
      {currentDocId && (
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="text-xs text-gray-500">Currently viewing:</div>
          <div className="text-sm font-medium truncate">
            {documents.find(d => d.doc_id === currentDocId)?.title || 'Document'}
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;