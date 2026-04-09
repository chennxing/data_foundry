"use client";

import React, { type ReactNode, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

export function StageSummaryCard({
  href,
  index,
  title,
  description,
  isActive,
  trailing,
  onNavigate,
}: {
  href: string;
  index: number;
  title: string;
  description: string;
  isActive?: boolean;
  trailing?: ReactNode;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <a
      href={href}
      onClick={onNavigate}
      className={cn(
        "min-w-0 border-r border-border/70 px-3 py-2 transition-colors last:border-r-0 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isActive ? "bg-primary/8" : "bg-transparent",
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border bg-background text-[10px] font-semibold",
            isActive ? "border-primary/30 text-primary" : "border-border/70 text-muted-foreground",
          )}
        >
          {index}
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[13px] font-medium leading-5">{title}</div>
            {trailing}
          </div>
          <div className="text-[10px] leading-4 text-muted-foreground">{description}</div>
        </div>
      </div>
    </a>
  );
}

