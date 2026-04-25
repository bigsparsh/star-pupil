"""
Ranking Engine Module

Computes composite scores for candidates based on multiple factors.
Weight formula:
- 35% GitHub stats
- 25% Skill match
- 15% Complexity score  
- 10% Recency/commit heatmap
- 15% OSS Contribution (100+ star repos)
"""
from typing import Optional
from app.models.user import User
from app.models.stats import UserStats
from app.schemas.recruiter import GitHubStats, CandidateResult, ExtractedSkills


class RankingEngineService:
    """Service for ranking and scoring candidates."""
    
    # Weight configuration
    WEIGHT_GITHUB = 0.35
    WEIGHT_SKILL_MATCH = 0.25
    WEIGHT_COMPLEXITY = 0.15
    WEIGHT_RECENCY = 0.10
    WEIGHT_OSS_CONTRIBUTION = 0.15
    
    def calculate_score(
        self,
        user: User,
        matched_skills: list[str],
        all_skills: ExtractedSkills,
        github_stats: Optional[GitHubStats],
        user_stats: Optional[UserStats],
    ) -> float:
        """
        Calculate composite ranking score for a candidate.
        
        Args:
            user: User model instance
            matched_skills: Skills that matched the query
            all_skills: All extracted skills from query
            github_stats: GitHub statistics (from API)
            user_stats: Stored user statistics
            
        Returns:
            Composite score between 0 and 100
        """
        github_score = self._calculate_github_score(github_stats)
        skill_score = self._calculate_skill_score(matched_skills, all_skills)
        complexity_score = self._calculate_complexity_score(user_stats, github_stats)
        recency_score = self._calculate_recency_score(github_stats, user_stats)
        oss_contribution_score = self._calculate_oss_contribution_score(user_stats, github_stats)
        
        composite = (
            github_score * self.WEIGHT_GITHUB +
            skill_score * self.WEIGHT_SKILL_MATCH +
            complexity_score * self.WEIGHT_COMPLEXITY +
            recency_score * self.WEIGHT_RECENCY +
            oss_contribution_score * self.WEIGHT_OSS_CONTRIBUTION
        )
        
        # Cap score at 100
        return round(min(composite, 100.0), 2)
    
    def calculate_score_with_breakdown(
        self,
        user: User,
        matched_skills: list[str],
        all_skills: ExtractedSkills,
        github_stats: Optional[GitHubStats],
        user_stats: Optional[UserStats],
    ) -> tuple[float, dict]:
        """
        Calculate composite ranking score with detailed breakdown.
        
        Returns:
            Tuple of (composite_score, breakdown_dict)
        """
        github_score = self._calculate_github_score(github_stats)
        skill_score = self._calculate_skill_score(matched_skills, all_skills)
        complexity_score = self._calculate_complexity_score(user_stats, github_stats)
        recency_score = self._calculate_recency_score(github_stats, user_stats)
        oss_contribution_score = self._calculate_oss_contribution_score(user_stats, github_stats)
        
        composite = (
            github_score * self.WEIGHT_GITHUB +
            skill_score * self.WEIGHT_SKILL_MATCH +
            complexity_score * self.WEIGHT_COMPLEXITY +
            recency_score * self.WEIGHT_RECENCY +
            oss_contribution_score * self.WEIGHT_OSS_CONTRIBUTION
        )
        
        breakdown = {
            "github_score": round(github_score, 2),
            "skill_match_score": round(skill_score, 2),
            "complexity_score": round(complexity_score, 2),
            "recency_score": round(recency_score, 2),
            "oss_contribution_score": round(oss_contribution_score, 2),
            "github_weight": self.WEIGHT_GITHUB,
            "skill_match_weight": self.WEIGHT_SKILL_MATCH,
            "complexity_weight": self.WEIGHT_COMPLEXITY,
            "recency_weight": self.WEIGHT_RECENCY,
            "oss_contribution_weight": self.WEIGHT_OSS_CONTRIBUTION,
        }
        
        return round(min(composite, 100.0), 2), breakdown
    
    def _calculate_github_score(self, stats: Optional[GitHubStats]) -> float:
        """Calculate score based on GitHub activity."""
        if not stats:
            return 0.0
        
        score = 0.0
        
        # PR score (up to 30 points)
        pr_score = min(stats.merged_prs / 50, 1.0) * 30
        score += pr_score
        
        # Commit score (up to 30 points)
        commit_score = min(stats.total_commits / 500, 1.0) * 30
        score += commit_score
        
        # Repo score (up to 20 points)
        repo_score = min(stats.repo_count / 30, 1.0) * 20
        score += repo_score
        
        # Commit frequency bonus (up to 20 points)
        frequency_map = {
            "very_active": 20,
            "active": 15,
            "moderate": 10,
            "low": 5,
        }
        score += frequency_map.get(stats.commit_frequency or "low", 5)
        
        return score
    
    def _calculate_skill_score(
        self,
        matched_skills: list[str],
        all_skills: ExtractedSkills,
    ) -> float:
        """Calculate score based on skill matching."""
        primary = set(s.lower() for s in all_skills.primary_skills)
        secondary = set(s.lower() for s in all_skills.secondary_skills)
        matched = set(s.lower() for s in matched_skills)
        
        # Primary skills are worth more
        primary_matches = len(matched & primary)
        secondary_matches = len(matched & secondary)
        
        total_primary = len(primary) or 1
        total_secondary = len(secondary) or 1
        
        # Primary match contributes 70%, secondary 30%
        primary_score = (primary_matches / total_primary) * 70
        secondary_score = (secondary_matches / total_secondary) * 30
        
        return primary_score + secondary_score
    
    def _calculate_complexity_score(
        self, 
        user_stats: Optional[UserStats],
        github_stats: Optional[GitHubStats] = None,
    ) -> float:
        """
        Calculate score based on code complexity analysis.
        
        Uses fresh github_stats if available (has complexity_score attribute),
        otherwise falls back to stored user_stats.complexity_score.
        """
        # Try fresh github_stats first
        if github_stats and hasattr(github_stats, 'complexity_score') and github_stats.complexity_score:
            return min(github_stats.complexity_score, 100)
        
        # Fall back to stored stats
        if user_stats:
            return min(user_stats.complexity_score, 100)
        
        return 0.0
    
    def _calculate_recency_score(
        self,
        github_stats: Optional[GitHubStats],
        user_stats: Optional[UserStats],
    ) -> float:
        """Calculate score based on recent activity."""
        score = 0.0
        
        if github_stats and github_stats.commit_frequency:
            frequency_map = {
                "very_active": 100,
                "active": 75,
                "moderate": 50,
                "low": 25,
            }
            score = frequency_map.get(github_stats.commit_frequency, 25)
        
        return score
    
    def _calculate_oss_contribution_score(self, user_stats: Optional[UserStats], github_stats: Optional[GitHubStats] = None) -> float:
        """Calculate score based on contributions to popular open source repos (100+ stars)."""
        contributions = []
        
        # Try fresh github_stats first (has popular_repo_contributions attribute)
        if github_stats and hasattr(github_stats, 'popular_repo_contributions') and github_stats.popular_repo_contributions:
            contributions = github_stats.popular_repo_contributions
        # Fall back to stored stats
        elif user_stats and user_stats.popular_repo_contributions_json:
            contributions = user_stats.popular_repo_contributions_json.get("contributions", [])
        
        if not contributions:
            return 0.0
        
        # Score based on number of popular repos contributed to
        # 1 repo = 40 points, 2 repos = 60 points, 3+ repos = 80-100 points
        repo_count = len(contributions)
        
        if repo_count >= 5:
            base_score = 100
        elif repo_count >= 3:
            base_score = 80
        elif repo_count >= 2:
            base_score = 60
        else:
            base_score = 40
        
        # Bonus for contributing to very popular repos (1000+ stars)
        high_star_bonus = 0
        for contrib in contributions:
            stars = contrib.get("stars", 0)
            if stars >= 10000:
                high_star_bonus += 10
            elif stars >= 1000:
                high_star_bonus += 5
        
        return min(base_score + high_star_bonus, 100)
    
    def rank_candidates(
        self,
        candidates: list[CandidateResult],
        top_n: int = 10,
    ) -> list[CandidateResult]:
        """
        Sort candidates by score and assign ranks.
        
        Args:
            candidates: List of candidate results
            top_n: Number of top candidates to return
            
        Returns:
            Sorted and ranked candidate list
        """
        # Sort by score descending
        sorted_candidates = sorted(
            candidates,
            key=lambda c: c.score,
            reverse=True,
        )[:top_n]
        
        # Assign ranks
        for i, candidate in enumerate(sorted_candidates):
            candidate.rank = i + 1
        
        return sorted_candidates


# Singleton instance
ranking_engine = RankingEngineService()
