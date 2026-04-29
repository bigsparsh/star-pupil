"use client";

import { useAuthStore, useRecruiterStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { StatBadge } from "@/components/stat-badge";
import { Search, Users, Bookmark, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default function RecruiterDashboard() {
  const { user } = useAuthStore();
  const { savedCandidates, searchHistory, totalSearches, totalCandidatesViewed } = useRecruiterStore();

  if (!user) return null;

  // Calculate match rate (saved / viewed * 100)
  const matchRate = totalCandidatesViewed > 0 
    ? Math.round((savedCandidates.length / totalCandidatesViewed) * 100) 
    : 0;

  // Get recent searches (last 4)
  const recentSearches = searchHistory.slice(0, 4);
  
  // Get recent saved candidates (last 4)
  const recentSaved = savedCandidates.slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Welcome back, {user.name}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          {user.organization && `${user.organization} · `}Here's your recruiting dashboard
        </p>
      </div>

      {/* Quick Search CTA */}
      <div className="rounded-2xl border border-zinc-200 bg-gradient-to-r from-violet-500 to-indigo-600 p-8 text-white dark:border-zinc-800">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Find Your Next Hire</h2>
            <p className="mt-2 text-violet-100">
              Use natural language to describe the developer you're looking for
            </p>
          </div>
          <Link href="/recruiter/search">
            <Button size="lg" variant="secondary">
              <Search className="mr-2 h-5 w-5" />
              Start Searching
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatBadge label="Total Searches" value={totalSearches.toString()} icon={Search} />
        <StatBadge label="Candidates Viewed" value={totalCandidatesViewed.toString()} icon={Users} />
        <StatBadge label="Saved Candidates" value={savedCandidates.length.toString()} icon={Bookmark} />
        <StatBadge label="Save Rate" value={`${matchRate}%`} icon={TrendingUp} />
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Searches */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Recent Searches
            </h3>
            <Link href="/recruiter/search" className="text-sm text-violet-600 hover:text-violet-500 dark:text-violet-400">
              View all
            </Link>
          </div>
          
          <div className="mt-4 space-y-3">
            {recentSearches.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No searches yet</p>
                <p className="text-xs mt-1">Start searching to see your history here</p>
              </div>
            ) : (
              recentSearches.map((search) => (
                <Link
                  key={search.id}
                  href={`/recruiter/search?q=${encodeURIComponent(search.query)}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-100 p-3 transition-colors hover:border-violet-200 hover:bg-violet-50 dark:border-zinc-800 dark:hover:border-violet-800 dark:hover:bg-violet-900/20"
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {search.query}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {search.matchCount} results · {formatDistanceToNow(new Date(search.searchedAt), { addSuffix: true })}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-zinc-400" />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Saved Candidates */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Saved Candidates
            </h3>
            <Link href="/recruiter/saved" className="text-sm text-violet-600 hover:text-violet-500 dark:text-violet-400">
              View all
            </Link>
          </div>
          
          <div className="mt-4 space-y-3">
            {recentSaved.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No saved candidates yet</p>
                <p className="text-xs mt-1">Save candidates from search results</p>
              </div>
            ) : (
              recentSaved.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-100 p-3 dark:border-zinc-800"
                >
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-medium">
                    {candidate.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {candidate.name}
                    </p>
                    <div className="flex gap-1 flex-wrap">
                      {candidate.matched_skills.slice(0, 3).map((skill) => (
                        <span key={skill} className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-600 dark:text-zinc-400">
                          {skill}
                        </span>
                      ))}
                      {candidate.matched_skills.length > 3 && (
                        <span className="text-xs text-zinc-400">+{candidate.matched_skills.length - 3}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {Math.round(candidate.score * 100)}%
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Search Tips
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Be Specific",
              description: "Include technologies, experience level, and role type for better matches",
            },
            {
              title: "Natural Language",
              description: "Write queries as you would describe the role to a colleague",
            },
            {
              title: "Check GitHub",
              description: "Review candidates' actual code contributions for deeper insights",
            },
          ].map((tip, i) => (
            <div key={i} className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800">
              <h4 className="font-medium text-zinc-900 dark:text-zinc-100">{tip.title}</h4>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{tip.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
