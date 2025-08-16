/**
 * Application Constants
 * Centralized location for all constants used across the application
 */

// Environment Variables Configuration
export const ENV = {
  // Adobe PDF Embed
  ADOBE_API_KEY: import.meta.env.VITE_ADOBE_EMBED_API_KEY,
  
  // Document Processing
  MAX_UPLOAD_FILES: parseInt(import.meta.env.VITE_MAX_UPLOAD_FILES || '50'),
  MAX_PDF_SIZE_MB: parseInt(import.meta.env.VITE_MAX_PDF_SIZE_MB || '50'),
  DEFAULT_ZOOM: parseInt(import.meta.env.VITE_DEFAULT_ZOOM || '100'),

  // Semantic Search
  TOP_K_SECTIONS: parseInt(import.meta.env.VITE_TOP_K_SECTIONS || '5'),
  SNIPPET_LENGTH: parseInt(import.meta.env.VITE_SNIPPET_LENGTH || '3'),
  MIN_SIMILARITY: parseFloat(import.meta.env.VITE_MIN_SIMILARITY_SCORE || '0.65'),

  // AI Services
  LLM_PROVIDER: import.meta.env.VITE_LLM_PROVIDER || 'gemini',
  GEMINI_MODEL: import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash',
  OLLAMA_MODEL: import.meta.env.VITE_OLLAMA_MODEL || 'llama3',
  TTS_PROVIDER: import.meta.env.VITE_TTS_PROVIDER || 'azure',
  AUDIO_DURATION_LIMIT: parseInt(import.meta.env.VITE_AUDIO_DURATION_LIMIT || '300'),

  // Optional Features
  ENABLE_INSIGHTS: import.meta.env.VITE_ENABLE_INSIGHTS === 'true',
  INSIGHT_TYPES: (import.meta.env.VITE_INSIGHT_TYPES || 'contradictions,examples,key_takeaways').split(','),
  ENABLE_AUDIO: import.meta.env.VITE_ENABLE_AUDIO === 'true',
  AUDIO_FORMAT: import.meta.env.VITE_AUDIO_FORMAT || 'podcast',
  AUDIO_SPEAKERS: parseInt(import.meta.env.VITE_AUDIO_SPEAKERS || '2'),

  // Development
  DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE === 'true',
  API_BASE_URL: import.meta.env.VITE_API_BASE || 'http://localhost:8080/api'
};

// API Configuration
export const API_CONFIG = {
  BASE_URL: ENV.API_BASE_URL,
  TIMEOUT: 30000, // 30 seconds
  ENDPOINTS: {
    DOCUMENTS: {
      UPLOAD: '/documents/upload',
      PROCESS: '/documents/process',
      SEARCH: '/documents/search',
    },
    AI: {
      GENERATE: '/ai/generate',
      TTS: '/ai/tts'
    }
  }
};

// [Rest of your constants...]
export const PDF_VIEWER = {
  // Your existing PDF viewer constants
};

export default {
  ENV,
  API_CONFIG,
  PDF_VIEWER,
  // [Other exports]
};