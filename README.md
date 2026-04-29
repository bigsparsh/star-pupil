# ⭐ Star - Talent Discovery Platform

**Star** is an AI-powered talent discovery platform that helps recruiters find developers based on their real contributions, skills, and open-source work—not just keywords on a resume.

## 🎯 Overview

Star aggregates developer profiles from multiple platforms (GitHub, Stack Overflow, Dev.to, Hashnode, portfolio websites) and uses AI to match recruiters' natural language queries with the most relevant candidates.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           STAR PLATFORM                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Recruiter Query                    Developer Profile                  │
│   ───────────────                    ─────────────────                  │
│   "Looking for a senior             GitHub ──┐                          │
│    Python developer with            Stack Overflow ──┼──► Profile       │
│    FastAPI experience"              Dev.to ──┘        │   Enrichment    │
│         │                           Portfolio ───────┘       │          │
│         ▼                                                    ▼          │
│   ┌─────────────┐                              ┌─────────────────┐      │
│   │   LLM Skill │                              │   Skill + Stats │      │
│   │  Extraction │                              │    Database     │      │
│   └──────┬──────┘                              └────────┬────────┘      │
│          │                                              │               │
│          └──────────────┬───────────────────────────────┘               │
│                         ▼                                               │
│                ┌─────────────────┐                                      │
│                │  Ranking Engine │                                      │
│                │  (Multi-factor  │                                      │
│                │   Scoring)      │                                      │
│                └────────┬────────┘                                      │
│                         ▼                                               │
│              Ranked Candidate Results                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ System Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS, Zustand |
| **Backend** | FastAPI, Python 3.11+, SQLAlchemy (async) |
| **Database** | PostgreSQL with Alembic migrations |
| **AI/LLM** | Groq (Llama 3.1 70B) for skill extraction |
| **APIs** | GitHub GraphQL, Stack Overflow, Dev.to, Hashnode |

### Directory Structure

```
star2/
├── backend/
│   ├── app/
│   │   ├── core/           # Config, database, security
│   │   ├── models/         # SQLAlchemy models (User, Skill, Stats)
│   │   ├── routes/         # API endpoints
│   │   ├── schemas/        # Pydantic schemas
│   │   └── services/       # Business logic
│   ├── alembic/            # Database migrations
│   └── scripts/            # Seeding, utilities
├── frontend/
│   ├── app/                # Next.js pages (App Router)
│   ├── components/         # Reusable UI components
│   └── lib/                # API client, store, utils
└── README.md               # This file
```

---

## 🔄 How It Works

### 1. Profile Enrichment (On Signup/Login)

When a developer signs up or logs in, we fetch and aggregate data from multiple platforms:

```python
# Profile Enrichment Pipeline
┌────────────────────────────────────────────────────────────────┐
│                     PROFILE ENRICHMENT                         │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  User Signs Up with:                                           │
│  • GitHub username                                             │
│  • Stack Overflow ID                                           │
│  • Dev.to username                                             │
│  • Hashnode username                                           │
│  • Portfolio URL                                               │
│                                                                │
│         ▼                                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              CONCURRENT DATA FETCHING                   │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                         │   │
│  │  GitHub (GraphQL)      Stack Overflow    Dev.to/Hashnode│   │
│  │  ─────────────────     ──────────────    ───────────────│   │
│  │  • Repositories        • Top Tags        • Articles     │   │
│  │  • Languages           • Reputation      • Reactions    │   │
│  │  • PRs (merged)        • Badge Count     • Comments     │   │
│  │  • Commits             • Answer Count    • Followers    │   │
│  │  • Contribution Graph                                   │   │
│  │  • Popular Repo PRs                                     │   │
│  │                                                         │   │
│  │  Portfolio Scraper                                      │   │
│  │  ─────────────────                                      │   │
│  │  • Extract skills from HTML                             │   │
│  │  • Parse skill sections                                 │   │
│  │  • Identify technologies                                │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│         ▼                                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   SKILL VERIFICATION                    │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  Skills from GitHub + SO Tags + Dev.to → Verified Skills│   │
│  │  (Cross-platform validation increases confidence)       │   │
│  └─────────────────────────────────────────────────────────┘   │
│         ▼                                                      │
│  Stored in: UserStats + SkillMapping tables                    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Data Sources & What We Extract:**

| Platform | Data Extracted |
|----------|---------------|
| **GitHub** | Languages, repo count/size, commits, merged PRs, contribution graph, followers, contributions to 100+ star repos, PR reviews, language diversity, stars/forks received |
| **Stack Overflow** | Top tags (as skills), reputation, badge counts, answer count |
| **Dev.to** | Article count, total reactions, comments, followers |
| **Hashnode** | Article count, reactions |
| **Portfolio** | Skills mentioned in HTML (200+ tech keywords detected) |

---

### 2. Recruiter Search Flow

When a recruiter searches for candidates:

```python
# Search Pipeline
┌────────────────────────────────────────────────────────────────┐
│                      SEARCH PIPELINE                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Recruiter Query: "Senior Python developer with FastAPI        │
│                    and machine learning experience"            │
│         │                                                      │
│         ▼                                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              1. SKILL EXTRACTION (LLM)                  │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  Model: Groq Llama 3.1 70B                              │   │
│  │                                                         │   │
│  │  Input: Natural language query                          │   │
│  │  Output: {                                              │   │
│  │    "primary_skills": ["python", "fastapi", "ml"],       │   │
│  │    "secondary_skills": ["pytorch", "tensorflow", "sql"] │   │
│  │  }                                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│         │                                                      │
│         ▼                                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              2. TALENT RETRIEVAL                        │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  • Expand skills with aliases (c++ → cpp, go → golang)  │   │
│  │  • Query SkillMapping table for matching users          │   │
│  │  • Return users with matched skill count                │   │
│  └─────────────────────────────────────────────────────────┘   │
│         │                                                      │
│         ▼                                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              3. RANKING ENGINE                          │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  Calculate composite score for each candidate           │   │
│  │  (See Scoring System below)                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│         │                                                      │
│         ▼                                                      │
│  Ranked Results with scores, GitHub stats, skills, OSS badge   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 📊 Scoring & Ranking System

### Recruiter Search: Composite Score Formula

The ranking engine calculates a **composite score (0-100)** using weighted factors:

```
COMPOSITE_SCORE = 
    (GitHub Score      × 0.35) +
    (Skill Match Score × 0.25) +
    (Complexity Score  × 0.15) +
    (Recency Score     × 0.10) +
    (OSS Contribution  × 0.15)
```

#### Factor Breakdown

| Factor | Weight | Description | Scoring Logic |
|--------|--------|-------------|---------------|
| **GitHub Score** | 35% | Overall GitHub activity | PRs (up to 30pts) + Commits (up to 30pts) + Repos (up to 20pts) + Frequency (up to 20pts) |
| **Skill Match** | 25% | How well skills match query | Primary matches (70%) + Secondary matches (30%) |
| **Complexity** | 15% | Repository analysis | Language diversity (20pts) + Codebase size (20pts) + Community validation (20pts) + Code reviews (20pts) + Collaboration breadth (20pts) |
| **Recency** | 10% | Recent activity level | Commit frequency: very_active=100, active=75, moderate=50, low=25 |
| **OSS Contribution** | 15% | Contributions to popular repos | Number of 100+ star repos contributed to + bonus for 1000+ star repos |

#### GitHub Score Detail

```python
# PR Score (up to 30 points)
pr_score = min(merged_prs / 50, 1.0) × 30

# Commit Score (up to 30 points)  
commit_score = min(total_commits / 500, 1.0) × 30

# Repo Score (up to 20 points)
repo_score = min(repo_count / 30, 1.0) × 20

# Frequency Bonus (up to 20 points)
frequency_score = {
    "very_active": 20,  # 200+ commits in last year
    "active": 15,       # 100-199 commits
    "moderate": 10,     # 50-99 commits
    "low": 5            # <50 commits
}
```

#### OSS Contribution Score Detail

```python
# Base score by number of popular repos (100+ stars) contributed to
if repo_count >= 5:    base_score = 100
elif repo_count >= 3:  base_score = 80
elif repo_count >= 2:  base_score = 60
else:                  base_score = 40

# Bonus for very popular repos
for each repo:
    if stars >= 10000: bonus += 10
    elif stars >= 1000: bonus += 5

final_score = min(base_score + bonus, 100)
```

#### Complexity Score Detail (Repository Analysis)

The complexity score analyzes GitHub repositories to assess code quality and engineering sophistication:

```python
# 5 factors, 20 points each (max 100)

# 1. Language Diversity (0-20 points)
# More languages = more versatile developer
if unique_languages >= 8:  score += 20
elif unique_languages >= 5: score += 15
elif unique_languages >= 3: score += 10
elif unique_languages >= 1: score += 4

# 2. Codebase Size (0-20 points)
# Larger codebases = more complex work experience
if total_disk_usage >= 500MB: score += 20
elif total_disk_usage >= 100MB: score += 15
elif total_disk_usage >= 20MB:  score += 10
elif total_disk_usage >= 5MB:   score += 5

# 3. Community Validation (0-20 points)
# Stars + forks = quality code recognition
community = stars + (forks * 2)
if community >= 500: score += 20
elif community >= 100: score += 15
elif community >= 25:  score += 10
elif community >= 5:   score += 5

# 4. Code Review Culture (0-20 points)
# PR reviews given = collaborative practices
if pr_reviews >= 50: score += 20
elif pr_reviews >= 20: score += 15
elif pr_reviews >= 5:  score += 10
elif pr_reviews >= 1:  score += 5

# 5. Collaboration Breadth (0-20 points)
# External repos + PRs = team player
collab = external_repos + (merged_prs / 2)
if collab >= 30: score += 20
elif collab >= 15: score += 15
elif collab >= 5:  score += 10
elif collab >= 1:  score += 5
```

---

### Leaderboard Scoring

The public leaderboard uses simpler, category-specific scoring:

| Category | Formula |
|----------|---------|
| **Overall** | `(OSS_repos × 100) + (PRs × 5) + (commits × 0.1) + (followers × 2) + repos` |
| **Open Source** | `(OSS_repos × 100) + PRs` |
| **Commits** | `total_commits` |
| **Pull Requests** | `merged_prs` |

**Rationale:** The overall score heavily weights OSS contributions because contributing to popular open-source projects is a strong signal of code quality, collaboration skills, and community recognition.

---

## 🔧 Key Services

### SkillClassifierService
Extracts skills from natural language using Groq's Llama 3.1 70B model.

```python
# Input
"Looking for a React developer with TypeScript and Node.js experience"

# Output
{
    "primary_skills": ["react", "typescript", "nodejs"],
    "secondary_skills": ["javascript", "frontend", "backend"]
}
```

### TalentRetrievalService
Queries database with skill aliases for comprehensive matching:

```python
SKILL_ALIASES = {
    "c++": ["cpp", "cplusplus"],
    "javascript": ["js", "ecmascript"],
    "golang": ["go"],
    "kubernetes": ["k8s"],
    # ... etc
}
```

### ProfileEnrichmentService
Aggregates data from all platforms concurrently:
- GitHub stats via GraphQL API
- Stack Overflow via REST API
- Dev.to/Hashnode via REST API
- Portfolio via HTML scraping

### PortfolioScraperService
Extracts skills from portfolio websites:
- Parses HTML for skill keywords
- Identifies skill sections by class names, headings
- Normalizes skill names

---

## 🌐 API Endpoints

### Authentication
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/signup` | POST | No | Register new user |
| `/api/auth/login` | POST | No | Login, get tokens |
| `/api/auth/refresh` | POST | Token | Refresh access token |
| `/api/auth/me` | GET | Token | Get current user profile |

### Programmer Routes
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/programmer/profile` | GET | Token | Get own profile |
| `/api/programmer/profile` | PUT | Token | Update profile |
| `/api/programmer/stats` | GET | Token | Get GitHub stats |
| `/api/programmer/enrich` | POST | Token | Trigger profile enrichment |

### Recruiter Routes
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/recruiter/search` | POST | Token | Search for candidates |
| `/api/recruiter/saved` | GET | Token | Get saved candidates |
| `/api/recruiter/saved/{id}` | POST/DELETE | Token | Save/unsave candidate |

### Public Routes (No Auth)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/public/skills` | GET | List all skills |
| `/api/public/skills/{name}/developers` | GET | Get developers by skill |
| `/api/public/leaderboard` | GET | Get ranked developers |
| `/api/public/skill-categories` | GET | Get skill categories |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- pnpm (for frontend)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

# Install dependencies
pip install -e .

# Set environment variables
cp .env.example .env
# Edit .env with your API keys:
# - GITHUB_TOKEN (required for enrichment)
# - GROQ_API_KEY (required for skill extraction)
# - DATABASE_URL

# Run migrations
alembic upgrade head

# Seed database (optional)
python scripts/seed_github_users.py --limit 5

# Start server
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
pnpm install

# Set environment variables
cp .env.example .env.local
# Edit with NEXT_PUBLIC_API_URL

# Start dev server
pnpm dev
```

---

## 🔑 Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/star

# Security
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# GitHub API (required for enrichment)
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
GITHUB_STATS_CACHE_HOURS=6

# Groq LLM (required for skill extraction)
GROQ_API_KEY=gsk_xxxxxxxxxxxx
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

## 📈 Why This Scoring Approach?

### The Problem with Traditional Hiring
- Resumes are self-reported and often exaggerated
- Keyword matching misses qualified candidates
- No way to verify actual skills

### Our Solution: Evidence-Based Ranking

1. **Real Contributions** - We look at actual merged PRs, commits, and code
2. **Cross-Platform Verification** - Skills validated across GitHub, SO, blogs
3. **OSS Recognition** - Contributing to popular projects = community trust
4. **Recency Matters** - Recent activity shows current engagement
5. **Skill Matching via AI** - Natural language queries, not just keywords

### Score Interpretation

| Score Range | Interpretation |
|-------------|----------------|
| 80-100 | Exceptional - Top-tier contributor, OSS maintainer |
| 60-79 | Strong - Active developer, good skill match |
| 40-59 | Good - Solid fundamentals, room to grow |
| 20-39 | Entry - Limited public contributions |
| 0-19 | New - Just starting out |

---

## 📝 License

MIT License - See LICENSE file for details.

---

## 🤝 Contributing

Contributions welcome! Please read CONTRIBUTING.md for guidelines.
