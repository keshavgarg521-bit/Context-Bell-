"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface WaveformVisualizerProps {
  className?: string;
  barCount?: number;
  animated?: boolean;
  color?: "amber" | "violet" | "cyan";
}

export function WaveformVisualizer({
  className,
  barCount = 48,
  animated = true,
  color = "amber",
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  const colorMap = {
    amber: "rgba(245, 158, 11, 0.7)",
    violet: "rgba(139, 92, 246, 0.6)",
    cyan: "rgba(34, 211, 238, 0.6)",
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const barW = w / barCount;
    const gap = 2;

    const draw = (time: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = colorMap[color];

      for (let i = 0; i < barCount; i++) {
        const base = Math.sin(i * 0.3) * 0.3 + 0.4;
        const wave = animated ? Math.sin(time * 0.003 + i * 0.4) * 0.35 : 0;
        const height = (base + wave) * h * 0.8;
        const x = i * barW + gap / 2;
        const y = (h - height) / 2;

        ctx.beginPath();
        ctx.roundRect(x, y, barW - gap, height, 1);
        ctx.fill();
      }

      if (animated) {
        frameRef.current = requestAnimationFrame(draw);
      }
    };

    draw(0);
    if (animated) {
      frameRef.current = requestAnimationFrame(draw);
    }

    return () => cancelAnimationFrame(frameRef.current);
  }, [barCount, animated, color]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("w-full h-full", className)}
      style={{ width: "100%", height: "100%" }}
      aria-hidden="true"
    />
  );
}
