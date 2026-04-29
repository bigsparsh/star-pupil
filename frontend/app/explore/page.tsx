"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { publicApi, SkillCategory, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { Search, Users, Trophy, Layers, Code2, Database, Globe, Wrench, Cpu, BookOpen } from "lucide-react";

const categoryIcons: Record<string, React.ReactNode> = {
  language: <Code2 className="h-5 w-5" />,
  framework: <Layers className="h-5 w-5" />,
  database: <Database className="h-5 w-5" />,
  devops: <Wrench className="h-5 w-5" />,
  tool: <Wrench className="h-5 w-5" />,
  library: <BookOpen className="h-5 w-5" />,
  cloud: <Globe className="h-5 w-5" />,
  infrastructure: <Cpu className="h-5 w-5" />,
};

const categoryColors: Record<string, string> = {
  language: "from-blue-500 to-indigo-600",
  framework: "from-violet-500 to-purple-600",
  database: "from-green-500 to-emerald-600",
  devops: "from-orange-500 to-amber-600",
  tool: "from-pink-500 to-rose-600",
  library: "from-cyan-500 to-teal-600",
  cloud: "from-sky-500 to-blue-600",
  infrastructure: "from-slate-500 to-zinc-600",
};

export default function ExplorePage() {
  const { addToast } = useToast();
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [allSkills, setAllSkills] = useState<string[]>([]);
  const [filteredSkills, setFilteredSkills] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [categoriesData, skillsData] = await Promise.all([
          publicApi.getSkillCategories(),
          publicApi.getSkills()
        ]);
        setCategories(categoriesData);
        setAllSkills(skillsData);
        setFilteredSkills(skillsData);
      } catch (error) {
        const message = error instanceof ApiError ? error.message : "Failed to load skills";
        addToast(message, "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [addToast]);

  useEffect(() => {
    let result = allSkills;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(skill => skill.toLowerCase().includes(query));
    }
    
    setFilteredSkills(result);
  }, [searchQuery, allSkills]);

  const handleCategoryClick = async (category: string) => {
    if (activeCategory === category) {
      setActiveCategory(null);
      setFilteredSkills(allSkills);
      return;
    }
    
    setActiveCategory(category);
    try {
      const skills = await publicApi.getSkills(category);
      setFilteredSkills(skills);
    } catch {
      // Fallback to all skills
      setFilteredSkills(allSkills);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Explore Skills
              </h1>
              <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                Discover talented developers by their skills
              </p>
            </div>
            <Link href="/leaderboard">
              <Button className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                <Trophy className="h-4 w-4" />
                View Leaderboard
              </Button>
            </Link>
          </div>
          
          {/* Search */}
          <div className="mt-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                type="text"
                placeholder="Search skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <>
            {/* Category Skeletons */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
            
            {/* Skills Skeletons */}
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                <Skeleton key={i} className="h-9 w-24 rounded-full" />
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Categories */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((cat) => (
                <button
                  key={cat.category}
                  onClick={() => handleCategoryClick(cat.category)}
                  className={`group relative overflow-hidden rounded-xl p-4 text-left transition-all duration-200 ${
                    activeCategory === cat.category
                      ? "ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-zinc-900"
                      : "hover:shadow-lg"
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${categoryColors[cat.category] || "from-zinc-500 to-zinc-600"} opacity-90`} />
                  <div className="relative flex items-center justify-between text-white">
                    <div>
                      <div className="flex items-center gap-2">
                        {categoryIcons[cat.category] || <Layers className="h-5 w-5" />}
                        <span className="font-semibold capitalize">{cat.category}</span>
                      </div>
                      <p className="mt-1 text-sm opacity-90">
                        {cat.skill_count} skills
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-sm opacity-90">
                      <Users className="h-4 w-4" />
                      {cat.developer_count}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Skills Grid */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {activeCategory ? (
                  <>
                    <span className="capitalize">{activeCategory}</span> Skills
                  </>
                ) : (
                  "All Skills"
                )}
              </h2>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {filteredSkills.length} skills
              </span>
            </div>

            {filteredSkills.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                <Search className="mx-auto h-12 w-12 text-zinc-400" />
                <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
                  No skills found
                </h3>
                <p className="mt-2 text-zinc-500 dark:text-zinc-400">
                  Try adjusting your search or filter
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory(null);
                    setFilteredSkills(allSkills);
                  }}
                  className="mt-4"
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {filteredSkills.map((skill) => (
                  <Link key={skill} href={`/skills/${encodeURIComponent(skill)}`}>
                    <span className="inline-flex cursor-pointer items-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-violet-600 dark:hover:bg-violet-900/20 dark:hover:text-violet-300">
                      {skill}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
