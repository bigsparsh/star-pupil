from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "Star API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS - comma-separated list of allowed origins
    CORS_ORIGINS: str = "*"
    
    # Frontend URL (for links in emails, etc.)
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/star"
    DATABASE_URL_SYNC: str = "postgresql://postgres:postgres@localhost:5432/star"
    
    # JWT
    JWT_SECRET_KEY: str = "your-super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # GitHub
    GITHUB_TOKEN: str = ""
    GITHUB_GRAPHQL_URL: str = "https://api.github.com/graphql"
    
    # Stack Overflow (StackApps)
    STACKOVERFLOW_API_KEY: str = ""
    STACKOVERFLOW_API_URL: str = "https://api.stackexchange.com/2.3"
    
    # Dev.to
    DEVTO_API_URL: str = "https://dev.to/api"
    
    # Hashnode
    HASHNODE_API_URL: str = "https://gql.hashnode.com"
    
    # LLM Services
    GROQ_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    
    # Cache
    GITHUB_STATS_CACHE_HOURS: int = 24
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS into a list."""
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
