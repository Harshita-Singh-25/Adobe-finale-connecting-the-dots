import apiClient from './apiClient';

const documentService = {
  /**
   * Upload multiple PDF documents
   * @param {File[]} files - Array of PDF files to upload
   * @returns {Promise<Array<{id: string, name: string, size: number}>>} Uploaded documents metadata
   */
  uploadDocuments: async (files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('documents', file));

    try {
      const response = await apiClient.post('/documents/upload', formData, {
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
   * Process a document for text extraction and analysis
   * @param {string} documentId - ID of the document to process
   * @returns {Promise<{sections: Array, metadata: object}>} Document structure and metadata
   */
  processDocument: async (documentId) => {
    try {
      const response = await apiClient.post(`/documents/${documentId}/process`);
      return {
        sections: response.sections,
        metadata: response.metadata
      };
    } catch (error) {
      console.error('Document processing failed:', error);
      throw new Error('Failed to process document');
    }
  },

  /**
   * Get document metadata and content structure
   * @param {string} documentId - ID of the document
   * @returns {Promise<{metadata: object, sections: Array}>} Document info
   */
  getDocument: async (documentId) => {
    try {
      const response = await apiClient.get(`/documents/${documentId}`);
      return response;
    } catch (error) {
      console.error('Failed to fetch document:', error);
      throw new Error('Document not found');
    }
  },

  /**
   * Get all user documents
   * @returns {Promise<Array<{id: string, name: string, uploadDate: string}>>} List of documents
   */
  getAllDocuments: async () => {
    try {
      const response = await apiClient.get('/documents');
      return response.documents;
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      throw new Error('Failed to load documents');
    }
  },

  /**
   * Delete a document
   * @param {string} documentId - ID of the document to delete
   * @returns {Promise<void>}
   */
  deleteDocument: async (documentId) => {
    try {
      await apiClient.delete(`/documents/${documentId}`);
    } catch (error) {
      console.error('Failed to delete document:', error);
      throw new Error('Failed to delete document');
    }
  },

  /**
   * Search within a document
   * @param {string} documentId - ID of the document to search
   * @param {string} query - Search query
   * @returns {Promise<Array<{page: number, text: string, score: number}>>} Search results
   */
  searchDocument: async (documentId, query) => {
    try {
      const response = await apiClient.post(`/documents/${documentId}/search`, { query });
      return response.results;
    } catch (error) {
      console.error('Document search failed:', error);
      throw new Error('Search failed');
    }
  },

  /**
   * Get related sections across documents
   * @param {string} sourceDocumentId - Source document ID
   * @param {string} sectionId - Section ID to find relations for
   * @returns {Promise<Array<{documentId: string, section: object, similarity: number}>>} Related sections
   */
  getRelatedSections: async (sourceDocumentId, sectionId) => {
    try {
      const response = await apiClient.get(
        `/documents/${sourceDocumentId}/sections/${sectionId}/related`
      );
      return response.relatedSections;
    } catch (error) {
      console.error('Failed to find related sections:', error);
      throw new Error('Failed to find related content');
    }
  },

  /**
   * Get document statistics and analytics
   * @param {string} documentId - ID of the document
   * @returns {Promise<{wordCount: number, sectionCount: number, readingTime: number}>} Document stats
   */
  getDocumentStats: async (documentId) => {
    try {
      const response = await apiClient.get(`/documents/${documentId}/stats`);
      return response.stats;
    } catch (error) {
      console.error('Failed to fetch document stats:', error);
      throw new Error('Failed to load document analytics');
    }
  }
};

export default documentService;