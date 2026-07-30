"use client";

import Link from "next/link";
import { CapturedMoment } from "@/lib/mock-data";
import { cn, formatTime } from "@/lib/utils";
import { WaveformVisualizer } from "./WaveformVisualizer";
import { ChevronRight } from "lucide-react";

const statusStyles = {
  unresolved: "border-accent-amber/30 glow-amber",
  reviewing: "border-accent-violet/30 glow-violet",
  understood: "border-status-understood/20",
};

const statusLabels = {
  unresolved: "Unresolved",
  reviewing: "Reviewing",
  understood: "Understood",
};

interface MomentCardProps {
  moment: CapturedMoment;
  variant?: "compact" | "full";
}

export function MomentCard({ moment, variant = "compact" }: MomentCardProps) {
  return (
    <Link
      href={`/moment/${moment.id}`}
      className={cn(
        "group block rounded-xl border bg-bg-elevated-1 p-4 transition-all duration-300",
        "hover:-translate-y-0.5 hover:bg-bg-elevated-2",
        statusStyles[moment.status]
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-lg text-accent-amber">{formatTime(moment.timestamp)}</span>
        <span
          className={cn(
            "text-xs px-2 py-0.5 rounded-full border",
            moment.status === "unresolved" && "text-accent-amber border-accent-amber/30 bg-accent-amber/10",
            moment.status === "reviewing" && "text-accent-violet border-accent-violet/30 bg-accent-violet/10",
            moment.status === "understood" && "text-status-understood border-status-understood/30 bg-status-understood/10"
          )}
        >
          {statusLabels[moment.status]}
        </span>
      </div>

      <p className="mt-3 text-sm text-text-primary leading-relaxed line-clamp-2">
        &ldquo;{moment.quote}&rdquo;
      </p>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-text-muted px-2 py-0.5 rounded bg-bg-elevated-2">{moment.topic}</span>
        <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-primary transition-colors" />
      </div>

      {variant === "full" && (
        <div className="mt-4 h-8 opacity-50 group-hover:opacity-80 transition-opacity">
          <WaveformVisualizer barCount={32} color="amber" />
        </div>
      )}
    </Link>
  );
}
