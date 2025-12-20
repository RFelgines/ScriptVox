import edge_tts
import asyncio
import subprocess
import sys
import tempfile
import os
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
                "FriendlyName": v.get("FriendlyName", v["ShortName"])  # Fallback to ShortName
            }
            for v in voices
        ]

    async def generate_audio(self, text: str, voice_id: str, output_path: str) -> str:
        print(f"[TTS DEBUG] Generating audio:")
        print(f"[TTS DEBUG]   Voice: {voice_id}")
        print(f"[TTS DEBUG]   Text length: {len(text)} chars")
        print(f"[TTS DEBUG]   Text preview: {text[:100]}...")
        print(f"[TTS DEBUG]   Output: {output_path}")
        
        # Use the edge_tts Python library directly (more reliable than subprocess)
        try:
            communicate = edge_tts.Communicate(text, voice_id)
            await communicate.save(output_path)
            print(f"[TTS DEBUG] Audio saved to {output_path}")
            return output_path
        except Exception as e:
            print(f"[TTS ERROR] edge_tts library failed: {e}, trying subprocess fallback")
        
        # Fallback to subprocess with temp file for long texts
        try:
            # For long texts, write to a temp file to avoid command-line length limits
            if len(text) > 1000:
                with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
                    f.write(text)
                    temp_file = f.name
                
                try:
                    result = subprocess.run(
                        [
                            sys.executable, "-m", "edge_tts",
                            "--file", temp_file,
                            "--voice", voice_id,
                            "--write-media", output_path
                        ],
                        capture_output=True,
                        text=True,
                        timeout=120
                    )
                finally:
                    # Clean up temp file
                    try:
                        os.unlink(temp_file)
                    except:
                        pass
            else:
                result = subprocess.run(
                    [
                        sys.executable, "-m", "edge_tts",
                        "--text", text,
                        "--voice", voice_id,
                        "--write-media", output_path
                    ],
                    capture_output=True,
                    text=True,
                    timeout=60
                )
            
            if result.returncode != 0:
                print(f"[TTS ERROR] edge-tts failed: {result.stderr}")
                raise Exception(f"edge-tts failed: {result.stderr}")
            
            print(f"[TTS DEBUG] Audio saved to {output_path}")
            return output_path
            
        except subprocess.TimeoutExpired:
            print(f"[TTS ERROR] edge-tts timed out")
            raise Exception("TTS generation timed out")
        except Exception as e:
            print(f"[TTS ERROR] {e}")
            raise

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
