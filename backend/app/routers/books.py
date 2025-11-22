from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
import shutil
import os
from ..core.database import get_session
from ..models.models import Book, Chapter, Character
from ..services.orchestrator import Orchestrator

router = APIRouter(prefix="/books", tags=["books"])
orchestrator = Orchestrator()

@router.post("/upload", response_model=Book)
async def upload_book(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    if not file.filename.endswith(".epub"):
        raise HTTPException(status_code=400, detail="Only .epub files are supported")
    
    return await orchestrator.process_upload(file, background_tasks)

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
