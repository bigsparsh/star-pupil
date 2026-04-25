"use client";

import { cn } from "@/lib/utils";
import { User } from "@/lib/store";
import { SkillTag } from "./skill-tag";
import { GitPullRequest, FolderGit2, ArrowRight, Star } from "lucide-react";

interface TalentCardProps {
  user: User;
  matchedSkills?: string[];
  stats?: {
    prsMerged?: number;
    repoCount?: number;
    popularRepoCount?: number;
  };
  onClick?: () => void;
  className?: string;
}

export function TalentCard({ user, matchedSkills = [], stats, onClick, className }: TalentCardProps) {
  const hasPopularContributions = stats?.popularRepoCount && stats.popularRepoCount > 0;
  
  return (
    <div
      onClick={onClick}
      className={cn(
        "group cursor-pointer rounded-2xl border bg-white p-5 transition-all duration-200",
        "hover:shadow-lg",
        "dark:bg-zinc-900",
        hasPopularContributions 
          ? "border-amber-300 hover:border-amber-400 hover:shadow-amber-500/10 dark:border-amber-700 dark:hover:border-amber-600"
          : "border-zinc-200 hover:border-violet-300 hover:shadow-violet-500/10 dark:border-zinc-800 dark:hover:border-violet-700",
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-semibold text-lg">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
          {hasPopularContributions && (
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white shadow-md" title={`Contributed to ${stats?.popularRepoCount} popular repo${stats?.popularRepoCount !== 1 ? 's' : ''}`}>
              <Star className="h-3.5 w-3.5" fill="currentColor" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {user.name}
            </h3>
            {hasPopularContributions && (
              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                <Star className="h-3 w-3" fill="currentColor" />
                OSS Contributor
              </span>
            )}
            <ArrowRight className="h-5 w-5 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 shrink-0" />
          </div>
          
          {stats && (
            <div className="mt-1 flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
              {stats.prsMerged !== undefined && (
                <span className="flex items-center gap-1">
                  <GitPullRequest className="h-4 w-4" />
                  {stats.prsMerged} PRs
                </span>
              )}
              {stats.repoCount !== undefined && (
                <span className="flex items-center gap-1">
                  <FolderGit2 className="h-4 w-4" />
                  {stats.repoCount} repos
                </span>
              )}
            </div>
          )}
          
          <div className="mt-3 flex flex-wrap gap-1.5">
            {user.skills?.slice(0, 5).map((skill) => (
              <SkillTag
                key={skill}
                name={skill}
                size="sm"
                highlighted={matchedSkills.includes(skill)}
              />
            ))}
            {user.skills && user.skills.length > 5 && (
              <span className="px-2 py-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                +{user.skills.length - 5} more
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
