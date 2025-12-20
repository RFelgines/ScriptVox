# ScriptVox Backend

FastAPI-based backend for ScriptVox audiobook generation platform. Handles EPUB parsing, character detection, text segmentation, and multi-voice audio generation using EdgeTTS or XTTS.

## Architecture Overview

The backend follows a **clean architecture** with clear separation of concerns:

```
Backend Architecture
┌─────────────────────────────────────────────┐
│           FastAPI Application               │
├─────────────────────────────────────────────┤
│  Routers (API Endpoints)                    │
│  ├── books.py         (CRUD operations)     │
│  ├── generation.py    (Background tasks)    │
│  ├── characters.py    (Voice assignment)    │
│  └── settings.py      (App configuration)   │
├─────────────────────────────────────────────┤
│  Services (Business Logic)                  │
│  ├── Orchestrator     (Main pipeline)       │
│  ├── EbookParser      (EPUB processing)     │
│  └── VoiceRegistry    (Voice matching)      │
├─────────────────────────────────────────────┤
│  Adapters (External Services)               │
│  ├── TTS Adapters     (EdgeTTS, XTTS)       │
│  └── LLM Adapters     (Gemini, Ollama)      │
├─────────────────────────────────────────────┤
│  Models (Database Entities)                 │
│  ├── Book, Chapter, Character, Segment      │
│  └── SQLModel ORM                            │
├─────────────────────────────────────────────┤
│  Core (Infrastructure)                      │
│  ├── Database (SQLite)                      │
│  └── Config (Environment)                   │
└─────────────────────────────────────────────┘
```

### Key Design Patterns

#### 1. **Adapter Pattern**
Abstracts TTS and LLM services behind interfaces, allowing easy swapping between providers:
- `BaseTTS` → `EdgeTTSAdapter | XTTSAdapter`
- `BaseLLM` → `GeminiLLMAdapter | OllamaLLMAdapter`

#### 2. **Dependency Injection**
Services are injected via FastAPI's `Depends()` mechanism, ensuring loose coupling and testability.

#### 3. **Background Tasks**
Audio generation is handled asynchronously using FastAPI's `BackgroundTasks` to avoid blocking HTTP responses.

## Dual Mode Architecture

ScriptVox supports two operating modes:

### Cloud Mode (Default)
- **TTS**: EdgeTTS (Microsoft Azure)
- **LLM**: Google Gemini API
- **Pros**: Fast, no GPU required, high-quality voices
- **Cons**: Requires internet, API costs (Gemini)

### Local Mode
- **TTS**: XTTS (Coqui TTS)
- **LLM**: Ollama
- **Pros**: Fully private, no internet required
- **Cons**: Requires GPU, slower generation

Modes are configured via `APP_MODE` environment variable.

## Database Schema

```sql
-- Books
CREATE TABLE book (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    cover_path TEXT,
    status TEXT NOT NULL,  -- 'new', 'processing', 'ready'
    created_at TIMESTAMP
);

-- Chapters
CREATE TABLE chapter (
    id INTEGER PRIMARY KEY,
    book_id INTEGER REFERENCES book(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    title TEXT NOT NULL,
    content_text TEXT NOT NULL,
    audio_path TEXT,  -- Directory path to audio segments
    status TEXT NOT NULL,  -- 'pending', 'processing', 'completed', 'failed'
    progress INTEGER DEFAULT 0  -- 0-100
);

-- Characters (detected by LLM)
CREATE TABLE character (
    id INTEGER PRIMARY KEY,
    book_id INTEGER REFERENCES book(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    gender TEXT,  -- 'male', 'female', 'neutral'
    age_category TEXT,  -- 'child', 'teen', 'adult', 'old'
    tone TEXT,  -- 'deep', 'soft', 'warm'
    voice_quality TEXT,  -- 'calm', 'energetic', 'authoritative'
    description TEXT,  -- AI-generated character description
    assigned_voice_id TEXT  -- TTS voice identifier
);

-- Text Segments (dialogue/narration)
CREATE TABLE segment (
    id INTEGER PRIMARY KEY,
    chapter_id INTEGER REFERENCES chapter(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    speaker_id INTEGER REFERENCES character(id),  -- NULL = Narrator
    audio_file TEXT,  -- Path to generated MP3
    start_time REAL,
    end_time REAL
);
```

## Audio Generation Pipeline

The `Orchestrator` service coordinates the generation pipeline:

```
1. Upload EPUB
   ↓
2. Parse Book (EbookParser)
   - Extract chapters
   - Extract cover image
   - Save metadata to DB
   ↓
3. Analyze Characters (LLM)  [Optional]
   - LLM analyzes text
   - Extracts character traits
   - Auto-assigns best matching voices
   ↓
4. Segment Chapter (LLM)
   - Split into dialogue/narration
   - Assign speaker to each segment
   ↓
5. Generate Audio (TTS)
   - Generate MP3 for each segment
   - Save to data/audio/book_{id}/chapter_{pos}/
   - Update progress in real-time
   ↓
6. Playback
   - Frontend streams from /data/audio/...
```

## API Endpoints

See [API.md](./docs/API.md) for comprehensive API documentation.

### Quick Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/books/upload` | POST | Upload EPUB file |
| `/books` | GET | List all books |
| `/books/{id}` | GET | Get book details |
| `/books/{id}` | DELETE | Delete book |
| `/books/{id}/chapters` | GET | List chapters |
| `/books/{id}/characters` | GET | List characters |
| `/books/{id}/cover` | POST | Upload custom cover |
| `/generation/analyze/{book_id}` | POST | Detect characters (LLM) |
| `/generation/segment/{chapter_id}` | POST | Segment chapter text |
| `/generation/generate/{chapter_id}` | POST | Generate audio |
| `/characters/{id}` | PATCH | Update character voice |
| `/settings` | GET | Get app settings |
| `/settings/mode` | PUT | Change app mode |
| `/voices` | GET | List available TTS voices |

## Development

### Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
.\venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# For local mode
pip install -r requirements.local.txt
```

### Running the Server

```bash
# Development mode (auto-reload)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production mode
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Environment Configuration

Create a `.env` file:

```env
# Application mode: CLOUD or LOCAL
APP_MODE=CLOUD

# Google Gemini API Key (required for CLOUD mode character detection)
GEMINI_API_KEY=your_api_key_here

# Database URL (optional, defaults to SQLite)
# DATABASE_URL=sqlite:///./scriptvox.db

# For LOCAL mode, ensure Ollama is running on localhost:11434
```

### Project Structure

```
backend/
├── app/
│   ├── adapters/           # External service adapters
│   │   ├── base.py            # Abstract base classes (BaseTTS, BaseLLM)
│   │   ├── tts_adapters.py    # EdgeTTS & XTTS implementations
│   │   └── llm_adapters.py    # Gemini & Ollama implementations
│   ├── core/               # Infrastructure
│   │   ├── config.py          # Settings management (BaseSettings)
│   │   └── database.py        # SQLite + SQLModel setup
│   ├── models/             # Database models
│   │   └── models.py          # Book, Chapter, Character, Segment
│   ├── routers/            # API endpoints
│   │   ├── books.py           # Book CRUD
│   │   ├── generation.py      # Background audio generation
│   │   ├── characters.py      # Character management
│   │   └── settings.py        # Settings API
│   ├── services/           # Business logic
│   │   ├── orchestrator.py    # Main generation pipeline
│   │   ├── ebook_parser.py    # EPUB parsing with ebooklib
│   │   └── voice_registry.py  # Voice matching algorithm
│   └── main.py             # FastAPI app entry point
├── data/                   # Runtime storage
│   ├── uploads/               # Uploaded EPUB files
│   ├── covers/                # Book cover images
│   └── audio/                 # Generated audio files
│       └── book_{id}/
│           └── chapter_{pos}/
│               └── segment_*.mp3
├── requirements.txt        # Core dependencies
└── requirements.local.txt  # LOCAL mode dependencies (XTTS, Ollama)
```

## Adding a New Feature

### Example: Adding a New TTS Provider

1. **Create the adapter**:
   ```python
   # app/adapters/tts_adapters.py
   from .base import BaseTTS
   
   class MyTTSAdapter(BaseTTS):
       async def list_voices(self) -> List[Dict[str, str]]:
           # Implement voice listing
           pass
       
       async def generate_audio(self, text: str, voice_id: str, output_path: str) -> str:
           # Implement TTS generation
           pass
   ```

2. **Register in main.py**:
   ```python
   # app/main.py
   from .adapters.tts_adapters import MyTTSAdapter
   
   if settings.APP_MODE == "MY_MODE":
       container.tts_service = MyTTSAdapter()
   ```

3. **Update configuration**:
   ```python
   # app/core/config.py
   class Settings(BaseSettings):
       APP_MODE: str = Field(default="CLOUD", pattern="^(CLOUD|LOCAL|MY_MODE)$")
   ```

## Testing

```bash
# Run tests (if implemented)
pytest

# With coverage
pytest --cov=app tests/

# Lint code
flake8 app/
black app/ --check
```

## Deployment

### Production Checklist

- [ ] Configure production environment variables
- [ ] Use PostgreSQL instead of SQLite
- [ ] Set up Nginx reverse proxy
- [ ] Enable HTTPS with SSL certificates
- [ ] Configure CORS for production frontend URL
- [ ] Set up monitoring and logging
- [ ] Use a process manager (systemd, supervisor)
- [ ] Configure rate limiting

### Docker Deployment (TODO)

Docker support is planned for simplified deployment.

## Troubleshooting

### Common Issues

**Issue**: `ModuleNotFoundError: No module named 'torch'`  
**Solution**: Install LOCAL mode dependencies: `pip install -r requirements.local.txt`

**Issue**: `FileNotFoundError: [WinError 206] Filename too long`  
**Solution**: This should be fixed in the latest version. If you encounter it, ensure you're using the updated `tts_adapters.py`.

**Issue**: Chapter generation fails with no error  
**Solution**: Check backend logs. Common causes:
- No segments created (run segmentation first)
- Empty text in segments
- TTS service unavailable

## Performance Optimization

### Database Optimization
- Add indexes on frequently queried columns
- Use foreign key constraints for data integrity
- Consider PostgreSQL for production (better concurrent write handling)

### Audio Generation
- Generate audio in parallel using `asyncio.gather()` (be mindful of rate limits)
- Cache commonly used voices
- Implement resume functionality for failed generations

## Security Considerations

- **File Upload**: Validate EPUB file format, limit file size
- **API Rate Limiting**: Implement rate limiting to prevent abuse
- **Authentication**: Add user authentication for multi-user deployments
- **Input Validation**: Sanitize all user inputs
- **CORS**: Restrict to specific frontend domains in production

## License

MIT License - see [LICENSE](../LICENSE) for details.
