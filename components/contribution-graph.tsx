"use client";

import { cn } from "@/lib/utils";

interface ContributionGraphProps {
  data: number[];
  className?: string;
}

export function ContributionGraph({ data, className }: ContributionGraphProps) {
  const weeks = 52;
  const days = 7;
  
  // Check if we have any data
  const hasData = data.length > 0 && data.some(v => v > 0);
  
  // Normalize data to fit the grid (365 days = 52 weeks * 7 days)
  const normalizedData = Array.from({ length: weeks * days }, (_, i) => 
    data[i] ?? 0
  );
  
  const maxValue = Math.max(...normalizedData, 1);
  const totalContributions = normalizedData.reduce((a, b) => a + b, 0);
  
  const getColor = (value: number) => {
    if (value === 0) return "bg-zinc-100 dark:bg-zinc-800";
    const intensity = value / maxValue;
    if (intensity < 0.25) return "bg-green-200 dark:bg-green-900";
    if (intensity < 0.5) return "bg-green-300 dark:bg-green-700";
    if (intensity < 0.75) return "bg-green-500 dark:bg-green-600";
    return "bg-green-600 dark:bg-green-500";
  };

  const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Contribution Activity
        </h4>
        {hasData && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {totalContributions} contributions in the last year
          </span>
        )}
      </div>
      
      {!hasData ? (
        <div className="flex h-24 items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No contribution data available yet
          </p>
        </div>
      ) : (
        <>
          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-[3px] pr-2 text-[10px] text-zinc-400">
              {dayLabels.map((label, i) => (
                <div key={i} className="h-[10px] leading-[10px]">
                  {label}
                </div>
              ))}
            </div>
            
            {/* Grid */}
            <div className="flex gap-[3px] overflow-x-auto">
              {Array.from({ length: weeks }, (_, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[3px]">
                  {Array.from({ length: days }, (_, dayIndex) => {
                    const dataIndex = weekIndex * days + dayIndex;
                    const value = normalizedData[dataIndex];
                    return (
                      <div
                        key={dayIndex}
                        className={cn(
                          "h-[10px] w-[10px] rounded-[2px] transition-colors",
                          getColor(value)
                        )}
                        title={`${value} contributions`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-end gap-1 text-[10px] text-zinc-400">
            <span>Less</span>
            <div className="h-[10px] w-[10px] rounded-[2px] bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-[10px] w-[10px] rounded-[2px] bg-green-200 dark:bg-green-900" />
            <div className="h-[10px] w-[10px] rounded-[2px] bg-green-300 dark:bg-green-700" />
            <div className="h-[10px] w-[10px] rounded-[2px] bg-green-500 dark:bg-green-600" />
            <div className="h-[10px] w-[10px] rounded-[2px] bg-green-600 dark:bg-green-500" />
            <span>More</span>
          </div>
        </>
      )}
    </div>
  );
}
