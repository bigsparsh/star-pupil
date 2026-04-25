import Link from "next/link";
import { cn } from "@/lib/utils";

interface SkillTagProps {
  name: string;
  level?: number;
  highlighted?: boolean;
  size?: "sm" | "md";
  className?: string;
  clickable?: boolean;
}

export function SkillTag({ name, level, highlighted = false, size = "md", className, clickable = true }: SkillTagProps) {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
  };

  const baseClasses = cn(
    "inline-flex items-center gap-1.5 rounded-full font-medium transition-colors",
    highlighted
      ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
      : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    clickable && "hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-900/30 dark:hover:text-violet-300 cursor-pointer",
    sizeClasses[size],
    className
  );

  const content = (
    <>
      {name}
      {level !== undefined && (
        <span className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              className={cn(
                "h-3 w-3",
                star <= level
                  ? "fill-amber-400 text-amber-400"
                  : "fill-zinc-300 text-zinc-300 dark:fill-zinc-600 dark:text-zinc-600"
              )}
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </span>
      )}
    </>
  );

  if (clickable) {
    return (
      <Link href={`/skills/${encodeURIComponent(name)}`} className={baseClasses}>
        {content}
      </Link>
    );
  }

  return <span className={baseClasses}>{content}</span>;
}
