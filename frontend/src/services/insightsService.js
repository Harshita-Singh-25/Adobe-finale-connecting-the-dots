import apiClient from './apiClient';

const insightsService = {
  /**
   * Generate insights from selected text
   * @param {string} documentId - Current document ID
   * @param {string} selectedText - Selected text content
   * @param {string} context - Surrounding text context
   * @returns {Promise<{contradictions: string[], examples: string[], keyTakeaways: string[], inspirations: string[]}>} Generated insights
   */
  generateInsights: async (documentId, selectedText, context) => {
    try {
      const response = await apiClient.post('/insights/generate', {
        documentId,
        selectedText,
        context,
        types: ['contradictions', 'examples', 'keyTakeaways', 'inspirations']
      });
      
      return {
        contradictions: response.contradictions || [],
        examples: response.examples || [],
        keyTakeaways: response.keyTakeaways || [],
        inspirations: response.inspirations || []
      };
    } catch (error) {
      console.error('Insight generation failed:', error);
      throw new Error('Failed to generate insights');
    }
  },

  /**
   * Get related sections from other documents
   * @param {string} documentId - Source document ID
   * @param {string} sectionId - Section ID to find relations for
   * @returns {Promise<Array<{documentId: string, documentTitle: string, section: string, similarity: number}>>} Related sections
   */
  getRelatedSections: async (documentId, sectionId) => {
    try {
      const response = await apiClient.get(
        `/documents/${documentId}/sections/${sectionId}/related`
      );
      return response.relatedSections.map(section => ({
        ...section,
        preview: section.text.slice(0, 150) + '...' // Generate preview snippet
      }));
    } catch (error) {
      console.error('Failed to find related sections:', error);
      throw new Error('Failed to find related content');
    }
  },

  /**
   * Save user-customized insight
   * @param {object} insightData - Insight to save
   * @param {string} insightData.type - Insight type
   * @param {string} insightData.content - Insight content
   * @param {string} insightData.sourceDocument - Source document ID
   * @param {string} [insightData.sourceSection] - Optional section reference
   * @returns {Promise<{id: string, savedAt: string}>} Saved insight metadata
   */
  saveInsight: async (insightData) => {
    try {
      const response = await apiClient.post('/insights/save', insightData);
      return response;
    } catch (error) {
      console.error('Failed to save insight:', error);
      throw new Error('Failed to save insight');
    }
  },

  /**
   * Get insights for a specific document
   * @param {string} documentId - Document ID to fetch insights for
   * @returns {Promise<Array<{type: string, content: string, sourceSection?: string}>>} Saved insights
   */
  getDocumentInsights: async (documentId) => {
    try {
      const response = await apiClient.get(`/documents/${documentId}/insights`);
      return response.insights;
    } catch (error) {
      console.error('Failed to fetch document insights:', error);
      throw new Error('Failed to load insights');
    }
  },

  /**
   * Generate audio summary from insights
   * @param {string} documentId - Document ID
   * @param {Array<{type: string, content: string}>} insights - Insights to include
   * @param {object} options - Audio generation options
   * @returns {Promise<{audioUrl: string, duration: number, transcript: string}>} Audio summary
   */
  generateInsightsAudio: async (documentId, insights, options = {}) => {
    try {
      const response = await apiClient.post('/insights/generate-audio', {
        documentId,
        insights,
        options: {
          format: 'mp3',
          voice: 'female',
          ...options
        }
      });
      return response;
    } catch (error) {
      console.error('Audio generation failed:', error);
      throw new Error('Failed to generate audio summary');
    }
  },

  /**
   * Get insight suggestions from similar documents
   * @param {string} documentId - Document ID
   * @returns {Promise<Array<{type: string, content: string, similarity: number}>>} Suggested insights
   */
  getSuggestedInsights: async (documentId) => {
    try {
      const response = await apiClient.get(`/documents/${documentId}/insights/suggestions`);
      return response.suggestions;
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      throw new Error('Failed to get insight suggestions');
    }
  }
};

export default insightsService;