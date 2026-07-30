"use client";

import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type BellState = "idle" | "pressed" | "saving" | "cooldown";
const LOCK_SECONDS = 15;

interface ContextBellProps {
  onCapture?: () => void;
  capturedCount?: number;
  size?: "sm" | "lg";
  className?: string;
}

export function ContextBell({ onCapture, capturedCount = 0, size = "lg", className }: ContextBellProps) {
  const [state, setState] = useState<BellState>("idle");
  const [ripples, setRipples] = useState<number[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const lockTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const handlePress = useCallback(() => {
    if (state !== "idle") return;

    setState("pressed");
    setRipples((r) => [...r, Date.now()]);

    setTimeout(() => setState("saving"), 200);
    setTimeout(() => {
      setState("cooldown");
      onCapture?.();
    }, 800);
    setSecondsLeft(LOCK_SECONDS);
    lockTimer.current = setInterval(() => {
      setSecondsLeft((seconds) => {
        if (seconds <= 1) {
          if (lockTimer.current) clearInterval(lockTimer.current);
          lockTimer.current = null;
          setState("idle");
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
  }, [state, onCapture]);

  const isLarge = size === "lg";

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && state === "idle") {
        e.preventDefault();
        handlePress();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [state, handlePress]);

  useEffect(() => () => {
    if (lockTimer.current) clearInterval(lockTimer.current);
  }, []);

  const bellSize = isLarge ? "w-28 h-28" : "w-20 h-20";
  const iconSize = isLarge ? "w-10 h-10" : "w-7 h-7";

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="relative flex items-center justify-center">
        {/* Cooldown ring */}
        {state === "cooldown" && (
          <motion.div
            className="absolute rounded-full border-2 border-accent-amber/40"
            style={{ width: isLarge ? 160 : 120, height: isLarge ? 160 : 120 }}
            initial={{ scale: 0.8, opacity: 1 }}
            animate={{ scale: 1.1, opacity: 0 }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
        )}

        {/* Waveform arcs */}
        <motion.div
          className="absolute rounded-full border border-accent-amber/20"
          style={{ width: isLarge ? 140 : 100, height: isLarge ? 140 : 100 }}
          animate={state === "idle" ? { scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] } : {}}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute rounded-full border border-accent-violet/15"
          style={{ width: isLarge ? 168 : 120, height: isLarge ? 168 : 120 }}
          animate={state === "idle" ? { scale: [1, 1.03, 1], opacity: [0.2, 0.35, 0.2] } : {}}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />

        {/* Ripples */}
        {ripples.map((id) => (
          <motion.div
            key={id}
            className="absolute rounded-full border-2 border-accent-amber/60"
            style={{ width: isLarge ? 112 : 80, height: isLarge ? 112 : 80 }}
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            onAnimationComplete={() => setRipples((r) => r.filter((x) => x !== id))}
          />
        ))}

        {/* Bell button */}
        <motion.button
          onClick={handlePress}
          disabled={state !== "idle"}
          className={cn(
            bellSize,
            "relative rounded-full flex items-center justify-center",
            "bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600",
            "shadow-lg shadow-amber-500/30",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base",
            "disabled:cursor-not-allowed"
          )}
          animate={
            state === "pressed"
              ? { scale: 0.92, rotate: [0, -8, 8, -4, 0] }
              : state === "idle"
                ? { scale: [1, 1.02, 1] }
                : { scale: 1 }
          }
          transition={
            state === "pressed"
              ? { duration: 0.3 }
              : state === "idle"
                ? { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.2 }
          }
          aria-label="Capture confusion moment"
        >
          <Bell className={cn(iconSize, "text-bg-base drop-shadow-sm")} fill="currentColor" />
        </motion.button>
      </div>

      <div className="text-center space-y-1">
        <p className="text-sm text-text-secondary">
          {state === "saving" ? "Marking confusion point…" : state === "cooldown" ? `Bell locked for ${secondsLeft}s` : "Tap when confused"}
        </p>
        <p className="font-mono text-xs text-text-muted">
          <kbd className="px-1.5 py-0.5 rounded bg-bg-elevated-2 border border-white/10">Space</kbd>
          <span className="ml-2">{state === "idle" ? "Bell ready" : "Capturing context"}</span>
          {capturedCount > 0 && <span className="ml-2">· {capturedCount} captured</span>}
        </p>
      </div>
    </div>
  );
}
