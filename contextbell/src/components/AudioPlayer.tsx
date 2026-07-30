"use client";

import { cn } from "@/lib/utils";
import { Pause, Play } from "lucide-react";
import { useRef, useState } from "react";

interface AudioPlayerProps {
  src?: string;
  label?: string;
  className?: string;
}

export function AudioPlayer({ src, label = "30s clip (−15s to +15s)", className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  if (!src) {
    return (
      <div className={cn("glass-panel rounded-xl p-4 border border-white/5", className)}>
        <p className="text-sm text-text-muted">{label}</p>
        <p className="text-xs text-text-muted mt-2">
          Audio clip will appear here after bell capture (15s before + 15s after)
        </p>
        <div className="mt-3 h-2 rounded-full bg-bg-elevated-2 overflow-hidden">
          <div className="h-full w-1/2 bg-accent-amber/30 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("glass-panel rounded-xl p-4 border border-white/5", className)}>
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            const audio = audioRef.current;
            if (!audio) return;
            if (playing) {
              audio.pause();
            } else {
              audio.play();
            }
            setPlaying(!playing);
          }}
          className="w-10 h-10 rounded-full bg-accent-amber/20 flex items-center justify-center text-accent-amber hover:bg-accent-amber/30 transition-colors shrink-0"
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <div className="flex-1">
          <p className="text-sm text-text-primary">{label}</p>
          <p className="text-xs text-text-muted">15 seconds before bell + 15 seconds after</p>
        </div>
      </div>
      <audio
        ref={audioRef}
        src={src}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
    </div>
  );
}
