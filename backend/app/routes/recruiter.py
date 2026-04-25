"""
Recruiter Routes

Handles talent search queries and candidate retrieval.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.skill import SkillMapping
from app.schemas.user import UserResponse
from app.schemas.recruiter import (
    RecruiterQuery,
    QueryResponse,
    CandidateResult,
    GitHubStats,
)
from app.services.skill_classifier import skill_classifier
from app.services.github_enrichment import github_enrichment
from app.services.talent_retrieval import talent_retrieval
from app.services.ranking_engine import ranking_engine


router = APIRouter(prefix="/recruiter", tags=["Recruiter"])


@router.post("/query", response_model=QueryResponse)
async def search_talents(
    query: RecruiterQuery,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.RECRUITER, UserRole.ADMIN])),
):
    """
    Search for talent based on natural language query.
    
    Pipeline:
    1. Extract skills from query using LLM
    2. Fetch matching users from database
    3. Enrich with GitHub stats
    4. Rank and return top candidates
    """
    # Step 1: Extract skills from query
    extracted_skills = await skill_classifier.extract_skills(query.query)
    
    if not extracted_skills.primary_skills and not extracted_skills.secondary_skills:
        return QueryResponse(
            query=query.query,
            extracted_skills=extracted_skills,
            candidates=[],
            total_matches=0,
        )
    
    # Step 2: Find matching users
    matches = await talent_retrieval.find_matching_users(
        db=db,
        skills=extracted_skills,
        limit=50,  # Initial fetch
    )
    
    if not matches:
        return QueryResponse(
            query=query.query,
            extracted_skills=extracted_skills,
            candidates=[],
            total_matches=0,
        )
    
    # Step 3: Enrich with GitHub stats
    github_usernames = [
        user.github_username 
        for user, _, _ in matches 
        if user.github_username
    ]
    
    github_stats_map = {}
    if github_usernames:
        github_stats_map = await github_enrichment.get_stats_batch(github_usernames)
    
    # Step 4: Build candidate results and calculate scores
    candidates = []
    for user, matched_skills, match_count in matches:
        # Get all user skills
        all_user_skills = await talent_retrieval.get_user_skills(db, user.id)
        
        # Get GitHub stats
        github_stats = None
        if user.github_username:
            github_stats = github_stats_map.get(user.github_username)
        
        # Calculate score with breakdown
        score, breakdown = ranking_engine.calculate_score_with_breakdown(
            user=user,
            matched_skills=matched_skills,
            all_skills=extracted_skills,
            github_stats=github_stats,
            user_stats=user.stats,
        )
        
        # Build profile link
        profile_link = None
        if user.github_username:
            profile_link = f"https://github.com/{user.github_username}"
        
        # Get popular repo count - check fresh github_stats first, then stored stats
        popular_repo_count = 0
        if github_stats and hasattr(github_stats, 'popular_repo_contributions') and github_stats.popular_repo_contributions:
            popular_repo_count = len(github_stats.popular_repo_contributions)
        elif user.stats and user.stats.popular_repo_contributions_json:
            popular_repo_count = user.stats.popular_repo_contributions_json.get("total_count", 0)
        
        # Get contribution graph - check fresh github_stats first, then stored stats
        contribution_graph = []
        if github_stats and hasattr(github_stats, 'contribution_graph') and github_stats.contribution_graph:
            contribution_graph = github_stats.contribution_graph
        elif user.stats and user.stats.contribution_graph_json:
            contribution_graph = user.stats.contribution_graph_json.get("graph", [])
        
        candidate = CandidateResult(
            id=user.id,
            name=user.name,
            github_username=user.github_username,
            profile_link=profile_link,
            skills=all_user_skills,
            matched_skills=matched_skills,
            github_stats=github_stats,
            popular_repo_count=popular_repo_count,
            score=score,
            score_breakdown=breakdown,
            contribution_graph=contribution_graph,
        )
        candidates.append(candidate)
    
    # Step 5: Rank and limit results
    ranked_candidates = ranking_engine.rank_candidates(
        candidates=candidates,
        top_n=query.limit,
    )
    
    return QueryResponse(
        query=query.query,
        extracted_skills=extracted_skills,
        candidates=ranked_candidates,
        total_matches=len(matches),
    )


@router.get("/user/{user_id}", response_model=UserResponse)
async def get_user_profile(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.RECRUITER, UserRole.ADMIN])),
):
    """
    Get detailed profile for a specific user.
    """
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(
            selectinload(User.skill_mappings).selectinload(SkillMapping.skill),
            selectinload(User.stats),
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    return UserResponse.model_validate(user)
