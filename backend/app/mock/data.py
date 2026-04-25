"""
Mock Data Module

Provides fake data for testing the talent shortlist pipeline.
"""
import uuid
from datetime import datetime, timezone
from app.schemas.recruiter import GitHubStats, ExtractedSkills


# Mock programmers with skills and GitHub data
MOCK_PROGRAMMERS = [
    {
        "id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
        "name": "Alice Chen",
        "email": "alice@example.com",
        "github_username": "alicechen",
        "bio": "Full-stack developer passionate about Kubernetes and cloud-native",
        "skills": ["kubernetes", "docker", "python", "go", "terraform", "aws"],
        "github_stats": GitHubStats(
            merged_prs=156,
            total_commits=2340,
            repo_count=45,
            main_languages=["Go", "Python", "TypeScript"],
            commit_frequency="very_active",
        ),
        "complexity_score": 85,
    },
    {
        "id": uuid.UUID("22222222-2222-2222-2222-222222222222"),
        "name": "Bob Martinez",
        "email": "bob@example.com",
        "github_username": "bobmartinez",
        "bio": "Backend engineer specializing in microservices",
        "skills": ["python", "fastapi", "postgresql", "docker", "redis", "kubernetes"],
        "github_stats": GitHubStats(
            merged_prs=89,
            total_commits=1567,
            repo_count=28,
            main_languages=["Python", "JavaScript"],
            commit_frequency="active",
        ),
        "complexity_score": 72,
    },
    {
        "id": uuid.UUID("33333333-3333-3333-3333-333333333333"),
        "name": "Carol Wang",
        "email": "carol@example.com",
        "github_username": "carolwang",
        "bio": "DevOps engineer with strong K8s experience",
        "skills": ["kubernetes", "helm", "docker", "aws", "terraform", "jenkins", "python"],
        "github_stats": GitHubStats(
            merged_prs=203,
            total_commits=3100,
            repo_count=52,
            main_languages=["Python", "Shell", "Go"],
            commit_frequency="very_active",
        ),
        "complexity_score": 91,
    },
    {
        "id": uuid.UUID("44444444-4444-4444-4444-444444444444"),
        "name": "David Kim",
        "email": "david@example.com",
        "github_username": "davidkim",
        "bio": "ML engineer focused on NLP",
        "skills": ["python", "pytorch", "tensorflow", "nlp", "docker", "aws"],
        "github_stats": GitHubStats(
            merged_prs=67,
            total_commits=890,
            repo_count=19,
            main_languages=["Python", "Jupyter"],
            commit_frequency="active",
        ),
        "complexity_score": 78,
    },
    {
        "id": uuid.UUID("55555555-5555-5555-5555-555555555555"),
        "name": "Eva Johnson",
        "email": "eva@example.com",
        "github_username": "evajohnson",
        "bio": "Frontend developer with React expertise",
        "skills": ["javascript", "typescript", "react", "nextjs", "tailwindcss", "nodejs"],
        "github_stats": GitHubStats(
            merged_prs=112,
            total_commits=1890,
            repo_count=34,
            main_languages=["TypeScript", "JavaScript"],
            commit_frequency="active",
        ),
        "complexity_score": 68,
    },
    {
        "id": uuid.UUID("66666666-6666-6666-6666-666666666666"),
        "name": "Frank Lee",
        "email": "frank@example.com",
        "github_username": "franklee",
        "bio": "Cloud architect with multi-cloud experience",
        "skills": ["aws", "gcp", "kubernetes", "terraform", "docker", "python", "go"],
        "github_stats": GitHubStats(
            merged_prs=178,
            total_commits=2567,
            repo_count=41,
            main_languages=["Python", "Go", "HCL"],
            commit_frequency="very_active",
        ),
        "complexity_score": 88,
    },
    {
        "id": uuid.UUID("77777777-7777-7777-7777-777777777777"),
        "name": "Grace Park",
        "email": "grace@example.com",
        "github_username": "gracepark",
        "bio": "Full-stack developer",
        "skills": ["python", "django", "react", "postgresql", "docker"],
        "github_stats": GitHubStats(
            merged_prs=45,
            total_commits=678,
            repo_count=12,
            main_languages=["Python", "JavaScript"],
            commit_frequency="moderate",
        ),
        "complexity_score": 55,
    },
    {
        "id": uuid.UUID("88888888-8888-8888-8888-888888888888"),
        "name": "Henry Nguyen",
        "email": "henry@example.com",
        "github_username": "henrynguyen",
        "bio": "Senior SRE engineer",
        "skills": ["kubernetes", "docker", "prometheus", "grafana", "linux", "python", "go"],
        "github_stats": GitHubStats(
            merged_prs=234,
            total_commits=3450,
            repo_count=67,
            main_languages=["Go", "Python", "Shell"],
            commit_frequency="very_active",
        ),
        "complexity_score": 94,
    },
    {
        "id": uuid.UUID("99999999-9999-9999-9999-999999999999"),
        "name": "Ivy Brown",
        "email": "ivy@example.com",
        "github_username": "ivybrown",
        "bio": "Backend developer",
        "skills": ["java", "spring", "kubernetes", "docker", "postgresql"],
        "github_stats": GitHubStats(
            merged_prs=78,
            total_commits=1234,
            repo_count=23,
            main_languages=["Java", "Kotlin"],
            commit_frequency="active",
        ),
        "complexity_score": 70,
    },
    {
        "id": uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        "name": "Jack Wilson",
        "email": "jack@example.com",
        "github_username": "jackwilson",
        "bio": "Junior developer learning K8s",
        "skills": ["python", "docker", "linux"],
        "github_stats": GitHubStats(
            merged_prs=12,
            total_commits=156,
            repo_count=8,
            main_languages=["Python"],
            commit_frequency="low",
        ),
        "complexity_score": 25,
    },
]


# Skill keyword mappings for mock extraction
SKILL_KEYWORDS = {
    "kubernetes": ["kubernetes", "k8s", "container orchestration", "pods", "helm"],
    "docker": ["docker", "container", "containerization", "dockerfile"],
    "python": ["python", "py", "django", "fastapi", "flask"],
    "go": ["go", "golang"],
    "aws": ["aws", "amazon", "ec2", "s3", "lambda"],
    "gcp": ["gcp", "google cloud"],
    "terraform": ["terraform", "iac", "infrastructure as code"],
    "react": ["react", "reactjs", "frontend"],
    "javascript": ["javascript", "js", "node"],
    "typescript": ["typescript", "ts"],
    "machine-learning": ["machine learning", "ml", "ai", "deep learning"],
    "nlp": ["nlp", "natural language", "text processing"],
    "postgresql": ["postgresql", "postgres", "sql", "database"],
}


def mock_extract_skills(query: str) -> ExtractedSkills:
    """Mock skill extraction from query."""
    query_lower = query.lower()
    primary = []
    secondary = []
    
    for skill, keywords in SKILL_KEYWORDS.items():
        for kw in keywords:
            if kw in query_lower:
                if len(primary) < 3:
                    primary.append(skill)
                else:
                    secondary.append(skill)
                break
    
    # If nothing found, add some defaults based on common terms
    if not primary:
        if "backend" in query_lower:
            primary = ["python", "postgresql"]
        elif "frontend" in query_lower:
            primary = ["javascript", "react"]
        elif "devops" in query_lower or "sre" in query_lower:
            primary = ["kubernetes", "docker"]
        else:
            primary = ["python"]
    
    return ExtractedSkills(primary_skills=primary, secondary_skills=secondary)


def mock_find_matching_programmers(skills: ExtractedSkills) -> list[dict]:
    """Find mock programmers matching the skills."""
    all_skills = set(skills.primary_skills + skills.secondary_skills)
    matches = []
    
    for programmer in MOCK_PROGRAMMERS:
        prog_skills = set(programmer["skills"])
        matched = prog_skills & all_skills
        
        if matched:
            matches.append({
                **programmer,
                "matched_skills": list(matched),
                "match_count": len(matched),
            })
    
    # Sort by match count descending
    matches.sort(key=lambda x: x["match_count"], reverse=True)
    return matches
