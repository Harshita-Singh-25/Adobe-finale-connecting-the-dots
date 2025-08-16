import apiClient from './apiClient';

const selectionService = {
  /**
   * Analyze selected text and return semantic context
   * @param {string} documentId - Current document ID
   * @param {string} selectedText - Selected text content
   * @param {string} surroundingText - Context around selection
   * @param {number} [selectionOffset] - Character offset in document
   * @returns {Promise<{semanticType: string, keyConcepts: string[]}>} Analysis results
   */
  analyzeSelection: async (documentId, selectedText, surroundingText, selectionOffset) => {
    try {
      const response = await apiClient.post('/selection/analyze', {
        documentId,
        selectedText,
        surroundingText,
        selectionOffset
      });
      
      return {
        semanticType: response.semanticType || 'unknown',
        keyConcepts: response.keyConcepts || [],
        isTechnicalTerm: response.isTechnicalTerm || false
      };
    } catch (error) {
      console.error('Selection analysis failed:', error);
      throw new Error('Failed to analyze selected text');
    }
  },

  /**
   * Find related content across documents
   * @param {string} documentId - Source document ID
   * @param {string} selectedText - Selected text to match
   * @param {string[]} [documentIds] - Optional target document IDs
   * @returns {Promise<Array<{documentId: string, excerpt: string, similarity: number}>>} Related content
   */
  findRelatedContent: async (documentId, selectedText, documentIds = []) => {
    try {
      const response = await apiClient.post('/selection/related', {
        documentId,
        selectedText,
        documentIds,
        maxResults: 5 // Get top 5 most relevant matches
      });

      return response.results.map(result => ({
        ...result,
        preview: result.excerpt.slice(0, 200) + (result.excerpt.length > 200 ? '...' : '')
      }));
    } catch (error) {
      console.error('Related content search failed:', error);
      throw new Error('Failed to find related content');
    }
  },

  /**
   * Get contradictory statements to selected text
   * @param {string} documentId - Source document ID
   * @param {string} selectedText - Claim to verify
   * @returns {Promise<Array<{documentId: string, contradictoryText: string, confidence: number}>>} Contradictions
   */
  findContradictions: async (documentId, selectedText) => {
    try {
      const response = await apiClient.post('/selection/contradictions', {
        documentId,
        selectedText
      });
      return response.contradictions;
    } catch (error) {
      console.error('Contradiction search failed:', error);
      throw new Error('Failed to find contradictory statements');
    }
  },

  /**
   * Get examples similar to selected concept
   * @param {string} documentId - Source document ID
   * @param {string} selectedText - Concept to find examples for
   * @returns {Promise<Array<{documentId: string, exampleText: string, similarity: number}>>} Examples
   */
  findExamples: async (documentId, selectedText) => {
    try {
      const response = await apiClient.post('/selection/examples', {
        documentId,
        selectedText
      });
      return response.examples;
    } catch (error) {
      console.error('Example search failed:', error);
      throw new Error('Failed to find examples');
    }
  },

  /**
   * Get text highlights for important concepts in selection
   * @param {string} documentId - Document ID
   * @param {string} selectedText - Text selection
   * @returns {Promise<Array<{text: string, type: 'concept'|'entity'|'claim', relevance: number}>>} Highlights
   */
  getTextHighlights: async (documentId, selectedText) => {
    try {
      const response = await apiClient.post('/selection/highlights', {
        documentId,
        selectedText
      });
      return response.highlights;
    } catch (error) {
      console.error('Failed to get text highlights:', error);
      throw new Error('Failed to analyze text concepts');
    }
  },

  /**
   * Generate a summary for the selected text
   * @param {string} documentId - Document ID
   * @param {string} selectedText - Text to summarize
   * @param {object} [options] - Summary options
   * @returns {Promise<{summary: string, keyPoints: string[]}>} Generated summary
   */
  generateSummary: async (documentId, selectedText, options = {}) => {
    try {
      const response = await apiClient.post('/selection/summarize', {
        documentId,
        selectedText,
        options: {
          style: 'concise',
          ...options
        }
      });
      return {
        summary: response.summary,
        keyPoints: response.keyPoints || []
      };
    } catch (error) {
      console.error('Summary generation failed:', error);
      throw new Error('Failed to generate summary');
    }
  }
};

export default selectionService;