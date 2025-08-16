import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadBulkDocuments, uploadFreshDocument } from '../../services/documentService';
import Button from '../common/Button';
import Modal from '../common/Modal';
import FileUploadArea from '../upload/FileUploadArea';
import Toast from '../common/Toast';
import { ReactComponent as Logo } from '../../assets/logo.svg';
import { ReactComponent as UploadIcon } from '../../assets/icons/upload.svg';
import { ReactComponent as UserIcon } from '../../assets/icons/user.svg';

const Header = ({ onDocumentUpload }) => {
  const navigate = useNavigate();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState('bulk');
  const [toast, setToast] = useState(null);

  const handleUpload = async (files) => {
    try {
      let response;
      if (uploadType === 'bulk') {
        response = await uploadBulkDocuments(files);
      } else {
        response = await uploadFreshDocument(files[0]);
      }

      setToast({
        type: 'success',
        message: `Uploaded ${uploadType === 'bulk' ? response.documents.length : 1} document(s) successfully`
      });

      onDocumentUpload?.(response);
      setShowUploadModal(false);
    } catch (error) {
      setToast({
        type: 'error',
        message: error.response?.data?.detail || 'Upload failed'
      });
    }
  };

  const closeToast = () => {
    setToast(null);
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <div 
              className="flex items-center cursor-pointer"
              onClick={() => navigate('/')}
            >
              <Logo className="h-8 w-auto" />
              <span className="ml-2 text-xl font-semibold text-gray-900">DocConnect</span>
            </div>
            
            <nav className="hidden md:flex space-x-8">
              <button 
                className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
                onClick={() => navigate('/reader')}
              >
                Reader
              </button>
              <button 
                className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
                onClick={() => navigate('/library')}
              >
                My Library
              </button>
            </nav>
          </div>

          {/* Upload and User Controls */}
          <div className="flex items-center space-x-4">
            <Button
              variant="primary"
              icon={<UploadIcon className="h-4 w-4 mr-2" />}
              onClick={() => setShowUploadModal(true)}
            >
              Upload PDFs
            </Button>

            <button className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none">
              <UserIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title={`Upload ${uploadType === 'bulk' ? 'Multiple' : 'Single'} Document`}
      >
        <div className="space-y-4">
          <div className="flex border-b border-gray-200">
            <button
              className={`py-2 px-4 font-medium text-sm ${uploadType === 'bulk' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
              onClick={() => setUploadType('bulk')}
            >
              Bulk Upload (Past Documents)
            </button>
            <button
              className={`py-2 px-4 font-medium text-sm ${uploadType === 'fresh' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
              onClick={() => setUploadType('fresh')}
            >
              Fresh Upload (Current Reading)
            </button>
          </div>

          <FileUploadArea
            onFilesSelected={handleUpload}
            multiple={uploadType === 'bulk'}
            accept=".pdf"
          />
        </div>
      </Modal>

      {/* Toast Notification */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={closeToast}
          duration={3000}
        />
      )}
    </header>
  );
};

export default Header;