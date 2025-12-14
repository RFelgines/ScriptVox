from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    APP_NAME: str = "ScriptVox"
    APP_MODE: str = "CLOUD" # "CLOUD" or "LOCAL"
    DATABASE_URL: str = "sqlite:///data/scriptvox.db"
    
    # API Keys
    GEMINI_API_KEY: Optional[str] = None
    
    class Config:
        env_file = ".env"

settings = Settings()
