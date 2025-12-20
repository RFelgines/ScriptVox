from fastapi import APIRouter
from pydantic import BaseModel
from ..core.config import settings
import os

router = APIRouter(prefix="/settings", tags=["settings"])

class SettingsResponse(BaseModel):
    app_mode: str
    gemini_api_key_set: bool

class SettingsUpdate(BaseModel):
    app_mode: str  # "CLOUD" or "LOCAL"

@router.get("/", response_model=SettingsResponse)
def get_settings():
    """Get current application settings"""
    # Read from .env file to get the latest saved value
    env_path = ".env"
    current_mode = settings.APP_MODE  # Default fallback
    
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line.startswith("APP_MODE="):
                    current_mode = line.split("=", 1)[1]
                    break
    
    return SettingsResponse(
        app_mode=current_mode,
        gemini_api_key_set=bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "")
    )

@router.put("/mode")
def update_mode(update: SettingsUpdate):
    """Update application mode (requires restart to take effect)"""
    env_path = ".env"
    
    # Read current .env
    env_vars = {}
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and "=" in line and not line.startswith("#"):
                    key, value = line.split("=", 1)
                    env_vars[key] = value
    
    # Update mode
    env_vars["APP_MODE"] = update.app_mode
    
    # Write back
    with open(env_path, "w") as f:
        for key, value in env_vars.items():
            f.write(f"{key}={value}\n")
    
    return {
        "message": f"Mode updated to {update.app_mode}. Restart backend to apply.",
        "new_mode": update.app_mode
    }
