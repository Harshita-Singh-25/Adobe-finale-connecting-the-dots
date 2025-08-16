import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '../common/Button';
import { Slider } from '../common/Slider';

export const AudioPlayer = ({ audioUrl, onEnded, autoPlay = false }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  // Handle audio metadata load
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      if (autoPlay) audio.play().catch(e => console.error("Autoplay failed:", e));
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [autoPlay]);

  // Handle time updates
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onEnded]);

  // Handle play/pause
  useEffect(() => {
    if (!audioRef.current) return;
    isPlaying ? audioRef.current.play() : audioRef.current.pause();
  }, [isPlaying]);

  // Handle volume changes
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Handle playback rate changes
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  const togglePlayPause = () => setIsPlaying(!isPlaying);
  const toggleMute = () => setIsMuted(!isMuted);
  const handleTimeChange = (value) => {
    audioRef.current.currentTime = value;
    setCurrentTime(value);
  };
  const handleVolumeChange = (value) => {
    setVolume(value);
    if (value === 0) setIsMuted(true);
    else if (isMuted) setIsMuted(false);
  };
  const skipForward = () => {
    audioRef.current.currentTime = Math.min(currentTime + 15, duration);
  };
  const skipBackward = () => {
    audioRef.current.currentTime = Math.max(currentTime - 15, 0);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!audioUrl) return (
    <div className="p-4 text-center text-gray-500">
      No audio available
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        className="hidden"
      />

      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs text-gray-600 dark:text-gray-300 w-10">
          {formatTime(currentTime)}
        </span>
        <Slider
          value={currentTime}
          max={duration || 0.1} // Avoid division by zero
          onChange={handleTimeChange}
          className="flex-1"
        />
        <span className="text-xs text-gray-600 dark:text-gray-300 w-10">
          {formatTime(duration)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Playback speed */}
        <div className="flex items-center">
          <select
            value={playbackRate}
            onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
            className="text-xs bg-gray-100 dark:bg-gray-700 rounded px-2 py-1"
          >
            {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(speed => (
              <option key={speed} value={speed}>
                {speed}x
              </option>
            ))}
          </select>
        </div>

        {/* Main controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={skipBackward}
            aria-label="Skip back 15 seconds"
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          
          <Button
            variant="primary"
            size="lg"
            onClick={togglePlayPause}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-12 h-12 rounded-full"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={skipForward}
            aria-label="Skip forward 15 seconds"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* Volume controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
          
          <Slider
            value={isMuted ? 0 : volume}
            max={1}
            step={0.01}
            onChange={handleVolumeChange}
            className="w-20"
          />
        </div>
      </div>
    </div>
  );
};

AudioPlayer.propTypes = {
  audioUrl: PropTypes.string,
  onEnded: PropTypes.func,
  autoPlay: PropTypes.bool,
};

export default AudioPlayer;