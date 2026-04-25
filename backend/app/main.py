"""
Star Backend API

A talent matching platform connecting recruiters with programmers.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.routes import auth_router, recruiter_router, programmer_router, skills_router, chat_router
from app.routes.public import router as public_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    await init_db()
    yield
    # Shutdown
    pass


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Star - A talent matching platform connecting recruiters with programmers",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(recruiter_router)
app.include_router(programmer_router)
app.include_router(skills_router)
app.include_router(chat_router)
app.include_router(public_router)


@app.get("/")
async def root():
    """Root endpoint - API health check."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "healthy",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
