"use client";

import { useEffect, useState } from "react";
import { useAuthStore, Skill, Stats, PopularRepoContribution, PortfolioData } from "@/lib/store";
import { programmerApi, ApiError } from "@/lib/api";
import { ProfileCard } from "@/components/profile-card";
import { StatBadge } from "@/components/stat-badge";
import { SkillTree } from "@/components/skill-tree";
import { ContributionGraph } from "@/components/contribution-graph";
import { SkillTag } from "@/components/skill-tag";
import { Button } from "@/components/ui/button";
import { StatsSkeleton, Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { GitPullRequest, FolderGit2, Code2, Activity, Edit, Star, ExternalLink, Globe } from "lucide-react";
import Link from "next/link";

export default function ProgrammerDashboard() {
  const { user, skills, stats, setSkills, setStats } = useAuthStore();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const [skillsResponse, statsResponse] = await Promise.all([
          programmerApi.getMySkills(),
          programmerApi.getMyStats(),
        ]);
        
        // Transform skills from backend format to frontend format
        const transformedSkills: Skill[] = skillsResponse.map((mapping) => ({
          id: mapping.skill.id,
          name: mapping.skill.name,
          level: mapping.proficiency_level,
          category: mapping.skill.category,
          years_experience: mapping.years_experience,
        }));
        
        // Transform stats from backend format to frontend format
        // Extract contribution graph from the response
        const contributionGraph = statsResponse.contribution_graph?.graph || [];
        const monthlyCommits = statsResponse.contribution_graph?.monthly_commits || statsResponse.monthly_commits || 0;
        
        const transformedStats: Stats = {
          prsMerged: statsResponse.merged_prs,
          repoCount: statsResponse.total_repos,
          totalCommits: statsResponse.total_commits,
          followers: statsResponse.followers,
          languagesUsed: statsResponse.languages?.languages || [],
          contributions: contributionGraph.slice(-365), // Last year of contributions
          commitGraph: contributionGraph,
          monthlyCommits: monthlyCommits,
          complexityScore: statsResponse.complexity_score,
          popularRepoContributions: statsResponse.popular_repo_contributions || [],
          portfolio: statsResponse.portfolio || null,
        };
        
        setSkills(transformedSkills);
        setStats(transformedStats);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Failed to load data";
        setError(message);
        addToast(message, "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [setSkills, setStats, addToast]);

  if (!user) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Dashboard
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Welcome back, {user.name}! Here's your profile overview.
          </p>
        </div>
        <Link href="/programmer/profile">
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        </Link>
      </div>

      {/* Profile Card */}
      <ProfileCard user={user} size="lg" showEmail />

      {/* Stats Grid */}
      {isLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatBadge
            label="PRs Merged"
            value={stats?.prsMerged || 0}
            icon={GitPullRequest}
          />
          <StatBadge
            label="Repositories"
            value={stats?.repoCount || 0}
            icon={FolderGit2}
          />
          <StatBadge
            label="Languages"
            value={stats?.languagesUsed.length || 0}
            icon={Code2}
          />
          <StatBadge
            label="This Month"
            value={`${stats?.monthlyCommits || 0} commits`}
            icon={Activity}
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column - Skills */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-32" />
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <SkillTree skills={skills} />
            )}
          </div>
        </div>

        {/* Right Column - Activity */}
        <div className="space-y-6 lg:col-span-2">
          {/* Contribution Graph */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <ContributionGraph data={stats?.commitGraph || []} />
            )}
          </div>

          {/* Top Skills */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Top Skills
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Skills extracted from your code activity
            </p>
            
            {isLoading ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-8 w-20" />
                ))}
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {skills
                  .sort((a, b) => b.level - a.level)
                  .slice(0, 10)
                  .map((skill) => (
                    <SkillTag key={skill.name} name={skill.name} level={skill.level} />
                  ))}
              </div>
            )}
          </div>

          {/* Languages */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Languages Used
            </h3>
            
            {isLoading ? (
              <div className="mt-4 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-2 flex-1" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {stats?.languagesUsed.map((lang, i) => {
                  const percentage = 100 - i * 15;
                  return (
                    <div key={lang} className="flex items-center gap-3">
                      <span className="w-24 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {lang}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-sm text-zinc-500">
                        {percentage}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Popular Repo Contributions - Full Width Section */}
      {!isLoading && stats?.popularRepoContributions && stats.popularRepoContributions.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-6 dark:border-amber-800/50 dark:from-amber-900/20 dark:to-orange-900/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
              <Star className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="currentColor" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Open Source Projects
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {(() => {
                  const owned = stats.popularRepoContributions.filter(r => r.is_owner).length;
                  const contributed = stats.popularRepoContributions.length - owned;
                  const parts = [];
                  if (owned > 0) parts.push(`${owned} popular project${owned !== 1 ? 's' : ''} you maintain`);
                  if (contributed > 0) parts.push(`${contributed} popular project${contributed !== 1 ? 's' : ''} you've contributed to`);
                  return parts.join(' and ') + ' (100+ stars)';
                })()}
              </p>
            </div>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.popularRepoContributions.slice(0, 6).map((repo) => (
              <a
                key={repo.repo_name}
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex flex-col rounded-xl border p-4 transition-all hover:shadow-md ${
                  repo.is_owner 
                    ? 'border-violet-200 bg-gradient-to-br from-white to-violet-50 hover:border-violet-400 dark:border-violet-800/50 dark:from-zinc-900 dark:to-violet-900/20 dark:hover:border-violet-600' 
                    : 'border-amber-200 bg-white hover:border-amber-400 dark:border-amber-800/50 dark:bg-zinc-900 dark:hover:border-amber-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className={`font-semibold text-zinc-900 dark:text-zinc-100 truncate ${
                        repo.is_owner 
                          ? 'group-hover:text-violet-600 dark:group-hover:text-violet-400' 
                          : 'group-hover:text-amber-600 dark:group-hover:text-amber-400'
                      }`}>
                        {repo.name}
                      </h4>
                      {repo.is_owner && (
                        <span className="shrink-0 inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                          Maintainer
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                      {repo.owner}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                
                {repo.description && (
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                    {repo.description}
                  </p>
                )}
                
                <div className="mt-3 flex items-center gap-3 text-sm">
                  <span className={`flex items-center gap-1 font-medium ${
                    repo.is_owner 
                      ? 'text-violet-600 dark:text-violet-400' 
                      : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    <Star className="h-4 w-4" fill="currentColor" />
                    {repo.stars.toLocaleString()}
                  </span>
                  {repo.language && (
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {repo.language}
                    </span>
                  )}
                  {!repo.is_owner && repo.contribution_count > 0 && (
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {repo.contribution_count} contribution{repo.contribution_count !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
          
          {stats.popularRepoContributions.length > 6 && (
            <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
              +{stats.popularRepoContributions.length - 6} more projects
            </p>
          )}
        </div>
      )}

      {/* Portfolio Website Skills */}
      {!isLoading && stats?.portfolio && stats.portfolio.success && stats.portfolio.skills.length > 0 && (
        <div className="rounded-2xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50 p-6 dark:border-cyan-800/50 dark:from-cyan-900/20 dark:to-blue-900/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-900/50">
              <Globe className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Portfolio Skills
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Skills extracted from your portfolio website
              </p>
            </div>
            <a
              href={stats.portfolio.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
            >
              View site
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {stats.portfolio.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center rounded-full bg-cyan-100 px-3 py-1 text-sm font-medium text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300"
              >
                {skill}
              </span>
            ))}
          </div>
          
          {stats.portfolio.projects_mentioned > 0 && (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              {stats.portfolio.projects_mentioned} project{stats.portfolio.projects_mentioned !== 1 ? 's' : ''} detected on your site
            </p>
          )}
        </div>
      )}
    </div>
  );
}
