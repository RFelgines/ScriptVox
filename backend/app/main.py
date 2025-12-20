from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from .core.config import settings
from .core.database import create_db_and_tables
from .adapters.base import BaseTTS, BaseLLM
from .adapters.tts_adapters import EdgeTTSAdapter, XTTSAdapter
from .adapters.llm_adapters import GeminiLLMAdapter, OllamaLLMAdapter

# Dependency Container
class ServiceContainer:
    tts_service: BaseTTS
    llm_service: BaseLLM

container = ServiceContainer()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_db_and_tables()
    
    # Initialize Adapters based on Mode
    print(f"Initializing in {settings.APP_MODE} mode...")
    
    if settings.APP_MODE == "CLOUD":
        container.tts_service = EdgeTTSAdapter()
        if settings.GEMINI_API_KEY:
            container.llm_service = GeminiLLMAdapter(api_key=settings.GEMINI_API_KEY)
        else:
            print("WARNING: GEMINI_API_KEY not set. LLM features will fail.")
            container.llm_service = GeminiLLMAdapter(api_key="dummy_key")
            
    elif settings.APP_MODE == "LOCAL":
        container.tts_service = XTTSAdapter()
        container.llm_service = OllamaLLMAdapter()
    else:
        raise ValueError(f"Unknown APP_MODE: {settings.APP_MODE}")
        
    yield
    # Shutdown

app = FastAPI(title="ScriptVox API", lifespan=lifespan)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency Getters
def get_tts_service() -> BaseTTS:
    return container.tts_service

def get_llm_service() -> BaseLLM:
    return container.llm_service

# Register Routers
from .routers import books, generation, characters, settings as settings_router
app.include_router(books.router)
app.include_router(generation.router)
app.include_router(characters.router)
app.include_router(settings_router.router)

# Mount static files for serving covers and audio
app.mount("/data", StaticFiles(directory="data"), name="data")

@app.get("/")
def read_root():
    return {"message": "ScriptVox API is running", "mode": settings.APP_MODE}

@app.get("/voices")
async def get_voices(tts: BaseTTS = Depends(get_tts_service)):
    try:
        voices = await tts.list_voices()
        return {"count": len(voices), "voices": voices}
    except Exception as e:
        print(f"ERROR in /voices: {e}")
        import traceback
        traceback.print_exc()
        raise
