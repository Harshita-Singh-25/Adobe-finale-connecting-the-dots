import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { Slider } from '../common/Slider';
import { Volume, Volume1, Volume2, VolumeX, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import PropTypes from 'prop-types';

export const PodcastControls = ({ 
  audioRef,
  isPlaying,
  duration,
  currentTime,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onSkipForward,
  onSkipBack,
  playbackRate,
  onPlaybackRateChange
}) => {
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [showSpeedOptions, setShowSpeedOptions] = useState(false);

  // Initialize volume from audioRef if available
  useEffect(() => {
    if (audioRef.current) {
      setVolume(audioRef.current.volume);
      setIsMuted(audioRef.current.muted);
    }
  }, [audioRef]);

  const handleVolumeChange = (value) => {
    const newVolume = parseFloat(value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
    onVolumeChange?.(newVolume);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeChange = (value) => {
    const newTime = parseFloat(value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    onSeek?.(newTime);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const playbackRates = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <div className="podcast-controls bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-inner">
      {/* Progress Bar */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs text-gray-600 dark:text-gray-300 w-10 text-right">
          {formatTime(currentTime)}
        </span>
        <Slider
          value={currentTime}
          max={duration || 100}
          onChange={handleTimeChange}
          className="flex-1"
        />
        <span className="text-xs text-gray-600 dark:text-gray-300 w-10">
          {formatTime(duration)}
        </span>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Playback Speed */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSpeedOptions(!showSpeedOptions)}
              aria-label="Playback speed"
            >
              <span className="text-xs font-medium">{playbackRate}x</span>
            </Button>
            
            {showSpeedOptions && (
              <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-700 shadow-lg rounded-md p-2 z-10 min-w-[80px]">
                {playbackRates.map(rate => (
                  <button
                    key={rate}
                    className={`block w-full text-left px-3 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-600 ${playbackRate === rate ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                    onClick={() => {
                      onPlaybackRateChange?.(rate);
                      setShowSpeedOptions(false);
                    }}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkipBack}
            aria-label="Skip back 15 seconds"
          >
            <SkipBack className="w-5 h-5" />
          </Button>
          
          <Button
            variant="primary"
            size="lg"
            onClick={onPlayPause}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-12 h-12 rounded-full"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkipForward}
            aria-label="Skip forward 15 seconds"
          >
            <SkipForward className="w-5 h-5" />
          </Button>
        </div>

        {/* Volume Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5" />
            ) : volume < 0.5 ? (
              <Volume className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </Button>
          
          <Slider
            value={isMuted ? 0 : volume}
            max={1}
            step={0.01}
            onChange={handleVolumeChange}
            className="w-24"
          />
        </div>
      </div>
    </div>
  );
};

PodcastControls.propTypes = {
  audioRef: PropTypes.object.isRequired,
  isPlaying: PropTypes.bool.isRequired,
  duration: PropTypes.number.isRequired,
  currentTime: PropTypes.number.isRequired,
  onPlayPause: PropTypes.func.isRequired,
  onSeek: PropTypes.func.isRequired,
  onVolumeChange: PropTypes.func,
  onSkipForward: PropTypes.func,
  onSkipBack: PropTypes.func,
  playbackRate: PropTypes.number,
  onPlaybackRateChange: PropTypes.func,
};