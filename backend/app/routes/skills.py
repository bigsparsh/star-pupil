"""
Skills Routes

Handles skill CRUD operations (admin and listing).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.skill import Skill
from app.schemas.skill import SkillCreate, SkillResponse


router = APIRouter(prefix="/skills", tags=["Skills"])


@router.get("", response_model=list[SkillResponse])
async def list_skills(
    db: AsyncSession = Depends(get_db),
    search: str | None = None,
    category: str | None = None,
    limit: int = 100,
):
    """
    List all available skills.
    Optionally filter by search term or category.
    """
    query = select(Skill)
    
    if search:
        query = query.where(Skill.name.ilike(f"%{search}%"))
    
    if category:
        query = query.where(Skill.category == category)
    
    query = query.limit(limit).order_by(Skill.name)
    
    result = await db.execute(query)
    skills = result.scalars().all()
    
    return [SkillResponse.model_validate(s) for s in skills]


@router.post("", response_model=SkillResponse, status_code=status.HTTP_201_CREATED)
async def create_skill(
    skill_data: SkillCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """
    Create a new skill (admin only).
    """
    # Check if skill already exists
    existing = await db.execute(
        select(Skill).where(Skill.name.ilike(skill_data.name))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Skill already exists",
        )
    
    skill = Skill(
        name=skill_data.name.lower(),
        category=skill_data.category,
        description=skill_data.description,
    )
    
    db.add(skill)
    await db.flush()
    await db.refresh(skill)
    
    return SkillResponse.model_validate(skill)


@router.get("/{skill_id}", response_model=SkillResponse)
async def get_skill(
    skill_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific skill by ID.
    """
    result = await db.execute(select(Skill).where(Skill.id == skill_id))
    skill = result.scalar_one_or_none()
    
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found",
        )
    
    return SkillResponse.model_validate(skill)


@router.get("/categories/list", response_model=list[str])
async def list_categories(
    db: AsyncSession = Depends(get_db),
):
    """
    List all unique skill categories.
    """
    result = await db.execute(
        select(Skill.category).where(Skill.category.isnot(None)).distinct()
    )
    categories = [row[0] for row in result.all() if row[0]]
    return sorted(categories)
