import { cn } from "@/lib/utils";
import { User } from "@/lib/store";
import { Code2, Building2, Github, Mail } from "lucide-react";

interface ProfileCardProps {
  user: User;
  size?: "sm" | "md" | "lg";
  showEmail?: boolean;
  className?: string;
}

export function ProfileCard({ user, size = "md", showEmail = false, className }: ProfileCardProps) {
  const sizeClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  const avatarSizes = {
    sm: "h-12 w-12",
    md: "h-16 w-16",
    lg: "h-24 w-24",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900",
        sizeClasses[size],
        className
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-semibold",
            avatarSizes[size]
          )}
        >
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className={cn("rounded-full object-cover", avatarSizes[size])}
            />
          ) : (
            <span className={size === "lg" ? "text-3xl" : size === "md" ? "text-xl" : "text-lg"}>
              {user.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1">
          <h3 className={cn(
            "font-semibold text-zinc-900 dark:text-zinc-100",
            size === "lg" ? "text-2xl" : size === "md" ? "text-lg" : "text-base"
          )}>
            {user.name}
          </h3>
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
            {user.role === "programmer" ? (
              <Code2 className="h-4 w-4" />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
            <span className="text-sm capitalize">{user.role}</span>
          </div>
          {user.organization && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {user.organization}
            </p>
          )}
        </div>
      </div>
      
      <div className="mt-4 flex flex-wrap gap-2">
        {showEmail && user.email && (
          <div className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            <Mail className="h-4 w-4" />
            {user.email}
          </div>
        )}
        {(user.githubLink || user.github_username) && (
          <a
            href={user.githubLink || `https://github.com/${user.github_username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-violet-600 dark:text-zinc-400 dark:hover:text-violet-400"
          >
            <Github className="h-4 w-4" />
            {user.github_username || "GitHub"}
          </a>
        )}
      </div>
    </div>
  );
}
