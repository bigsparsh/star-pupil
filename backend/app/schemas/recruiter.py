import uuid
from pydantic import BaseModel, Field


class RecruiterQuery(BaseModel):
    """Schema for recruiter talent search query."""
    query: str = Field(..., min_length=1, max_length=2000)
    limit: int = Field(default=10, ge=1, le=50)


class ExtractedSkills(BaseModel):
    """Schema for LLM-extracted skills from query."""
    primary_skills: list[str] = []
    secondary_skills: list[str] = []


class GitHubStats(BaseModel):
    """Schema for GitHub statistics."""
    merged_prs: int = 0
    total_commits: int = 0
    repo_count: int = 0
    main_languages: list[str] = []
    commit_frequency: str | None = None


class ScoreBreakdown(BaseModel):
    """Breakdown of how the match score was calculated."""
    github_score: float = 0.0
    skill_match_score: float = 0.0
    complexity_score: float = 0.0
    recency_score: float = 0.0
    oss_contribution_score: float = 0.0
    # Weights used
    github_weight: float = 0.35
    skill_match_weight: float = 0.25
    complexity_weight: float = 0.15
    recency_weight: float = 0.10
    oss_contribution_weight: float = 0.15


class CandidateResult(BaseModel):
    """Schema for individual candidate in search results."""
    id: uuid.UUID
    name: str
    github_username: str | None = None
    profile_link: str | None = None
    skills: list[str] = []
    matched_skills: list[str] = []
    github_stats: GitHubStats | None = None
    popular_repo_count: int = 0  # Number of 100+ star repos contributed to
    score: float = 0.0
    score_breakdown: ScoreBreakdown | None = None
    contribution_graph: list[int] = []  # Weekly contribution counts
    rank: int = 0


class QueryResponse(BaseModel):
    """Schema for recruiter query response."""
    query: str
    extracted_skills: ExtractedSkills
    candidates: list[CandidateResult]
    total_matches: int = 0
