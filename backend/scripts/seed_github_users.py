"""
Database seeding script with real GitHub users.

This script seeds the database with programmer users that have real GitHub accounts,
then enriches their profiles with actual GitHub data.

Run: python scripts/seed_github_users.py
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
from app.services.profile_enrichment import profile_enrichment


# Real GitHub users with notable contributions
# These are public profiles of well-known developers
GITHUB_USERS = [
    # Python developers
    {
        "github_username": "gvanrossum",
        "name": "Guido van Rossum",
        "email": "guido@star.dev",
        "bio": "Creator of Python programming language",
        "twitter_username": "gaborivan",
        "stackoverflow_user_id": "818274",  # Real SO ID
        "location": "California, USA",
    },
    {
        "github_username": "kennethreitz",
        "name": "Kenneth Reitz",
        "email": "kenneth@star.dev",
        "bio": "Creator of Requests, Pipenv, and other Python tools",
        "twitter_username": "kennethreitz42",
        "website": "https://kennethreitz.org",
        "devto_username": "kennethreitz",
        "location": "Virginia, USA",
    },
    {
        "github_username": "tiangolo",
        "name": "Sebastián Ramírez",
        "email": "tiangolo@star.dev",
        "bio": "Creator of FastAPI and Typer",
        "twitter_username": "tiaboriano",
        "linkedin_username": "tiangolo",
        "website": "https://tiangolo.com",
        "devto_username": "tiangolo",
        "location": "Berlin, Germany",
    },
    
    # JavaScript/TypeScript developers
    {
        "github_username": "sindresorhus",
        "name": "Sindre Sorhus",
        "email": "sindre@star.dev",
        "bio": "Full-time open-sourcerer. Creator of many npm packages",
        "twitter_username": "sindresorhus",
        "website": "https://sindresorhus.com",
        "stackoverflow_user_id": "64949",
        "location": "Bangkok, Thailand",
    },
    {
        "github_username": "tj",
        "name": "TJ Holowaychuk",
        "email": "tj@star.dev",
        "bio": "Creator of Express.js, Koa, and many npm packages",
        "twitter_username": "tjholowaychuk",
        "location": "Victoria, Canada",
    },
    {
        "github_username": "antfu",
        "name": "Anthony Fu",
        "email": "antfu@star.dev",
        "bio": "Core team of Vue, Vite, Nuxt. Creator of VueUse, Vitest",
        "twitter_username": "antfu7",
        "website": "https://antfu.me",
        "devto_username": "antfu",
        "location": "Paris, France",
    },
    
    # Go developers
    {
        "github_username": "bradfitz",
        "name": "Brad Fitzpatrick",
        "email": "bradfitz@star.dev",
        "bio": "Go team member, created memcached, OpenID",
        "twitter_username": "bradfitz",
        "website": "https://bradfitz.com",
        "stackoverflow_user_id": "21234",
        "location": "Seattle, USA",
    },
    {
        "github_username": "rakyll",
        "name": "Jaana Dogan",
        "email": "rakyll@star.dev",
        "bio": "Go contributor, cloud infrastructure engineer",
        "twitter_username": "rakyll",
        "linkedin_username": "jaaborigan",
        "location": "San Francisco, USA",
    },
    
    # Rust developers
    {
        "github_username": "BurntSushi",
        "name": "Andrew Gallant",
        "email": "burntsushi@star.dev",
        "bio": "Creator of ripgrep, maintainer of many Rust crates",
        "website": "https://blog.burntsushi.net",
        "location": "Massachusetts, USA",
    },
    {
        "github_username": "dtolnay",
        "name": "David Tolnay",
        "email": "dtolnay@star.dev",
        "bio": "Rust library author (serde, syn, quote, etc)",
        "location": "San Francisco, USA",
    },
    
    # Full-stack / Various
    {
        "github_username": "getify",
        "name": "Kyle Simpson",
        "email": "getify@star.dev",
        "bio": "Author of You Don't Know JS book series",
        "twitter_username": "getify",
        "website": "https://me.getify.com",
        "linkedin_username": "kcsimpson",
        "location": "Austin, USA",
    },
    {
        "github_username": "addyosmani",
        "name": "Addy Osmani",
        "email": "addyosmani@star.dev",
        "bio": "Engineering Manager at Google Chrome, web performance expert",
        "twitter_username": "addyosmani",
        "linkedin_username": "addyosmani",
        "website": "https://addyosmani.com",
        "location": "Sunnyvale, USA",
    },
    {
        "github_username": "leerob",
        "name": "Lee Robinson",
        "email": "leerob@star.dev",
        "bio": "VP of Product at Vercel, Next.js advocate",
        "twitter_username": "leeerob",
        "linkedin_username": "leeerob",
        "website": "https://leerob.io",
        "location": "Des Moines, USA",
    },
    {
        "github_username": "shadcn",
        "name": "shadcn",
        "email": "shadcn@star.dev",
        "bio": "Creator of shadcn/ui component library",
        "twitter_username": "shadcn",
        "website": "https://shadcn.com",
    },
    {
        "github_username": "TheAlgorithms",
        "name": "The Algorithms",
        "email": "algorithms@star.dev",
        "bio": "Open source resource for learning algorithms",
        "website": "https://the-algorithms.com",
    },
    
    # DevOps / Infrastructure
    {
        "github_username": "jessfraz",
        "name": "Jessie Frazelle",
        "email": "jessfraz@star.dev",
        "bio": "Docker and container ecosystem contributor",
        "twitter_username": "jessfraz",
        "website": "https://jess.dev",
        "location": "New York, USA",
    },
    {
        "github_username": "kelseyhightower",
        "name": "Kelsey Hightower",
        "email": "kelsey@star.dev",
        "bio": "Kubernetes and cloud native advocate",
        "twitter_username": "kelseyhightower",
        "linkedin_username": "kelseyhightower",
        "location": "Portland, USA",
    },
    
    # Data Science / ML
    {
        "github_username": "fchollet",
        "name": "François Chollet",
        "email": "fchollet@star.dev",
        "bio": "Creator of Keras, AI researcher at Google",
        "twitter_username": "fchollet",
        "location": "Mountain View, USA",
    },
    {
        "github_username": "karpathy",
        "name": "Andrej Karpathy",
        "email": "karpathy@star.dev",
        "bio": "AI researcher, former Tesla AI director",
        "twitter_username": "karpathy",
        "website": "https://karpathy.ai",
        "location": "San Francisco, USA",
    },
    {
        "github_username": "jxnl",
        "name": "Jason Liu",
        "email": "jxnl@star.dev",
        "bio": "ML engineer, creator of instructor library",
        "twitter_username": "jxnlco",
        "linkedin_username": "jasonxnl",
        "website": "https://jxnl.co",
        "location": "New York, USA",
    },
    
    # Systems / Low-level
    {
        "github_username": "antirez",
        "name": "Salvatore Sanfilippo",
        "email": "antirez@star.dev",
        "bio": "Creator of Redis",
        "twitter_username": "antirez",
        "website": "http://antirez.com",
        "location": "Sicily, Italy",
    },
    {
        "github_username": "torvalds",
        "name": "Linus Torvalds",
        "email": "torvalds@star.dev",
        "bio": "Creator of Linux and Git",
        "location": "Portland, USA",
    },
    
    # Web / React
    {
        "github_username": "dan_abramov",
        "name": "Dan Abramov",
        "email": "dan@star.dev",
        "bio": "React core team, co-creator of Redux",
        "twitter_username": "dan_abramov2",
        "website": "https://overreacted.io",
        "location": "London, UK",
    },
    {
        "github_username": "kentcdodds",
        "name": "Kent C. Dodds",
        "email": "kentcdodds@star.dev",
        "bio": "JavaScript educator, Testing Library author",
        "twitter_username": "kentcdodds",
        "linkedin_username": "kentcdodds",
        "website": "https://kentcdodds.com",
        "location": "Utah, USA",
    },
    {
        "github_username": "wesbos",
        "name": "Wes Bos",
        "email": "wesbos@star.dev",
        "bio": "Full-stack developer and educator",
        "twitter_username": "wesbos",
        "linkedin_username": "wesbos",
        "website": "https://wesbos.com",
        "location": "Hamilton, Canada",
    },
]

# Default password for all seeded users (for demo purposes)
DEFAULT_PASSWORD = "github123456"


async def seed_github_users(session, enrich: bool = True):
    """
    Seed database with real GitHub users.
    
    Args:
        session: Database session
        enrich: Whether to fetch and store GitHub data (requires API access)
    """
    print(f"Seeding {len(GITHUB_USERS)} GitHub users...")
    
    created_count = 0
    enriched_count = 0
    
    for user_data in GITHUB_USERS:
        # Check if user already exists (by email or github_username)
        result = await session.execute(
            select(User).where(
                (User.email == user_data["email"]) | 
                (User.github_username == user_data["github_username"])
            )
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print(f"  ⏭️  Skipping {user_data['github_username']} (already exists)")
            continue
        
        # Create user
        user = User(
            email=user_data["email"],
            name=user_data["name"],
            password_hash=hash_password(DEFAULT_PASSWORD),
            role=UserRole.PROGRAMMER,
            github_username=user_data["github_username"],
            linkedin_username=user_data.get("linkedin_username"),
            twitter_username=user_data.get("twitter_username"),
            stackoverflow_user_id=user_data.get("stackoverflow_user_id"),
            devto_username=user_data.get("devto_username"),
            hashnode_username=user_data.get("hashnode_username"),
            website=user_data.get("website"),
            location=user_data.get("location"),
            bio=user_data.get("bio"),
        )
        session.add(user)
        await session.flush()
        await session.refresh(user)
        created_count += 1
        print(f"  ✅ Created user: {user_data['name']} (@{user_data['github_username']})")
        
        # Enrich profile with multi-platform data
        if enrich:
            try:
                result = await profile_enrichment.enrich_user_profile(session, user)
                github_stats = result.get("github")
                skills_added = result.get("skills_added", [])
                verified = result.get("verified_skills", [])
                
                if github_stats or result.get("stackoverflow") or result.get("devto"):
                    enriched_count += 1
                    parts = []
                    if github_stats:
                        parts.append(f"{github_stats.total_commits} commits, {github_stats.merged_prs} PRs")
                    if result.get("stackoverflow"):
                        parts.append(f"SO rep: {result['stackoverflow'].reputation}")
                    if result.get("devto"):
                        parts.append(f"Dev.to: {result['devto'].total_articles} articles")
                    if verified:
                        parts.append(f"Verified: {', '.join(verified[:3])}")
                    print(f"     📊 {' | '.join(parts)}")
                else:
                    print(f"     ⚠️  Could not fetch platform data")
            except Exception as e:
                print(f"     ❌ Error enriching profile: {e}")
        
        # Small delay to avoid rate limiting
        await asyncio.sleep(0.5)
    
    await session.commit()
    print(f"\n✅ Created {created_count} users, enriched {enriched_count} profiles")


async def seed_skills_if_needed(session):
    """Ensure base skills exist in database."""
    # Check if skills already exist
    existing = await session.execute(select(Skill).limit(1))
    if existing.scalar_one_or_none():
        print("Skills already seeded, skipping...")
        return
    
    # Basic skills to seed
    initial_skills = [
        {"name": "python", "category": "Programming Languages"},
        {"name": "javascript", "category": "Programming Languages"},
        {"name": "typescript", "category": "Programming Languages"},
        {"name": "java", "category": "Programming Languages"},
        {"name": "go", "category": "Programming Languages"},
        {"name": "rust", "category": "Programming Languages"},
        {"name": "c++", "category": "Programming Languages"},
        {"name": "c#", "category": "Programming Languages"},
        {"name": "ruby", "category": "Programming Languages"},
        {"name": "swift", "category": "Programming Languages"},
        {"name": "kotlin", "category": "Programming Languages"},
        {"name": "react", "category": "Frontend"},
        {"name": "vue", "category": "Frontend"},
        {"name": "angular", "category": "Frontend"},
        {"name": "nextjs", "category": "Frontend"},
        {"name": "nodejs", "category": "Backend"},
        {"name": "fastapi", "category": "Backend"},
        {"name": "django", "category": "Backend"},
        {"name": "docker", "category": "DevOps"},
        {"name": "kubernetes", "category": "DevOps"},
        {"name": "aws", "category": "Cloud"},
        {"name": "postgresql", "category": "Databases"},
        {"name": "mongodb", "category": "Databases"},
        {"name": "redis", "category": "Databases"},
        {"name": "machine-learning", "category": "Data Science"},
        {"name": "pytorch", "category": "Data Science"},
        {"name": "tensorflow", "category": "Data Science"},
    ]
    
    print("Seeding initial skills...")
    for skill_data in initial_skills:
        skill = Skill(
            name=skill_data["name"],
            category=skill_data.get("category"),
        )
        session.add(skill)
    await session.commit()
    print(f"Seeded {len(initial_skills)} skills")


async def main():
    """Run database seeding with GitHub users."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Seed database with GitHub users")
    parser.add_argument(
        "--no-enrich",
        action="store_true",
        help="Skip fetching GitHub data (faster, but no stats/skills)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of users to seed",
    )
    args = parser.parse_args()
    
    print("=" * 60)
    print("🌱 Star Platform - GitHub Users Seeder")
    print("=" * 60)
    
    print("\nInitializing database...")
    await init_db()
    
    async with AsyncSessionLocal() as session:
        # Seed skills first
        await seed_skills_if_needed(session)
        
        # Seed GitHub users
        global GITHUB_USERS
        if args.limit:
            GITHUB_USERS = GITHUB_USERS[:args.limit]
        
        await seed_github_users(session, enrich=not args.no_enrich)
    
    print("\n" + "=" * 60)
    print("🎉 Database seeding complete!")
    print("=" * 60)
    print(f"\nDefault password for all users: {DEFAULT_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(main())
