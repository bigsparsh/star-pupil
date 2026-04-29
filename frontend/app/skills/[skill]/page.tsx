"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { publicApi, PublicDeveloper, SkillDevelopersResponse, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Users, GitPullRequest, FolderGit2, Star, Github, ExternalLink } from "lucide-react";

export default function SkillDevelopersPage() {
  const params = useParams();
  const skillName = decodeURIComponent(params.skill as string);
  const { addToast } = useToast();
  
  const [data, setData] = useState<SkillDevelopersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDevelopers = async () => {
      setIsLoading(true);
      try {
        const response = await publicApi.getDevelopersBySkill(skillName, 50);
        setData(response);
      } catch (error) {
        const message = error instanceof ApiError ? error.message : "Failed to load developers";
        addToast(message, "error");
      } finally {
        setIsLoading(false);
      }
    };

    if (skillName) {
      fetchDevelopers();
    }
  }, [skillName, addToast]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/explore">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-violet-100 px-4 py-1.5 text-lg font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                  {skillName}
                </span>
              </div>
              <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                {isLoading ? (
                  <Skeleton className="h-5 w-40" />
                ) : (
                  `${data?.total_count || 0} developers with this skill`
                )}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : data?.developers.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <Users className="mx-auto h-12 w-12 text-zinc-400" />
            <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
              No developers found
            </h3>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">
              No developers have listed {skillName} as a skill yet.
            </p>
            <Link href="/explore" className="mt-4 inline-block">
              <Button variant="outline">Explore other skills</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.developers.map((developer) => (
              <DeveloperCard key={developer.id} developer={developer} highlightedSkill={skillName} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function DeveloperCard({ developer, highlightedSkill }: { developer: PublicDeveloper; highlightedSkill: string }) {
  const hasOssContributions = developer.popular_repo_count > 0;
  
  return (
    <div
      className={`group rounded-2xl border bg-white p-5 transition-all duration-200 hover:shadow-lg dark:bg-zinc-900 ${
        hasOssContributions
          ? "border-amber-300 hover:border-amber-400 dark:border-amber-700"
          : "border-zinc-200 hover:border-violet-300 dark:border-zinc-800 dark:hover:border-violet-700"
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="relative">
          {developer.avatar_url ? (
            <img
              src={developer.avatar_url}
              alt={developer.name}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-semibold text-lg">
              {developer.name.charAt(0).toUpperCase()}
            </div>
          )}
          {hasOssContributions && (
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white shadow-md">
              <Star className="h-3.5 w-3.5" fill="currentColor" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {developer.name}
            </h3>
            {hasOssContributions && (
              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                <Star className="h-3 w-3" fill="currentColor" />
                OSS
              </span>
            )}
          </div>
          
          {developer.github_username && (
            <a
              href={`https://github.com/${developer.github_username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-zinc-500 hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400"
            >
              <Github className="h-3.5 w-3.5" />
              {developer.github_username}
              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          )}
          
          {developer.bio && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
              {developer.bio}
            </p>
          )}
        </div>
      </div>
      
      {/* Stats */}
      <div className="mt-4 flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1">
          <GitPullRequest className="h-4 w-4" />
          {developer.merged_prs} PRs
        </span>
        <span className="flex items-center gap-1">
          <FolderGit2 className="h-4 w-4" />
          {developer.total_repos} repos
        </span>
        {developer.popular_repo_count > 0 && (
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <Star className="h-4 w-4" fill="currentColor" />
            {developer.popular_repo_count} OSS
          </span>
        )}
      </div>
      
      {/* Skills */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {developer.skills.slice(0, 6).map((skill) => (
          <Link key={skill} href={`/skills/${encodeURIComponent(skill)}`}>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                skill.toLowerCase() === highlightedSkill.toLowerCase()
                  ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              }`}
            >
              {skill}
            </span>
          </Link>
        ))}
        {developer.skills.length > 6 && (
          <span className="text-xs text-zinc-400">+{developer.skills.length - 6}</span>
        )}
      </div>
    </div>
  );
}
