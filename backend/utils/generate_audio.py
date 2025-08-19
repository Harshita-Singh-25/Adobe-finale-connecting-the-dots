import os
import asyncio
from pathlib import Path
from typing import Optional
import uuid
import tempfile

class AudioGenerator:
    """Generate audio summaries using TTS"""
    
    def __init__(self):
        self.provider = os.getenv("TTS_PROVIDER", "azure")
        self.azure_key = os.getenv("AZURE_TTS_KEY")
        self.azure_endpoint = os.getenv("AZURE_TTS_ENDPOINT")
    
    async def generate_audio(self, text: str, output_dir: Optional[Path] = None) -> str:
        """Generate audio from text"""
        if not output_dir:
            output_dir = Path(tempfile.gettempdir())
        
        output_file = output_dir / f"audio_{uuid.uuid4().hex[:8]}.mp3"
        
        if self.provider == "azure" and self.azure_key:
            return await self._generate_azure_audio(text, output_file)
        else:
            return await self._generate_local_audio(text, output_file)
    
    async def _generate_azure_audio(self, text: str, output_file: Path) -> str:
        """Generate audio using Azure TTS"""
        try:
            import azure.cognitiveservices.speech as speechsdk
            
            # Configure speech service
            speech_config = speechsdk.SpeechConfig(
                subscription=self.azure_key,
                region=self.azure_endpoint.split('.')[0] if self.azure_endpoint else "eastus"
            )
            
            # Set voice
            speech_config.speech_synthesis_voice_name = "en-US-JennyNeural"
            
            # Configure audio output
            audio_config = speechsdk.audio.AudioOutputConfig(filename=str(output_file))
            
            # Create synthesizer
            synthesizer = speechsdk.SpeechSynthesizer(
                speech_config=speech_config, 
                audio_config=audio_config
            )
            
            # Generate speech
            result = synthesizer.speak_text_async(text).get()
            
            if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                return str(output_file)
            else:
                raise Exception(f"TTS failed: {result.reason}")
                
        except Exception as e:
            print(f"Azure TTS failed: {e}, falling back to local TTS")
            return await self._generate_local_audio(text, output_file)
    
    async def _generate_local_audio(self, text: str, output_file: Path) -> str:
        """Generate audio using local TTS (fallback)"""
        try:
            import pyttsx3
            
            engine = pyttsx3.init()
            engine.setProperty('rate', 150)
            engine.setProperty('volume', 1.0)
            
            # Save to file
            engine.save_to_file(text, str(output_file))
            engine.runAndWait()
            
            return str(output_file)
            
        except Exception as e:
            print(f"Local TTS failed: {e}")
            # Create dummy file
            output_file.write_text(f"Audio generation failed: {e}")
            return str(output_file)
    
    def get_audio_duration(self, audio_path: str) -> float:
        """Get audio file duration"""
        try:
            import mutagen
            from mutagen.mp3 import MP3
            
            audio = MP3(audio_path)
            return audio.info.length
        except:
            return 120.0  # Default 2 minutes