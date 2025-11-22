import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup
import os
from typing import List, Tuple, Optional
from dataclasses import dataclass

@dataclass
class ParsedChapter:
    title: str
    content: str
    position: int

@dataclass
class ParsedBook:
    title: str
    author: str
    cover_path: Optional[str]
    chapters: List[ParsedChapter]

class EbookParser:
    def __init__(self, upload_dir: str = "data/uploads", cover_dir: str = "data/covers"):
        self.upload_dir = upload_dir
        self.cover_dir = cover_dir
        os.makedirs(upload_dir, exist_ok=True)
        os.makedirs(cover_dir, exist_ok=True)

    def parse_epub(self, file_path: str) -> ParsedBook:
        try:
            book = epub.read_epub(file_path)
        except Exception as e:
            raise ValueError(f"Failed to read EPUB file: {e}")

        title = book.get_metadata('DC', 'title')[0][0] if book.get_metadata('DC', 'title') else "Unknown Title"
        author = book.get_metadata('DC', 'creator')[0][0] if book.get_metadata('DC', 'creator') else "Unknown Author"
        
        # Extract Cover
        cover_path = None
        cover_item = book.get_item_with_id('cover')
        if not cover_item:
            # Try to find an image item that might be the cover
            for item in book.get_items():
                if item.get_type() == ebooklib.ITEM_IMAGE and 'cover' in item.get_name().lower():
                    cover_item = item
                    break
        
        if cover_item:
            cover_filename = f"{os.path.basename(file_path).replace('.epub', '')}_cover.jpg"
            cover_path = os.path.join(self.cover_dir, cover_filename)
            with open(cover_path, 'wb') as f:
                f.write(cover_item.get_content())

        # Extract Chapters
        chapters = []
        position = 1
        
        # Iterate over spine to get chapters in order
        for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
            # Basic filtering to skip nav, toc, etc. if possible, but spine is better order.
            # Using spine is more reliable for reading order.
            pass

        # Better approach: Use spine
        for item_id in book.spine:
            item = book.get_item_with_id(item_id[0])
            if not item:
                continue
            
            if item.get_type() == ebooklib.ITEM_DOCUMENT:
                soup = BeautifulSoup(item.get_content(), 'html.parser')
                
                # Try to find a title
                chapter_title = f"Chapter {position}"
                h1 = soup.find('h1')
                if h1:
                    chapter_title = h1.get_text().strip()
                elif soup.find('h2'):
                    chapter_title = soup.find('h2').get_text().strip()
                
                # Extract text
                # Remove script and style elements
                for script in soup(["script", "style"]):
                    script.extract()
                
                text = soup.get_text()
                
                # Clean text (basic)
                lines = (line.strip() for line in text.splitlines())
                chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
                text = '\n'.join(chunk for chunk in chunks if chunk)
                
                if len(text) > 100: # Filter out very short "chapters" like empty pages or just titles
                    chapters.append(ParsedChapter(
                        title=chapter_title,
                        content=text,
                        position=position
                    ))
                    position += 1

        return ParsedBook(
            title=title,
            author=author,
            cover_path=cover_path,
            chapters=chapters
        )
