import edge_tts
import asyncio
from typing import List, Dict
from .base import BaseTTS

class EdgeTTSAdapter(BaseTTS):
    async def list_voices(self) -> List[Dict[str, str]]:
        voices = await edge_tts.list_voices()
        return [
            {
                "ShortName": v["ShortName"], 
                "Gender": v["Gender"], 
                "Locale": v["Locale"],
                "FriendlyName": v["FriendlyName"]
            }
            for v in voices
        ]

    async def generate_audio(self, text: str, voice_id: str, output_path: str) -> str:
        communicate = edge_tts.Communicate(text, voice_id)
        await communicate.save(output_path)
        return output_path

class XTTSAdapter(BaseTTS):
    def __init__(self):
        # Check if required libraries are available, or raise error if strictly needed at init time.
        # For now, we just act as a stub that would fail if methods are called without proper setup.
        try:
            import torch
            # import TTS... 
        except ImportError:
            pass # Allow init, but methods might fail if used in wrong env

    async def list_voices(self) -> List[Dict[str, str]]:
        raise NotImplementedError("XTTS is not yet implemented or dependencies are missing.")

    async def generate_audio(self, text: str, voice_id: str, output_path: str) -> str:
        raise NotImplementedError("XTTS is not yet implemented or dependencies are missing.")
