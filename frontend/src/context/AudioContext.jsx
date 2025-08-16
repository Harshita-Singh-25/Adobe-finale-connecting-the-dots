import React, { createContext, useContext, useState } from 'react';

// 1. First create the context (this doesn't count as an export)
const AudioContext = createContext();

// 2. Create the provider component
const AudioProvider = ({ children }) => {
  const [currentAudio, setCurrentAudio] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  const playAudio = (audioUrl) => {
    setCurrentAudio(audioUrl);
    setIsPlaying(true);
  };

  const pauseAudio = () => {
    setIsPlaying(false);
  };

  return (
    <AudioContext.Provider
      value={{
        currentAudio,
        isPlaying,
        playbackRate,
        playAudio,
        pauseAudio,
        setPlaybackRate
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

// 3. Create the hook but don't export it directly
function useAudioInternal() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}

// 4. Export everything as a single object
const Audio = {
  Provider: AudioProvider,
  useContext: useAudioInternal
};

// 5. Default export (required for Fast Refresh)
export default Audio;