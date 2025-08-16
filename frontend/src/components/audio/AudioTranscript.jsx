import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { Loader } from '../common/Loader';
import { useAudioContext } from '../../context/AudioContext';
import { Copy, Download, Volume2, Pause, Play } from 'lucide-react';

export const AudioTranscript = () => {
  const { currentAudio, isPlaying, playAudio, pauseAudio } = useAudioContext();
  const [isCopied, setIsCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!currentAudio?.audioUrl) return;

    const audioElement = new Audio(currentAudio.audioUrl);
    
    const updateTime = () => setCurrentTime(audioElement.currentTime);
    const updateDuration = () => setDuration(audioElement.duration);
    
    audioElement.addEventListener('timeupdate', updateTime);
    audioElement.addEventListener('loadedmetadata', updateDuration);

    return () => {
      audioElement.removeEventListener('timeupdate', updateTime);
      audioElement.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [currentAudio]);

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio(currentAudio.audioUrl);
    }
  };

  const handleCopyTranscript = async () => {
    if (!currentAudio?.transcript) return;
    
    try {
      await navigator.clipboard.writeText(currentAudio.transcript);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy transcript:', err);
    }
  };

  const handleDownloadAudio = () => {
    if (!currentAudio?.audioUrl) return;
    
    const link = document.createElement('a');
    link.href = currentAudio.audioUrl;
    link.download = `audio-summary-${new Date().toISOString().slice(0, 10)}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!currentAudio) {
    return (
      <div className="audio-transcript-empty bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          No audio generated yet. Select text and click the audio button to create a summary.
        </p>
      </div>
    );
  }

  return (
    <div className="audio-transcript-container bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
      <div className="audio-player bg-gray-50 dark:bg-gray-700 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={handlePlayPause}
              aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            
            <div className="text-sm font-medium">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyTranscript}
              disabled={!currentAudio.transcript}
              tooltip={isCopied ? 'Copied!' : 'Copy transcript'}
            >
              <Copy className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadAudio}
              tooltip="Download audio"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="mt-3 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-blue-500" />
          {currentAudio.title || 'Audio Summary'}
        </h3>
        
        {currentAudio.isGenerating ? (
          <div className="flex items-center justify-center py-8">
            <Loader size="md" message="Generating transcript..." />
          </div>
        ) : (
          <div className="transcript-content prose dark:prose-invert max-w-none">
            {currentAudio.transcript ? (
              <p className="whitespace-pre-wrap">{currentAudio.transcript}</p>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No transcript available</p>
            )}
          </div>
        )}
      </div>
      
      {currentAudio.sources && currentAudio.sources.length > 0 && (
        <div className="px-4 pb-4">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Sources:</h4>
          <ul className="space-y-1">
            {currentAudio.sources.map((source, index) => (
              <li key={index} className="text-sm text-gray-600 dark:text-gray-300">
                {source.documentTitle} - {source.sectionTitle}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};