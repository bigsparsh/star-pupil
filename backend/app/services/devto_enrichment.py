"""
Dev.to and Hashnode Enrichment Service

Fetches user articles and engagement data from:
- Dev.to REST API
- Hashnode GraphQL API

Target Data:
- Article titles and tags
- Public reactions count (indicates authority/expertise)
- Comments count
"""
import httpx
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

from app.core.config import settings


@dataclass
class DevArticle:
    """A user's article on Dev.to or Hashnode."""
    id: str
    title: str
    url: str
    tags: list[str]
    reactions_count: int
    comments_count: int
    reading_time_minutes: int
    published_at: datetime | None
    # Authority score based on engagement
    is_high_authority: bool = False  # True if reactions > threshold
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "url": self.url,
            "tags": self.tags,
            "reactions_count": self.reactions_count,
            "comments_count": self.comments_count,
            "reading_time_minutes": self.reading_time_minutes,
            "published_at": self.published_at.isoformat() if self.published_at else None,
            "is_high_authority": self.is_high_authority,
        }


@dataclass 
class DevtoStats:
    """Dev.to user statistics."""
    username: str
    name: str | None
    profile_url: str
    articles: list[DevArticle]
    total_reactions: int
    total_articles: int
    # Tags the user writes about most (authority areas)
    top_tags: list[str]
    # High-authority topics (based on high-engagement articles)
    authority_topics: list[str]
    
    def to_dict(self) -> dict:
        return {
            "username": self.username,
            "name": self.name,
            "profile_url": self.profile_url,
            "articles": [a.to_dict() for a in self.articles],
            "total_reactions": self.total_reactions,
            "total_articles": self.total_articles,
            "top_tags": self.top_tags,
            "authority_topics": self.authority_topics,
        }


@dataclass
class HashnodeStats:
    """Hashnode user statistics."""
    username: str
    name: str | None
    profile_url: str
    articles: list[DevArticle]
    total_reactions: int
    total_articles: int
    top_tags: list[str]
    authority_topics: list[str]
    
    def to_dict(self) -> dict:
        return {
            "username": self.username,
            "name": self.name,
            "profile_url": self.profile_url,
            "articles": [a.to_dict() for a in self.articles],
            "total_reactions": self.total_reactions,
            "total_articles": self.total_articles,
            "top_tags": self.top_tags,
            "authority_topics": self.authority_topics,
        }


class DevtoEnrichmentService:
    """Service for fetching Dev.to user data."""
    
    # Threshold for "high authority" article (reactions count)
    HIGH_AUTHORITY_THRESHOLD = 50
    
    def __init__(self):
        self._cache: dict[str, tuple[DevtoStats, datetime]] = {}
        self._cache_hours = 24
    
    async def get_user_stats(self, username: str) -> Optional[DevtoStats]:
        """
        Fetch Dev.to stats for a user.
        
        Args:
            username: Dev.to username
            
        Returns:
            DevtoStats or None if user not found
        """
        # Check cache
        if username in self._cache:
            stats, cached_at = self._cache[username]
            if datetime.now() - cached_at < timedelta(hours=self._cache_hours):
                return stats
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                articles = await self._fetch_articles(client, username)
                
                if not articles:
                    return None
                
                # Calculate statistics
                total_reactions = sum(a.reactions_count for a in articles)
                
                # Count tags across all articles
                tag_counts: dict[str, int] = {}
                for article in articles:
                    for tag in article.tags:
                        tag_counts[tag] = tag_counts.get(tag, 0) + 1
                
                # Top tags by frequency
                top_tags = sorted(tag_counts.keys(), key=lambda t: tag_counts[t], reverse=True)[:10]
                
                # Authority topics: tags from high-engagement articles
                authority_topics = set()
                for article in articles:
                    if article.is_high_authority:
                        authority_topics.update(article.tags)
                
                stats = DevtoStats(
                    username=username,
                    name=None,  # Dev.to doesn't return name in articles endpoint
                    profile_url=f"https://dev.to/{username}",
                    articles=articles[:20],  # Keep top 20 articles
                    total_reactions=total_reactions,
                    total_articles=len(articles),
                    top_tags=top_tags,
                    authority_topics=list(authority_topics),
                )
                
                # Cache result
                self._cache[username] = (stats, datetime.now())
                return stats
                
        except Exception as e:
            print(f"Error fetching Dev.to data for user {username}: {e}")
            return None
    
    async def _fetch_articles(self, client: httpx.AsyncClient, username: str) -> list[DevArticle]:
        """Fetch user's articles from Dev.to."""
        articles = []
        page = 1
        per_page = 30
        
        while True:
            response = await client.get(
                f"{settings.DEVTO_API_URL}/articles",
                params={
                    "username": username,
                    "page": page,
                    "per_page": per_page,
                },
            )
            
            if response.status_code != 200:
                break
            
            data = response.json()
            if not data:
                break
            
            for item in data:
                published_at = None
                if item.get("published_at"):
                    try:
                        published_at = datetime.fromisoformat(item["published_at"].replace("Z", "+00:00"))
                    except:
                        pass
                
                reactions = item.get("public_reactions_count", 0) or item.get("positive_reactions_count", 0)
                
                article = DevArticle(
                    id=str(item.get("id", "")),
                    title=item.get("title", ""),
                    url=item.get("url", ""),
                    tags=item.get("tag_list", []),
                    reactions_count=reactions,
                    comments_count=item.get("comments_count", 0),
                    reading_time_minutes=item.get("reading_time_minutes", 0),
                    published_at=published_at,
                    is_high_authority=reactions >= self.HIGH_AUTHORITY_THRESHOLD,
                )
                articles.append(article)
            
            # Stop if we've fetched enough or no more pages
            if len(data) < per_page or len(articles) >= 100:
                break
            
            page += 1
        
        # Sort by reactions (most popular first)
        articles.sort(key=lambda a: a.reactions_count, reverse=True)
        return articles


class HashnodeEnrichmentService:
    """Service for fetching Hashnode user data via GraphQL."""
    
    HIGH_AUTHORITY_THRESHOLD = 50
    
    def __init__(self):
        self._cache: dict[str, tuple[HashnodeStats, datetime]] = {}
        self._cache_hours = 24
    
    async def get_user_stats(self, username: str) -> Optional[HashnodeStats]:
        """
        Fetch Hashnode stats for a user.
        
        Args:
            username: Hashnode username
            
        Returns:
            HashnodeStats or None if user not found
        """
        # Check cache
        if username in self._cache:
            stats, cached_at = self._cache[username]
            if datetime.now() - cached_at < timedelta(hours=self._cache_hours):
                return stats
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                user_data = await self._fetch_user_publications(client, username)
                
                if not user_data:
                    return None
                
                articles = user_data.get("articles", [])
                total_reactions = sum(a.reactions_count for a in articles)
                
                # Count tags
                tag_counts: dict[str, int] = {}
                for article in articles:
                    for tag in article.tags:
                        tag_counts[tag] = tag_counts.get(tag, 0) + 1
                
                top_tags = sorted(tag_counts.keys(), key=lambda t: tag_counts[t], reverse=True)[:10]
                
                # Authority topics
                authority_topics = set()
                for article in articles:
                    if article.is_high_authority:
                        authority_topics.update(article.tags)
                
                stats = HashnodeStats(
                    username=username,
                    name=user_data.get("name"),
                    profile_url=f"https://hashnode.com/@{username}",
                    articles=articles[:20],
                    total_reactions=total_reactions,
                    total_articles=len(articles),
                    top_tags=top_tags,
                    authority_topics=list(authority_topics),
                )
                
                self._cache[username] = (stats, datetime.now())
                return stats
                
        except Exception as e:
            print(f"Error fetching Hashnode data for user {username}: {e}")
            return None
    
    async def _fetch_user_publications(self, client: httpx.AsyncClient, username: str) -> Optional[dict]:
        """Fetch user's publications from Hashnode GraphQL API."""
        query = """
        query GetUserArticles($username: String!) {
            user(username: $username) {
                name
                username
                publications(first: 1) {
                    edges {
                        node {
                            posts(first: 50) {
                                edges {
                                    node {
                                        id
                                        title
                                        url
                                        tags {
                                            name
                                        }
                                        reactionCount
                                        responseCount
                                        readTimeInMinutes
                                        publishedAt
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        """
        
        response = await client.post(
            settings.HASHNODE_API_URL,
            json={
                "query": query,
                "variables": {"username": username},
            },
            headers={"Content-Type": "application/json"},
        )
        
        if response.status_code != 200:
            return None
        
        data = response.json()
        user = data.get("data", {}).get("user")
        
        if not user:
            return None
        
        articles = []
        publications = user.get("publications", {}).get("edges", [])
        
        for pub in publications:
            posts = pub.get("node", {}).get("posts", {}).get("edges", [])
            for post_edge in posts:
                post = post_edge.get("node", {})
                
                published_at = None
                if post.get("publishedAt"):
                    try:
                        published_at = datetime.fromisoformat(post["publishedAt"].replace("Z", "+00:00"))
                    except:
                        pass
                
                reactions = post.get("reactionCount", 0)
                tags = [t.get("name", "") for t in post.get("tags", []) if t.get("name")]
                
                article = DevArticle(
                    id=str(post.get("id", "")),
                    title=post.get("title", ""),
                    url=post.get("url", ""),
                    tags=tags,
                    reactions_count=reactions,
                    comments_count=post.get("responseCount", 0),
                    reading_time_minutes=post.get("readTimeInMinutes", 0),
                    published_at=published_at,
                    is_high_authority=reactions >= self.HIGH_AUTHORITY_THRESHOLD,
                )
                articles.append(article)
        
        articles.sort(key=lambda a: a.reactions_count, reverse=True)
        
        return {
            "name": user.get("name"),
            "articles": articles,
        }


# Singleton instances
devto_enrichment = DevtoEnrichmentService()
hashnode_enrichment = HashnodeEnrichmentService()
