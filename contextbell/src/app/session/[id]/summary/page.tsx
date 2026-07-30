"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AIChatbot } from "@/components/AIChatbot";
import { SiteHeader } from "@/components/FlowStrip";
import { getSession } from "@/lib/session-store";
import type { LectureSession } from "@/lib/types";
import { ArrowLeft, Brain, Loader2 } from "lucide-react";

export default function SummaryPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const [session, setSession] = useState<LectureSession | null>(null);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = getSession(sessionId);
    setSession(s);

    if (s?.lectureSummary) {
      setSummary(s.lectureSummary);
      setLoading(false);
      return;
    }

    fetch("/api/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: s?.title, moments: s?.moments ?? [] }),
    })
      .then((r) => r.json())
      .then((data) => {
        setSummary(data.summary);
        setLoading(false);
      });
  }, [sessionId]);

  return (
    <>
      <SiteHeader />
      <main className="pt-14 min-h-screen">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <Link
            href={`/session/${sessionId}/review`}
            className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to review
          </Link>

          <div className="flex items-center gap-3 mb-8">
            <Brain className="w-6 h-6 text-accent-violet" />
            <div>
              <h1 className="font-[family-name:var(--font-plus-jakarta)] text-3xl font-bold text-text-primary">
                Lecture Summary
              </h1>
              <p className="text-sm text-text-secondary">{session?.title}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 text-text-muted py-20 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating AI summary…
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-8 border border-white/5 prose prose-invert max-w-none">
              {summary.split("\n").map((line, i) => {
                if (line.startsWith("## ")) {
                  return <h2 key={i} className="font-[family-name:var(--font-plus-jakarta)] text-xl font-bold text-text-primary mt-6 mb-3">{line.replace("## ", "")}</h2>;
                }
                if (line.startsWith("### ")) {
                  return <h3 key={i} className="font-semibold text-text-primary mt-4 mb-2">{line.replace("### ", "")}</h3>;
                }
                if (line.match(/^\d+\./)) {
                  return <p key={i} className="text-text-secondary leading-relaxed ml-4">{line}</p>;
                }
                if (line.includes("**")) {
                  const parts = line.split("**");
                  return (
                    <p key={i} className="text-text-secondary leading-relaxed">
                      {parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-text-primary">{part}</strong> : part)}
                    </p>
                  );
                }
                if (line.trim() === "") return <br key={i} />;
                return <p key={i} className="text-text-secondary leading-relaxed">{line}</p>;
              })}
            </div>
          )}
        </div>
      </main>

      <AIChatbot
        sessionTitle={session?.title ?? "Lecture"}
        sessionId={sessionId}
        momentCount={session?.moments.length ?? 0}
      />
    </>
  );
}
