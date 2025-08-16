import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useDocumentSelection } from '../../hooks/useDocumentSelection';
import { ReactComponent as MenuIcon } from '../../assets/icons/menu.svg';
import { ReactComponent as CloseIcon } from '../../assets/icons/close.svg';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const { reset: resetSelection } = useDocumentSelection();

  const handleDocumentSelect = (docId, sectionId = null) => {
    setCurrentDocument(docId);
    resetSelection();
    // Close sidebar on mobile after selection
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Mobile sidebar backdrop (only shows on mobile) */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Header */}
      <Header 
        onDocumentUpload={handleDocumentSelect}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Hidden on mobile unless open */}
        <div 
          className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 z-30 w-64 flex-shrink-0 transition-transform duration-300 ease-in-out`}
        >
          <Sidebar 
            currentDocId={currentDocument}
            onDocumentSelect={handleDocumentSelect}
          />
        </div>

        {/* Mobile sidebar toggle button */}
        <button
          className="md:hidden fixed bottom-4 left-4 bg-blue-600 p-3 rounded-full shadow-lg z-40"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? (
            <CloseIcon className="h-6 w-6 text-white" />
          ) : (
            <MenuIcon className="h-6 w-6 text-white" />
          )}
        </button>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto focus:outline-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Outlet context={{ currentDocument, setCurrentDocument }} />
          </div>
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Layout;