"""
Profile Enrichment Service

Fetches data from multiple platforms on user signup/login and stores skills/stats in DB:
- GitHub: Code contributions, languages, PRs
- Stack Overflow: Top tags, badges (for skill verification)
- Dev.to: Articles, engagement metrics (authority indicator)
- Hashnode: Articles, engagement metrics (authority indicator)
- Portfolio Website: Skills extracted from personal site
"""
import asyncio
from datetime import datetime, timezone
from typing import Optional
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.skill import Skill, SkillMapping
from app.models.stats import UserStats
from app.services.github_enrichment import github_enrichment, ExtendedGitHubStats
from app.services.stackoverflow_enrichment import stackoverflow_enrichment, StackOverflowStats
from app.services.devto_enrichment import devto_enrichment, hashnode_enrichment, DevtoStats, HashnodeStats
from app.services.portfolio_scraper import portfolio_scraper, PortfolioData


# Language to skill category mapping
LANGUAGE_CATEGORIES = {
    "python": "Languages",
    "javascript": "Languages",
    "typescript": "Languages",
    "java": "Languages",
    "go": "Languages",
    "rust": "Languages",
    "c": "Languages",
    "c++": "Languages",
    "c#": "Languages",
    "ruby": "Languages",
    "php": "Languages",
    "swift": "Languages",
    "kotlin": "Languages",
    "scala": "Languages",
    "r": "Languages",
    "julia": "Languages",
    "dart": "Languages",
    "lua": "Languages",
    "perl": "Languages",
    "haskell": "Languages",
    "elixir": "Languages",
    "clojure": "Languages",
    "shell": "Tools",
    "html": "Web",
    "css": "Web",
    "sql": "Databases",
    "dockerfile": "DevOps",
    "makefile": "Tools",
}


class ProfileEnrichmentService:
    """Service for enriching user profiles with multi-platform data."""
    
    async def enrich_user_profile(
        self,
        db: AsyncSession,
        user: User,
    ) -> dict:
        """
        Fetch data from all platforms and store skills/stats for a user.
        
        Args:
            db: Database session
            user: User to enrich
            
        Returns:
            Dictionary with enrichment results from each platform
        """
        results = {
            "github": None,
            "stackoverflow": None,
            "devto": None,
            "hashnode": None,
            "portfolio": None,
            "skills_added": [],
            "verified_skills": [],
        }
        
        # Fetch from all platforms concurrently
        tasks = []
        
        if user.github_username:
            tasks.append(("github", github_enrichment.get_user_stats(user.github_username)))
        
        if user.stackoverflow_user_id:
            tasks.append(("stackoverflow", stackoverflow_enrichment.get_user_stats(user.stackoverflow_user_id)))
        
        if user.devto_username:
            tasks.append(("devto", devto_enrichment.get_user_stats(user.devto_username)))
        
        if user.hashnode_username:
            tasks.append(("hashnode", hashnode_enrichment.get_user_stats(user.hashnode_username)))
        
        if user.website:
            tasks.append(("portfolio", portfolio_scraper.scrape_portfolio(user.website)))
        
        if not tasks:
            return results
        
        # Execute all tasks concurrently
        task_results = await asyncio.gather(*[t[1] for t in tasks], return_exceptions=True)
        
        for (platform, _), result in zip(tasks, task_results):
            if isinstance(result, Exception):
                print(f"Error enriching {platform}: {result}")
                continue
            results[platform] = result
        
        # Get or create user stats
        user_stats = await self._get_or_create_user_stats(db, user.id)
        
        # Process GitHub data
        if results["github"]:
            github_stats: ExtendedGitHubStats = results["github"]
            user_stats.merged_prs = github_stats.merged_prs
            user_stats.total_commits = github_stats.total_commits
            user_stats.total_repos = github_stats.repo_count
            user_stats.followers = github_stats.followers
            user_stats.languages_json = {"languages": github_stats.main_languages}
            user_stats.contribution_graph_json = {
                "graph": github_stats.contribution_graph,
                "monthly_commits": github_stats.monthly_commits,
                "total_contributions": len(github_stats.contribution_graph),
            }
            user_stats.repo_activity_json = {
                "commit_frequency": github_stats.commit_frequency,
            }
            
            # Store popular repo contributions (repos with 100+ stars)
            if github_stats.popular_repo_contributions:
                user_stats.popular_repo_contributions_json = {
                    "contributions": github_stats.popular_repo_contributions,
                    "total_count": len(github_stats.popular_repo_contributions),
                }
            
            # Store GitHub-derived skills
            skills = await self._store_user_skills(db, user.id, github_stats.main_languages)
            results["skills_added"].extend(skills)
        
        # Process Stack Overflow data
        if results["stackoverflow"]:
            so_stats: StackOverflowStats = results["stackoverflow"]
            user_stats.stackoverflow_json = so_stats.to_dict()
            
            # Add verified skills (gold badge = top 1% expert)
            results["verified_skills"].extend(so_stats.verified_skills)
            
            # Store Stack Overflow-derived skills (from top tags)
            top_tag_names = [tag.tag_name for tag in so_stats.top_tags[:10]]
            skills = await self._store_user_skills(
                db, user.id, top_tag_names, 
                source="stackoverflow",
                verified_skills=so_stats.verified_skills
            )
            results["skills_added"].extend(skills)
        
        # Process Dev.to data
        if results["devto"]:
            devto_stats: DevtoStats = results["devto"]
            user_stats.devto_json = devto_stats.to_dict()
            
            # High-authority topics become verified skills
            results["verified_skills"].extend(devto_stats.authority_topics)
        
        # Process Hashnode data
        if results["hashnode"]:
            hashnode_stats: HashnodeStats = results["hashnode"]
            user_stats.hashnode_json = hashnode_stats.to_dict()
            
            # High-authority topics become verified skills
            results["verified_skills"].extend(hashnode_stats.authority_topics)
        
        # Process Portfolio website data
        if results["portfolio"]:
            portfolio_data: PortfolioData = results["portfolio"]
            if portfolio_data.success:
                user_stats.portfolio_json = portfolio_data.to_dict()
                
                # Store portfolio-derived skills
                if portfolio_data.skills:
                    skills = await self._store_user_skills(
                        db, user.id, portfolio_data.skills,
                        source="portfolio"
                    )
                    results["skills_added"].extend(skills)
        
        # Store verified skills
        verified_skills = list(set(results["verified_skills"]))  # Dedupe
        user_stats.verified_skills_json = {"skills": verified_skills}
        
        user_stats.updated_at = datetime.now(timezone.utc)
        await db.flush()
        
        return results
    
    async def _get_or_create_user_stats(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> UserStats:
        """Get existing user stats or create new one."""
        result = await db.execute(
            select(UserStats).where(UserStats.user_id == user_id)
        )
        user_stats = result.scalar_one_or_none()
        
        if not user_stats:
            user_stats = UserStats(user_id=user_id)
            db.add(user_stats)
            await db.flush()
        
        return user_stats
    
    async def _store_user_stats(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        github_stats: ExtendedGitHubStats,
    ) -> UserStats:
        """Store or update user stats in database."""
        # Check if stats exist
        result = await db.execute(
            select(UserStats).where(UserStats.user_id == user_id)
        )
        user_stats = result.scalar_one_or_none()
        
        if not user_stats:
            user_stats = UserStats(user_id=user_id)
            db.add(user_stats)
        
        # Update stats with extended data
        user_stats.merged_prs = github_stats.merged_prs
        user_stats.total_commits = github_stats.total_commits
        user_stats.total_repos = github_stats.repo_count
        user_stats.followers = github_stats.followers
        user_stats.languages_json = {"languages": github_stats.main_languages}
        user_stats.contribution_graph_json = {
            "graph": github_stats.contribution_graph,
            "monthly_commits": github_stats.monthly_commits,
            "total_contributions": len(github_stats.contribution_graph),
        }
        user_stats.repo_activity_json = {
            "commit_frequency": github_stats.commit_frequency,
        }
        user_stats.updated_at = datetime.now(timezone.utc)
        
        await db.flush()
        return user_stats
    
    async def _store_user_skills(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        languages: list[str],
        source: str = "github",
        verified_skills: list[str] | None = None,
    ) -> list[str]:
        """
        Store skills for user based on platform data.
        
        Args:
            db: Database session
            user_id: User ID
            languages: List of skill/language names
            source: Source platform (github, stackoverflow, etc.)
            verified_skills: List of verified skill names (e.g., gold badge skills)
            
        Returns:
            List of skill names that were added
        """
        skills_added = []
        verified_set = set(s.lower() for s in (verified_skills or []))
        
        for idx, lang in enumerate(languages):
            lang_lower = lang.lower()
            
            # Get or create skill
            result = await db.execute(
                select(Skill).where(Skill.name.ilike(lang_lower))
            )
            skill = result.scalar_one_or_none()
            
            if not skill:
                # Create new skill
                category = LANGUAGE_CATEGORIES.get(lang_lower, "Languages")
                skill = Skill(
                    name=lang_lower,
                    category=category,
                    description=f"Programming language: {lang}",
                )
                db.add(skill)
                await db.flush()
                await db.refresh(skill)
            
            # Check if mapping exists
            existing_mapping = await db.execute(
                select(SkillMapping).where(
                    SkillMapping.user_id == user_id,
                    SkillMapping.skill_id == skill.id,
                )
            )
            
            existing = existing_mapping.scalar_one_or_none()
            
            if not existing:
                # Calculate proficiency based on position and verification
                base_proficiency = min(5, 5 - idx)  # First item = 5, decreasing
                
                # Verified skills (gold badge, high-authority content) get max proficiency
                if lang_lower in verified_set:
                    base_proficiency = 5
                
                mapping = SkillMapping(
                    user_id=user_id,
                    skill_id=skill.id,
                    proficiency_level=base_proficiency,
                )
                db.add(mapping)
                skills_added.append(lang)
            elif lang_lower in verified_set and existing.proficiency_level < 5:
                # Upgrade existing skill to verified level
                existing.proficiency_level = 5
        
        await db.flush()
        return skills_added
    
    async def refresh_user_profile(
        self,
        db: AsyncSession,
        user: User,
    ) -> dict:
        """
        Force refresh of user's data from all platforms (clear caches first).
        """
        # Clear caches
        if user.github_username and user.github_username in github_enrichment._cache:
            del github_enrichment._cache[user.github_username]
        
        if user.stackoverflow_user_id and user.stackoverflow_user_id in stackoverflow_enrichment._cache:
            del stackoverflow_enrichment._cache[user.stackoverflow_user_id]
        
        if user.devto_username and user.devto_username in devto_enrichment._cache:
            del devto_enrichment._cache[user.devto_username]
        
        if user.hashnode_username and user.hashnode_username in hashnode_enrichment._cache:
            del hashnode_enrichment._cache[user.hashnode_username]
        
        return await self.enrich_user_profile(db, user)


# Singleton instance
profile_enrichment = ProfileEnrichmentService()
