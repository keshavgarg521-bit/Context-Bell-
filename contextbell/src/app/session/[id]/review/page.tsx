"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AIChatbot } from "@/components/AIChatbot";
import { AudioPlayer } from "@/components/AudioPlayer";
import { SiteHeader } from "@/components/FlowStrip";
import { Button } from "@/components/ui/Button";
import { getSession } from "@/lib/session-store";
import { generateExplanation } from "@/lib/ai-service";
import type { CapturedMoment, LectureSession } from "@/lib/types";
import { formatTime } from "@/lib/utils";
import { ArrowLeft, BookOpen, Brain, ChevronRight, Lightbulb, Sparkles } from "lucide-react";

export default function ReviewPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const [session, setSession] = useState<LectureSession | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setSession(getSession(sessionId));
  }, [sessionId]);

  const moments = session?.moments ?? [];

  return (
    <>
      <SiteHeader />
      <main className="pt-14 min-h-screen">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </Link>

          <div className="mb-10">
            <p className="text-xs uppercase tracking-wider text-accent-amber mb-2">Lecture Complete</p>
            <h1 className="font-[family-name:var(--font-plus-jakarta)] text-3xl font-bold text-text-primary">
              {session?.title ?? "Lecture"} — Confusion Review
            </h1>
            <p className="mt-2 text-text-secondary">
              {moments.length} confusion point{moments.length !== 1 ? "s" : ""} captured with 30-second audio clips
            </p>
          </div>

          {/* Quick nav */}
          <div className="grid sm:grid-cols-3 gap-4 mb-10">
            <Link href={`/session/${sessionId}/summary`} className="glass-panel rounded-xl p-4 border border-white/5 hover:border-accent-violet/30 transition-colors group">
              <Brain className="w-5 h-5 text-accent-violet mb-2" />
              <p className="font-medium text-text-primary text-sm">Lecture Summary</p>
              <p className="text-xs text-text-muted mt-1">AI-generated overview</p>
              <ChevronRight className="w-4 h-4 text-text-muted mt-2 group-hover:text-accent-violet transition-colors" />
            </Link>
            <Link href={`/session/${sessionId}/quiz`} className="glass-panel rounded-xl p-4 border border-white/5 hover:border-accent-amber/30 transition-colors group">
              <BookOpen className="w-5 h-5 text-accent-amber mb-2" />
              <p className="font-medium text-text-primary text-sm">Quiz</p>
              <p className="text-xs text-text-muted mt-1">Based on confusion points</p>
              <ChevronRight className="w-4 h-4 text-text-muted mt-2 group-hover:text-accent-amber transition-colors" />
            </Link>
            <Link href="/teacher" className="glass-panel rounded-xl p-4 border border-white/5 hover:border-accent-cyan/30 transition-colors group">
              <Sparkles className="w-5 h-5 text-accent-cyan mb-2" />
              <p className="font-medium text-text-primary text-sm">Teacher View</p>
              <p className="text-xs text-text-muted mt-1">Weak topics analysis</p>
              <ChevronRight className="w-4 h-4 text-text-muted mt-2 group-hover:text-accent-cyan transition-colors" />
            </Link>
          </div>

          {/* Confusion points list */}
          <h2 className="font-[family-name:var(--font-plus-jakarta)] text-xl font-bold text-text-primary mb-6">
            Your Confusion Points
          </h2>

          {moments.length === 0 ? (
            <div className="glass-panel rounded-2xl p-10 border border-white/5 text-center">
              <p className="text-text-muted">No confusion moments were captured in this session.</p>
              <Link href={`/session/${sessionId}`}>
                <Button className="mt-4">Back to Session</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {moments.map((moment, i) => (
                <MomentReviewCard
                  key={moment.id}
                  moment={moment}
                  index={i}
                  sessionId={sessionId}
                  expanded={expanded === moment.id}
                  onToggle={() => setExpanded(expanded === moment.id ? null : moment.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <AIChatbot
        sessionTitle={session?.title ?? "Lecture"}
        sessionId={sessionId}
        momentCount={moments.length}
      />
    </>
  );
}

function MomentReviewCard({
  moment,
  index,
  sessionId,
  expanded,
  onToggle,
}: {
  moment: CapturedMoment;
  index: number;
  sessionId: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const explanation = moment.explanation ?? generateExplanation(moment);

  return (
    <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/2 transition-colors"
      >
        <span className="font-mono text-lg text-accent-amber shrink-0">{formatTime(moment.timestamp)}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-text-primary truncate">{moment.topic}</p>
          <p className="text-sm text-text-muted truncate">&ldquo;{moment.quote}&rdquo;</p>
        </div>
        <span className="text-xs px-2 py-1 rounded bg-accent-amber/10 text-accent-amber border border-accent-amber/20 shrink-0">
          #{index + 1}
        </span>
        <ChevronRight className={`w-4 h-4 text-text-muted transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-white/5 pt-5">
          <AudioPlayer src={moment.audioClipUrl} label="Recording: 15s before → 15s after bell" />

          <div className="rounded-xl p-5 border border-white/5 bg-bg-elevated-1">
            <div className="flex items-center gap-2 text-accent-violet mb-3">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Step-by-step explanation</span>
            </div>
            <p className="text-text-secondary leading-relaxed mb-4">{explanation.simple}</p>
            <ol className="space-y-2">
              {explanation.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-accent-violet/10 text-accent-violet flex items-center justify-center text-xs font-mono">
                    {i + 1}
                  </span>
                  <span className="text-text-secondary pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-xl p-4 border-l-4 border-accent-amber bg-accent-amber/5">
            <div className="flex items-center gap-2 text-accent-amber mb-2">
              <Lightbulb className="w-4 h-4" />
              <span className="text-sm font-medium">Analogy</span>
            </div>
            <p className="text-sm text-text-secondary italic">{explanation.analogy}</p>
          </div>

          <div className="rounded-xl p-4 border border-accent-cyan/20 bg-accent-cyan/5">
            <p className="text-xs uppercase tracking-wider text-accent-cyan mb-1">Important</p>
            <p className="text-sm text-text-primary">{explanation.important}</p>
          </div>

          <Link href={`/moment/${moment.id}?session=${sessionId}`}>
            <Button variant="secondary" size="sm">View full detail</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
