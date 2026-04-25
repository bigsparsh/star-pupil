"""
Stack Overflow Enrichment Service

Fetches user data from Stack Overflow API including:
- Top tags with scores and badge counts
- User reputation and badge summary
- Answer statistics

Uses the StackExchange API v2.3
"""
import asyncio
import httpx
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

from app.core.config import settings


@dataclass
class StackOverflowTag:
    """A user's top tag on Stack Overflow."""
    tag_name: str
    answer_count: int
    answer_score: int
    question_count: int
    question_score: int
    # Badge info: gold, silver, bronze counts for this tag
    has_gold_badge: bool = False
    has_silver_badge: bool = False
    has_bronze_badge: bool = False


@dataclass
class StackOverflowBadges:
    """User's badge counts."""
    gold: int = 0
    silver: int = 0
    bronze: int = 0


@dataclass
class StackOverflowStats:
    """Complete Stack Overflow statistics for a user."""
    user_id: str
    display_name: str
    reputation: int
    badge_counts: StackOverflowBadges
    top_tags: list[StackOverflowTag]
    # Verified skills based on gold/silver badges
    verified_skills: list[str]
    # Profile link
    profile_url: str
    # Account age and activity
    account_id: int
    creation_date: datetime | None
    last_access_date: datetime | None
    
    def to_dict(self) -> dict:
        """Convert to dictionary for JSON storage."""
        return {
            "user_id": self.user_id,
            "display_name": self.display_name,
            "reputation": self.reputation,
            "badge_counts": {
                "gold": self.badge_counts.gold,
                "silver": self.badge_counts.silver,
                "bronze": self.badge_counts.bronze,
            },
            "top_tags": [
                {
                    "tag_name": tag.tag_name,
                    "answer_count": tag.answer_count,
                    "answer_score": tag.answer_score,
                    "question_count": tag.question_count,
                    "question_score": tag.question_score,
                    "has_gold_badge": tag.has_gold_badge,
                    "has_silver_badge": tag.has_silver_badge,
                    "has_bronze_badge": tag.has_bronze_badge,
                }
                for tag in self.top_tags
            ],
            "verified_skills": self.verified_skills,
            "profile_url": self.profile_url,
            "account_id": self.account_id,
            "creation_date": self.creation_date.isoformat() if self.creation_date else None,
            "last_access_date": self.last_access_date.isoformat() if self.last_access_date else None,
        }


class StackOverflowEnrichmentService:
    """Service for fetching Stack Overflow user data."""
    
    def __init__(self):
        self._cache: dict[str, tuple[StackOverflowStats, datetime]] = {}
        self._cache_hours = 24
    
    async def get_user_stats(self, user_id: str) -> Optional[StackOverflowStats]:
        """
        Fetch Stack Overflow stats for a user.
        
        Args:
            user_id: Stack Overflow user ID (numeric)
            
        Returns:
            StackOverflowStats or None if user not found
        """
        # Check cache
        if user_id in self._cache:
            stats, cached_at = self._cache[user_id]
            if datetime.now() - cached_at < timedelta(hours=self._cache_hours):
                return stats
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Fetch all data in parallel for better performance
                user_info_task = self._fetch_user_info(client, user_id)
                top_tags_task = self._fetch_top_tags(client, user_id)
                tag_badges_task = self._fetch_tag_badges(client, user_id)
                
                user_info, top_tags, tag_badges = await asyncio.gather(
                    user_info_task,
                    top_tags_task, 
                    tag_badges_task,
                    return_exceptions=True
                )
                
                # Handle exceptions from parallel tasks
                if isinstance(user_info, Exception) or not user_info:
                    return None
                if isinstance(top_tags, Exception):
                    top_tags = []
                if isinstance(tag_badges, Exception):
                    tag_badges = {}
                
                # Merge badge info into tags
                self._merge_badge_info(top_tags, tag_badges)
                
                # Identify verified skills (gold badge = top 1% expert)
                verified_skills = [
                    tag.tag_name for tag in top_tags 
                    if tag.has_gold_badge
                ]
                
                stats = StackOverflowStats(
                    user_id=user_id,
                    display_name=user_info.get("display_name", ""),
                    reputation=user_info.get("reputation", 0),
                    badge_counts=StackOverflowBadges(
                        gold=user_info.get("badge_counts", {}).get("gold", 0),
                        silver=user_info.get("badge_counts", {}).get("silver", 0),
                        bronze=user_info.get("badge_counts", {}).get("bronze", 0),
                    ),
                    top_tags=top_tags,
                    verified_skills=verified_skills,
                    profile_url=user_info.get("link", f"https://stackoverflow.com/users/{user_id}"),
                    account_id=user_info.get("account_id", 0),
                    creation_date=datetime.fromtimestamp(user_info["creation_date"]) if "creation_date" in user_info else None,
                    last_access_date=datetime.fromtimestamp(user_info["last_access_date"]) if "last_access_date" in user_info else None,
                )
                
                # Cache result
                self._cache[user_id] = (stats, datetime.now())
                return stats
                
        except Exception as e:
            print(f"Error fetching Stack Overflow data for user {user_id}: {e}")
            return None
    
    async def _fetch_user_info(self, client: httpx.AsyncClient, user_id: str) -> Optional[dict]:
        """Fetch basic user info from Stack Overflow."""
        params = {
            "site": "stackoverflow",
            "filter": "!BTeL)VZvLZ6t5Nxgje",  # Include badge_counts
        }
        if settings.STACKOVERFLOW_API_KEY:
            params["key"] = settings.STACKOVERFLOW_API_KEY
        
        response = await client.get(
            f"{settings.STACKOVERFLOW_API_URL}/users/{user_id}",
            params=params,
        )
        
        if response.status_code != 200:
            return None
        
        data = response.json()
        items = data.get("items", [])
        return items[0] if items else None
    
    async def _fetch_top_tags(self, client: httpx.AsyncClient, user_id: str) -> list[StackOverflowTag]:
        """Fetch user's top tags by answer score."""
        params = {
            "site": "stackoverflow",
            "pagesize": 20,
        }
        if settings.STACKOVERFLOW_API_KEY:
            params["key"] = settings.STACKOVERFLOW_API_KEY
        
        response = await client.get(
            f"{settings.STACKOVERFLOW_API_URL}/users/{user_id}/top-tags",
            params=params,
        )
        
        if response.status_code != 200:
            return []
        
        data = response.json()
        tags = []
        for item in data.get("items", []):
            tags.append(StackOverflowTag(
                tag_name=item.get("tag_name", ""),
                answer_count=item.get("answer_count", 0),
                answer_score=item.get("answer_score", 0),
                question_count=item.get("question_count", 0),
                question_score=item.get("question_score", 0),
            ))
        
        return tags
    
    async def _fetch_tag_badges(self, client: httpx.AsyncClient, user_id: str) -> dict[str, dict]:
        """Fetch user's tag-based badges (gold, silver, bronze)."""
        params = {
            "site": "stackoverflow",
            "pagesize": 100,
            "order": "desc",
            "sort": "rank",
        }
        if settings.STACKOVERFLOW_API_KEY:
            params["key"] = settings.STACKOVERFLOW_API_KEY
        
        response = await client.get(
            f"{settings.STACKOVERFLOW_API_URL}/users/{user_id}/badges",
            params=params,
        )
        
        if response.status_code != 200:
            return {}
        
        data = response.json()
        tag_badges: dict[str, dict] = {}
        
        for badge in data.get("items", []):
            # Tag-based badges have badge_type = "tag_based"
            if badge.get("badge_type") == "tag_based":
                tag_name = badge.get("name", "").lower()
                rank = badge.get("rank", "bronze")
                
                if tag_name not in tag_badges:
                    tag_badges[tag_name] = {"gold": False, "silver": False, "bronze": False}
                
                tag_badges[tag_name][rank] = True
        
        return tag_badges
    
    def _merge_badge_info(self, tags: list[StackOverflowTag], tag_badges: dict[str, dict]) -> None:
        """Merge badge information into tag objects."""
        for tag in tags:
            tag_name_lower = tag.tag_name.lower()
            if tag_name_lower in tag_badges:
                badge_info = tag_badges[tag_name_lower]
                tag.has_gold_badge = badge_info.get("gold", False)
                tag.has_silver_badge = badge_info.get("silver", False)
                tag.has_bronze_badge = badge_info.get("bronze", False)


# Singleton instance
stackoverflow_enrichment = StackOverflowEnrichmentService()
