from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    HRMS_API_URL: str
    HRMS_API_TOKEN: str
    
    class Config:
        env_file = ".env"

settings = Settings()