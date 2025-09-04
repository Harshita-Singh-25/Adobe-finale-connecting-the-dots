import axios from 'axios';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:8000/api',
  timeout: 20000,
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
    
    // If sending FormData, remove the Content-Type header to let browser set it automatically
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
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
    // Don't modify the response for FormData uploads
    if (response.config.data instanceof FormData) {
      return response;
    }
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
    
    // Preserve the original error for better debugging
    return Promise.reject(error);
  }
);

// Export only the raw axios instance to avoid conflicts with actual service files
export default apiClient;