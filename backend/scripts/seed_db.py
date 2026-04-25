"""
Database seeding script for initial data.

Run: python scripts/seed_db.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal, init_db
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.skill import Skill, SkillMapping
from app.models.stats import UserStats


INITIAL_SKILLS = [
    # Programming Languages
    {"name": "python", "category": "Programming Languages"},
    {"name": "javascript", "category": "Programming Languages"},
    {"name": "typescript", "category": "Programming Languages"},
    {"name": "java", "category": "Programming Languages"},
    {"name": "go", "category": "Programming Languages"},
    {"name": "golang", "category": "Programming Languages"},
    {"name": "rust", "category": "Programming Languages"},
    {"name": "c", "category": "Programming Languages"},
    {"name": "c++", "category": "Programming Languages"},
    {"name": "cpp", "category": "Programming Languages"},
    {"name": "c#", "category": "Programming Languages"},
    {"name": "csharp", "category": "Programming Languages"},
    {"name": "ruby", "category": "Programming Languages"},
    {"name": "php", "category": "Programming Languages"},
    {"name": "swift", "category": "Programming Languages"},
    {"name": "kotlin", "category": "Programming Languages"},
    {"name": "scala", "category": "Programming Languages"},
    {"name": "objective-c", "category": "Programming Languages"},
    {"name": "dart", "category": "Programming Languages"},
    {"name": "r", "category": "Programming Languages"},
    {"name": "julia", "category": "Programming Languages"},
    {"name": "haskell", "category": "Programming Languages"},
    {"name": "elixir", "category": "Programming Languages"},
    {"name": "clojure", "category": "Programming Languages"},
    {"name": "lua", "category": "Programming Languages"},
    {"name": "perl", "category": "Programming Languages"},
    
    # Frontend
    {"name": "react", "category": "Frontend"},
    {"name": "vue", "category": "Frontend"},
    {"name": "angular", "category": "Frontend"},
    {"name": "svelte", "category": "Frontend"},
    {"name": "nextjs", "category": "Frontend"},
    {"name": "nuxt", "category": "Frontend"},
    {"name": "html", "category": "Frontend"},
    {"name": "css", "category": "Frontend"},
    {"name": "tailwindcss", "category": "Frontend"},
    {"name": "sass", "category": "Frontend"},
    
    # Backend
    {"name": "nodejs", "category": "Backend"},
    {"name": "node", "category": "Backend"},
    {"name": "fastapi", "category": "Backend"},
    {"name": "django", "category": "Backend"},
    {"name": "flask", "category": "Backend"},
    {"name": "express", "category": "Backend"},
    {"name": "spring", "category": "Backend"},
    {"name": "rails", "category": "Backend"},
    {"name": "laravel", "category": "Backend"},
    {"name": "graphql", "category": "Backend"},
    {"name": "rest", "category": "Backend"},
    {"name": "gin", "category": "Backend"},
    {"name": "fiber", "category": "Backend"},
    
    # Mobile
    {"name": "ios", "category": "Mobile"},
    {"name": "android", "category": "Mobile"},
    {"name": "react-native", "category": "Mobile"},
    {"name": "flutter", "category": "Mobile"},
    {"name": "swiftui", "category": "Mobile"},
    
    # DevOps & Cloud
    {"name": "docker", "category": "DevOps"},
    {"name": "kubernetes", "category": "DevOps"},
    {"name": "k8s", "category": "DevOps"},
    {"name": "aws", "category": "Cloud"},
    {"name": "gcp", "category": "Cloud"},
    {"name": "azure", "category": "Cloud"},
    {"name": "terraform", "category": "DevOps"},
    {"name": "ansible", "category": "DevOps"},
    {"name": "jenkins", "category": "DevOps"},
    {"name": "github-actions", "category": "DevOps"},
    {"name": "ci/cd", "category": "DevOps"},
    {"name": "linux", "category": "DevOps"},
    
    # Databases
    {"name": "postgresql", "category": "Databases"},
    {"name": "postgres", "category": "Databases"},
    {"name": "mysql", "category": "Databases"},
    {"name": "mongodb", "category": "Databases"},
    {"name": "redis", "category": "Databases"},
    {"name": "elasticsearch", "category": "Databases"},
    {"name": "sqlite", "category": "Databases"},
    {"name": "cassandra", "category": "Databases"},
    {"name": "dynamodb", "category": "Databases"},
    {"name": "sql", "category": "Databases"},
    
    # Data Science & ML
    {"name": "machine-learning", "category": "Data Science"},
    {"name": "deep-learning", "category": "Data Science"},
    {"name": "tensorflow", "category": "Data Science"},
    {"name": "pytorch", "category": "Data Science"},
    {"name": "pandas", "category": "Data Science"},
    {"name": "numpy", "category": "Data Science"},
    {"name": "scikit-learn", "category": "Data Science"},
    {"name": "nlp", "category": "Data Science"},
    {"name": "computer-vision", "category": "Data Science"},
    
    # Tools
    {"name": "git", "category": "Tools"},
    {"name": "linux", "category": "Tools"},
    {"name": "vim", "category": "Tools"},
    {"name": "vscode", "category": "Tools"},
]


async def seed_skills(session):
    """Seed initial skills."""
    print("Seeding skills...")
    
    added_count = 0
    for skill_data in INITIAL_SKILLS:
        # Check if skill exists
        result = await session.execute(
            select(Skill).where(Skill.name == skill_data["name"])
        )
        if not result.scalar_one_or_none():
            skill = Skill(
                name=skill_data["name"],
                category=skill_data.get("category"),
            )
            session.add(skill)
            added_count += 1
            # Flush after each to avoid batch insert issues
            await session.flush()
    
    await session.commit()
    print(f"Seeded {added_count} new skills (total: {len(INITIAL_SKILLS)})")


async def seed_demo_users(session):
    """Seed demo users for testing."""
    print("Seeding demo users...")
    
    demo_users = [
        {
            "email": "admin@star.dev",
            "name": "Admin User",
            "password": "admin123456",
            "role": UserRole.ADMIN,
        },
        {
            "email": "recruiter@star.dev",
            "name": "Demo Recruiter",
            "password": "recruiter123456",
            "role": UserRole.RECRUITER,
        },
        {
            "email": "programmer@star.dev",
            "name": "Demo Programmer",
            "password": "programmer123456",
            "role": UserRole.PROGRAMMER,
            "github_username": "octocat",
        },
    ]
    
    for user_data in demo_users:
        # Check if user exists
        result = await session.execute(
            select(User).where(User.email == user_data["email"])
        )
        if not result.scalar_one_or_none():
            user = User(
                email=user_data["email"],
                name=user_data["name"],
                password_hash=hash_password(user_data["password"]),
                role=user_data["role"],
                github_username=user_data.get("github_username"),
            )
            session.add(user)
    
    await session.commit()
    print(f"Seeded {len(demo_users)} demo users")


async def main():
    """Run database seeding."""
    print("Initializing database...")
    await init_db()
    
    async with AsyncSessionLocal() as session:
        await seed_skills(session)
        await seed_demo_users(session)
    
    print("Database seeding complete!")


if __name__ == "__main__":
    asyncio.run(main())
