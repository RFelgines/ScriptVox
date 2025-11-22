from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any

class BaseLLM(ABC):
    @abstractmethod
    async def analyze_text(self, text: str) -> Dict[str, Any]:
        """Analyze text to extract characters, scenes, etc."""
        pass

    @abstractmethod
    async def assign_roles(self, text: str, characters: List[Dict]) -> List[Dict]:
        """Assign speakers to text segments."""
        pass

class BaseTTS(ABC):
    @abstractmethod
    async def list_voices(self) -> List[Dict[str, str]]:
        """List available voices."""
        pass

    @abstractmethod
    async def generate_audio(self, text: str, voice_id: str, output_path: str) -> str:
        """Generate audio file from text."""
        pass
