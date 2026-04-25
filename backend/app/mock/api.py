"""
Mock API for testing shortlist functionality.

Run with: uvicorn app.mock.api:app --reload --port 8001
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.mock.data import (
    MOCK_PROGRAMMERS,
    mock_extract_skills,
    mock_find_matching_programmers,
)
from app.schemas.recruiter import (
    ExtractedSkills,
    GitHubStats,
    CandidateResult,
)
from app.services.ranking_engine import ranking_engine


app = FastAPI(
    title="Star Mock API",
    version="0.1.0",
    description="Mock API for testing talent shortlist functionality",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MockQuery(BaseModel):
    """Query input for talent search."""
    query: str = Field(..., min_length=1)
    limit: int = Field(default=5, ge=1, le=20)


class MockUserStats:
    """Fake user stats for scoring."""
    def __init__(self, complexity_score: int):
        self.complexity_score = complexity_score


class ShortlistResponse(BaseModel):
    """Response with shortlisted candidates."""
    query: str
    extracted_skills: ExtractedSkills
    candidates: list[CandidateResult]
    total_found: int


@app.get("/")
async def root():
    """Health check."""
    return {"status": "ok", "message": "Mock API running", "mode": "test"}


@app.get("/programmers")
async def list_all_programmers():
    """List all mock programmers for reference."""
    return [
        {
            "id": str(p["id"]),
            "name": p["name"],
            "github_username": p["github_username"],
            "skills": p["skills"],
        }
        for p in MOCK_PROGRAMMERS
    ]


@app.post("/shortlist", response_model=ShortlistResponse)
async def shortlist_talents(query: MockQuery):
    """
    Test the talent shortlist pipeline with mock data.
    
    This mimics the full recruiter query flow:
    1. Extract skills from query (mocked)
    2. Find matching programmers (from mock data)
    3. Calculate scores using real ranking engine
    4. Return top N candidates
    """
    # Step 1: Extract skills (mocked)
    extracted_skills = mock_extract_skills(query.query)
    
    # Step 2: Find matching programmers
    matches = mock_find_matching_programmers(extracted_skills)
    
    if not matches:
        return ShortlistResponse(
            query=query.query,
            extracted_skills=extracted_skills,
            candidates=[],
            total_found=0,
        )
    
    # Step 3: Score each candidate using the real ranking engine
    candidates = []
    for match in matches:
        # Create mock user stats object
        mock_stats = MockUserStats(match["complexity_score"])
        
        score = ranking_engine.calculate_score(
            user=None,  # Not needed for scoring
            matched_skills=match["matched_skills"],
            all_skills=extracted_skills,
            github_stats=match["github_stats"],
            user_stats=mock_stats,
        )
        
        candidate = CandidateResult(
            id=match["id"],
            name=match["name"],
            github_username=match["github_username"],
            profile_link=f"https://github.com/{match['github_username']}",
            skills=match["skills"],
            matched_skills=match["matched_skills"],
            github_stats=match["github_stats"],
            score=score,
        )
        candidates.append(candidate)
    
    # Step 4: Rank and limit
    ranked = ranking_engine.rank_candidates(candidates, top_n=query.limit)
    
    return ShortlistResponse(
        query=query.query,
        extracted_skills=extracted_skills,
        candidates=ranked,
        total_found=len(matches),
    )


@app.post("/extract-skills")
async def test_skill_extraction(query: str):
    """Test skill extraction separately."""
    return mock_extract_skills(query)


@app.get("/scoring-weights")
async def get_scoring_weights():
    """Show the current scoring weights."""
    return {
        "github_stats": ranking_engine.WEIGHT_GITHUB,
        "skill_match": ranking_engine.WEIGHT_SKILL_MATCH,
        "complexity": ranking_engine.WEIGHT_COMPLEXITY,
        "recency": ranking_engine.WEIGHT_RECENCY,
    }
