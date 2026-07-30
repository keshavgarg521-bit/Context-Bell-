"use client";

import Link from "next/link";
import { flowSteps } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

export function FlowStrip({ className }: { className?: string }) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-0">
        {flowSteps.map((step, i) => (
          <div key={step.step} className="flex items-center flex-1 min-w-0">
            <div className="flex-1 flex flex-col items-center text-center px-2 py-4 rounded-lg bg-bg-elevated-1/50 border border-white/5 hover:border-white/10 transition-colors">
              <span className="font-mono text-xs text-accent-amber mb-1">0{step.step}</span>
              <span className="font-[family-name:var(--font-plus-jakarta)] font-semibold text-sm text-text-primary">
                {step.label}
              </span>
              <span className="text-xs text-text-muted mt-0.5 hidden sm:block">{step.desc}</span>
            </div>
            {i < flowSteps.length - 1 && (
              <ArrowRight className="hidden sm:block w-4 h-4 text-text-muted shrink-0 mx-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="fixed top-0 inset-x-0 z-40 glass-panel border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
            <span className="text-bg-base text-xs font-bold">CB</span>
          </div>
          <span className="font-[family-name:var(--font-plus-jakarta)] font-semibold text-text-primary">
            ContextBell
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-text-secondary">
          <Link href="/revision" className="hover:text-text-primary transition-colors">
            Revision
          </Link>
          <Link href="/teacher" className="hover:text-text-primary transition-colors">
            Teacher
          </Link>
          <Link
            href="/join"
            className="px-4 py-1.5 rounded-lg bg-accent-amber/10 text-accent-amber border border-accent-amber/20 hover:bg-accent-amber/20 transition-colors"
          >
            Start Session
          </Link>
        </nav>
      </div>
    </header>
  );
}
