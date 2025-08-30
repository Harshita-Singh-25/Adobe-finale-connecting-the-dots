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
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

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
      return response.data.documents || [];
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
      const response = await apiClient.get(`/documents/${documentId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch document:', error);
      throw new Error('Document not found');
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