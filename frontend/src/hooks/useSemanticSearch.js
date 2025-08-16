import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import debounce from 'lodash.debounce';

export const useSemanticSearch = (initialQuery = '') => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchType, setSearchType] = useState('semantic');
  const [threshold, setThreshold] = useState(0.7);
  const cacheRef = useRef(new Map());

  // Memoized cosine similarity calculation
  const cosineSimilarity = useCallback((vecA, vecB) => {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    
    const dotProduct = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
    
    return magA && magB ? dotProduct / (magA * magB) : 0;
  }, []);

  // API call to generate embeddings
  const generateQueryEmbedding = useCallback(async (queryText) => {
    try {
      const response = await axios.post('/api/embed', { text: queryText });
      return response.data.embedding;
    } catch (err) {
      console.error('Embedding generation failed:', err);
      throw err;
    }
  }, []);

  // Core search function
  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const cacheKey = `${searchType}:${searchQuery}`;
    if (cacheRef.current.has(cacheKey)) {
      setResults(cacheRef.current.get(cacheKey));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let searchResults = [];
      
      if (searchType === 'semantic') {
        const queryEmbedding = await generateQueryEmbedding(searchQuery);
        const response = await axios.get('/api/embeddings');
        const embeddings = response.data;

        searchResults = embeddings
          .map(item => ({
            ...item,
            similarity: cosineSimilarity(queryEmbedding, item.embedding)
          }))
          .filter(item => item.similarity >= threshold)
          .sort((a, b) => b.similarity - a.similarity);
      } else {
        const response = await axios.get(`/api/search?query=${encodeURIComponent(searchQuery)}`);
        searchResults = response.data;
      }

      setResults(searchResults);
      cacheRef.current.set(cacheKey, searchResults);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Search failed');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchType, threshold, cosineSimilarity, generateQueryEmbedding]);

  // Debounced search with cleanup
  const debouncedSearch = useRef(
    debounce((q) => performSearch(q), 500)
  ).current;

  useEffect(() => {
    debouncedSearch(query);
    return () => debouncedSearch.cancel();
  }, [query, debouncedSearch]);

  return {
    // State
    query,
    results,
    isLoading,
    error,
    searchType,
    threshold,

    // Setters
    setQuery,
    setSearchType,
    setThreshold,

    // Actions
    search: performSearch,
    clearResults: () => setResults([]),
    clearError: () => setError(null),
    clearCache: () => cacheRef.current.clear(),
  };
};