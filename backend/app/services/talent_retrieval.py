"""
Talent Retrieval Module

Queries the database for users matching extracted skills.
"""
import uuid
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import User, UserRole
from app.models.skill import Skill, SkillMapping
from app.schemas.recruiter import ExtractedSkills


# Skill aliases for matching variations
SKILL_ALIASES = {
    "c++": ["cpp", "cplusplus", "c plus plus"],
    "cpp": ["c++", "cplusplus"],
    "c#": ["csharp", "c sharp"],
    "csharp": ["c#", "c sharp"],
    "objective-c": ["objc", "obj-c", "objectivec"],
    "javascript": ["js", "ecmascript"],
    "js": ["javascript"],
    "typescript": ["ts"],
    "ts": ["typescript"],
    "golang": ["go"],
    "go": ["golang"],
    "nodejs": ["node", "node.js"],
    "node": ["nodejs", "node.js"],
    "postgresql": ["postgres", "psql"],
    "postgres": ["postgresql", "psql"],
    "kubernetes": ["k8s"],
    "k8s": ["kubernetes"],
    "react native": ["reactnative", "react-native"],
    "react": ["reactjs", "react.js"],
    "vue": ["vuejs", "vue.js"],
    "angular": ["angularjs"],
    "python": ["py"],
    "ruby": ["rb"],
}


class TalentRetrievalService:
    """Service for retrieving talent based on skill matching."""
    
    def _expand_skill_aliases(self, skills: list[str]) -> list[str]:
        """Expand skills list to include known aliases."""
        expanded = set()
        for skill in skills:
            skill_lower = skill.lower()
            expanded.add(skill_lower)
            # Add aliases if they exist
            if skill_lower in SKILL_ALIASES:
                expanded.update(SKILL_ALIASES[skill_lower])
        return list(expanded)
    
    async def find_matching_users(
        self,
        db: AsyncSession,
        skills: ExtractedSkills,
        limit: int = 50,
    ) -> list[tuple[User, list[str], int]]:
        """
        Find users matching the extracted skills.
        
        Args:
            db: Database session
            skills: Extracted skills from query
            limit: Maximum number of results
            
        Returns:
            List of tuples (User, matched_skills, match_count)
        """
        all_skills = skills.primary_skills + skills.secondary_skills
        
        if not all_skills:
            return []
        
        # Expand skills to include aliases
        expanded_skills = self._expand_skill_aliases(all_skills)
        
        # Find skill IDs matching the skill names (including aliases)
        skill_query = select(Skill).where(
            func.lower(Skill.name).in_([s.lower() for s in expanded_skills])
        )
        skill_result = await db.execute(skill_query)
        matching_skills = skill_result.scalars().all()
        skill_ids = [s.id for s in matching_skills]
        skill_name_map = {s.id: s.name for s in matching_skills}
        
        if not skill_ids:
            return []
        
        # Find users with these skills (programmers only)
        # Group by user and count matching skills
        user_skill_query = (
            select(
                SkillMapping.user_id,
                func.array_agg(SkillMapping.skill_id).label("skill_ids"),
                func.count(SkillMapping.skill_id).label("skill_count"),
            )
            .where(SkillMapping.skill_id.in_(skill_ids))
            .group_by(SkillMapping.user_id)
            .order_by(func.count(SkillMapping.skill_id).desc())
            .limit(limit)
        )
        
        user_skill_result = await db.execute(user_skill_query)
        user_skill_rows = user_skill_result.all()
        
        if not user_skill_rows:
            return []
        
        # Get user details
        user_ids = [row.user_id for row in user_skill_rows]
        users_query = (
            select(User)
            .where(User.id.in_(user_ids))
            .where(User.role == UserRole.PROGRAMMER)
            .options(selectinload(User.skill_mappings).selectinload(SkillMapping.skill))
            .options(selectinload(User.stats))
        )
        
        users_result = await db.execute(users_query)
        users = {u.id: u for u in users_result.scalars().all()}
        
        # Build result with matched skills
        results = []
        for row in user_skill_rows:
            user = users.get(row.user_id)
            if user:
                matched_skill_names = [
                    skill_name_map[sid] 
                    for sid in row.skill_ids 
                    if sid in skill_name_map
                ]
                results.append((user, matched_skill_names, row.skill_count))
        
        return results
    
    async def get_user_skills(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> list[str]:
        """Get all skill names for a user."""
        query = (
            select(Skill.name)
            .join(SkillMapping, SkillMapping.skill_id == Skill.id)
            .where(SkillMapping.user_id == user_id)
        )
        result = await db.execute(query)
        return [row[0] for row in result.all()]


# Singleton instance
talent_retrieval = TalentRetrievalService()
