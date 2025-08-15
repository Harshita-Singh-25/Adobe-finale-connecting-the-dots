# backend/utils/chat_with_llm.py
import os
import json
import asyncio
from typing import Dict, List, Any, Optional
from google.cloud import aiplatform
from google.auth.credentials import Credentials
import google.auth
from backend.core.config import settings

class LLMClient:
    """Client for interacting with various LLM providers"""
    
    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        self.model = settings.GEMINI_MODEL
        self._setup_client()
    
    def _setup_client(self):
        """Setup client based on provider"""
        if self.provider == "gemini":
            if settings.GOOGLE_APPLICATION_CREDENTIALS:
                os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = settings.GOOGLE_APPLICATION_CREDENTIALS
            
            # Initialize Vertex AI
            try:
                credentials, project = google.auth.default()
                aiplatform.init(project=project, credentials=credentials)
            except Exception as e:
                print(f"Failed to initialize Vertex AI: {e}")
    
    async def generate_insights(self, selected_text: str, 
                              related_sections: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate insights from selected text and related sections"""
        try:
            # Prepare context
            context = self._prepare_insight_context(selected_text, related_sections)
            
            # Generate insights
            insights = await self._call_llm(
                system_prompt=self._get_insight_system_prompt(),
                user_prompt=context
            )
            
            return {
                "success": True,
                "insights": self._parse_insights(insights),
                "raw_response": insights
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "insights": []
            }
    
    def _prepare_insight_context(self, selected_text: str, 
                                related_sections: List[Dict[str, Any]]) -> str:
        """Prepare context for LLM insight generation"""
        context = f"Selected Text: {selected_text}\n\nRelated Sections:\n"
        
        for i, section in enumerate(related_sections[:5], 1):
            context += f"\n{i}. Document: {section['doc_title']}\n"
            context += f"   Section: {section['heading']}\n"
            context += f"   Content: {section['snippet']}\n"
            context += f"   Relevance: {section['relevance_type']}\n"
        
        return context
    
    def _get_insight_system_prompt(self) -> str:
        """Get system prompt for insight generation"""
        return """You are an expert document analyst. Given a selected text and related sections from documents, generate insightful analysis.

Provide insights in the following categories:
1. Key Takeaways - Main points and conclusions
2. Contradictions - Any opposing viewpoints or conflicting information
3. Examples - Specific examples or case studies mentioned
4. Extensions - How concepts are built upon or extended
5. Did You Know - Interesting facts or lesser-known information

Format your response as JSON with the following structure:
{
    "key_takeaways": ["insight 1", "insight 2"],
    "contradictions": ["contradiction 1"],
    "examples": ["example 1", "example 2"],
    "extensions": ["extension 1"],
    "did_you_know": ["fact 1", "fact 2"]
}

Keep insights concise, specific, and grounded in the provided content only."""
    
    async def _call_llm(self, system_prompt: str, user_prompt: str) -> str:
        """Make LLM API call"""
        if self.provider == "gemini":
            return await self._call_gemini(system_prompt, user_prompt)
        elif self.provider == "ollama":
            return await self._call_ollama(system_prompt, user_prompt)
        else:
            raise ValueError(f"Unsupported LLM provider: {self.provider}")
    
    async def _call_gemini(self, system_prompt: str, user_prompt: str) -> str:
        """Call Gemini API"""
        try:
            from vertexai.generative_models import GenerativeModel
            
            model = GenerativeModel(self.model)
            
            # Combine prompts
            full_prompt = f"System: {system_prompt}\n\nUser: {user_prompt}"
            
            # Generate response
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: model.generate_content(
                    full_prompt,
                    generation_config={
                        "max_output_tokens": 1024,
                        "temperature": 0.3,
                        "top_p": 0.8,
                    }
                )
            )
            
            return response.text
            
        except Exception as e:
            raise Exception(f"Gemini API error: {str(e)}")
    
    async def _call_ollama(self, system_prompt: str, user_prompt: str) -> str:
        """Call Ollama local API"""
        try:
            import aiohttp
            
            async with aiohttp.ClientSession() as session:
                payload = {
                    "model": os.getenv("OLLAMA_MODEL", "llama3"),
                    "system": system_prompt,
                    "prompt": user_prompt,
                    "stream": False
                }
                
                async with session.post(
                    "http://localhost:11434/api/generate",
                    json=payload
                ) as response:
                    result = await response.json()
                    return result.get("response", "")
                    
        except Exception as e:
            raise Exception(f"Ollama API error: {str(e)}")
    
    def _parse_insights(self, llm_response: str) -> Dict[str, List[str]]:
        """Parse LLM response into structured insights"""
        try:
            # Try to parse as JSON
            insights = json.loads(llm_response)
            
            # Validate structure
            expected_keys = ["key_takeaways", "contradictions", "examples", 
                           "extensions", "did_you_know"]
            
            for key in expected_keys:
                if key not in insights:
                    insights[key] = []
            
            return insights
            
        except json.JSONDecodeError:
            # Fallback parsing if not valid JSON
            return self._fallback_parse_insights(llm_response)
    
    def _fallback_parse_insights(self, text: str) -> Dict[str, List[str]]:
        """Fallback parsing for non-JSON responses"""
        insights = {
            "key_takeaways": [],
            "contradictions": [],
            "examples": [],
            "extensions": [],
            "did_you_know": []
        }
        
        # Simple keyword-based extraction
        lines = text.split('\n')
        current_category = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Detect categories
            if "takeaway" in line.lower():
                current_category = "key_takeaways"
            elif "contradiction" in line.lower():
                current_category = "contradictions"
            elif "example" in line.lower():
                current_category = "examples"
            elif "extension" in line.lower():
                current_