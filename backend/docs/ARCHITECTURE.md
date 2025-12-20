# ScriptVox Architecture

System design and architecture documentation for the ScriptVox audiobook generation platform.

## System Overview

ScriptVox is a fullstack application that transforms EPUB ebooks into multi-voice audiobooks using AI-powered character detection and text-to-speech technology.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User (Web Browser)                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/REST
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              Next.js Frontend (Port 3000)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Pages: Home, Library, Book Detail, Settings         │   │
│  │  Components: PersistentPlayer, Sidebar, CastingModal │   │
│  │  State: AudioPlayerContext                            │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              FastAPI Backend (Port 8000)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Routers: Books, Generation, Characters, Settings    │   │
│  │  Services: Orchestrator, EbookParser, VoiceRegistry  │   │
│  │  Adapters: TTS (EdgeTTS/XTTS), LLM (Gemini/Ollama)  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────┬─────────────────┬──────────────────┬─────────────────┘
      │                 │                  │
      ↓                 ↓                  ↓
┌──────────┐    ┌──────────────┐   ┌──────────────┐
│ SQLite   │    │ File System  │   │External APIs │
│ Database │    │ (EPUB, MP3)  │   │ (Gemini, TTS)│
└──────────┘    └──────────────┘   └──────────────┘
```

---

## Frontend Architecture

### Technology Stack
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **State Management**: React Context API
- **Type Safety**: TypeScript

### Directory Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── layout.tsx            # Root layout (includes Sidebar)
│   ├── page.tsx              # Home page (EPUB upload)
│   ├── books/
│   │   ├── page.tsx          # Library (book list)
│   │   └── [id]/
│   │       ├── page.tsx      # Book detail (chapter list, generation)
│   │       └── casting/
│   │           └── page.tsx  # Character voice assignment
│   ├── voices/
│   │   └── page.tsx          # Voice preview page
│   └── settings/
│       └── page.tsx          # Settings (mode switcher)
├── components/             # Reusable UI components
│   ├── PersistentPlayer.tsx  # Global audio player
│   ├── Sidebar.tsx           # Navigation sidebar
│   ├── CastingModal.tsx      # Voice assignment modal
│   └── CoverProgress.tsx     # Book cover with progress ring
├── contexts/               # React Context providers
│   └── AudioPlayerContext.tsx # Audio playback state
└── hooks/                  # Custom React hooks
    └── useToast.tsx          # Toast notifications
```

### State Management

#### AudioPlayerContext

Manages global audio playback state:

```typescript
interface AudioPlayerContextType {
  isPlaying: boolean;
  currentBook: Book | null;
  currentChapter: Chapter | null;
  audioUrl: string | null;
  playbackSpeed: number;
  showLyrics: boolean;
  
  play(book, chapter, url): void;
  pause(): void;
  togglePlay(): void;
  setPlaybackSpeed(speed): void;
  toggleLyrics(): void;
  audioRef: RefObject<HTMLAudioElement>;
}
```

**Usage**:
- Book detail page calls `play()` with chapter info
- `PersistentPlayer` subscribes to context for playback controls
- Audio element is shared across the entire app

### Routing

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | EPUB upload interface |
| `/books` | Library | Grid view of all books |
| `/books/[id]` | Book Detail | Chapter list, generation controls |
| `/books/[id]/casting` | Casting | Character voice assignment |
| `/voices` | Voice Preview | Preview available TTS voices |
| `/settings` | Settings | App mode (Cloud/Local) switcher |

### Component Hierarchy

```
App Layout (Sidebar + Main Content)
├── Sidebar (navigation)
└── Page Content
    ├── Home Page
    │   └── Upload Form
    ├── Library Page
    │   └── Book Grid
    ├── Book Detail Page
    │   ├── Book Info Card
    │   ├── CoverProgress
    │   ├── Chapter List
    │   └── CastingModal (conditional)
    ├── Settings Page
    │   └── Mode Toggle
    └── PersistentPlayer (global, always visible)
        └── <audio> element
```

---

## Backend Architecture

### Technology Stack
- **Framework**: FastAPI (async Python)
- **Database**: SQLite + SQLModel ORM
- **TTS**: EdgeTTS (cloud), XTTS (local)
- **LLM**: Google Gemini (cloud), Ollama (local)
- **EPUB Parsing**: ebooklib
- **Background Tasks**: FastAPI BackgroundTasks

### Layered Architecture

```
┌─────────────────────────────────────────────┐
│         API Layer (Routers)                 │
│  - FastAPI routes                           │
│  - Request/response validation              │
│  - HTTP handlers                            │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────┴───────────────────────────┐
│      Service Layer (Business Logic)         │
│  - Orchestrator (main pipeline)             │
│  - EbookParser (EPUB parsing)               │
│  - VoiceRegistry (voice matching)           │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────┴───────────────────────────┐
│     Adapter Layer (External Services)       │
│  - BaseTTS → EdgeTTSAdapter | XTTSAdapter   │
│  - BaseLLM → GeminiLLMAdapter | OllamaLLM   │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────┴───────────────────────────┐
│      Data Layer (Models & Database)         │
│  - SQLModel entities                        │
│  - SQLite database                          │
│  - File system (EPUB, MP3, images)          │
└─────────────────────────────────────────────┘
```

### Dependency Injection

Services are injected using FastAPI's `Depends()` mechanism:

```python
# Dependency container
class ServiceContainer:
    tts_service: BaseTTS
    llm_service: BaseLLM

container = ServiceContainer()

# Initialized at startup based on APP_MODE
@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.APP_MODE == "CLOUD":
        container.tts_service = EdgeTTSAdapter()
        container.llm_service = GeminiLLMAdapter()
    elif settings.APP_MODE == "LOCAL":
        container.tts_service = XTTSAdapter()
        container.llm_service = OllamaLLMAdapter()
    yield

# Injected into routes
@app.post("/generation/generate/{chapter_id}")
async def generate_audio(
    chapter_id: int,
    tts: BaseTTS = Depends(get_tts_service)
):
    await orchestrator.generate_audio(chapter_id, tts)
```

**Benefits**:
- Easy to swap service implementations
- Testable (mock services)
- Single source of truth for service instances

---

## Data Flow

### 1. Upload and Parsing Flow

```
User Uploads EPUB
        ↓
┌──────────────────────────────────────┐
│ POST /books/upload                   │
│ - Save file to data/uploads/         │
│ - Create Book record (status: processing) │
│ - Return book ID                     │
└────────────┬─────────────────────────┘
             ↓
┌──────────────────────────────────────┐
│ Background: EbookParser.parse_epub() │
│ ├─ Extract metadata (title, author)  │
│ ├─ Extract cover image → save to data/covers/ │
│ ├─ Extract chapters (title, content) │
│ └─ Update Book status: ready         │
└────────────┬─────────────────────────┘
             ↓
   Book and Chapters in Database
```

### 2. Character Detection Flow

```
User Clicks "Detect Characters"
        ↓
┌──────────────────────────────────────────┐
│ POST /generation/analyze/{book_id}       │
│ - Trigger background task                │
│ - Return immediately                     │
└────────────┬─────────────────────────────┘
             ↓
┌──────────────────────────────────────────┐
│ Background: Orchestrator.analyze_book()  │
│ ├─ Get first 3 chapters                  │
│ ├─ Send to LLM (Gemini or Ollama)        │
│ ├─ Parse LLM response (character list)   │
│ ├─ For each character:                   │
│ │   ├─ Extract traits (gender, age, tone)│
│ │   └─ Auto-assign best voice (VoiceRegistry) │
│ ├─ Ensure Narrator exists                │
│ └─ Save characters to database           │
└────────────┬─────────────────────────────┘
             ↓
   Characters with Assigned Voices
```

### 3. Audio Generation Flow

```
User Clicks "Generate" for a Chapter
        ↓
┌──────────────────────────────────────────────┐
│ POST /generation/generate/{chapter_id}       │
│ - Set chapter status: processing            │
│ - Trigger background task                   │
│ - Return immediately                         │
└────────────┬─────────────────────────────────┘
             ↓
┌──────────────────────────────────────────────┐
│ Background: Orchestrator.generate_audio()    │
│                                              │
│ 1. Fetch Chapter & Segments from DB          │
│    ├─ If no segments exist:                  │
│    │   └─ Create fallback (entire chapter)   │
│    └─ Detach data from DB session            │
│                                              │
│ 2. Create audio directory                    │
│    └─ data/audio/book_{id}/chapter_{pos}/    │
│                                              │
│ 3. For each segment:                         │
│    ├─ Determine voice (character → voice_id) │
│    ├─ Generate audio: TTS.generate_audio()   │
│    │   ├─ EdgeTTS (cloud): edge_tts library  │
│    │   └─ XTTS (local): Coqui TTS library    │
│    ├─ Verify file exists                     │
│    ├─ Save audio_file path to segment        │
│    └─ Update progress: (i+1)/total * 100     │
│                                              │
│ 4. Mark chapter as COMPLETED or FAILED       │
│    ├─ If successful_segments > 0: COMPLETED  │
│    └─ Else: FAILED                           │
└────────────┬─────────────────────────────────┘
             ↓
   Chapter with Generated Audio Files
```

### 4. Playback Flow

```
Frontend: User clicks "Play Chapter"
        ↓
┌──────────────────────────────────────┐
│ React: playChapter(chapter)          │
│ └─ audioContext.play(book, chapter, url) │
└────────────┬─────────────────────────┘
             ↓
┌──────────────────────────────────────┐
│ PersistentPlayer Component           │
│ ├─ Set audioRef.current.src = url    │
│ ├─ Call audioRef.current.play()      │
│ └─ Show player UI at bottom          │
└────────────┬─────────────────────────┘
             ↓
┌──────────────────────────────────────┐
│ Browser Audio Element                │
│ └─ HTTP GET /data/audio/.../segment_0000.mp3 │
└────────────┬─────────────────────────┘
             ↓
┌──────────────────────────────────────┐
│ FastAPI Static Files                 │
│ └─ Serve MP3 file from disk          │
└──────────────────────────────────────┘
             ↓
        Audio Playback
```

---

## Database Schema

### Entity Relationship Diagram

```
┌───────────────┐
│     Book      │
├───────────────┤
│ id (PK)       │
│ title         │
│ author        │
│ cover_path    │
│ status        │
│ created_at    │
└───────┬───────┘
        │ 1
        │
        │           ┌────────────────┐
        ├──────────│   Character    │
        │     *    ├────────────────┤
        │          │ id (PK)        │
        │          │ book_id (FK)   │
        │          │ name           │
        │          │ gender         │
        │          │ age_category   │
        │          │ tone           │
        │          │ voice_quality  │
        │          │ description    │
        │          │ assigned_voice_id │
        │          └────────┬───────┘
        │                   │ 1
        │     *             │
        ├──────────┐        │
        │          │        │
┌───────┴───────┐  │        │
│    Chapter    │  │        │
├───────────────┤  │        │
│ id (PK)       │  │        │
│ book_id (FK)  │  │        │
│ position      │  │        │
│ title         │  │        │
│ content_text  │  │        │
│ audio_path    │  │        │
│ status        │  │        │
│ progress      │  │        │
└───────┬───────┘  │        │
        │ 1        │        │
        │          │        │
        │     *    │        │ *
        └──────────┼────────┘
                   │
           ┌───────┴────────┐
           │    Segment     │
           ├────────────────┤
           │ id (PK)        │
           │ chapter_id (FK)│
           │ text           │
           │ speaker_id (FK)│ ─┐ (nullable, FK to Character)
           │ audio_file     │  │
           │ start_time     │  │
           │ end_time       │  │
           └────────────────┘  │
                    ↑          │
                    └──────────┘
```

### Cascade Deletion

- Deleting a **Book** cascades to:
  - All **Chapters**
  - All **Characters**
  - All **Segments** (via chapters)
  - Physical files (covers, audio)

---

## Adapter Pattern

### Why Adapters?

Allows swapping external services without changing core business logic.

### TTS Adapter Interface

```python
class BaseTTS(ABC):
    @abstractmethod
    async def list_voices(self) -> List[Dict[str, str]]:
        """Return available voices"""
        pass
    
    @abstractmethod
    async def generate_audio(self, text: str, voice_id: str, output_path: str) -> str:
        """Generate TTS audio and save to output_path"""
        pass
```

**Implementations**:
- `EdgeTTSAdapter`: Uses Microsoft Azure TTS (cloud)
- `XTTSAdapter`: Uses Coqui XTTS (local, GPU-accelerated)

### LLM Adapter Interface

```python
class BaseLLM(ABC):
    @abstractmethod
    async def analyze_text(self, text: str) -> Dict:
        """Analyze text to detect characters and their traits"""
        pass
    
    @abstractmethod
    async def assign_roles(self, text: str, characters: List[Dict]) -> List[Dict]:
        """Segment text into dialogue/narration with speaker assignment"""
        pass
```

**Implementations**:
- `GeminiLLMAdapter`: Uses Google Gemini API
- `OllamaLLMAdapter`: Uses local Ollama (llama2, mistral, etc.)

---

## Performance Considerations

### Backend Optimization

1. **Async I/O**: All TTS and LLM calls use `async/await`
2. **Background Tasks**: Long-running operations don't block HTTP responses
3. **Database Connection Pooling**: SQLModel handles connection lifecycle
4. **Static File Serving**: FastAPI serves audio files efficiently

### Frontend Optimization

1. **Code Splitting**: Next.js automatically splits bundles
2. **Incremental Static Regeneration**: Build optimization
3. **React Server Components**: Reduce client-side JS (not yet fully utilized)
4. **Audio Streaming**: Browser handles streaming of MP3 files

### Scaling Considerations

**Bottlenecks**:
- TTS generation (CPU/GPU intensive)
- LLM API rate limits
- Disk I/O for large audio files

**Solutions**:
- Queue system (Celery, RabbitMQ)
- Distributed workers
- Object storage (S3) instead of local disk
- Database sharding for multi-tenancy

---

## Security Architecture

### Current State
- **No authentication** (single-user deployment)
- **No authorization**
- CORS restricted to `localhost:3000`

### Production Hardening

1. **Authentication**:
   - Add JWT-based auth
   - OAuth integration (Google, GitHub)

2. **Authorization**:
   - User-book ownership
   - API key for external integrations

3. **Input Validation**:
   - File type verification (EPUB only)
   - File size limits (prevent DoS)
   - Sanitize text inputs

4. **Rate Limiting**:
   - Per-IP rate limits
   - Per-user quotas

5. **HTTPS**:
   - SSL/TLS certificates
   - Secure cookies

---

## Error Handling

### Backend Strategy

1. **Exceptions**:
   - Use HTTP exceptions (`HTTPException`)
   - Catch adapter errors gracefully

2. **Logging**:
   - Log errors to console
   - Future: structured logging (JSON)

3. **Graceful Degradation**:
   - If LLM fails, create default Narrator character
   - If segmentation fails, use full chapter text

### Frontend Strategy

1. **Error Boundaries**:
   - Catch React errors
   - Display user-friendly messages

2. **Toast Notifications**:
   - Success, error, info toasts

3. **Loading States**:
   - Skeleton screens
   - Progress indicators

---

## Monitoring and Observability

### Metrics to Track (Future)

- API request latency
- TTS generation time per chapter
- LLM API call duration
- Database query performance
- Audio file storage usage

### Logging Strategy

- **Development**: Console logging with timestamps
- **Production**: Structured JSON logs
  - Request IDs for tracing
  - User IDs for analytics
  - Error stack traces

### Health Checks

Implement health check endpoints:
- `/health` - Basic service availability
- `/health/db` - Database connectivity
- `/health/tts` - TTS service availability
- `/health/llm` - LLM service availability

---

## Future Enhancements

### Planned Features

1. **Real-time Progress**: WebSocket for live generation updates
2. **Batch Operations**: Generate all chapters in parallel
3. **Audio Editing**: Trim, speed adjust, volume normalize
4. **Export**: Package as M4B audiobook file
5. **Multi-user**: User accounts and authentication
6. **Cloud Storage**: S3 for audio files
7. **CDN**: CloudFront for static assets

### Scalability Roadmap

1. **Phase 1**: Single server, SQLite (current)
2. **Phase 2**: PostgreSQL, Redis cache
3. **Phase 3**: Worker queue (Celery), S3 storage
4. **Phase 4**: Kubernetes, microservices

---

## References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [EdgeTTS GitHub](https://github.com/rany2/edge-tts)
- [XTTS Documentation](https://docs.coqui.ai/en/latest/models/xtts.html)
- [Google Gemini API](https://ai.google.dev/docs)
