"use client";

import { Skill } from "@/lib/store";
import { cn } from "@/lib/utils";

interface SkillTreeProps {
  skills: Skill[];
  className?: string;
}

export function SkillTree({ skills, className }: SkillTreeProps) {
  const categories = skills.reduce((acc, skill) => {
    const category = skill.category || "Other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  const categoryColors: Record<string, string> = {
    Languages: "from-blue-500 to-cyan-500",
    Frameworks: "from-violet-500 to-purple-500",
    Tools: "from-amber-500 to-orange-500",
    Databases: "from-green-500 to-emerald-500",
    Cloud: "from-pink-500 to-rose-500",
    default: "from-zinc-500 to-zinc-600",
  };

  return (
    <div className={cn("space-y-6", className)}>
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Skill Tree
      </h3>
      
      <div className="space-y-4">
        {Object.entries(categories).map(([category, categorySkills]) => (
          <div key={category}>
            <h4 className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {category}
            </h4>
            <div className="space-y-2">
              {categorySkills.map((skill) => (
                <div key={skill.name} className="flex items-center gap-3">
                  <span className="w-24 truncate text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {skill.name}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full bg-gradient-to-r transition-all duration-500",
                        categoryColors[category] || categoryColors.default
                      )}
                      style={{ width: `${(skill.level / 5) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-zinc-400">
                    {skill.level}/5
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
