from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
import shutil
import os
from ..core.database import get_session
from ..models.models import Book, Chapter, Character
from ..services.orchestrator import Orchestrator
from ..main import get_llm_service, get_tts_service

router = APIRouter(prefix="/books", tags=["books"])
orchestrator = Orchestrator()

@router.post("/upload", response_model=Book)
async def upload_book(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    auto_process: bool = False,
    llm_service = Depends(get_llm_service),
    tts_service = Depends(get_tts_service)
):
    if not file.filename.endswith(".epub"):
        raise HTTPException(status_code=400, detail="Only .epub files are supported")
    
    if auto_process:
        return await orchestrator.process_upload_and_generate(file, background_tasks, llm_service, tts_service)
    else:
        return await orchestrator.process_upload_and_analyze(file, background_tasks, llm_service)

@router.post("/{book_id}/cover", response_model=Book)
async def upload_cover(
    book_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are supported")
    
    # Create covers directory if it doesn't exist
    covers_dir = "data/covers"
    os.makedirs(covers_dir, exist_ok=True)
    
    # Save cover image
    file_extension = file.filename.split(".")[-1]
    cover_filename = f"book_{book_id}_cover.{file_extension}"
    cover_path = os.path.join(covers_dir, cover_filename)
    
    with open(cover_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update book record
    book.cover_path = cover_path
    session.add(book)
    session.commit()
    session.refresh(book)
    
    return book

@router.get("/", response_model=List[Book])
def list_books(session: Session = Depends(get_session)):
    books = session.exec(select(Book)).all()
    return books

@router.get("/{book_id}", response_model=Book)
def get_book(book_id: int, session: Session = Depends(get_session)):
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book

@router.get("/{book_id}/chapters", response_model=List[Chapter])
def get_book_chapters(book_id: int, session: Session = Depends(get_session)):
    chapters = session.exec(select(Chapter).where(Chapter.book_id == book_id).order_by(Chapter.position)).all()
    return chapters

@router.get("/{book_id}/characters", response_model=List[Character])
def get_book_characters(book_id: int, session: Session = Depends(get_session)):
    characters = session.exec(select(Character).where(Character.book_id == book_id)).all()
    return characters

@router.get("/chapters/{chapter_id}/segments", response_model=List[dict])
def get_chapter_segments(chapter_id: int, session: Session = Depends(get_session)):
    from ..models.models import Segment
    segments = session.exec(select(Segment).where(Segment.chapter_id == chapter_id).order_by(Segment.id)).all()
    return segments

@router.delete("/{book_id}")
async def delete_book(book_id: int, session: Session = Depends(get_session)):
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Delete files
    # 1. Audio directory
    audio_dir = f"../data/audio/book_{book_id}"
    if os.path.exists(audio_dir):
        shutil.rmtree(audio_dir)
        
    # 2. Cover image (if it exists and is not a default/shared one)
    # Be careful not to delete shared assets if any. 
    # For now, assuming covers are unique per book or we just leave them to avoid risk.
    # Let's delete if it's in the uploads folder specifically for this book?
    # The cover_path is usually "data/covers/uuid.jpg". 
    # Let's just delete the DB record for now, file cleanup is secondary/risky without strict paths.
    
    session.delete(book)
    session.commit()
    return {"message": "Book deleted successfully"}
