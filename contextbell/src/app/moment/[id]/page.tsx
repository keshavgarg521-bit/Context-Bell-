"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AIChatbot } from "@/components/AIChatbot";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Button } from "@/components/ui/Button";
import { generateExplanation } from "@/lib/ai-service";
import { getSession } from "@/lib/session-store";
import type { CapturedMoment, LectureSession } from "@/lib/types";
import { formatTime } from "@/lib/utils";
import { ArrowLeft, Lightbulb, MessageCircle, Sparkles } from "lucide-react";

export default function MomentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session") || "demo";
  const [session, setSession] = useState<LectureSession | null>(null);
  const [moment, setMoment] = useState<CapturedMoment | null>(null);

  useEffect(() => {
    const saved = getSession(sessionId);
    setSession(saved);
    setMoment(saved?.moments.find((item) => item.id === params.id) ?? null);
  }, [params.id, sessionId]);

  const explanation = moment ? moment.explanation ?? generateExplanation(moment) : null;

  if (!moment || !explanation) {
    return <main className="min-h-screen bg-bg-base flex items-center justify-center p-6 text-center"><div><p className="text-text-secondary">This doubt point is not available.</p><Link className="mt-4 inline-block text-accent-violet" href={`/session/${sessionId}/review`}>Back to its session folder</Link></div></main>;
  }

  return (
    <main className="min-h-screen bg-bg-base text-text-primary pb-16">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <Link href={`/session/${sessionId}/review`} className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary"><ArrowLeft className="w-4 h-4" /> Back to {session?.title ?? "session"} folder</Link>
        <div className="mt-8 grid lg:grid-cols-[0.8fr_1.2fr] gap-8 items-start">
          <section className="space-y-5">
            <div className="glass-panel rounded-2xl p-6 border border-white/8">
              <p className="font-mono text-accent-amber">{formatTime(moment.timestamp)}</p>
              <h1 className="mt-2 text-2xl font-bold font-[family-name:var(--font-plus-jakarta)]">{moment.topic}</h1>
              <p className="mt-4 text-sm leading-6 text-text-secondary">This is the exact confusion point marked during the lecture.</p>
            </div>
            <AudioPlayer src={moment.audioClipUrl} label="Captured audio: 15 seconds before + 15 seconds after" />
            <div className="glass-panel rounded-2xl p-6 border border-white/8">
              <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Captured transcript</p>
              <p className="mt-3 leading-7 text-text-primary">“{moment.quote}”</p>
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex items-center gap-2 text-accent-violet"><Sparkles className="w-4 h-4" /><span className="text-sm font-medium">AI explanation for this doubt</span></div>
            <div className="glass-panel rounded-2xl p-6 border border-white/8"><h2 className="font-semibold">Start here</h2><p className="mt-3 leading-7 text-text-secondary">{explanation.simple}</p></div>
            <div className="glass-panel rounded-2xl p-6 border border-white/8"><h2 className="font-semibold">Step by step</h2><ol className="mt-4 space-y-3">{explanation.steps.map((step, index) => <li key={step} className="flex gap-3 text-sm text-text-secondary"><span className="w-6 h-6 shrink-0 rounded-full bg-accent-violet/10 text-accent-violet flex items-center justify-center">{index + 1}</span><span className="pt-0.5">{step}</span></li>)}</ol></div>
            <div className="rounded-2xl border-l-4 border-accent-amber bg-accent-amber/5 p-5"><div className="flex items-center gap-2 text-accent-amber"><Lightbulb className="w-4 h-4" /><span className="font-medium text-sm">Helpful analogy</span></div><p className="mt-2 text-sm leading-6 text-text-secondary">{explanation.analogy}</p></div>
            <div className="rounded-2xl border border-accent-cyan/20 bg-accent-cyan/5 p-5"><p className="text-xs uppercase tracking-[0.16em] text-accent-cyan">Key takeaway</p><p className="mt-2 text-sm leading-6">{explanation.important}</p></div>
            <Button variant="secondary"><MessageCircle className="w-4 h-4" /> Ask the AI tutor about this point</Button>
          </section>
        </div>
      </div>
      <AIChatbot sessionTitle={`${session?.title ?? "Lecture"}: ${moment.topic}`} sessionId={sessionId} momentCount={1} defaultOpen />
    </main>
  );
}
