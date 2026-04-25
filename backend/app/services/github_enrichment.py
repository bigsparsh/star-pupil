"""
GitHub Enrichment Module

Fetches GitHub statistics using GraphQL API with httpx.
Implements caching and concurrent requests for performance.
"""
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional
import httpx

from app.core.config import settings
from app.schemas.recruiter import GitHubStats


# Extended query to include contribution calendar and complexity metrics
GITHUB_USER_QUERY = """
query($login: String!) {
  user(login: $login) {
    login
    name
    bio
    followers {
      totalCount
    }
    repositories(first: 100, ownerAffiliations: OWNER, orderBy: {field: STARGAZERS, direction: DESC}) {
      totalCount
      nodes {
        name
        nameWithOwner
        primaryLanguage {
          name
        }
        stargazerCount
        forkCount
        updatedAt
        diskUsage
        description
        url
        isPrivate
        isFork
        languages(first: 10) {
          nodes {
            name
          }
        }
        defaultBranchRef {
          target {
            ... on Commit {
              history(first: 0) {
                totalCount
              }
            }
          }
        }
      }
    }
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      totalRepositoriesWithContributedCommits
      totalRepositoriesWithContributedPullRequests
      pullRequestContributionsByRepository(maxRepositories: 100) {
        repository {
          nameWithOwner
          name
          owner {
            login
          }
          stargazerCount
          primaryLanguage {
            name
          }
          description
          url
        }
        contributions {
          totalCount
        }
      }
      commitContributionsByRepository(maxRepositories: 100) {
        repository {
          nameWithOwner
          name
          owner {
            login
          }
          stargazerCount
          primaryLanguage {
            name
          }
          description
          url
        }
        contributions {
          totalCount
        }
      }
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            contributionCount
            date
          }
        }
      }
    }
    pullRequests(first: 100, states: MERGED) {
      totalCount
    }
    repositoriesContributedTo(first: 100, contributionTypes: [COMMIT, PULL_REQUEST]) {
      totalCount
      nodes {
        nameWithOwner
        name
        owner {
          login
        }
        stargazerCount
        primaryLanguage {
          name
        }
        description
        url
      }
    }
  }
}
"""


# Extended stats to include contribution graph and complexity metrics
class ExtendedGitHubStats(GitHubStats):
    """Extended GitHub stats with contribution graph data and complexity analysis."""
    followers: int = 0
    contribution_graph: list[int] = []
    monthly_commits: int = 0
    popular_repo_contributions: list[dict] = []  # Contributions to repos with 100+ stars
    # Complexity metrics
    complexity_score: int = 0
    language_diversity: int = 0  # Number of unique languages across repos
    total_disk_usage_kb: int = 0  # Total size of all repos in KB
    total_stars_received: int = 0  # Stars across all owned repos
    total_forks_received: int = 0  # Forks across all owned repos
    pr_review_count: int = 0  # Number of PR reviews given
    external_repos_contributed: int = 0  # Repos not owned but contributed to
    avg_commits_per_repo: float = 0.0  # Average commits per repository


class GitHubEnrichmentService:
    """Service for fetching and enriching user profiles with GitHub data."""
    
    def __init__(self):
        self._cache: dict[str, tuple[ExtendedGitHubStats, datetime]] = {}
        self._cache_duration = timedelta(hours=settings.GITHUB_STATS_CACHE_HOURS)
    
    def _get_headers(self) -> dict:
        """Get headers for GitHub API requests."""
        if not settings.GITHUB_TOKEN:
            raise ValueError("GITHUB_TOKEN not configured")
        return {
            "Authorization": f"Bearer {settings.GITHUB_TOKEN}",
            "Content-Type": "application/json",
        }
    
    def _is_cache_valid(self, username: str) -> bool:
        """Check if cached data is still valid."""
        if username not in self._cache:
            return False
        _, cached_at = self._cache[username]
        return datetime.now(timezone.utc) - cached_at < self._cache_duration
    
    async def get_user_stats(self, github_username: str) -> Optional[ExtendedGitHubStats]:
        """
        Fetch GitHub statistics for a user.
        
        Args:
            github_username: GitHub username
            
        Returns:
            ExtendedGitHubStats or None if user not found
        """
        # Check cache first
        if self._is_cache_valid(github_username):
            return self._cache[github_username][0]
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    settings.GITHUB_GRAPHQL_URL,
                    headers=self._get_headers(),
                    json={
                        "query": GITHUB_USER_QUERY,
                        "variables": {"login": github_username},
                    },
                )
                response.raise_for_status()
                data = response.json()
                
                if "errors" in data:
                    return None
                
                user_data = data.get("data", {}).get("user")
                if not user_data:
                    return None
                
                stats = self._parse_user_data(user_data)
                
                # Cache the result
                self._cache[github_username] = (stats, datetime.now(timezone.utc))
                
                return stats
                
        except httpx.HTTPError:
            return None
    
    def _parse_user_data(self, user_data: dict) -> ExtendedGitHubStats:
        """Parse GitHub GraphQL response into ExtendedGitHubStats."""
        repos = user_data.get("repositories", {})
        contributions = user_data.get("contributionsCollection", {})
        
        # Extract main languages and calculate diversity
        languages: dict[str, int] = {}
        all_languages: set[str] = set()
        total_stars = 0
        total_forks = 0
        total_disk_usage = 0
        total_repo_commits = 0
        repo_nodes = repos.get("nodes", [])
        
        for repo in repo_nodes:
            # Primary language
            lang = repo.get("primaryLanguage")
            if lang:
                lang_name = lang.get("name", "Unknown")
                languages[lang_name] = languages.get(lang_name, 0) + 1
                all_languages.add(lang_name)
            
            # All languages in repo
            repo_languages = repo.get("languages", {}).get("nodes", [])
            for rlang in repo_languages:
                if rlang.get("name"):
                    all_languages.add(rlang["name"])
            
            # Stars and forks
            total_stars += repo.get("stargazerCount", 0)
            total_forks += repo.get("forkCount", 0)
            
            # Disk usage (in KB)
            total_disk_usage += repo.get("diskUsage", 0)
            
            # Commits per repo
            branch_ref = repo.get("defaultBranchRef")
            if branch_ref and branch_ref.get("target"):
                history = branch_ref["target"].get("history", {})
                total_repo_commits += history.get("totalCount", 0)
        
        # Sort by frequency and get top 5
        main_languages = sorted(languages.keys(), key=lambda x: languages[x], reverse=True)[:5]
        
        # Language diversity (unique languages)
        language_diversity = len(all_languages)
        
        # Average commits per repo
        avg_commits_per_repo = 0.0
        if len(repo_nodes) > 0:
            avg_commits_per_repo = total_repo_commits / len(repo_nodes)
        
        # Calculate commit frequency
        calendar = contributions.get("contributionCalendar", {})
        total_contributions = calendar.get("totalContributions", 0)
        
        if total_contributions > 1000:
            commit_frequency = "very_active"
        elif total_contributions > 500:
            commit_frequency = "active"
        elif total_contributions > 100:
            commit_frequency = "moderate"
        else:
            commit_frequency = "low"
        
        # Extract contribution graph (daily contributions for the past year)
        contribution_graph = []
        monthly_commits = 0
        weeks = calendar.get("weeks", [])
        
        for week in weeks:
            for day in week.get("contributionDays", []):
                contribution_graph.append(day.get("contributionCount", 0))
        
        # Calculate monthly commits (last 30 days)
        if len(contribution_graph) >= 30:
            monthly_commits = sum(contribution_graph[-30:])
        else:
            monthly_commits = sum(contribution_graph)
        
        # Get followers count
        followers = user_data.get("followers", {}).get("totalCount", 0)
        
        # PR review count
        pr_review_count = contributions.get("totalPullRequestReviewContributions", 0)
        
        # External repos contributed to
        external_repos = user_data.get("repositoriesContributedTo", {}).get("totalCount", 0)
        
        # Get user's login for filtering own repos
        user_login = user_data.get("login", "").lower()
        
        # Extract contributions to popular repos (100+ stars)
        # Use a dict to track repos by nameWithOwner to avoid duplicates
        popular_repos_map: dict[str, dict] = {}
        
        # 1. Add user's own popular public repositories (100+ stars, non-forks)
        for repo in repo_nodes:
            stars = repo.get("stargazerCount", 0)
            is_private = repo.get("isPrivate", False)
            is_fork = repo.get("isFork", False)
            
            if stars >= 100 and not is_private and not is_fork:
                repo_key = repo.get("nameWithOwner", "")
                if repo_key and repo_key not in popular_repos_map:
                    popular_repos_map[repo_key] = {
                        "repo_name": repo_key,
                        "name": repo.get("name", ""),
                        "owner": user_login,
                        "stars": stars,
                        "language": repo.get("primaryLanguage", {}).get("name") if repo.get("primaryLanguage") else None,
                        "description": repo.get("description", ""),
                        "url": repo.get("url", ""),
                        "contribution_count": 0,  # Owner - many contributions
                        "is_owner": True,
                    }
        
        # 2. Add PR contributions to external popular repos
        pr_contributions = contributions.get("pullRequestContributionsByRepository", [])
        for pr_contrib in pr_contributions:
            repo = pr_contrib.get("repository", {})
            stars = repo.get("stargazerCount", 0)
            repo_key = repo.get("nameWithOwner", "")
            owner = repo.get("owner", {}).get("login", "").lower()
            
            # Skip own repos (already added above) and low-star repos
            if stars >= 100 and owner != user_login:
                contrib_count = pr_contrib.get("contributions", {}).get("totalCount", 0)
                if repo_key in popular_repos_map:
                    # Add to existing contribution count
                    popular_repos_map[repo_key]["contribution_count"] += contrib_count
                else:
                    popular_repos_map[repo_key] = {
                        "repo_name": repo_key,
                        "name": repo.get("name", ""),
                        "owner": owner,
                        "stars": stars,
                        "language": repo.get("primaryLanguage", {}).get("name") if repo.get("primaryLanguage") else None,
                        "description": repo.get("description", ""),
                        "url": repo.get("url", ""),
                        "contribution_count": contrib_count,
                        "is_owner": False,
                    }
        
        # 3. Add commit contributions to external popular repos
        commit_contributions = contributions.get("commitContributionsByRepository", [])
        for commit_contrib in commit_contributions:
            repo = commit_contrib.get("repository", {})
            stars = repo.get("stargazerCount", 0)
            repo_key = repo.get("nameWithOwner", "")
            owner = repo.get("owner", {}).get("login", "").lower()
            
            # Skip own repos and low-star repos
            if stars >= 100 and owner != user_login:
                contrib_count = commit_contrib.get("contributions", {}).get("totalCount", 0)
                if repo_key in popular_repos_map:
                    # Add to existing contribution count
                    popular_repos_map[repo_key]["contribution_count"] += contrib_count
                else:
                    popular_repos_map[repo_key] = {
                        "repo_name": repo_key,
                        "name": repo.get("name", ""),
                        "owner": owner,
                        "stars": stars,
                        "language": repo.get("primaryLanguage", {}).get("name") if repo.get("primaryLanguage") else None,
                        "description": repo.get("description", ""),
                        "url": repo.get("url", ""),
                        "contribution_count": contrib_count,
                        "is_owner": False,
                    }
        
        # 4. Add any other repos contributed to that are popular (100+ stars)
        repos_contributed_to = user_data.get("repositoriesContributedTo", {}).get("nodes", [])
        for repo in repos_contributed_to:
            stars = repo.get("stargazerCount", 0)
            repo_key = repo.get("nameWithOwner", "")
            owner = repo.get("owner", {}).get("login", "").lower()
            
            if stars >= 100 and owner != user_login and repo_key and repo_key not in popular_repos_map:
                popular_repos_map[repo_key] = {
                    "repo_name": repo_key,
                    "name": repo.get("name", ""),
                    "owner": owner,
                    "stars": stars,
                    "language": repo.get("primaryLanguage", {}).get("name") if repo.get("primaryLanguage") else None,
                    "description": repo.get("description", ""),
                    "url": repo.get("url", ""),
                    "contribution_count": 1,  # At least 1 contribution
                    "is_owner": False,
                }
        
        # Convert map to list and sort by stars descending
        popular_repo_contributions = list(popular_repos_map.values())
        popular_repo_contributions.sort(key=lambda x: x["stars"], reverse=True)
        
        # Calculate complexity score (0-100)
        complexity_score = self._calculate_complexity_score(
            language_diversity=language_diversity,
            total_disk_usage_kb=total_disk_usage,
            total_stars=total_stars,
            total_forks=total_forks,
            pr_review_count=pr_review_count,
            external_repos=external_repos,
            avg_commits_per_repo=avg_commits_per_repo,
            merged_prs=user_data.get("pullRequests", {}).get("totalCount", 0),
        )
        
        return ExtendedGitHubStats(
            merged_prs=user_data.get("pullRequests", {}).get("totalCount", 0),
            total_commits=contributions.get("totalCommitContributions", 0),
            repo_count=repos.get("totalCount", 0),
            main_languages=main_languages,
            commit_frequency=commit_frequency,
            followers=followers,
            contribution_graph=contribution_graph,
            monthly_commits=monthly_commits,
            popular_repo_contributions=popular_repo_contributions,
            # Complexity metrics
            complexity_score=complexity_score,
            language_diversity=language_diversity,
            total_disk_usage_kb=total_disk_usage,
            total_stars_received=total_stars,
            total_forks_received=total_forks,
            pr_review_count=pr_review_count,
            external_repos_contributed=external_repos,
            avg_commits_per_repo=round(avg_commits_per_repo, 1),
        )
    
    def _calculate_complexity_score(
        self,
        language_diversity: int,
        total_disk_usage_kb: int,
        total_stars: int,
        total_forks: int,
        pr_review_count: int,
        external_repos: int,
        avg_commits_per_repo: float,
        merged_prs: int,
    ) -> int:
        """
        Calculate a complexity score (0-100) based on repository analysis.
        
        Factors:
        - Language diversity (20 pts): More languages = more versatile
        - Codebase size (20 pts): Larger codebases = more complex work
        - Community validation (20 pts): Stars + forks = quality code
        - Code review culture (20 pts): PR reviews = collaborative practices
        - Collaboration breadth (20 pts): External repos + merged PRs
        """
        score = 0
        
        # 1. Language Diversity Score (0-20 points)
        # 1 lang = 4pts, 3 = 10pts, 5 = 15pts, 8+ = 20pts
        if language_diversity >= 8:
            score += 20
        elif language_diversity >= 5:
            score += 15
        elif language_diversity >= 3:
            score += 10
        elif language_diversity >= 1:
            score += 4
        
        # 2. Codebase Size Score (0-20 points)
        # Based on total disk usage in MB
        disk_usage_mb = total_disk_usage_kb / 1024
        if disk_usage_mb >= 500:  # 500MB+
            score += 20
        elif disk_usage_mb >= 100:  # 100MB+
            score += 15
        elif disk_usage_mb >= 20:  # 20MB+
            score += 10
        elif disk_usage_mb >= 5:  # 5MB+
            score += 5
        
        # 3. Community Validation Score (0-20 points)
        # Based on total stars and forks received
        community_score = total_stars + (total_forks * 2)
        if community_score >= 500:
            score += 20
        elif community_score >= 100:
            score += 15
        elif community_score >= 25:
            score += 10
        elif community_score >= 5:
            score += 5
        
        # 4. Code Review Culture Score (0-20 points)
        # Based on PR reviews given (shows collaborative practices)
        if pr_review_count >= 50:
            score += 20
        elif pr_review_count >= 20:
            score += 15
        elif pr_review_count >= 5:
            score += 10
        elif pr_review_count >= 1:
            score += 5
        
        # 5. Collaboration Breadth Score (0-20 points)
        # Based on external repos contributed to + merged PRs
        collab_score = external_repos + (merged_prs // 2)
        if collab_score >= 30:
            score += 20
        elif collab_score >= 15:
            score += 15
        elif collab_score >= 5:
            score += 10
        elif collab_score >= 1:
            score += 5
        
        return min(score, 100)
    
    async def get_stats_batch(self, usernames: list[str]) -> dict[str, GitHubStats]:
        """
        Fetch GitHub stats for multiple users concurrently using a shared client.
        
        Args:
            usernames: List of GitHub usernames
            
        Returns:
            Dict mapping username to GitHubStats
        """
        stats_map = {}
        
        # Filter out cached results first
        uncached_usernames = []
        for username in usernames:
            if self._is_cache_valid(username):
                stats_map[username] = self._cache[username][0]
            else:
                uncached_usernames.append(username)
        
        if not uncached_usernames:
            return stats_map
        
        # Use a single shared client for all requests
        async with httpx.AsyncClient(timeout=30.0) as client:
            async def fetch_one(username: str) -> tuple[str, Optional[ExtendedGitHubStats]]:
                try:
                    response = await client.post(
                        settings.GITHUB_GRAPHQL_URL,
                        headers=self._get_headers(),
                        json={
                            "query": GITHUB_USER_QUERY,
                            "variables": {"login": username},
                        },
                    )
                    response.raise_for_status()
                    data = response.json()
                    
                    if "errors" in data:
                        return (username, None)
                    
                    user_data = data.get("data", {}).get("user")
                    if not user_data:
                        return (username, None)
                    
                    stats = self._parse_user_data(user_data)
                    
                    # Cache the result
                    self._cache[username] = (stats, datetime.now(timezone.utc))
                    
                    return (username, stats)
                except Exception:
                    return (username, None)
            
            # Execute all requests in parallel with shared connection pool
            results = await asyncio.gather(
                *[fetch_one(u) for u in uncached_usernames],
                return_exceptions=True
            )
            
            for result in results:
                if isinstance(result, tuple):
                    username, stats = result
                    if stats is not None:
                        stats_map[username] = stats
        
        return stats_map
    
    def clear_cache(self):
        """Clear the stats cache."""
        self._cache.clear()


# Singleton instance
github_enrichment = GitHubEnrichmentService()
