import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class SkillCreate(BaseModel):
    """Schema for creating a skill."""
    name: str = Field(..., min_length=1, max_length=255)
    category: str | None = None
    description: str | None = None


class SkillResponse(BaseModel):
    """Schema for skill response."""
    id: uuid.UUID
    name: str
    category: str | None = None
    description: str | None = None
    
    model_config = {"from_attributes": True}


class SkillMappingCreate(BaseModel):
    """Schema for adding a skill to user."""
    skill_id: uuid.UUID
    proficiency_level: int = Field(default=1, ge=1, le=5)
    years_experience: float | None = None


class SkillMappingResponse(BaseModel):
    """Schema for skill mapping response."""
    id: uuid.UUID
    skill: SkillResponse
    proficiency_level: int
    years_experience: float | None = None
    created_at: datetime
    
    model_config = {"from_attributes": True}


class PopularRepoContribution(BaseModel):
    """Schema for a contribution to a popular repository."""
    repo_name: str
    name: str
    owner: str
    stars: int
    language: str | None = None
    description: str | None = None
    url: str
    contribution_count: int
    is_owner: bool = False  # True if user owns this repo


class PortfolioDataResponse(BaseModel):
    """Schema for portfolio website data."""
    url: str
    skills: list[str] = []
    title: str | None = None
    description: str | None = None
    projects_mentioned: int = 0
    success: bool = True


class UserStatsResponse(BaseModel):
    """Schema for user stats response."""
    merged_prs: int = 0
    total_commits: int = 0
    total_repos: int = 0
    followers: int = 0
    languages: dict | None = None
    repo_activity: dict | None = None
    contribution_graph: dict | None = None
    popular_repo_contributions: list[PopularRepoContribution] | None = None
    portfolio: PortfolioDataResponse | None = None
    complexity_score: int = 0
    monthly_commits: int = 0
    updated_at: datetime | None = None
    
    model_config = {"from_attributes": True}
