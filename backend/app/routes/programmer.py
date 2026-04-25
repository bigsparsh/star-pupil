"""
Programmer Routes

Handles programmer profile, skills, and stats management.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.skill import Skill, SkillMapping
from app.models.stats import UserStats
from app.schemas.user import UserUpdate, UserResponse
from app.schemas.skill import (
    SkillMappingCreate,
    SkillMappingResponse,
    SkillResponse,
    UserStatsResponse,
)
from app.services.github_enrichment import github_enrichment


router = APIRouter(prefix="/programmer", tags=["Programmer"])


@router.get("/skills", response_model=list[SkillMappingResponse])
async def get_my_skills(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.PROGRAMMER])),
):
    """
    Get current programmer's skills.
    """
    result = await db.execute(
        select(SkillMapping)
        .where(SkillMapping.user_id == current_user.id)
        .options(selectinload(SkillMapping.skill))
    )
    mappings = result.scalars().all()
    
    return [
        SkillMappingResponse(
            id=m.id,
            skill=SkillResponse.model_validate(m.skill),
            proficiency_level=m.proficiency_level,
            years_experience=m.years_experience,
            created_at=m.created_at,
        )
        for m in mappings
    ]


@router.post("/skills", response_model=SkillMappingResponse, status_code=status.HTTP_201_CREATED)
async def add_skill(
    skill_data: SkillMappingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.PROGRAMMER])),
):
    """
    Add a skill to current programmer's profile.
    """
    # Check if skill exists
    result = await db.execute(select(Skill).where(Skill.id == skill_data.skill_id))
    skill = result.scalar_one_or_none()
    
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found",
        )
    
    # Check if already has this skill
    existing = await db.execute(
        select(SkillMapping).where(
            SkillMapping.user_id == current_user.id,
            SkillMapping.skill_id == skill_data.skill_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Skill already added",
        )
    
    # Create mapping
    mapping = SkillMapping(
        user_id=current_user.id,
        skill_id=skill_data.skill_id,
        proficiency_level=skill_data.proficiency_level,
        years_experience=skill_data.years_experience,
    )
    
    db.add(mapping)
    await db.flush()
    await db.refresh(mapping)
    
    return SkillMappingResponse(
        id=mapping.id,
        skill=SkillResponse.model_validate(skill),
        proficiency_level=mapping.proficiency_level,
        years_experience=mapping.years_experience,
        created_at=mapping.created_at,
    )


@router.delete("/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_skill(
    skill_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.PROGRAMMER])),
):
    """
    Remove a skill from current programmer's profile.
    """
    await db.execute(
        delete(SkillMapping).where(
            SkillMapping.user_id == current_user.id,
            SkillMapping.skill_id == skill_id,
        )
    )


@router.get("/stats", response_model=UserStatsResponse)
async def get_my_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.PROGRAMMER])),
):
    """
    Get current programmer's GitHub statistics.
    """
    # Try to get fresh stats from GitHub
    github_stats = None
    if current_user.github_username:
        github_stats = await github_enrichment.get_user_stats(current_user.github_username)
    
    # Get stored stats
    result = await db.execute(
        select(UserStats).where(UserStats.user_id == current_user.id)
    )
    user_stats = result.scalar_one_or_none()
    
    if github_stats:
        # Update stored stats with fresh data including contribution graph
        if not user_stats:
            user_stats = UserStats(user_id=current_user.id)
            db.add(user_stats)
        
        user_stats.merged_prs = github_stats.merged_prs
        user_stats.total_commits = github_stats.total_commits
        user_stats.total_repos = github_stats.repo_count
        user_stats.followers = github_stats.followers
        user_stats.languages_json = {"languages": github_stats.main_languages}
        user_stats.contribution_graph_json = {
            "graph": github_stats.contribution_graph,
            "monthly_commits": github_stats.monthly_commits,
        }
        user_stats.repo_activity_json = {
            "commit_frequency": github_stats.commit_frequency,
        }
        
        # Store popular repo contributions
        if github_stats.popular_repo_contributions:
            user_stats.popular_repo_contributions_json = {
                "contributions": github_stats.popular_repo_contributions,
                "total_count": len(github_stats.popular_repo_contributions),
            }
        
        # Store complexity score and metrics
        user_stats.complexity_score = github_stats.complexity_score
        
        await db.flush()
        await db.refresh(user_stats)
    
    if not user_stats:
        return UserStatsResponse()
    
    # Extract monthly commits from contribution graph
    monthly_commits = 0
    if user_stats.contribution_graph_json:
        monthly_commits = user_stats.contribution_graph_json.get("monthly_commits", 0)
    
    # Extract popular repo contributions
    popular_repo_contributions = None
    if user_stats.popular_repo_contributions_json:
        contributions_data = user_stats.popular_repo_contributions_json.get("contributions", [])
        if contributions_data:
            popular_repo_contributions = contributions_data
    
    # Extract portfolio data
    portfolio = None
    if user_stats.portfolio_json:
        portfolio = user_stats.portfolio_json
    
    return UserStatsResponse(
        merged_prs=user_stats.merged_prs,
        total_commits=user_stats.total_commits,
        total_repos=user_stats.total_repos,
        followers=user_stats.followers,
        languages=user_stats.languages_json,
        repo_activity=user_stats.repo_activity_json,
        contribution_graph=user_stats.contribution_graph_json,
        popular_repo_contributions=popular_repo_contributions,
        portfolio=portfolio,
        complexity_score=user_stats.complexity_score,
        monthly_commits=monthly_commits,
        updated_at=user_stats.updated_at,
    )


@router.patch("/profile", response_model=UserResponse)
async def update_profile(
    update_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.PROGRAMMER])),
):
    """
    Update current programmer's profile.
    """
    if update_data.name is not None:
        current_user.name = update_data.name
    
    if update_data.github_username is not None:
        # Check if GitHub username is already taken
        if update_data.github_username != current_user.github_username:
            existing = await db.execute(
                select(User).where(User.github_username == update_data.github_username)
            )
            if existing.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="GitHub username already registered",
                )
        current_user.github_username = update_data.github_username
    
    if update_data.linkedin_username is not None:
        current_user.linkedin_username = update_data.linkedin_username
    
    if update_data.twitter_username is not None:
        current_user.twitter_username = update_data.twitter_username
    
    if update_data.stackoverflow_user_id is not None:
        current_user.stackoverflow_user_id = update_data.stackoverflow_user_id
    
    if update_data.devto_username is not None:
        current_user.devto_username = update_data.devto_username
    
    if update_data.hashnode_username is not None:
        current_user.hashnode_username = update_data.hashnode_username
    
    if update_data.website is not None:
        current_user.website = update_data.website
    
    if update_data.location is not None:
        current_user.location = update_data.location
    
    if update_data.bio is not None:
        current_user.bio = update_data.bio
    
    await db.flush()
    await db.refresh(current_user)
    
    return UserResponse.model_validate(current_user)
