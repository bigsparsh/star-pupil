from app.routes.auth import router as auth_router
from app.routes.recruiter import router as recruiter_router
from app.routes.programmer import router as programmer_router
from app.routes.skills import router as skills_router
from app.routes.chat import router as chat_router

__all__ = ["auth_router", "recruiter_router", "programmer_router", "skills_router", "chat_router"]
