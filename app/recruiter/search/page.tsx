"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Candidate, useSearchStore, useRecruiterStore } from "@/lib/store";
import { recruiterApi, ApiError, CandidateResult } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TalentCard } from "@/components/talent-card";
import { TalentListSkeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { ProfileCard } from "@/components/profile-card";
import { SkillTag } from "@/components/skill-tag";
import { ContributionGraph } from "@/components/contribution-graph";
import { 
  Search, 
  SlidersHorizontal, 
  GitPullRequest, 
  FolderGit2, 
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Sparkles
} from "lucide-react";

// Compact score bar for collapsible section
function CompactScoreBar({ label, score, weight, color }: { 
  label: string; 
  score: number; 
  weight: number;
  color: string;
}) {
  const weightedScore = score * weight;
  const percentage = Math.min((score / 100) * 100, 100);
  
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 text-zinc-600 dark:text-zinc-400 truncate">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700">
        <div 
          className={`h-full rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-10 text-right text-zinc-500">{weightedScore.toFixed(1)}</span>
    </div>
  );
}

// Transform backend candidate to frontend format
function transformCandidate(candidate: CandidateResult): Candidate {
  return {
    id: candidate.id,
    name: candidate.name,
    github_username: candidate.github_username,
    profile_link: candidate.profile_link,
    skills: candidate.skills,
    matched_skills: candidate.matched_skills,
    github_stats: candidate.github_stats,
    score: candidate.score,
    score_breakdown: candidate.score_breakdown,
    contribution_graph: candidate.contribution_graph,
    rank: candidate.rank,
  };
}

function RecruiterSearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const { addToast } = useToast();
  const { 
    results, 
    extractedSkills, 
    totalMatches,
    setResults, 
    setExtractedSkills,
    setTotalMatches,
    clearResults 
  } = useSearchStore();
  
  const { 
    saveCandidate, 
    unsaveCandidate, 
    isCandidateSaved, 
    addSearchToHistory,
    incrementCandidatesViewed 
  } = useRecruiterStore();
  
  const [query, setQuery] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  
  // Filters
  const [minPRs, setMinPRs] = useState("");
  const [minRepos, setMinRepos] = useState("");
  const [resultLimit, setResultLimit] = useState("10");

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    
    try {
      const response = await recruiterApi.searchTalent(query, parseInt(resultLimit) || 10);
      
      // Transform candidates to frontend format
      const transformedCandidates = response.candidates.map(transformCandidate);
      
      // Apply client-side filters
      let filtered = transformedCandidates;
      
      if (minPRs) {
        filtered = filtered.filter((c) => 
          (c.github_stats?.merged_prs || 0) >= parseInt(minPRs)
        );
      }
      
      if (minRepos) {
        filtered = filtered.filter((c) => 
          (c.github_stats?.repo_count || 0) >= parseInt(minRepos)
        );
      }
      
      setResults(filtered);
      setExtractedSkills(response.extracted_skills);
      setTotalMatches(response.total_matches);
      
      // Track this search in history
      addSearchToHistory(query, response.total_matches);
      
      if (filtered.length > 0) {
        addToast(`Found ${filtered.length} matching candidates`, "success");
      } else {
        addToast("No candidates found matching your query", "info");
      }
    } catch (error) {
      const message = error instanceof ApiError 
        ? error.message 
        : "Search failed. Please try again.";
      addToast(message, "error");
      clearResults();
    } finally {
      setIsLoading(false);
    }
  }, [query, minPRs, minRepos, resultLimit, addToast, setResults, setExtractedSkills, setTotalMatches, clearResults, addSearchToHistory]);

  useEffect(() => {
    if (initialQuery) {
      handleSearch();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Search Talent
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Use natural language to find the perfect developers for your team
        </p>
      </div>

      {/* Search Box */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Need a Golang dev for API work with Kubernetes experience..."
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-3 pl-12 pr-4 text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-900"
            />
          </div>
          <Button onClick={() => setShowFilters(!showFilters)} variant="outline">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <Button onClick={handleSearch} isLoading={isLoading}>
            Search
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 flex flex-wrap gap-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <div className="w-40">
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Min PRs Merged
              </label>
              <Input
                type="number"
                value={minPRs}
                onChange={(e) => setMinPRs(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="w-40">
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Min Repositories
              </label>
              <Input
                type="number"
                value={minRepos}
                onChange={(e) => setMinRepos(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="w-40">
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Result Limit
              </label>
              <select
                value={resultLimit}
                onChange={(e) => setResultLimit(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="5">5 results</option>
                <option value="10">10 results</option>
                <option value="25">25 results</option>
                <option value="50">50 results</option>
              </select>
            </div>
          </div>
        )}

        {/* Extracted Skills */}
        {extractedSkills && (extractedSkills.primary_skills.length > 0 || extractedSkills.secondary_skills.length > 0) && (
          <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <Sparkles className="h-4 w-4 text-violet-500" />
              <span>AI detected skills:</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {extractedSkills.primary_skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-violet-100 px-2.5 py-1 text-sm font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                >
                  {skill}
                </span>
              ))}
              {extractedSkills.secondary_skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-zinc-100 px-2.5 py-1 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Quick Suggestions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Try:</span>
          {[
            "React developer with TypeScript",
            "Backend engineer Python + AWS",
            "Full-stack Node.js + PostgreSQL",
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setQuery(suggestion)}
              className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-600 transition-colors hover:bg-violet-100 hover:text-violet-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-violet-900/30 dark:hover:text-violet-300"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div>
        {isLoading ? (
          <TalentListSkeleton />
        ) : results.length > 0 ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Found <span className="font-medium text-zinc-900 dark:text-zinc-100">{results.length}</span> candidates
                {totalMatches > results.length && (
                  <span> (from {totalMatches} total matches)</span>
                )}
              </p>
              <select className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800">
                <option>Sort by match score</option>
                <option>Sort by PRs merged</option>
                <option>Sort by repositories</option>
              </select>
            </div>
            
            <div className="space-y-4">
              {results.map((candidate) => (
                <div key={candidate.id} className="relative">
                  <TalentCard
                    user={{
                      id: candidate.id,
                      name: candidate.name,
                      email: "",
                      role: "programmer",
                      skills: candidate.skills,
                      githubLink: candidate.profile_link || undefined,
                      github_username: candidate.github_username,
                    }}
                    matchedSkills={candidate.matched_skills}
                    stats={candidate.github_stats ? {
                      prsMerged: candidate.github_stats.merged_prs,
                      repoCount: candidate.github_stats.repo_count,
                      popularRepoCount: candidate.popular_repo_count,
                    } : candidate.popular_repo_count > 0 ? {
                      popularRepoCount: candidate.popular_repo_count,
                    } : undefined}
                    onClick={() => setSelectedCandidate(candidate)}
                  />
                  {candidate.score > 0 && (
                    <div className="absolute right-4 top-4 rounded-full bg-green-100 px-2.5 py-1 text-sm font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      {Math.round(candidate.score)}% match
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : query && !isLoading ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mx-auto h-16 w-16 rounded-full bg-zinc-100 flex items-center justify-center dark:bg-zinc-800">
              <Search className="h-8 w-8 text-zinc-400" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
              No results found
            </h3>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">
              Try adjusting your search query or filters
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <div className="mx-auto h-16 w-16 rounded-full bg-violet-100 flex items-center justify-center dark:bg-violet-900/30">
              <Search className="h-8 w-8 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Start your search
            </h3>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">
              Describe the developer you're looking for in natural language
            </p>
          </div>
        )}
      </div>

      {/* Candidate Detail Modal */}
      <Modal
        isOpen={!!selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        title="Candidate Profile"
        className="max-w-2xl"
      >
        {selectedCandidate && (
          <div className="space-y-6">
            <ProfileCard 
              user={{
                id: selectedCandidate.id,
                name: selectedCandidate.name,
                email: selectedCandidate.email || "",
                role: "programmer",
                skills: selectedCandidate.skills,
                githubLink: selectedCandidate.profile_link || undefined,
                github_username: selectedCandidate.github_username,
              }} 
              size="sm" 
              showEmail={!!selectedCandidate.email}
            />
            
            {/* Stats Row - Compact */}
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-lg bg-zinc-50 p-2 text-center dark:bg-zinc-800">
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {selectedCandidate.github_stats?.merged_prs || 0}
                </p>
                <span className="text-xs text-zinc-500">PRs</span>
              </div>
              <div className="rounded-lg bg-zinc-50 p-2 text-center dark:bg-zinc-800">
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {selectedCandidate.github_stats?.repo_count || 0}
                </p>
                <span className="text-xs text-zinc-500">Repos</span>
              </div>
              <div className="rounded-lg bg-zinc-50 p-2 text-center dark:bg-zinc-800">
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {selectedCandidate.github_stats?.total_commits || 0}
                </p>
                <span className="text-xs text-zinc-500">Commits</span>
              </div>
              <div className="rounded-lg bg-violet-50 p-2 text-center dark:bg-violet-900/20">
                <p className="text-lg font-bold text-violet-600 dark:text-violet-400">
                  {Math.round(selectedCandidate.score)}%
                </p>
                <span className="text-xs text-violet-500">Match</span>
              </div>
            </div>
            
            {/* Score Breakdown - Collapsible/Compact */}
            {selectedCandidate.score_breakdown && (
              <details className="rounded-lg border border-zinc-200 dark:border-zinc-700">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                  Score Breakdown
                </summary>
                <div className="space-y-1.5 px-3 pb-3 pt-1">
                  <CompactScoreBar label="GitHub" score={selectedCandidate.score_breakdown.github_score} weight={selectedCandidate.score_breakdown.github_weight} color="bg-blue-500" />
                  <CompactScoreBar label="Skills" score={selectedCandidate.score_breakdown.skill_match_score} weight={selectedCandidate.score_breakdown.skill_match_weight} color="bg-green-500" />
                  <CompactScoreBar label="OSS" score={selectedCandidate.score_breakdown.oss_contribution_score} weight={selectedCandidate.score_breakdown.oss_contribution_weight} color="bg-amber-500" />
                  <CompactScoreBar label="Recent" score={selectedCandidate.score_breakdown.recency_score} weight={selectedCandidate.score_breakdown.recency_weight} color="bg-purple-500" />
                  <CompactScoreBar label="Complex" score={selectedCandidate.score_breakdown.complexity_score} weight={selectedCandidate.score_breakdown.complexity_weight} color="bg-pink-500" />
                </div>
              </details>
            )}
            
            {/* Contribution Graph - Compact */}
            {selectedCandidate.contribution_graph && selectedCandidate.contribution_graph.length > 0 && (
              <div className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-700">
                <ContributionGraph data={selectedCandidate.contribution_graph} />
              </div>
            )}
            
            {/* Skills & Languages - Side by side */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase mb-1.5">Skills</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedCandidate.skills?.slice(0, 8).map((skill) => (
                    <SkillTag
                      key={skill}
                      name={skill}
                      size="sm"
                      highlighted={selectedCandidate.matched_skills?.includes(skill)}
                    />
                  ))}
                  {selectedCandidate.skills && selectedCandidate.skills.length > 8 && (
                    <span className="text-xs text-zinc-400">+{selectedCandidate.skills.length - 8}</span>
                  )}
                </div>
              </div>
              {selectedCandidate.github_stats?.main_languages && selectedCandidate.github_stats.main_languages.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase mb-1.5">Languages</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedCandidate.github_stats.main_languages.slice(0, 5).map((lang) => (
                      <span
                        key={lang}
                        className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
              {isCandidateSaved(selectedCandidate.id) ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1 border-green-500 text-green-600 hover:bg-green-50 dark:border-green-600 dark:text-green-400"
                  onClick={() => {
                    unsaveCandidate(selectedCandidate.id);
                  }}
                >
                  <BookmarkCheck className="mr-2 h-4 w-4" />
                  Saved
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    saveCandidate(selectedCandidate);
                    incrementCandidatesViewed();
                  }}
                >
                  <Bookmark className="mr-2 h-4 w-4" />
                  Save Candidate
                </Button>
              )}
              {selectedCandidate.profile_link && (
                <a
                  href={selectedCandidate.profile_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button className="w-full">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View GitHub
                  </Button>
                </a>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function RecruiterSearch() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="h-4 w-64 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mt-2" />
        </div>
        <TalentListSkeleton />
      </div>
    }>
      <RecruiterSearchContent />
    </Suspense>
  );
}
