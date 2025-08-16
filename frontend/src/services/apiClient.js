import axios from 'axios';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:8080/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor for adding auth tokens or other headers
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

// Response interceptor for handling errors globally
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // Handle different error scenarios
    if (error.response) {
      // Server responded with a status code outside 2xx
      switch (error.response.status) {
        case 401:
          // Handle unauthorized access
          break;
        case 404:
          // Handle not found errors
          break;
        case 500:
          // Handle server errors
          break;
        default:
          console.error('API Error:', error.response.data);
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('Network Error:', error.message);
    } else {
      // Something happened in setting up the request
      console.error('Request Error:', error.message);
    }
    
    return Promise.reject(error.response?.data || error.message);
  }
);

// PDF Document Service
const documentService = {
  uploadDocuments: async (files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('documents', file));
    
    return apiClient.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  processDocument: async (documentId) => {
    return apiClient.post(`/documents/${documentId}/process`);
  },

  getDocument: async (documentId) => {
    return apiClient.get(`/documents/${documentId}`);
  },

  getAllDocuments: async () => {
    return apiClient.get('/documents');
  },

  deleteDocument: async (documentId) => {
    return apiClient.delete(`/documents/${documentId}`);
  }
};

// Semantic Search Service
const searchService = {
  findRelatedSections: async (documentId, selectedText) => {
    return apiClient.post('/search/related', {
      documentId,
      text: selectedText
    });
  },

  semanticSearch: async (query, documentIds) => {
    return apiClient.post('/search/semantic', {
      query,
      documentIds
    });
  }
};

// Insights Service
const insightsService = {
  generateInsights: async (documentId, selectedText) => {
    return apiClient.post('/insights/generate', {
      documentId,
      text: selectedText
    });
  },

  getInsightTypes: async () => {
    return apiClient.get('/insights/types');
  },

  saveInsight: async (insightData) => {
    return apiClient.post('/insights/save', insightData);
  }
};

// Audio Service
const audioService = {
  generateAudioSummary: async (content, options = {}) => {
    return apiClient.post('/audio/generate', {
      content,
      options
    });
  },

  getAudioTranscript: async (audioId) => {
    return apiClient.get(`/audio/${audioId}/transcript`);
  }
};

export default {
  ...documentService,
  ...searchService,
  ...insightsService,
  ...audioService,
  
  // Raw axios instance for custom requests
  raw: apiClient
};