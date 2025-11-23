from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from pydantic import BaseModel
from typing import Optional
from ..core.database import get_session
from ..models.models import Character

router = APIRouter(prefix="/characters", tags=["characters"])

class CharacterUpdate(BaseModel):
    assigned_voice_id: Optional[str] = None
    name: Optional[str] = None
    gender: Optional[str] = None

@router.patch("/{character_id}", response_model=Character)
def update_character(
    character_id: int,
    character_update: CharacterUpdate,
    session: Session = Depends(get_session)
):
    character = session.get(Character, character_id)
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    
    if character_update.assigned_voice_id is not None:
        character.assigned_voice_id = character_update.assigned_voice_id
    if character_update.name is not None:
        character.name = character_update.name
    if character_update.gender is not None:
        character.gender = character_update.gender
        
    session.add(character)
    session.commit()
    session.refresh(character)
    return character
