"""Voice Registry for EdgeTTS voices with metadata for automatic character matching."""

from typing import List, Dict, Optional
import random


class VoiceMetadata:
    """Metadata for a single voice."""
    def __init__(
        self,
        voice_id: str,
        locale: str,
        gender: str,
        age_category: str,
        tone: str,
        voice_quality: str,
        quality_score: int = 5
    ):
        self.voice_id = voice_id
        self.locale = locale
        self.gender = gender.lower()
        self.age_category = age_category.lower()
        self.tone = tone.lower()
        self.voice_quality = voice_quality.lower()
        self.quality_score = quality_score  # 1-10, higher is better


class VoiceRegistry:
    """Registry of voices with metadata for automatic character-to-voice matching."""
    
    def __init__(self):
        self.voices: List[VoiceMetadata] = []
        self._populate_registry()
    
    def _populate_registry(self):
        """Populate with curated EdgeTTS voices and their characteristics."""
        
        # French voices (prioritized for French content)
        french_voices = [
            # Female French voices
            VoiceMetadata("fr-FR-DeniseNeural", "fr-FR", "female", "adult", "warm", "calm", 8),
            VoiceMetadata("fr-FR-EloiseNeural", "fr-FR", "female", "young", "soft", "cheerful", 7),
            VoiceMetadata("fr-FR-VivienneMultilingualNeural", "fr-FR", "female", "adult", "professional", "authoritative", 8),
            
            # Male French voices
            VoiceMetadata("fr-FR-HenriNeural", "fr-FR", "male", "adult", "deep", "calm", 8),
            VoiceMetadata("fr-FR-AlainNeural", "fr-FR", "male", "adult", "warm", "friendly", 7),
            VoiceMetadata("fr-FR-ClaudeNeural", "fr-FR", "male", "old", "deep", "authoritative", 7),
            VoiceMetadata("fr-FR-JeromeNeural", "fr-FR", "male", "young", "energetic", "enthusiastic", 6),
            VoiceMetadata("fr-FR-MauriceNeural", "fr-FR", "male", "old", "rough", "serious", 6),
            VoiceMetadata("fr-FR-YvesNeural", "fr-FR", "male", "adult", "professional", "calm", 7),
            VoiceMetadata("fr-FR-RemyMultilingualNeural", "fr-FR", "male", "adult", "clear", "professional", 8),
            
            # Child/Teen French (limited availability, using young voices)
            VoiceMetadata("fr-FR-BrigitteNeural", "fr-FR", "female", "teen", "high", "energetic", 6),
            VoiceMetadata("fr-FR-CelesteNeural", "fr-FR", "female", "teen", "soft", "gentle", 6),
        ]
        
        # English voices (for English content or multilingual books)
        english_voices = [
            # Female English (US)
            VoiceMetadata("en-US-JennyNeural", "en-US", "female", "adult", "warm", "friendly", 9),
            VoiceMetadata("en-US-AriaNeural", "en-US", "female", "young", "energetic", "cheerful", 8),
            VoiceMetadata("en-US-SaraNeural", "en-US", "female", "adult", "professional", "calm", 8),
            VoiceMetadata("en-US-NancyNeural", "en-US", "female", "old", "warm", "wise", 7),
            
            # Male English (US)
            VoiceMetadata("en-US-GuyNeural", "en-US", "male", "adult", "deep", "authoritative", 9),
            VoiceMetadata("en-US-TonyNeural", "en-US", "male", "young", "energetic", "enthusiastic", 8),
            VoiceMetadata("en-US-ChristopherNeural", "en-US", "male", "adult", "professional", "calm", 8),
            VoiceMetadata("en-US-EricNeural", "en-US", "male", "adult", "deep", "serious", 7),
            
            # Female English (UK)
            VoiceMetadata("en-GB-SoniaNeural", "en-GB", "female", "adult", "warm", "professional", 8),
            VoiceMetadata("en-GB-LibbyNeural", "en-GB", "female", "young", "cheerful", "friendly", 8),
            VoiceMetadata("en-GB-MaisieNeural", "en-GB", "female", "child", "high", "enthusiastic", 7),
            
            # Male English (UK)
            VoiceMetadata("en-GB-RyanNeural", "en-GB", "male", "adult", "deep", "authoritative", 8),
            VoiceMetadata("en-GB-ThomasNeural", "en-GB", "male", "young", "energetic", "friendly", 7),
        ]
        
        # Spanish voices
        spanish_voices = [
            VoiceMetadata("es-ES-ElviraNeural", "es-ES", "female", "adult", "warm", "calm", 7),
            VoiceMetadata("es-ES-AlvaroNeural", "es-ES", "male", "adult", "deep", "authoritative", 7),
            VoiceMetadata("es-MX-DaliaNeural", "es-MX", "female", "young", "cheerful", "friendly", 7),
            VoiceMetadata("es-MX-JorgeNeural", "es-MX", "male", "adult", "warm", "professional", 7),
        ]
        
        # German voices
        german_voices = [
            VoiceMetadata("de-DE-KatjaNeural", "de-DE", "female", "adult", "professional", "calm", 7),
            VoiceMetadata("de-DE-ConradNeural", "de-DE", "male", "adult", "deep", "authoritative", 7),
        ]
        
        # Italian voices
        italian_voices = [
            VoiceMetadata("it-IT-ElsaNeural", "it-IT", "female", "adult", "warm", "expressive", 7),
            VoiceMetadata("it-IT-DiegoNeural", "it-IT", "male", "adult", "deep", "passionate", 7),
        ]
        
        # Add all voices to registry
        self.voices.extend(french_voices)
        self.voices.extend(english_voices)
        self.voices.extend(spanish_voices)
        self.voices.extend(german_voices)
        self.voices.extend(italian_voices)
    
    def find_best_match(
        self,
        gender: Optional[str] = None,
        age_category: Optional[str] = None,
        tone: Optional[str] = None,
        voice_quality: Optional[str] = None,
        locale: str = "fr-FR"
    ) -> str:
        """
        Find the best matching voice based on character traits.
        
        Returns the voice_id of the best match.
        """
        # Filter by locale first (prioritize exact match, fall back to language)
        locale_matches = [v for v in self.voices if v.locale == locale]
        if not locale_matches:
            # Try language code only (e.g., "fr" from "fr-FR")
            lang_code = locale.split("-")[0]
            locale_matches = [v for v in self.voices if v.locale.startswith(lang_code)]
        
        if not locale_matches:
            # Ultimate fallback to French
            locale_matches = [v for v in self.voices if v.locale.startswith("fr")]
        
        # Filter by gender if provided
        candidates = locale_matches
        if gender:
            gender_matches = [v for v in candidates if v.gender == gender.lower()]
            if gender_matches:
                candidates = gender_matches
        
        # Filter by age if provided
        if age_category:
            age_matches = [v for v in candidates if v.age_category == age_category.lower()]
            if age_matches:
                candidates = age_matches
        
        # Score remaining candidates based on tone and quality matches
        if tone or voice_quality:
            scored_candidates = []
            for voice in candidates:
                score = voice.quality_score
                
                # Boost score for tone match
                if tone and tone.lower() in voice.tone:
                    score += 3
                
                # Boost score for quality match
                if voice_quality and voice_quality.lower() in voice.voice_quality:
                    score += 3
                
                scored_candidates.append((score, voice))
            
            # Sort by score descending
            scored_candidates.sort(key=lambda x: x[0], reverse=True)
            
            # Return the best match
            if scored_candidates:
                return scored_candidates[0][1].voice_id
        
        # If we still have candidates, pick the highest quality one (or random if tied)
        if candidates:
            candidates.sort(key=lambda x: x.quality_score, reverse=True)
            # Among top quality, pick randomly for variety
            top_quality = candidates[0].quality_score
            top_candidates = [v for v in candidates if v.quality_score == top_quality]
            return random.choice(top_candidates).voice_id
        
        # Ultimate fallback
        return "fr-FR-DeniseNeural"
    
    def get_voice_info(self, voice_id: str) -> Optional[VoiceMetadata]:
        """Get metadata for a specific voice."""
        for voice in self.voices:
            if voice.voice_id == voice_id:
                return voice
        return None
