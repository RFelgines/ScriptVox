from fastapi import UploadFile, BackgroundTasks
from sqlmodel import Session, select
import shutil
import os
from typing import List
from ..models.models import Book, Chapter, BookStatus, ChapterStatus, Character, Segment
from .ebook_parser import EbookParser
from ..core.database import engine

class Orchestrator:
    def __init__(self):
        self.parser = EbookParser()

    async def process_upload(self, file: UploadFile, background_tasks: BackgroundTasks) -> Book:
        # 1. Save file
        file_path = os.path.join(self.parser.upload_dir, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 2. Create Initial Book Record
        with Session(engine) as session:
            book = Book(title=file.filename, author="Unknown", status=BookStatus.PROCESSING)
            session.add(book)
            session.commit()
            session.refresh(book)
            
            # 3. Queue Parsing Task
            background_tasks.add_task(self._parse_and_save, book.id, file_path)
            
            return book

    def _parse_and_save(self, book_id: int, file_path: str):
        with Session(engine) as session:
            book = session.get(Book, book_id)
            if not book:
                return

            try:
                parsed_book = self.parser.parse_epub(file_path)
                
                # Update Book Metadata
                book.title = parsed_book.title
                book.author = parsed_book.author
                book.cover_path = parsed_book.cover_path
                book.status = BookStatus.READY
                session.add(book)
                
                # Create Chapters
                for parsed_chapter in parsed_book.chapters:
                    chapter = Chapter(
                        book_id=book.id,
                        position=parsed_chapter.position,
                        title=parsed_chapter.title,
                        content_text=parsed_chapter.content,
                        status=ChapterStatus.PENDING
                    )
                    session.add(chapter)
                
                session.commit()
                print(f"Book {book_id} parsed successfully.")
                
            except Exception as e:
                print(f"Error parsing book {book_id}: {e}")
                book.status = "failed"
                session.add(book)
                session.commit()

    async def analyze_book(self, book_id: int, llm_service):
        with Session(engine) as session:
            book = session.get(Book, book_id)
            if not book:
                raise ValueError("Book not found")
            
            chapter = session.exec(select(Chapter).where(Chapter.book_id == book_id).order_by(Chapter.position)).first()
            
            if not chapter:
                print("No chapters found to analyze.")
                return

            print(f"Analyzing book {book_id} using chapter: {chapter.title}")
            
            analysis = await llm_service.analyze_text(chapter.content_text)
            
            characters_data = analysis.get("characters", [])
            
            narrator_exists = False
            for char_data in characters_data:
                if "narrator" in char_data["name"].lower():
                    narrator_exists = True
                
                character = Character(
                    book_id=book.id,
                    name=char_data["name"],
                    gender=char_data["gender"],
                    description=char_data["description"]
                )
                session.add(character)
            
            if not narrator_exists:
                session.add(Character(
                    book_id=book.id,
                    name="Narrator",
                    gender="neutral",
                    description="Standard narrator voice"
                ))
            
            book.status = BookStatus.READY
            session.add(book)
            session.commit()
            print(f"Analysis complete for book {book_id}. Found {len(characters_data)} characters.")

    async def segment_chapter(self, chapter_id: int, llm_service):
        print(f"[DEBUG] segment_chapter called for chapter_id={chapter_id}")
        try:
            # 1. Fetch data
            with Session(engine) as session:
                chapter = session.get(Chapter, chapter_id)
                if not chapter:
                    raise ValueError("Chapter not found")
                
                characters = session.exec(select(Character).where(Character.book_id == chapter.book_id)).all()
                # Detach data
                char_dicts = [{"name": c.name, "gender": c.gender, "id": c.id} for c in characters]
                chapter_text = chapter.content_text
                chapter_id_val = chapter.id

            # Session closed.
            
            print(f"Segmenting chapter {chapter_id}...")
            print(f"[DEBUG] Found {len(char_dicts)} characters")
            print(f"[DEBUG] Calling LLM service: {type(llm_service).__name__}")
            
            # 2. LLM Call (Long running)
            segments_data = await llm_service.assign_roles(chapter_text, char_dicts)
            
            print(f"[DEBUG] LLM returned {len(segments_data)} segments")
            
            # 3. Update DB
            with Session(engine) as session:
                # Re-fetch chapter to attach to session
                chapter = session.get(Chapter, chapter_id_val)
                if not chapter:
                     # Should not happen usually
                     return

                existing_segments = session.exec(select(Segment).where(Segment.chapter_id == chapter_id_val)).all()
                for s in existing_segments:
                    session.delete(s)
                
                for seg_data in segments_data:
                    speaker_name = seg_data.get("speaker", "Narrator")
                    text = seg_data.get("text", "")
                    
                    speaker_id = None
                    if speaker_name.lower() != "narrator":
                        # Find character ID from our detached list or re-query? 
                        # We have char_dicts with IDs now.
                        char = next((c for c in char_dicts if c["name"].lower() == speaker_name.lower()), None)
                        if char:
                            speaker_id = char["id"]
                    
                    segment = Segment(
                        chapter_id=chapter.id,
                        text=text,
                        speaker_id=speaker_id
                    )
                    session.add(segment)
                
                chapter.status = ChapterStatus.PROCESSING
                session.add(chapter)
                session.commit()
                print(f"Segmentation complete for chapter {chapter_id}. Created {len(segments_data)} segments.")
        except Exception as e:
            print(f"[ERROR] segment_chapter failed: {e}")
            import traceback
            traceback.print_exc()

    async def generate_audio(self, chapter_id: int, tts_service):
        # 1. Fetch all necessary data in a short-lived session
        with Session(engine) as session:
            chapter = session.get(Chapter, chapter_id)
            if not chapter:
                raise ValueError("Chapter not found")
            
            # Set status to PROCESSING immediately
            chapter.status = ChapterStatus.PROCESSING
            session.add(chapter)
            session.commit()
            session.refresh(chapter)
            
            segments = session.exec(select(Segment).where(Segment.chapter_id == chapter_id).order_by(Segment.id)).all()
            
            # If no segments, create fallback
            if not segments:
                print(f"No segments found for chapter {chapter_id}. Creating fallback segment with full text.")
                fallback_segment = Segment(
                    chapter_id=chapter.id,
                    text=chapter.content_text,
                    speaker_id=None
                )
                session.add(fallback_segment)
                session.commit()
                session.refresh(fallback_segment)
                segments = [fallback_segment]
            
            # Detach data needed for generation
            segments_data = [
                {"id": s.id, "text": s.text, "speaker_id": s.speaker_id} 
                for s in segments
            ]
            book_id = chapter.book_id
            chapter_position = chapter.position
            
            # Fetch characters and convert to dicts to avoid DetachedInstanceError
            characters = session.exec(select(Character).where(Character.book_id == book_id)).all()
            character_map = {
                c.id: {"assigned_voice_id": c.assigned_voice_id, "gender": c.gender} 
                for c in characters
            }

        # Session is now closed. We have all data in memory.

        print(f"Generating audio for chapter {chapter_id} ({len(segments_data)} segments)...")
        
        chapter_audio_dir = f"data/audio/book_{book_id}/chapter_{chapter_position}"
        os.makedirs(chapter_audio_dir, exist_ok=True)
        
        for i, segment_data in enumerate(segments_data):
            # Use French voice by default
            voice_id = "fr-FR-DeniseNeural"  # Female French voice
            
            if segment_data["speaker_id"]:
                char_data = character_map.get(segment_data["speaker_id"])
                if char_data:
                    if char_data["assigned_voice_id"]:
                        voice_id = char_data["assigned_voice_id"]
                    elif char_data["gender"]:
                        if char_data["gender"].lower() == "female":
                            voice_id = "fr-FR-DeniseNeural"
                        elif char_data["gender"].lower() == "male":
                            voice_id = "fr-FR-HenriNeural"
            
            filename = f"segment_{i:04d}.mp3"
            output_path = os.path.join(chapter_audio_dir, filename)
            
            try:
                if not segment_data["text"].strip():
                    continue
                    
                print(f"Generating segment {i+1}/{len(segments_data)} with voice {voice_id}...")
                # This is the long-running task. No DB connection is held here.
                await tts_service.generate_audio(segment_data["text"], voice_id, output_path)
                
                # Update DB with result in a NEW short-lived session
                with Session(engine) as update_session:
                    segment = update_session.get(Segment, segment_data["id"])
                    if segment:
                        segment.audio_file = output_path
                        update_session.add(segment)
                    
                    # Update chapter progress
                    chapter_update = update_session.get(Chapter, chapter_id)
                    if chapter_update:
                        progress_pct = int(((i + 1) / len(segments_data)) * 100)
                        chapter_update.progress = progress_pct
                        update_session.add(chapter_update)
                    
                    update_session.commit()
                
            except Exception as e:
                print(f"Error generating audio for segment {segment_data['id']}: {e}")
        
        # Final update for chapter status
        with Session(engine) as final_session:
            chapter = final_session.get(Chapter, chapter_id)
            if chapter:
                chapter.status = ChapterStatus.COMPLETED
                chapter.progress = 100
                chapter.audio_path = chapter_audio_dir
                final_session.add(chapter)
                final_session.commit()
        
        print(f"Audio generation complete for chapter {chapter_id}.")
