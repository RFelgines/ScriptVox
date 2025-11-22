from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session
from ..core.database import get_session
from ..models.models import Book, Chapter
from ..services.orchestrator import Orchestrator
from ..adapters.base import BaseLLM, BaseTTS
from ..main import get_llm_service, get_tts_service

router = APIRouter(prefix="/generation", tags=["generation"])
orchestrator = Orchestrator()

@router.post("/analyze/{book_id}")
async def analyze_book(
    book_id: int, 
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    llm_service: BaseLLM = Depends(get_llm_service)
):
    # Check if book exists
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Run analysis in background
    background_tasks.add_task(orchestrator.analyze_book, book_id, llm_service)
    
    return {"message": f"Analysis started for book {book_id}"}

@router.post("/segment/{chapter_id}")
async def segment_chapter(
    chapter_id: int,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    llm_service: BaseLLM = Depends(get_llm_service)
):
    chapter = session.get(Chapter, chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
        
    background_tasks.add_task(orchestrator.segment_chapter, chapter_id, llm_service)
    return {"message": f"Segmentation started for chapter {chapter_id}"}

@router.post("/generate/{chapter_id}")
async def generate_audio(
    chapter_id: int, 
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    tts_service: BaseTTS = Depends(get_tts_service)
):
    chapter = session.get(Chapter, chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
        
    background_tasks.add_task(orchestrator.generate_audio, chapter_id, tts_service)
    return {"message": f"Audio generation started for chapter {chapter_id}"}
