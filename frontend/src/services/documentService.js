import axios from 'axios';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: process.env.NODE_ENV === 'production'  
    ? '/api'  
    : 'http://localhost:8080/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

const documentService = {
  /**
   * Upload multiple PDF documents
   * @param {File[]} files - Array of PDF files to upload
   * @returns {Promise<Array<{id: string, name: string, size: number}>>} Uploaded documents metadata
   */
  // Corrected endpoint to match the backend: /api/documents/upload-bulk
  uploadDocuments: async (files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    try {
      const response = await apiClient.post('/documents/upload-bulk', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Document upload failed:', error);
      throw new Error('Failed to upload documents');
    }
  },

  /**
   * Get all user documents
   * @returns {Promise<Array<{id: string, name: string, uploadDate: string}>>} List of documents
   */
  // Corrected endpoint to match the backend. NOTE: The backend code you provided doesn't have a /documents/list endpoint.
  // This is a temporary placeholder. You'll need to implement the backend route to return a list of documents.
  getAllDocuments: async () => {
    try {
      // The backend needs a route like this to work.
      // If no route exists, this will still throw a 404.
      const response = await apiClient.get('/documents/list');
      return response.data.documents || [];
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      throw new Error('Failed to load documents');
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