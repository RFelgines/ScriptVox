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

    async def process_upload(self, file: UploadFile) -> tuple[Book, str]:
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
            
            # 3. Queue Pipeline Task
            # We don't queue parse here anymore if we are using the new pipeline methods
            # But for backward compatibility or simple upload, we might.
            # actually, let's make process_upload JUST save the file and DB record.
            # The caller will decide what to do next.
            
            return book, file_path

    async def process_upload_and_analyze(self, file: UploadFile, background_tasks: BackgroundTasks, llm_service) -> Book:
        book, file_path = await self.process_upload(file)
        # Chain analysis only (tts_service=None)
        background_tasks.add_task(self._run_pipeline, book.id, file_path, llm_service, None)
        return book

    async def process_upload_and_generate(self, file: UploadFile, background_tasks: BackgroundTasks, llm_service, tts_service) -> Book:
        book, file_path = await self.process_upload(file)
        # Chain full process
        background_tasks.add_task(self._run_pipeline, book.id, file_path, llm_service, tts_service)
        return book



    async def _run_pipeline(self, book_id: int, file_path: str, llm_service, tts_service=None):
        print(f"Starting pipeline for book {book_id}")
        
        # 1. Parse
        self._parse_and_save(book_id, file_path)
        
        # 2. Analyze
        await self.analyze_book(book_id, llm_service)
        
        # 3. If TTS service provided, continue to generation
        if tts_service:
            print(f"Auto-generating audio for book {book_id}")
            with Session(engine) as session:
                chapters = session.exec(select(Chapter).where(Chapter.book_id == book_id)).all()
                for chapter in chapters:
                    # Segment first
                    await self.segment_chapter(chapter.id, llm_service)
                    # Then Generate
                    await self.generate_audio(chapter.id, tts_service)

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
        from .voice_registry import VoiceRegistry
        
        voice_registry = VoiceRegistry()
        
        with Session(engine) as session:
            book = session.get(Book, book_id)
            if not book:
                raise ValueError("Book not found")
            
            # Get first 3 chapters for better character detection
            chapters = session.exec(
                select(Chapter).where(Chapter.book_id == book_id).order_by(Chapter.position).limit(3)
            ).all()
            
            if not chapters:
                print("No chapters found to analyze.")
                return

            # Combine text from multiple chapters for better character coverage
            combined_text = "\n\n---\n\n".join([ch.content_text for ch in chapters])
            print(f"Analyzing book {book_id} using {len(chapters)} chapters, total {len(combined_text)} chars")
            
            analysis = await llm_service.analyze_text(combined_text)
            
            characters_data = analysis.get("characters", [])
            
            narrator_exists = False
            for char_data in characters_data:
                if "narrator" in char_data["name"].lower():
                    narrator_exists = True
                
                # Extract new fields with fallbacks
                gender = char_data.get("gender", "neutral")
                age_category = char_data.get("age_category", "adult")
                tone = char_data.get("tone", "neutral")
                voice_quality = char_data.get("voice_quality", "calm")
                description = char_data.get("description", "")
                
                # Automatically assign best matching voice
                assigned_voice = voice_registry.find_best_match(
                    gender=gender,
                    age_category=age_category,
                    tone=tone,
                    voice_quality=voice_quality,
                    locale="fr-FR"  # TODO: Detect from book metadata
                )
                
                print(f"Auto-assigned voice {assigned_voice} to {char_data['name']} "
                      f"(gender={gender}, age={age_category}, tone={tone}, quality={voice_quality})")
                
                character = Character(
                    book_id=book.id,
                    name=char_data["name"],
                    gender=gender,
                    age_category=age_category,
                    tone=tone,
                    voice_quality=voice_quality,
                    description=description,
                    assigned_voice_id=assigned_voice
                )
                session.add(character)
            
            if not narrator_exists:
                # Create narrator with neutral characteristics and auto-assign voice
                narrator_voice = voice_registry.find_best_match(
                    gender="neutral",
                    age_category="adult",
                    tone="warm",
                    voice_quality="calm",
                    locale="fr-FR"
                )
                
                session.add(Character(
                    book_id=book.id,
                    name="Narrator",
                    gender="neutral",
                    age_category="adult",
                    tone="warm",
                    voice_quality="calm",
                    description="Standard narrator voice",
                    assigned_voice_id=narrator_voice
                ))
            
            book.status = BookStatus.READY
            session.add(book)
            session.commit()
            print(f"Analysis complete for book {book_id}. Found {len(characters_data)} characters with auto-assigned voices.")

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
            
            # Find Narrator ID
            narrator = next((c for c in characters if c.name == "Narrator"), None)
            narrator_id = narrator.id if narrator else None
            
            character_map = {
                c.id: {"assigned_voice_id": c.assigned_voice_id, "gender": c.gender} 
                for c in characters
            }
            
            print(f"[VOICE DEBUG] Character map: {character_map}")
            print(f"[VOICE DEBUG] Narrator ID: {narrator_id}")

        # Session is now closed. We have all data in memory.

        print(f"Generating audio for chapter {chapter_id} ({len(segments_data)} segments)...")
        
        # Use forward slashes for web compatibility
        chapter_audio_dir = f"data/audio/book_{book_id}/chapter_{chapter_position}"
        os.makedirs(chapter_audio_dir, exist_ok=True)
        
        successful_segments = 0
        
        for i, segment_data in enumerate(segments_data):
            # Use French voice by default
            voice_id = "fr-FR-DeniseNeural"  # Female French voice
            
            # Determine effective speaker ID (use Narrator if None)
            speaker_id = segment_data["speaker_id"]
            
            print(f"[VOICE DEBUG] Segment {i}: speaker_id={speaker_id}, narrator_id={narrator_id}")
            
            if speaker_id is None and narrator_id:
                speaker_id = narrator_id
                print(f"[VOICE DEBUG] Segment {i}: Using narrator_id as speaker")
            
            if speaker_id:
                char_data = character_map.get(speaker_id)
                print(f"[VOICE DEBUG] Segment {i}: char_data={char_data}")
                
                if char_data:
                    if char_data["assigned_voice_id"]:
                        voice_id = char_data["assigned_voice_id"]
                        print(f"[VOICE DEBUG] Segment {i}: Using assigned voice: {voice_id}")
                    elif char_data["gender"]:
                        if char_data["gender"].lower() == "female":
                            voice_id = "fr-FR-DeniseNeural"
                        elif char_data["gender"].lower() == "male":
                            voice_id = "fr-FR-HenriNeural"
                        print(f"[VOICE DEBUG] Segment {i}: Using gender fallback: {voice_id}")
                else:
                    print(f"[VOICE DEBUG] Segment {i}: No character data found for speaker_id={speaker_id}")
            else:
                print(f"[VOICE DEBUG] Segment {i}: No speaker_id, using default: {voice_id}")
            
            filename = f"segment_{i:04d}.mp3"
            output_path = os.path.join(chapter_audio_dir, filename)
            
            try:
                if not segment_data["text"].strip():
                    continue
                    
                print(f"Generating segment {i+1}/{len(segments_data)} with voice {voice_id}...")
                # This is the long-running task. No DB connection is held here.
                await tts_service.generate_audio(segment_data["text"], voice_id, output_path)
                
                # Verify the file was actually created
                if not os.path.exists(output_path):
                    print(f"[ERROR] Audio file was not created: {output_path}")
                    continue
                
                successful_segments += 1
                
                # Update DB with result in a NEW short-lived session
                with Session(engine) as update_session:
                    segment = update_session.get(Segment, segment_data["id"])
                    if segment:
                        # Convert backslashes to forward slashes for web URLs
                        segment.audio_file = output_path.replace('\\', '/')
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
                import traceback
                traceback.print_exc()
        
        # Final update for chapter status - only mark COMPLETED if we have audio files
        with Session(engine) as final_session:
            chapter = final_session.get(Chapter, chapter_id)
            if chapter:
                if successful_segments > 0:
                    chapter.status = ChapterStatus.COMPLETED
                    chapter.progress = 100
                    chapter.audio_path = chapter_audio_dir
                    print(f"Audio generation complete for chapter {chapter_id}. Generated {successful_segments}/{len(segments_data)} segments.")
                else:
                    chapter.status = ChapterStatus.FAILED
                    chapter.progress = 0
                    chapter.audio_path = None
                    print(f"Audio generation FAILED for chapter {chapter_id}. No segments were generated.")
                
                final_session.add(chapter)
                final_session.commit()
