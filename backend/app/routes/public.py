"""
Public Routes

Publicly accessible endpoints for skill browsing and leaderboards.
No authentication required.
"""
import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.skill import Skill, SkillMapping
from app.models.stats import UserStats
from app.schemas.skill import SkillResponse
from pydantic import BaseModel


router = APIRouter(prefix="/public", tags=["Public"])


class PublicDeveloper(BaseModel):
    """Public developer profile for display."""
    id: uuid.UUID
    name: str
    github_username: str | None = None
    bio: str | None = None
    skills: list[str] = []
    merged_prs: int = 0
    total_commits: int = 0
    total_repos: int = 0
    followers: int = 0
    popular_repo_count: int = 0
    avatar_url: str | None = None


class SkillDevelopersResponse(BaseModel):
    """Response for developers with a specific skill."""
    skill_name: str
    developers: list[PublicDeveloper]
    total_count: int


class LeaderboardEntry(BaseModel):
    """Entry in the leaderboard."""
    rank: int
    id: uuid.UUID
    name: str
    github_username: str | None = None
    avatar_url: str | None = None
    merged_prs: int = 0
    total_commits: int = 0
    total_repos: int = 0
    followers: int = 0
    popular_repo_count: int = 0
    score: float = 0.0
    top_skills: list[str] = []


class LeaderboardResponse(BaseModel):
    """Leaderboard response."""
    entries: list[LeaderboardEntry]
    category: str
    total_developers: int


class SkillCategoryResponse(BaseModel):
    """Response for skill category."""
    category: str
    skill_count: int
    developer_count: int


@router.get("/skills", response_model=list[str])
async def get_all_skills(
    db: AsyncSession = Depends(get_db),
    category: str | None = None,
    limit: int = Query(default=100, le=500),
):
    """
    Get all available skill names, optionally filtered by category.
    """
    query = select(Skill.name)
    
    if category:
        query = query.where(Skill.category == category)
    
    query = query.order_by(Skill.name).limit(limit)
    
    result = await db.execute(query)
    skills = result.scalars().all()
    
    return list(skills)


@router.get("/skills/{skill_name}/developers", response_model=SkillDevelopersResponse)
async def get_developers_by_skill(
    skill_name: str,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=20, le=50),
    offset: int = Query(default=0, ge=0),
):
    """
    Get developers who have a specific skill.
    """
    # Find the skill (case-insensitive)
    skill_result = await db.execute(
        select(Skill).where(func.lower(Skill.name) == skill_name.lower())
    )
    skill = skill_result.scalar_one_or_none()
    
    if not skill:
        # Return empty result if skill not found
        return SkillDevelopersResponse(
            skill_name=skill_name,
            developers=[],
            total_count=0,
        )
    
    # Count total developers with this skill
    count_result = await db.execute(
        select(func.count(SkillMapping.user_id.distinct()))
        .where(SkillMapping.skill_id == skill.id)
    )
    total_count = count_result.scalar() or 0
    
    # Get developers with this skill, ordered by stats
    developers_query = (
        select(User)
        .join(SkillMapping, SkillMapping.user_id == User.id)
        .where(SkillMapping.skill_id == skill.id)
        .where(User.role == UserRole.PROGRAMMER)
        .options(
            selectinload(User.stats),
            selectinload(User.skill_mappings).selectinload(SkillMapping.skill)
        )
        .offset(offset)
        .limit(limit)
    )
    
    result = await db.execute(developers_query)
    users = result.scalars().unique().all()
    
    # Build response with stats-based ordering
    developers = []
    for user in users:
        # Get user skills
        user_skills = [sm.skill.name for sm in user.skill_mappings if sm.skill][:10]
        
        # Get stats
        stats = user.stats
        popular_repo_count = 0
        if stats and stats.popular_repo_contributions_json:
            popular_repo_count = stats.popular_repo_contributions_json.get("total_count", 0)
        
        avatar_url = None
        if user.github_username:
            avatar_url = f"https://github.com/{user.github_username}.png"
        
        developers.append(PublicDeveloper(
            id=user.id,
            name=user.name,
            github_username=user.github_username,
            bio=user.bio,
            skills=user_skills,
            merged_prs=stats.merged_prs if stats else 0,
            total_commits=stats.total_commits if stats else 0,
            total_repos=stats.total_repos if stats else 0,
            followers=stats.followers if stats else 0,
            popular_repo_count=popular_repo_count,
            avatar_url=avatar_url,
        ))
    
    # Sort by a composite score
    developers.sort(
        key=lambda d: (d.popular_repo_count * 10 + d.merged_prs + d.total_commits // 10),
        reverse=True
    )
    
    return SkillDevelopersResponse(
        skill_name=skill.name,
        developers=developers,
        total_count=total_count,
    )


@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    db: AsyncSession = Depends(get_db),
    category: str = Query(default="overall", regex="^(overall|oss|commits|prs)$"),
    limit: int = Query(default=20, le=100),
):
    """
    Get developer leaderboard.
    
    Categories:
    - overall: Combined score from all metrics
    - oss: Open source contributions (popular repos)
    - commits: Total commits
    - prs: Merged PRs
    """
    # Get all programmers with stats
    query = (
        select(User)
        .where(User.role == UserRole.PROGRAMMER)
        .options(
            selectinload(User.stats),
            selectinload(User.skill_mappings).selectinload(SkillMapping.skill)
        )
    )
    
    result = await db.execute(query)
    users = result.scalars().unique().all()
    
    # Build entries with scores
    entries = []
    for user in users:
        stats = user.stats
        if not stats:
            continue
        
        popular_repo_count = 0
        if stats.popular_repo_contributions_json:
            popular_repo_count = stats.popular_repo_contributions_json.get("total_count", 0)
        
        # Calculate score based on category
        if category == "overall":
            score = (
                popular_repo_count * 100 +  # OSS contributions weighted heavily
                stats.merged_prs * 5 +
                stats.total_commits * 0.1 +
                stats.followers * 2 +
                stats.total_repos
            )
        elif category == "oss":
            score = popular_repo_count * 100 + stats.merged_prs
        elif category == "commits":
            score = stats.total_commits
        elif category == "prs":
            score = stats.merged_prs
        else:
            score = 0
        
        # Skip users with no activity
        if score == 0:
            continue
        
        # Get top skills
        top_skills = [sm.skill.name for sm in user.skill_mappings if sm.skill][:5]
        
        avatar_url = None
        if user.github_username:
            avatar_url = f"https://github.com/{user.github_username}.png"
        
        entries.append(LeaderboardEntry(
            rank=0,  # Will be set after sorting
            id=user.id,
            name=user.name,
            github_username=user.github_username,
            avatar_url=avatar_url,
            merged_prs=stats.merged_prs,
            total_commits=stats.total_commits,
            total_repos=stats.total_repos,
            followers=stats.followers,
            popular_repo_count=popular_repo_count,
            score=round(score, 2),
            top_skills=top_skills,
        ))
    
    # Sort by score and limit
    entries.sort(key=lambda e: e.score, reverse=True)
    entries = entries[:limit]
    
    # Assign ranks
    for i, entry in enumerate(entries):
        entry.rank = i + 1
    
    return LeaderboardResponse(
        entries=entries,
        category=category,
        total_developers=len(users),
    )


@router.get("/skill-categories", response_model=list[SkillCategoryResponse])
async def get_skill_categories(
    db: AsyncSession = Depends(get_db),
):
    """
    Get all skill categories with counts.
    """
    # Get skill counts per category
    skill_result = await db.execute(
        select(Skill.category, func.count(Skill.id))
        .where(Skill.category.isnot(None))
        .group_by(Skill.category)
        .order_by(func.count(Skill.id).desc())
    )
    skill_counts = {row[0]: row[1] for row in skill_result.all()}
    
    # Get developer counts per category
    dev_result = await db.execute(
        select(Skill.category, func.count(SkillMapping.user_id.distinct()))
        .join(SkillMapping, SkillMapping.skill_id == Skill.id)
        .where(Skill.category.isnot(None))
        .group_by(Skill.category)
    )
    dev_counts = {row[0]: row[1] for row in dev_result.all()}
    
    categories = [
        SkillCategoryResponse(
            category=cat,
            skill_count=skill_counts.get(cat, 0),
            developer_count=dev_counts.get(cat, 0)
        )
        for cat in skill_counts.keys()
    ]
    
    return categories
