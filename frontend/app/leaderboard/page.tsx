"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { publicApi, LeaderboardEntry, LeaderboardResponse, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { 
  Trophy, 
  Medal, 
  Award,
  Star,
  Github, 
  ExternalLink, 
  GitPullRequest, 
  FolderGit2, 
  GitCommit, 
  Users,
  Layers,
  ArrowLeft
} from "lucide-react";

type Category = "overall" | "oss" | "commits" | "prs";

const categoryInfo: Record<Category, { label: string; description: string; icon: React.ReactNode }> = {
  overall: {
    label: "Overall",
    description: "Combined score based on all contributions",
    icon: <Trophy className="h-5 w-5" />,
  },
  oss: {
    label: "Open Source",
    description: "Contributions to popular repositories (100+ stars)",
    icon: <Star className="h-5 w-5" />,
  },
  commits: {
    label: "Commits",
    description: "Total commits across all repositories",
    icon: <GitCommit className="h-5 w-5" />,
  },
  prs: {
    label: "Pull Requests",
    description: "Merged pull requests",
    icon: <GitPullRequest className="h-5 w-5" />,
  },
};

function getRankBadge(rank: number) {
  if (rank === 1) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg shadow-amber-500/30">
        <Trophy className="h-5 w-5" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-lg shadow-slate-400/30">
        <Medal className="h-5 w-5" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-600 text-white shadow-lg shadow-orange-500/30">
        <Award className="h-5 w-5" />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 font-bold dark:bg-zinc-800 dark:text-zinc-400">
      {rank}
    </div>
  );
}

export default function LeaderboardPage() {
  const { addToast } = useToast();
  const [activeCategory, setActiveCategory] = useState<Category>("overall");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        const response = await publicApi.getLeaderboard(activeCategory, 50);
        setData(response);
      } catch (error) {
        const message = error instanceof ApiError ? error.message : "Failed to load leaderboard";
        addToast(message, "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [activeCategory, addToast]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/explore">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/30">
                  <Trophy className="h-6 w-6" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Leaderboard
                </h1>
              </div>
              <p className="mt-2 text-zinc-500 dark:text-zinc-400">
                Top developers ranked by their contributions and expertise
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Category Tabs */}
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto py-2">
            {(Object.keys(categoryInfo) as Category[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeCategory === cat
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {categoryInfo[cat].icon}
                {categoryInfo[cat].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {categoryInfo[activeCategory].description}
          </p>
        </div>
      </div>

      {/* Leaderboard */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        ) : data?.entries.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <Users className="mx-auto h-12 w-12 text-zinc-400" />
            <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
              No rankings yet
            </h3>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">
              Be the first to join the leaderboard!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data?.entries.map((entry) => (
              <LeaderboardRow key={entry.id} entry={entry} category={activeCategory} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function LeaderboardRow({ entry, category }: { entry: LeaderboardEntry; category: Category }) {
  const isTopThree = entry.rank <= 3;
  
  return (
    <div
      className={`group flex items-center gap-4 rounded-xl border p-4 transition-all ${
        isTopThree
          ? "border-amber-200 bg-gradient-to-r from-amber-50 to-white dark:border-amber-800/50 dark:from-amber-900/10 dark:to-zinc-900"
          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
      }`}
    >
      {/* Rank */}
      {getRankBadge(entry.rank)}

      {/* Avatar */}
      <div className="relative shrink-0">
        {entry.avatar_url ? (
          <img
            src={entry.avatar_url}
            alt={entry.name}
            className="h-12 w-12 rounded-full object-cover ring-2 ring-white dark:ring-zinc-800"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-semibold text-lg ring-2 ring-white dark:ring-zinc-800">
            {entry.name.charAt(0).toUpperCase()}
          </div>
        )}
        {entry.popular_repo_count > 0 && (
          <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white shadow-md">
            <Star className="h-3 w-3" fill="currentColor" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {entry.name}
          </h3>
          {entry.github_username && (
            <a
              href={`https://github.com/${entry.github_username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-zinc-400 hover:text-violet-600 dark:hover:text-violet-400"
            >
              <Github className="h-4 w-4" />
              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          )}
        </div>
        
        {/* Stats row */}
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1">
            <GitCommit className="h-3.5 w-3.5" />
            {entry.total_commits.toLocaleString()} commits
          </span>
          <span className="flex items-center gap-1">
            <GitPullRequest className="h-3.5 w-3.5" />
            {entry.merged_prs} PRs
          </span>
          <span className="flex items-center gap-1">
            <FolderGit2 className="h-3.5 w-3.5" />
            {entry.total_repos} repos
          </span>
          {entry.popular_repo_count > 0 && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Star className="h-3.5 w-3.5" fill="currentColor" />
              {entry.popular_repo_count} OSS contributions
            </span>
          )}
        </div>
        
        {/* Skills */}
        <div className="mt-2 flex flex-wrap gap-1">
          {entry.top_skills.slice(0, 5).map((skill) => (
            <Link key={skill} href={`/skills/${encodeURIComponent(skill)}`}>
              <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-violet-100 hover:text-violet-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-violet-900/30 dark:hover:text-violet-300">
                {skill}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Score */}
      <div className="shrink-0 text-right">
        <div className={`text-lg font-bold ${
          category === "oss" ? "text-amber-600 dark:text-amber-400" : "text-violet-600 dark:text-violet-400"
        }`}>
          {Math.round(entry.score).toLocaleString()}
        </div>
        <div className="text-xs text-zinc-400">points</div>
      </div>
    </div>
  );
}
