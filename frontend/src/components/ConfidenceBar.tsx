"use client";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/useTranslation";
import { toBengaliNum } from "@/i18n/dataTranslations";

interface ConfidenceBarProps {
  confidence?: number;
  value?: number;
  className?: string;
}

export function ConfidenceBar({ confidence, value, className }: ConfidenceBarProps) {
  const pct = confidence ?? value ?? 0;
  const { language } = useTranslation();

  const getColor = (c: number) => {
    if (c >= 70) return "bg-green-500";
    if (c >= 45) return "bg-yellow-500";
    return "bg-orange-500";
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", getColor(pct))}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 w-12 text-right whitespace-nowrap">
        {toBengaliNum(pct.toFixed(0), language)}%
      </span>
    </div>
  );
}
