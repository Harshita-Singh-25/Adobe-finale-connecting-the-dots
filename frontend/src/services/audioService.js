import apiClient from './apiClient';

const audioService = {
  /**
   * Generate audio summary from text content
   * @param {string} content - Text content to convert to audio
   * @param {object} options - Generation options
   * @param {string} [options.voice] - Voice preference (e.g., 'male', 'female')
   * @param {number} [options.speed] - Playback speed (0.5-2.0)
   * @param {string} [options.format] - Audio format ('mp3', 'wav')
   * @returns {Promise<{audioUrl: string, duration: number}>} Generated audio data
   */
  generateAudioSummary: async (content, options = {}) => {
    try {
      const response = await apiClient.post('/audio/generate', {
        content,
        options: {
          voice: options.voice || 'female',
          speed: options.speed || 1.0,
          format: options.format || 'mp3',
          // Additional TTS provider-specific options
          provider: import.meta.env.VITE_TTS_PROVIDER || 'azure'
        }
      });
      return {
        audioUrl: response.audioUrl,
        duration: response.duration,
        transcript: response.transcript
      };
    } catch (error) {
      console.error('Audio generation failed:', error);
      throw new Error('Failed to generate audio summary');
    }
  },

  /**
   * Generate podcast-style audio with multiple speakers
   * @param {Array<{speaker: string, content: string}>} segments - Podcast segments
   * @param {object} options - Generation options
   * @returns {Promise<{audioUrl: string, duration: number, transcript: string}>}
   */
  generatePodcast: async (segments, options = {}) => {
    try {
      const response = await apiClient.post('/audio/podcast', {
        segments,
        options: {
          ...options,
          provider: import.meta.env.VITE_TTS_PROVIDER || 'azure',
          style: 'conversational'
        }
      });
      return {
        audioUrl: response.audioUrl,
        duration: response.duration,
        transcript: response.transcript,
        segments: response.segments
      };
    } catch (error) {
      console.error('Podcast generation failed:', error);
      throw new Error('Failed to generate podcast');
    }
  },

  /**
   * Get audio transcript by ID
   * @param {string} audioId - ID of the audio
   * @returns {Promise<string>} Transcript text
   */
  getTranscript: async (audioId) => {
    try {
      const response = await apiClient.get(`/audio/${audioId}/transcript`);
      return response.transcript;
    } catch (error) {
      console.error('Failed to fetch transcript:', error);
      throw new Error('Failed to get audio transcript');
    }
  },

  /**
   * Stream audio for progressive playback
   * @param {string} audioId - ID of the audio
   * @returns {ReadableStream} Audio stream
   */
  streamAudio: (audioId) => {
    return new ReadableStream({
      async start(controller) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_BASE}/audio/${audioId}/stream`,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
              }
            }
          );
          
          if (!response.ok) {
            throw new Error('Audio stream failed');
          }

          const reader = response.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          controller.close();
        } catch (error) {
          console.error('Audio streaming error:', error);
          controller.error(error);
        }
      }
    });
  }
};

export default audioService;