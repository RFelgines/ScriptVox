from typing import List, Dict, Any
from .base import BaseLLM
import google.generativeai as genai
import os

class GeminiLLMAdapter(BaseLLM):
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    async def analyze_text(self, text: str) -> Dict[str, Any]:
        prompt = """
        You are an expert literary analyst. 
        Analyze the following text from a book chapter. 
        Identify the Narrator (if distinct) and all unique characters who speak or are mentioned significantly.
        
        For each character, determine:
        - Their likely age category: "child" (0-12), "teen" (13-19), "young" (20-35), "adult" (36-60), or "old" (60+)
        - Their voice tone: describe the tone (e.g., "deep", "high", "soft", "rough", "warm", "cold")
        - Their voice quality: describe the emotional quality (e.g., "energetic", "calm", "ominous", "cheerful", "authoritative")
        
        Return the result strictly as a JSON object with this structure:
        {
            "characters": [
                {
                    "name": "Character Name",
                    "gender": "male" or "female" or "neutral",
                    "age_category": "child" or "teen" or "young" or "adult" or "old",
                    "tone": "Brief description of voice tone",
                    "voice_quality": "Brief description of voice quality/emotion",
                    "description": "Short description of personality and role in the story"
                }
            ]
        }
        
        Text to analyze:
        """
        # Truncate text to avoid token limits if necessary, though Gemini 1.5 Flash has a large context.
        # We'll take the first 15000 characters which is usually enough for a chapter.
        safe_text = text[:15000]
        
        try:
            response = await self.model.generate_content_async(f"{prompt}\n{safe_text}")
            
            # Clean up response to ensure it's valid JSON
            content = response.text.strip()
            if content.startswith("```json"):
                content = content[7:-3].strip()
            elif content.startswith("```"):
                content = content[3:-3].strip()
                
            import json
            return json.loads(content)
        except Exception as e:
            print(f"Error calling Gemini: {e}")
            return {"characters": []}

    async def assign_roles(self, text: str, characters: List[Dict]) -> List[Dict]:
        # Format character list for the prompt
        char_list_str = ", ".join([f"{c['name']} ({c['gender']})" for c in characters])
        
        prompt = f"""You are adapting a novel for audiobook narration.
Your task is to split the text into segments and assign a speaker to each segment.

IMPORTANT: Keep segments LONG and natural. Each segment should be:
- A complete paragraph of narration (for Narrator)
- A complete line of dialogue with its dialogue tag (for characters)
- Never split mid-sentence or mid-thought

Available speakers: {char_list_str}, Narrator.

Rules:
1. Narrator speaks all descriptive text, action, and narration.
2. Character names speak their dialogue (text inside quotation marks).
3. Keep dialogue with its surrounding description if short (e.g., "said Harry quietly")
4. Aim for segments of 50-500 words each. NEVER create segments shorter than 20 words.
5. Preserve the natural flow and rhythm of the prose.

Return a JSON array:
[
    {{"text": "Long paragraph of narration here...", "speaker": "Narrator"}},
    {{"text": "Character's complete dialogue with tag.", "speaker": "CharacterName"}}
]

Text to process:
"""
        
        # We process in chunks to avoid hitting output token limits, but for V1 let's try a reasonable chunk.
        # Ideally we should loop, but let's assume the chapter text passed here is manageable or we handle it upstream.
        # For this demo, we'll take the first 10000 chars if it's huge, but ideally the orchestrator handles chunking.
        safe_text = text[:10000] 
        
        try:
            response = await self.model.generate_content_async(f"{prompt}\n{safe_text}")
            
            content = response.text.strip()
            if content.startswith("```json"):
                content = content[7:-3].strip()
            elif content.startswith("```"):
                content = content[3:-3].strip()
                
            import json
            return json.loads(content)
        except Exception as e:
            print(f"Error calling Gemini for roles: {e}")
            # Fallback: Return entire text as Narrator
            return [{"text": text, "speaker": "Narrator"}]

class OllamaLLMAdapter(BaseLLM):
    def __init__(self, model_name: str = "qwen3:8b", base_url: str = "http://localhost:11434"):
        self.model_name = model_name
        self.base_url = base_url
    
    async def _call_ollama(self, prompt: str) -> str:
        import aiohttp
        import json
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model_name,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json"
                }
            ) as response:
                result = await response.json()
                return result.get("response", "{}")
    
    async def analyze_text(self, text: str) -> Dict[str, Any]:
        prompt = f"""You are an expert literary analyst. 
Analyze the following text from a book chapter. 
Identify the Narrator (if distinct) and all unique characters who speak or are mentioned significantly.

For each character, determine:
- Their likely age category: "child" (0-12), "teen" (13-19), "young" (20-35), "adult" (36-60), or "old" (60+)
- Their voice tone: describe the tone (e.g., "deep", "high", "soft", "rough", "warm", "cold")
- Their voice quality: describe the emotional quality (e.g., "energetic", "calm", "ominous", "cheerful", "authoritative")

Return the result strictly as a JSON object with this structure:
{{
    "characters": [
        {{
            "name": "Character Name",
            "gender": "male" or "female" or "neutral",
            "age_category": "child" or "teen" or "young" or "adult" or "old",
            "tone": "Brief description of voice tone",
            "voice_quality": "Brief description of voice quality/emotion",
            "description": "Short description of personality and role in the story"
        }}
    ]
}}

Text to analyze:
{text[:15000]}"""
        
        try:
            response_text = await self._call_ollama(prompt)
            import json
            return json.loads(response_text)
        except Exception as e:
            print(f"Error calling Ollama: {e}")
            return {"characters": []}

    async def assign_roles(self, text: str, characters: List[Dict]) -> List[Dict]:
        char_list_str = ", ".join([f"{c['name']} ({c['gender']})" for c in characters])
        
        prompt = f"""You are a scriptwriter adapting a novel for audio.
Your task is to split the following text into granular segments (dialogue vs narration) and assign a speaker to each.

Available Characters: {char_list_str}, Narrator.

Rules:
1. Split the text into logical segments. Dialogue lines MUST be separate segments.
2. Assign "Narrator" to descriptive text.
3. Assign the correct Character Name to dialogue.
4. If you are unsure who is speaking, use "Narrator" or the most likely character based on context.
5. Return ONLY a valid JSON array. Do not include any explanations or markdown.

Example Output:
[
    {{"text": "The door creaked open.", "speaker": "Narrator"}},
    {{"text": "Who's there?", "speaker": "John"}},
    {{"text": "It's only me.", "speaker": "Jane"}}
]

Text to process:
{text[:10000]}"""
        
        try:
            response_text = await self._call_ollama(prompt)
            print(f"[DEBUG] Ollama raw response: {response_text[:500]}")
            
            # Clean up response
            response_text = response_text.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            response_text = response_text.strip()
            
            import json
            parsed = json.loads(response_text)
            
            # Handle case where Ollama returns a single object instead of an array
            if isinstance(parsed, dict):
                print(f"[DEBUG] Ollama returned single object, converting to array")
                parsed = [parsed]
            
            # Validate structure
            if isinstance(parsed, list):
                # Check if items are dicts with required keys
                valid_segments = []
                for item in parsed:
                    if isinstance(item, dict) and "text" in item and "speaker" in item:
                        valid_segments.append(item)
                    else:
                        print(f"[WARN] Skipping invalid segment: {item}")
                
                if valid_segments:
                    return valid_segments
            
            print(f"[WARN] Ollama returned invalid format, using fallback")
            return [{"text": text, "speaker": "Narrator"}]
            
        except Exception as e:
            print(f"Error calling Ollama for roles: {e}")
            return [{"text": text, "speaker": "Narrator"}]
