import React, { useContext, useEffect, useState } from 'react';
import { PDFContext } from '../../context/PDFContext';
import { Button } from '../common/Button';
import { Loader } from '../common/Loader';
import { Toast } from '../common/Toast';
import { FiFile, FiCheck, FiX, FiTrash2, FiAlertCircle } from 'react-icons/fi';
import useDocumentService from '../../hooks/useDocumentService';

export const FileList = () => {
  const { uploadedFiles, setUploadedFiles, setCurrentPDF } = useContext(PDFContext);
  const [processingStatus, setProcessingStatus] = useState({});
  const [error, setError] = useState(null);
  const { processUploadedFiles, deleteDocument } = useDocumentService();

  useEffect(() => {
    if (uploadedFiles.length > 0) {
      handleProcessFiles();
    }
  }, [uploadedFiles]);

  const handleProcessFiles = async () => {
    try {
      setError(null);
      const newProcessingStatus = {};
      
      // Initialize processing status
      uploadedFiles.forEach(file => {
        newProcessingStatus[file.id] = {
          status: 'pending',
          progress: 0
        };
      });
      setProcessingStatus(newProcessingStatus);

      // Process files sequentially with progress updates
      for (const file of uploadedFiles) {
        try {
          setProcessingStatus(prev => ({
            ...prev,
            [file.id]: { status: 'processing', progress: 0 }
          }));

          const updateProgress = (progress) => {
            setProcessingStatus(prev => ({
              ...prev,
              [file.id]: { ...prev[file.id], progress }
            }));
          };

          const processedDocument = await processUploadedFiles(
            file, 
            updateProgress
          );

          setProcessingStatus(prev => ({
            ...prev,
            [file.id]: { status: 'completed', progress: 100 }
          }));

          // Set first processed document as current PDF
          if (uploadedFiles[0].id === file.id) {
            setCurrentPDF(processedDocument);
          }
        } catch (err) {
          console.error(`Error processing file ${file.name}:`, err);
          setProcessingStatus(prev => ({
            ...prev,
            [file.id]: { status: 'failed', progress: 0 }
          }));
        }
      }
    } catch (err) {
      setError('Failed to process files. Please try again.');
      console.error('Error processing files:', err);
    }
  };

  const handleDeleteFile = async (fileId) => {
    try {
      await deleteDocument(fileId);
      setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
      
      // If we're deleting the current PDF, reset to first available
      setCurrentPDF(prev => {
        if (prev?.id === fileId) {
          return uploadedFiles.find(f => f.id !== fileId) || null;
        }
        return prev;
      });
    } catch (err) {
      setError('Failed to delete file. Please try again.');
      console.error('Error deleting file:', err);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FiCheck className="text-green-500" />;
      case 'failed':
        return <FiAlertCircle className="text-red-500" />;
      case 'processing':
        return <Loader size="sm" />;
      default:
        return <FiFile className="text-gray-400" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i]);
  };

  return (
    <div className="space-y-2">
      {error && (
        <Toast 
          message={error} 
          type="error" 
          onClose={() => setError(null)}
          className="mb-2"
        />
      )}

      {uploadedFiles.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          No files uploaded yet
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {uploadedFiles.map((file) => (
            <li key={file.id} className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center min-w-0">
                  <div className="mr-3">
                    {getStatusIcon(processingStatus[file.id]?.status || 'pending')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <div className="flex items-center text-xs text-gray-500 space-x-2">
                      <span>{formatFileSize(file.size)}</span>
                      {processingStatus[file.id]?.status === 'processing' && (
                        <span>{processingStatus[file.id].progress}%</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {processingStatus[file.id]?.status === 'completed' && (
                    <Button 
                      size="xs" 
                      variant="ghost" 
                      onClick={() => setCurrentPDF(file)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Open
                    </Button>
                  )}
                  
                  <Button 
                    size="xs" 
                    variant="ghost" 
                    onClick={() => handleDeleteFile(file.id)}
                    className="text-red-600 hover:text-red-800"
                    aria-label="Delete file"
                  >
                    <FiTrash2 />
                  </Button>
                </div>
              </div>
              
              {processingStatus[file.id]?.status === 'processing' && (
                <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-blue-600 h-1.5 rounded-full" 
                    style={{ width: `${processingStatus[file.id].progress}%` }}
                  />
                </div>
              )}
              
              {processingStatus[file.id]?.status === 'failed' && (
                <div className="mt-1 text-xs text-red-500 flex items-center">
                  <FiX className="mr-1" />
                  Processing failed
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};