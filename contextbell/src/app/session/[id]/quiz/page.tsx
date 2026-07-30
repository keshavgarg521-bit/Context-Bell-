"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AIChatbot } from "@/components/AIChatbot";
import { QuizSection } from "@/components/QuizSection";
import { SiteHeader } from "@/components/FlowStrip";
import { getSession } from "@/lib/session-store";
import type { LectureSession, QuizQuestion } from "@/lib/types";
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";

export default function QuizPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const [session, setSession] = useState<LectureSession | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = getSession(sessionId);
    setSession(s);

    fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moments: s?.moments ?? [] }),
    })
      .then((r) => r.json())
      .then((data) => {
        setQuestions(data.questions);
        setLoading(false);
      });
  }, [sessionId]);

  return (
    <>
      <SiteHeader />
      <main className="pt-14 min-h-screen">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <Link
            href={`/session/${sessionId}/review`}
            className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to review
          </Link>

          <div className="flex items-center gap-3 mb-8">
            <BookOpen className="w-6 h-6 text-accent-amber" />
            <div>
              <h1 className="font-[family-name:var(--font-plus-jakarta)] text-3xl font-bold text-text-primary">
                Confusion Quiz
              </h1>
              <p className="text-sm text-text-secondary">
                {session?.moments.length ?? 0} confusion point(s) · AI-generated questions
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 text-text-muted py-20 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating quiz from your confusion points…
            </div>
          ) : (
            <QuizSection questions={questions} />
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
