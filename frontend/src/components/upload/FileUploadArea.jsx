import React, { useContext, useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFContext } from '../../context/PDFContext';
import { Button } from '../common/Button';
import { FiUpload, FiX, FiFile } from 'react-icons/fi';
import { Toast } from '../common/Toast';

export const FileUploadArea = () => {
  const { setUploadedFiles } = useContext(PDFContext);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setIsDragging(false);
    
    if (rejectedFiles.length > 0) {
      const rejectedFile = rejectedFiles[0];
      if (rejectedFile.errors[0].code === 'file-too-large') {
        setError('File size exceeds the maximum limit (50MB)');
      } else if (rejectedFile.errors[0].code === 'file-invalid-type') {
        setError('Only PDF files are allowed');
      } else {
        setError('Error uploading file');
      }
      return;
    }

    setError(null);

    const newFiles = acceptedFiles.map(file => ({
      id: `${file.name}-${file.lastModified}-${file.size}`,
      name: file.name,
      size: file.size,
      file, // Original file object
      uploadDate: new Date(),
    }));

    setUploadedFiles(prevFiles => [...prevFiles, ...newFiles]);
  }, [setUploadedFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
  });

  const handleFileInputClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className="space-y-4">
      {error && (
        <Toast 
          message={error} 
          type="error" 
          onClose={() => setError(null)}
          className="mb-2"
        />
      )}

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors 
          ${
            isDragActive || isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
      >
        <input {...getInputProps()} onClick={handleFileInputClick} />
        <div className="flex flex-col items-center justify-center space-y-3">
          <FiUpload className="h-12 w-12 text-gray-400" />
          <div className="space-y-1">
            <p className="text-sm text-gray-600">
              {isDragActive || isDragging
                ? 'Drop your PDF files here'
                : 'Drag & drop PDF files here, or click to select'}
            </p>
            <p className="text-xs text-gray-500">
              Maximum file size: 50MB • PDF only
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            icon={<FiFile className="mr-2" />}
          >
            Select Files
          </Button>
        </div>
      </div>

      <div className="text-xs text-gray-500 text-center">
        <p>Upload multiple research papers, reports, or study materials</p>
        <p>Supported: PDF documents (text-based PDFs work best)</p>
      </div>
    </div>
  );
};