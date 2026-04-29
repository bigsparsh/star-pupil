import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatBadgeProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatBadge({ label, value, icon: Icon, trend, className }: StatBadgeProps) {
  const trendColors = {
    up: "text-green-600 dark:text-green-400",
    down: "text-red-600 dark:text-red-400",
    neutral: "text-zinc-600 dark:text-zinc-400",
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />}
      </div>
      <p
        className={cn(
          "mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100",
          trend && trendColors[trend]
        )}
      >
        {value}
      </p>
    </div>
  );
}
