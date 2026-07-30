"use client";

import { demoTranscript } from "@/lib/mock-data";
import { cn, formatTime } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface FloatingPanelProps {
  side: "left" | "right";
  title: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}

export function FloatingPanel({ side, title, children, defaultOpen = true }: FloatingPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "flex flex-col transition-all duration-300",
        open ? "w-72" : "w-10",
        side === "left" ? "items-start" : "items-end"
      )}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg glass-panel text-sm text-text-secondary hover:text-text-primary mb-2"
      >
        {side === "left" ? (
          open ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
        ) : open ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
        {open && <span>{title}</span>}
      </button>

      {open && (
        <div className="flex-1 w-full glass-panel rounded-xl p-4 overflow-hidden">
          {children}
        </div>
      )}
    </div>
  );
}

export function TranscriptPanel() {
  return (
    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
      {demoTranscript.map((line) => (
        <div
          key={line.id}
          className={cn(
            "text-sm leading-relaxed transition-colors",
            line.isActive ? "text-text-primary bg-accent-amber/5 -mx-2 px-2 py-1 rounded" : "text-text-secondary"
          )}
        >
          <span className="font-mono text-xs text-text-muted mr-2">{formatTime(line.time)}</span>
          <span className="text-xs text-accent-violet mr-1">{line.speaker}:</span>
          {line.text}
        </div>
      ))}
    </div>
  );
}
