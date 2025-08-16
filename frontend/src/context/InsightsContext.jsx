import React, { createContext, useState } from 'react';
import PropTypes from 'prop-types';

const InsightsContext = createContext();

export const InsightsProvider = ({ children }) => {
  const [activeInsight, setActiveInsight] = useState(null);
  const [relatedSections, setRelatedSections] = useState([]);
  const [generatedInsights, setGeneratedInsights] = useState({
    contradictions: [],
    examples: [],
    keyTakeaways: [],
    inspirations: []
  });
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [audioInsight, setAudioInsight] = useState(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  const resetInsights = () => {
    setActiveInsight(null);
    setRelatedSections([]);
    setGeneratedInsights({
      contradictions: [],
      examples: [],
      keyTakeaways: [],
      inspirations: []
    });
    setAudioInsight(null);
  };

  const updateRelatedSections = (sections) => {
    setRelatedSections(sections);
    if (sections.length > 0) {
      setActiveInsight('related');
    }
  };

  const generateInsights = async () => { // Removed unused parameters
    setIsGeneratingInsights(true);
    try {
      // Mock response for demonstration
      const mockInsights = {
        contradictions: [
          "This contradicts with the findings in 'Neural Networks in Practice' which suggests a different approach."
        ],
        examples: [
          "Similar technique was used in 'Advanced ML Applications' with 92% accuracy."
        ],
        keyTakeaways: [
          "This method improves training efficiency by 30% compared to traditional approaches."
        ],
        inspirations: [
          "Could be combined with the augmentation strategy from 'Data Enhancement Methods'."
        ]
      };
      setGeneratedInsights(mockInsights);
      setActiveInsight('bulb');
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const generateAudioInsight = async () => { // Removed unused parameter
    setIsGeneratingAudio(true);
    try {
      // Mock response for demonstration
      const mockAudio = {
        url: 'path/to/generated/audio.mp3',
        duration: 145, // in seconds
        transcript: 'This technique shows promise based on multiple studies...'
      };
      setAudioInsight(mockAudio);
    } catch (error) {
      console.error('Error generating audio insight:', error);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const value = {
    activeInsight,
    relatedSections,
    generatedInsights,
    audioInsight,
    isGeneratingInsights,
    isGeneratingAudio,
    setActiveInsight,
    updateRelatedSections,
    generateInsights,
    generateAudioInsight,
    resetInsights
  };

  return (
    <InsightsContext.Provider value={value}>
      {children}
    </InsightsContext.Provider>
  );
};

InsightsProvider.propTypes = {
  children: PropTypes.node.isRequired
};

// Moved to a separate hooks file to comply with react-refresh/only-export-components
// export const useInsights = () => {
//   const context = useContext(InsightsContext);
//   if (!context) {
//     throw new Error('useInsights must be used within an InsightsProvider');
//   }
//   return context;
// };

export default InsightsProvider;