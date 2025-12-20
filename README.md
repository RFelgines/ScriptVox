# ScriptVox

**AI-Powered Audiobook Generation Studio**

Transform EPUB books into multi-voice audiobooks with automatic character detection and voice assignment. ScriptVox combines advanced text-to-speech technology with LLM-powered character analysis to create professional-quality narration.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 📚 **EPUB Parsing**: Automatically extract chapters and content from EPUB files
- 🎭 **Character Detection**: AI-powered identification of characters with personality traits
- 🎙️ **Multi-Voice Narration**: Assign different voices to different characters
- 🔄 **Dual Mode Architecture**:
  - **Cloud Mode**: EdgeTTS + Google Gemini (fast, no GPU required)
  - **Local Mode**: XTTS + Ollama (private, high-quality, requires GPU)
- 📊 **Real-time Progress**: Track audio generation with live progress updates
- 🎨 **Modern UI**: Built with Next.js 16 and Tailwind CSS 4
- 🔊 **Audio Player**: Persistent player with speed control and chapter navigation

## 🏗️ Architecture

```
ScriptVox/
├── backend/          # FastAPI backend with SQLite
│   ├── app/
│   │   ├── adapters/    # TTS & LLM service adapters
│   │   ├── models/      # SQLModel database entities
│   │   ├── routers/     # API endpoints
│   │   └── services/    # Business logic (orchestrator, parser, voice registry)
│   └── data/            # Uploaded books, covers, audio files
└── frontend/         # Next.js 16 frontend
    ├── app/             # App router pages
    ├── components/      # React components
    ├── contexts/        # AudioPlayerContext
    └── hooks/           # Custom hooks (useToast)
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.9+** (for backend)
- **Node.js 18+** (for frontend)
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/RFelgines/ScriptVox.git
   cd ScriptVox
   ```

2. **Backend Setup**
   ```bash
   cd backend
   
   # Create virtual environment
   python -m venv venv
   
   # Activate (Windows)
   .\venv\Scripts\activate
   # Activate (Linux/Mac)
   source venv/bin/activate
   
   # Install dependencies
   pip install -r requirements.txt
   
   # Configure environment
   cp .env.example .env
   # Edit .env and add your GEMINI_API_KEY (optional, for character detection)
   
   # Run the backend
   uvicorn app.main:app --reload
   ```

   Backend will run on `http://localhost:8000`

3. **Frontend Setup**
   ```bash
   cd frontend
   
   # Install dependencies
   npm install
   
   # Run the development server
   npm run dev
   ```

   Frontend will run on `http://localhost:3000`

### Usage

1. **Upload an EPUB book** via the Home page
2. **Wait for parsing** - chapters will be extracted automatically
3. **Run character detection** (optional) - AI identifies characters in the book
4. **Assign voices** - Use the Casting modal to customize character voices
5. **Generate audio** - Click "Generate All" or generate individual chapters
6. **Listen** - Use the persistent audio player to enjoy your audiobook

## ⚙️ Configuration

### Environment Variables

**Backend** (`.env`):
```env
# Application Mode: CLOUD or LOCAL
APP_MODE=CLOUD

# Google Gemini API Key (for character detection in CLOUD mode)
GEMINI_API_KEY=your_api_key_here

# Database (SQLite by default, no configuration needed)
```

**Frontend**:
- No environment variables required for development
- API endpoint is hardcoded to `http://localhost:8000`

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI (async Python web framework)
- **Database**: SQLite with SQLModel (ORM)
- **TTS Services**:
  - EdgeTTS (Microsoft Azure TTS, cloud-based)
  - XTTS (Coqui TTS, local GPU-accelerated)
- **LLM Services**:
  - Google Gemini API (character detection)
  - Ollama (local LLM support)
- **EPUB Parsing**: ebooklib
- **Audio Processing**: edge-tts, TTS (for XTTS)

### Frontend
- **Framework**: Next.js 16 (React 19 with App Router)
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **State Management**: React Context API
- **TypeScript**: Full type safety

## 📖 Project Structure

```
backend/
├── app/
│   ├── adapters/           # Adapter pattern for TTS & LLM services
│   │   ├── base.py            # Abstract base classes
│   │   ├── tts_adapters.py    # EdgeTTS & XTTS implementations
│   │   └── llm_adapters.py    # Gemini & Ollama implementations
│   ├── core/               # Configuration & database
│   │   ├── config.py          # Settings management
│   │   └── database.py        # SQLModel setup
│   ├── models/             # Database entities
│   │   └── models.py          # Book, Chapter, Character, Segment
│   ├── routers/            # API endpoints
│   │   ├── books.py           # Book CRUD operations
│   │   ├── generation.py      # Audio generation endpoints
│   │   ├── characters.py      # Character management
│   │   └── settings.py        # Application settings
│   ├── services/           # Business logic
│   │   ├── orchestrator.py    # Main generation pipeline
│   │   ├── ebook_parser.py    # EPUB parsing service
│   │   └── voice_registry.py  # Voice matching system
│   └── main.py             # FastAPI app entry point
└── data/                   # Runtime data storage

frontend/
├── app/                    # Next.js app router
│   ├── books/                 # Book management pages
│   │   └── [id]/              # Dynamic book detail page
│   ├── settings/              # Settings page
│   ├── voices/                # Voice preview page
│   ├── layout.tsx             # Root layout with Sidebar
│   └── page.tsx               # Home page (upload)
├── components/             # Reusable UI components
│   ├── PersistentPlayer.tsx   # Global audio player
│   ├── Sidebar.tsx            # Navigation sidebar
│   ├── CastingModal.tsx       # Voice assignment modal
│   └── CoverProgress.tsx      # Book cover with progress
├── contexts/               # React Context
│   └── AudioPlayerContext.tsx # Audio state management
└── hooks/                  # Custom React hooks
    └── useToast.tsx           # Toast notifications
```

## 🔄 Data Flow

1. **Upload EPUB** → File saved to `backend/data/uploads/`
2. **Parse Book** → Extract chapters, metadata, cover → Save to SQLite
3. **Analyze Characters** (optional) → LLM analyzes text → Detect characters with traits
4. **Segment Text** → LLM splits chapters into dialogue/narration → Create segments with speaker IDs
5. **Generate Audio** → TTS generates MP3 for each segment → Save to `backend/data/audio/`
6. **Playback** → Frontend streams audio from backend → Persistent player controls

## 🧪 Development

### Running Tests
```bash
# Backend (if tests are added)
cd backend
pytest

# Frontend (if tests are added)
cd frontend
npm test
```

### Code Style
- **Backend**: Follow PEP 8, use Black formatter
- **Frontend**: Follow ESLint configuration, use Prettier

### Adding a New TTS Provider

1. Create a new adapter in `backend/app/adapters/tts_adapters.py`
2. Inherit from `BaseTTS` and implement `list_voices()` and `generate_audio()`
3. Update `backend/app/main.py` to initialize your adapter based on `APP_MODE`

### Adding a New LLM Provider

1. Create a new adapter in `backend/app/adapters/llm_adapters.py`
2. Inherit from `BaseLLM` and implement `analyze_text()` and `assign_roles()`
3. Update `backend/app/main.py` to initialize your adapter

## 📝 API Documentation

The backend API is documented with OpenAPI/Swagger. Once the backend is running, visit:

**Swagger UI**: `http://localhost:8000/docs`  
**ReDoc**: `http://localhost:8000/redoc`

### Key Endpoints

- `POST /books/upload` - Upload an EPUB file
- `GET /books` - List all books
- `GET /books/{id}` - Get book details
- `GET /books/{id}/chapters` - List chapters for a book
- `POST /generation/analyze/{book_id}` - Detect characters with AI
- `POST /generation/segment/{chapter_id}` - Segment chapter text
- `POST /generation/generate/{chapter_id}` - Generate audio for chapter
- `GET /voices` - List available TTS voices

## 🚢 Deployment

### Production Deployment

1. **Backend**:
   - Use a production ASGI server (e.g., Gunicorn + Uvicorn workers)
   - Set `APP_MODE` in environment
   - Configure database (consider PostgreSQL for production)
   - Serve static files with Nginx

2. **Frontend**:
   - Build production bundle: `npm run build`
   - Serve with `npm start` or deploy to Vercel/Netlify
   - Update API endpoint to production backend URL

### Docker Support (TODO)

Docker support is planned for easy deployment.

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **EdgeTTS**: Microsoft's text-to-speech service
- **XTTS**: Coqui TTS for high-quality voice generation
- **Google Gemini**: AI-powered character detection
- **FastAPI**: Modern Python web framework
- **Next.js**: React framework for production
- **ebooklib**: EPUB parsing library

## 📧 Support

For issues and questions, please [open an issue](https://github.com/RFelgines/ScriptVox/issues) on GitHub.

---

**Made with ❤️ by the ScriptVox Team**
