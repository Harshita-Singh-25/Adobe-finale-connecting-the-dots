import axios from 'axios';

/**
 * Audio Utility Functions
 * Provides helper functions for audio recording, playback, and processing
 */

// Audio recording constants
const AUDIO_FORMAT = 'audio/wav';
const SAMPLE_RATE = 16000; // Standard sample rate for speech recognition

// Global variables for audio context
let audioContext;
let mediaRecorder;
let audioChunks = [];
let audioStream;

/**
 * Initialize audio context
 * @returns {AudioContext} The audio context instance
 */
export const initAudioContext = () => {
  if (!audioContext) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
  }
  return audioContext;
};

/**
 * Start audio recording
 * @returns {Promise<MediaStream>} The audio stream
 */
export const startRecording = async () => {
  try {
    audioChunks = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioStream = stream;
    mediaRecorder = new MediaRecorder(stream);
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };
    
    mediaRecorder.start(100); // Collect data every 100ms
    return stream;
  } catch (error) {
    console.error('Error starting recording:', error);
    throw error;
  }
};

/**
 * Stop audio recording
 * @returns {Promise<Blob>} The recorded audio blob
 */
export const stopRecording = async () => {
  return new Promise((resolve) => {
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: AUDIO_FORMAT });
      cleanupRecording();
      resolve(audioBlob);
    };
    
    mediaRecorder.stop();
    audioStream.getTracks().forEach(track => track.stop());
  });
};

/**
 * Clean up recording resources
 */
const cleanupRecording = () => {
  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop());
    audioStream = null;
  }
  mediaRecorder = null;
  audioChunks = [];
};

/**
 * Play audio from a blob
 * @param {Blob} audioBlob - The audio blob to play
 */
export const playAudio = (audioBlob) => {
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  
  audio.onended = () => {
    URL.revokeObjectURL(audioUrl);
  };
  
  return audio.play();
};

/**
 * Convert audio blob to base64
 * @param {Blob} audioBlob - The audio blob to convert
 * @returns {Promise<string>} Base64 encoded audio
 */
export const blobToBase64 = (audioBlob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });
};

/**
 * Convert audio blob to array buffer
 * @param {Blob} audioBlob - The audio blob to convert
 * @returns {Promise<ArrayBuffer>} Audio as array buffer
 */
export const blobToArrayBuffer = (audioBlob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(audioBlob);
  });
};

/**
 * Process audio with backend API
 * @param {Blob} audioBlob - The audio to process
 * @param {string} apiEndpoint - The API endpoint
 * @returns {Promise<Object>} API response
 */
export const processAudio = async (audioBlob, apiEndpoint) => {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    
    const response = await axios.post(apiEndpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Audio processing error:', error);
    throw error;
  }
};

/**
 * Generate audio from text (TTS)
 * @param {string} text - Text to convert to speech
 * @param {string} apiEndpoint - TTS API endpoint
 * @returns {Promise<Blob>} Generated audio blob
 */
export const textToSpeech = async (text, apiEndpoint) => {
  try {
    const response = await axios.post(apiEndpoint, { text }, {
      responseType: 'blob',
    });
    
    return response.data;
  } catch (error) {
    console.error('TTS error:', error);
    throw error;
  }
};

/**
 * Visualize audio waveform
 * @param {HTMLAudioElement} audioElement - The audio element to visualize
 * @param {HTMLCanvasElement} canvas - The canvas to draw on
 */
export const visualizeAudio = (audioElement, canvas) => {
  const context = canvas.getContext('2d');
  const audioContext = initAudioContext();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaElementSource(audioElement);
  
  source.connect(analyser);
  analyser.connect(audioContext.destination);
  analyser.fftSize = 256;
  
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  const draw = () => {
    requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);
    
    context.fillStyle = 'rgb(200, 200, 200)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = dataArray[i] / 2;
      context.fillStyle = `rgb(50, 50, ${barHeight + 100})`;
      context.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
  };
  
  draw();
};

// Export all utility functions
export default {
  initAudioContext,
  startRecording,
  stopRecording,
  playAudio,
  blobToBase64,
  blobToArrayBuffer,
  processAudio,
  textToSpeech,
  visualizeAudio,
};