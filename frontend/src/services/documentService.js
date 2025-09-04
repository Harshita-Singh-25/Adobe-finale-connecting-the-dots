import apiClient from './apiClient';

// Add request interceptor for auth if needed
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error Details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
        headers: error.config?.headers
      },
      isNetworkError: !error.response,
      isCorsError: error.message?.includes('CORS') || error.message?.includes('Access-Control'),
      fullError: error
    });
    return Promise.reject(error);
  }
);

const documentService = {
  /**
   * Upload multiple PDF documents
   * @param {File[]} files - Array of PDF files to upload
   * @returns {Promise<Array<{id: string, name: string, size: number}>>} Uploaded documents metadata
   */
  // Corrected endpoint to match the backend: /api/documents/upload/bulk
  uploadDocuments: async (files) => {
    // Validate files
    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new Error('No files provided');
    }
    
    // Check if each file is a valid File object
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!(file instanceof File)) {
        throw new Error(`File at index ${i} is not a valid File object`);
      }
      if (!file.name || file.size === 0) {
        throw new Error(`File at index ${i} is empty or invalid`);
      }
    }
    
    console.log('Files to upload:', files);
    console.log('First file:', files[0]);
    console.log('First file type:', typeof files[0]);
    console.log('First file constructor:', files[0].constructor.name);
    
    const formData = new FormData();
    files.forEach((file, index) => {
      console.log(`Appending file ${index}:`, file.name, file.size, file.type);
      formData.append('files', file);
    });
    
    console.log('FormData created:', formData);
    console.log('FormData entries:');
    for (let [key, value] of formData.entries()) {
      console.log(`Key: ${key}, Value:`, value);
    }

    try {
      console.log('Attempting to upload documents to:', apiClient.defaults.baseURL + '/documents/upload/bulk');
      console.log('Files to upload:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));
      
      const response = await apiClient.post('/documents/upload/bulk', formData);
      
      console.log('Upload response:', response);
      return response.data;
    } catch (error) {
      console.error('Document upload failed - Detailed Error:', {
        error: error,
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        isCors: error.message?.includes('CORS') || error.message?.includes('Access-Control'),
        isNetwork: !error.response
      });
      
      if (error.message?.includes('CORS') || error.message?.includes('Access-Control')) {
        throw new Error('CORS Error: Backend server is not allowing uploads from frontend. Check CORS configuration.');
      } else if (!error.response) {
        throw new Error('Network Error: Cannot connect to backend server during upload. Make sure it\'s running on port 8000.');
      } else if (error.response.status === 405) {
        throw new Error('Method Not Allowed: The upload endpoint does not accept POST requests. Check backend route configuration.');
      } else {
        throw new Error(`Upload failed: ${error.response.status} ${error.response.statusText}`);
      }
    }
  },

  /**
   * Get all user documents
   * @returns {Promise<Array<{id: string, name: string, uploadDate: string}>>} List of documents
   */
  // Corrected endpoint to match the backend: /api/documents/list
  getAllDocuments: async () => {
    try {
      console.log('Attempting to fetch documents from:', apiClient.defaults.baseURL + '/documents/list');
      const response = await apiClient.get('/documents/list');
      console.log('Documents response:', response);
      console.log('Response data:', response.data);
      
      // Handle different response structures
      if (response.data && response.data.documents) {
        return response.data.documents;
      } else if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        return response.data.data;
      } else {
        console.warn('Unexpected response structure:', response.data);
        return [];
      }
    } catch (error) {
      console.error('Failed to fetch documents - Detailed Error:', {
        error: error,
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        isCors: error.message?.includes('CORS') || error.message?.includes('Access-Control'),
        isNetwork: !error.response
      });
      
      if (error.message?.includes('CORS') || error.message?.includes('Access-Control')) {
        throw new Error('CORS Error: Backend server is not allowing requests from frontend. Check CORS configuration.');
      } else if (!error.response) {
        throw new Error('Network Error: Cannot connect to backend server. Make sure it\'s running on port 8000.');
      } else {
        throw new Error(`Failed to load documents: ${error.response.status} ${error.response.statusText}`);
      }
    }
  },

  /**
   * Get document details
   * @param {string} documentId - ID of the document
   * @returns {Promise<{metadata: object, sections: Array}>} Document info
   */
  // Endpoint seems okay, assuming a route for specific document IDs exists in the backend.
  getDocumentDetails: async (documentId) => {
    try {
      console.log('Fetching document details for:', documentId);
      const response = await apiClient.get(`/documents/${documentId}`);
      console.log('Document details response:', response);
      console.log('Document details data:', response.data);
      
      // Handle different response structures
      if (response.data) {
        return response.data;
      } else if (response) {
        return response;
      } else {
        throw new Error('No data received from server');
      }
    } catch (error) {
      console.error('Failed to fetch document:', error);
      if (error.response?.status === 404) {
        throw new Error('Document not found');
      } else if (error.response?.status >= 500) {
        throw new Error('Server error while fetching document');
      } else {
        throw new Error('Failed to fetch document: ' + (error.message || 'Unknown error'));
      }
    }
  },

  /**
   * Delete a document
   * @param {string} documentId - ID of the document to delete
   * @returns {Promise<void>}
   */
  // Endpoint seems okay, assuming a delete route exists in the backend.
  deleteDocument: async (documentId) => {
    try {
      await apiClient.delete(`/documents/${documentId}`);
    } catch (error) {
      console.error('Failed to delete document:', error);
      throw new Error('Failed to delete document');
    }
  },

  /**
   * Get PDF file content for viewing
   * @param {string} documentId - ID of the document
   * @returns {Promise<Blob>} PDF file blob
   */
  getPDFFile: async (documentId) => {
    try {
      const response = await apiClient.get(`/documents/${documentId}/file`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch PDF file:', error);
      throw new Error('Failed to load PDF file');
    }
  },

  /**
   * Search for related sections
   * @param {Object} params - Search parameters
   * @param {string} params.selected_text - The selected text
   * @param {string} params.current_doc_id - Current document ID
   * @returns {Promise<Array>} Related sections
   */
  // Corrected endpoint. The backend code you provided does not have this route.
  // This is a placeholder. A backend route for '/selection/related' needs to be implemented.
  findRelatedSections: async (params) => {
    try {
      const response = await apiClient.post('/selection/related', params);
      return response.data.related_sections || [];
    } catch (error) {
      console.error('Failed to find related sections:', error);
      throw new Error('Failed to find related content');
    }
  }
};

export default documentService;