import { useState, useRef, useEffect } from 'react';

const useAudioGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  
  const audioRef = useRef(new Audio());
  const generationControllerRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio.pause();
      if (generationControllerRef.current) {
        generationControllerRef.current.abort();
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Handle audio playback events
  useEffect(() => {
    const audio = audioRef.current;
    
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  const generateAudio = async (text, options = {}) => {
    setIsGenerating(true);
    setError(null);
    setProgress(0);
    
    try {
      // Create a new AbortController for this generation request
      generationControllerRef.current = new AbortController();
      
      // Simulate API call to generate audio
      // Replace this with your actual API call
      const response = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, ...options }),
        signal: generationControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Audio generation failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      setAudioBlob(blob);
      setAudioUrl(url);
      audioRef.current.src = url;
      
      return { blob, url };
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
        console.error('Audio generation error:', err);
      }
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const playAudio = () => {
    if (audioUrl) {
      audioRef.current.play().catch(err => {
        setError('Playback failed: ' + err.message);
      });
    }
  };

  const pauseAudio = () => {
    audioRef.current.pause();
  };

  const stopAudio = () => {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
  };

  const seekAudio = (percentage) => {
    if (audioRef.current.duration) {
      audioRef.current.currentTime = (percentage / 100) * audioRef.current.duration;
    }
  };

  const cancelGeneration = () => {
    if (generationControllerRef.current) {
      generationControllerRef.current.abort();
      setIsGenerating(false);
    }
  };

  return {
    // State
    isGenerating,
    isPlaying,
    progress,
    error,
    audioBlob,
    audioUrl,
    
    // Methods
    generateAudio,
    playAudio,
    pauseAudio,
    stopAudio,
    seekAudio,
    cancelGeneration,
  };
};

export default useAudioGeneration;