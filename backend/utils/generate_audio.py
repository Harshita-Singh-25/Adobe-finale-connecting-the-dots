# backend/utils/generate_audio.py
import os
import tempfile
from pathlib import Path
from typing import Optional
import asyncio
from google.cloud import texttospeech
from backend.core.config import settings

class AudioGenerator:
    """Handles text-to-speech audio generation"""
    
    def __init__(self):
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize TTS client"""
        if settings.GOOGLE_APPLICATION_CREDENTIALS:
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = settings.GOOGLE_APPLICATION_CREDENTIALS
        
        try:
            self.client = texttospeech.TextToSpeechClient()
        except Exception as e:
            print(f"Failed to initialize TTS client: {e}")
            self.client = None
    
    async def generate_audio(self, text: str) -> str:
        """Generate audio file from text"""
        if not self.client:
            raise Exception("TTS client not initialized")
        
        # Limit text length
        text = text[:5000]
        
        # Set up synthesis input
        synthesis_input = texttospeech.SynthesisInput(text=text)
        
        # Build voice request
        voice = texttospeech.VoiceSelectionParams(
            language_code="en-US",
            name="en-US-Studio-O",
            ssml_gender=texttospeech.SsmlVoiceGender.FEMALE
        )
        
        # Set audio config
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=1.0,
            pitch=0,
            volume_gain_db=0
        )
        
        # Generate speech
        try:
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.client.synthesize_speech(
                    input=synthesis_input,
                    voice=voice,
                    audio_config=audio_config
                )
            )
            
            # Save to temp file
            output_dir = settings.CACHE_DIR / "audio"
            output_dir.mkdir(exist_ok=True)
            
            temp_file = tempfile.NamedTemporaryFile(
                suffix=".mp3",
                dir=output_dir,
                delete=False
            )
            temp_file.write(response.audio_content)
            temp_file.close()
            
            return str(Path(temp_file.name).relative_to(settings.BASE_DIR))
            
        except Exception as e:
            raise Exception(f"Audio generation failed: {str(e)}")
    
    def get_audio_duration(self, audio_path: str) -> float:
        """Estimate audio duration in seconds"""
        try:
            # Simple estimation: 150 words per minute
            with open(settings.BASE_DIR / audio_path, 'rb') as f:
                content = f.read()
                word_count = len(content) / 6  # Approximate
                return max(word_count / 150 * 60, 5)  # Minimum 5 seconds
        except:
            return 0