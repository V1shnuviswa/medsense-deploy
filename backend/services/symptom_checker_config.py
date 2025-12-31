"""Configuration settings for the Symptom Checker Agent."""
import os
from typing import Optional
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from .env.symptom file
env_path = Path(__file__).parent.parent / '.env.symptom'
load_dotenv(dotenv_path=env_path)


class Config:
    """Application configuration."""
    
    # Moonshot API Configuration
    MOONSHOT_API_KEY: str = os.getenv("MOONSHOT_API_KEY", "")
    MOONSHOT_MODEL: str = os.getenv("MOONSHOT_MODEL", "moonshotai/kimi-k2-instruct")
    MOONSHOT_BASE_URL: str = os.getenv("MOONSHOT_BASE_URL", "https://api.groq.com/openai/v1")
    MOONSHOT_TEMPERATURE: float = float(os.getenv("MOONSHOT_TEMPERATURE", "0.0"))
    
    # Tavily API Configuration
    TAVILY_API_KEY: str = os.getenv("TAVILY_API_KEY", "")
    
    # Request timeouts
    API_TIMEOUT: int = int(os.getenv("API_TIMEOUT", "300"))
    WEB_SCRAPE_TIMEOUT: int = int(os.getenv("WEB_SCRAPE_TIMEOUT", "180"))
    
    # Agent behavior settings
    CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.75"))
    MAX_WEB_SOURCES: int = 5
    INTENT_CONFIDENCE_THRESHOLD: float = 0.7
    
    # Mock mode (for testing without API keys)
    MOCK_MODE: bool = os.getenv("MOCK_MODE", "false").lower() == "true"
    
    @classmethod
    def validate(cls):
        """Validate required configuration."""
        if cls.MOCK_MODE:
            print("⚠️  Running in MOCK MODE - API responses will be simulated")
            print("   Set MOCK_MODE=false in .env to use real AI analysis")
            return
            
        if not cls.MOONSHOT_API_KEY:
            print("⚠️  WARNING: MOONSHOT_API_KEY is not set")
            print("   The symptom checker will run in MOCK MODE")
            print("   To use real AI analysis:")
            print("   1. Get a free API key from https://console.groq.com/")
            print("   2. Add it to .env file: MOONSHOT_API_KEY=your_key_here")
            cls.MOCK_MODE = True
            return
            
        if not cls.TAVILY_API_KEY:
            print("⚠️  WARNING: TAVILY_API_KEY is not set")
            print("   Web search functionality will be limited")
            print("   Get a free API key from https://tavily.com/")


# Create global config instance
config = Config()
