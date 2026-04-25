# Star Backend

A talent matching platform backend connecting recruiters with programmers.

## Tech Stack

- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - Async ORM with PostgreSQL
- **LangGraph** - LLM orchestration for skill extraction
- **Groq** - LLM provider for skill classification
- **httpx** - Async HTTP client for GitHub API
- **JWT** - Session authentication
- **bcrypt** - Password hashing

## Project Structure

```
backend/
├── app/
│   ├── core/           # Configuration, database, security
│   │   ├── config.py   # Settings from environment
│   │   ├── database.py # SQLAlchemy async setup
│   │   └── security.py # JWT & password handling
│   ├── models/         # SQLAlchemy models
│   │   ├── user.py     # User model with roles
│   │   ├── skill.py    # Skill & SkillMapping
│   │   └── stats.py    # UserStats for GitHub data
│   ├── routes/         # API endpoints
│   │   ├── auth.py     # /auth/* endpoints
│   │   ├── recruiter.py# /recruiter/* endpoints
│   │   ├── programmer.py # /programmer/* endpoints
│   │   └── skills.py   # /skills/* endpoints
│   ├── schemas/        # Pydantic models
│   │   ├── user.py
│   │   ├── skill.py
│   │   └── recruiter.py
│   ├── services/       # Business logic
│   │   ├── skill_classifier.py  # LLM skill extraction
│   │   ├── github_enrichment.py # GitHub API client
│   │   ├── talent_retrieval.py  # DB talent search
│   │   └── ranking_engine.py    # Candidate scoring
│   └── main.py         # FastAPI application
├── alembic/            # Database migrations
├── scripts/            # Utility scripts
│   └── seed_db.py      # Initial data seeding
├── .env.example        # Environment template
├── alembic.ini         # Alembic config
├── main.py             # Entry point
└── pyproject.toml      # Dependencies
```

## Setup

### 1. Prerequisites

- Python 3.12+
- PostgreSQL 15+
- UV package manager

### 2. Install Dependencies

```bash
uv sync
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET_KEY` - Secret for JWT signing
- `GITHUB_TOKEN` - GitHub Personal Access Token
- `GROQ_API_KEY` - Groq API key for LLM

### 4. Database Setup

```bash
# Create database
createdb star

# Run migrations
alembic upgrade head

# Seed initial data
python scripts/seed_db.py
```

### 5. Run Development Server

```bash
# Using uvicorn directly
uvicorn app.main:app --reload

# Or using the entry point
python main.py
```

API will be available at `http://localhost:8000`

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Register new user |
| POST | `/auth/login` | Login and get tokens |
| GET | `/auth/refresh` | Refresh access token |
| GET | `/auth/me` | Get current user profile |

### Recruiter

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/recruiter/query` | Search for talents |
| GET | `/recruiter/user/{id}` | Get user profile |

### Programmer

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/programmer/skills` | Get my skills |
| POST | `/programmer/skills` | Add a skill |
| DELETE | `/programmer/skills/{id}` | Remove a skill |
| GET | `/programmer/stats` | Get GitHub stats |
| PATCH | `/programmer/profile` | Update profile |

### Skills

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/skills` | List all skills |
| POST | `/skills` | Create skill (admin) |
| GET | `/skills/{id}` | Get skill by ID |
| GET | `/skills/categories/list` | List categories |

## Demo Credentials

After running the seed script:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@star.dev | admin123456 |
| Recruiter | recruiter@star.dev | recruiter123456 |
| Programmer | programmer@star.dev | programmer123456 |

## Talent Search Pipeline

1. **Query Parsing** - LLM extracts skills from natural language
2. **Database Search** - Find programmers with matching skills
3. **GitHub Enrichment** - Fetch activity stats via GraphQL
4. **Scoring** - Calculate composite score:
   - 40% GitHub stats (PRs, commits, repos)
   - 30% Skill match (primary/secondary)
   - 20% Complexity score
   - 10% Recency/activity
5. **Ranking** - Return top candidates sorted by score

## API Documentation

Interactive docs available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## License

MIT
