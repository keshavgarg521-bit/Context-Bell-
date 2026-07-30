"use client";

import { motion } from "framer-motion";
import { cn, formatTime } from "@/lib/utils";

interface TimelineMarker {
  id: string;
  time: number;
  label?: string;
  status?: "unresolved" | "reviewing" | "understood";
}

interface LectureTimelineProps {
  duration?: number;
  currentTime?: number;
  markers?: TimelineMarker[];
  className?: string;
  onMarkerClick?: (id: string) => void;
}

const statusColors = {
  unresolved: "bg-accent-amber",
  reviewing: "bg-accent-violet",
  understood: "bg-status-understood",
};

export function LectureTimeline({
  duration = 3600,
  currentTime = 1842,
  markers = [],
  className,
  onMarkerClick,
}: LectureTimelineProps) {
  const progress = (currentTime / duration) * 100;

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="font-mono text-xs text-text-muted">00:00</span>
        <span className="font-mono text-xs text-accent-cyan">{formatTime(currentTime)}</span>
        <span className="font-mono text-xs text-text-muted">{formatTime(duration)}</span>
      </div>

      <div className="relative h-16 rounded-lg bg-bg-elevated-1 border border-white/5 overflow-hidden">
        {/* Waveform background */}
        <div className="absolute inset-0 opacity-40">
          <svg className="w-full h-full" preserveAspectRatio="none">
            <path
              d="M0,32 Q50,20 100,35 T200,28 T300,40 T400,25 T500,38 T600,30 T700,42 T800,28"
              fill="none"
              stroke="rgba(139, 92, 246, 0.4)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>

        {/* Topic segments */}
        <div className="absolute inset-y-0 left-0 w-[30%] bg-accent-violet/5 border-r border-white/5" />
        <div className="absolute inset-y-0 left-[30%] w-[40%] bg-accent-amber/5 border-r border-white/5" />
        <div className="absolute inset-y-0 left-[70%] w-[30%] bg-accent-cyan/5" />

        {/* Markers */}
        {markers.map((marker) => {
          const left = (marker.time / duration) * 100;
          return (
            <motion.button
              key={marker.id}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-bg-base z-10",
                statusColors[marker.status ?? "unresolved"],
                "hover:scale-125 transition-transform cursor-pointer"
              )}
              style={{ left: `${left}%` }}
              onClick={() => onMarkerClick?.(marker.id)}
              initial={{ scale: 0, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              title={marker.label ?? formatTime(marker.time)}
            />
          );
        })}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-accent-cyan z-20"
          style={{ left: `${progress}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-accent-cyan" />
        </div>
      </div>
    </div>
  );
}
