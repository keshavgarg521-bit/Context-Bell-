"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { generateExplanation } from "@/lib/ai-service";
import { createSession, getSession, saveSession, addMomentToSession, removeMomentFromSession, updateMomentAudio } from "@/lib/session-store";
import type { CapturedMoment, LectureSession, TranscriptLine } from "@/lib/types";
import { demoTranscript } from "@/lib/mock-data";

interface SessionContextValue {
  session: LectureSession | null;
  elapsed: number;
  initSession: (id: string, title: string, studentName: string, code: string) => void;
  captureMoment: (quote?: string) => CapturedMoment;
  attachAudio: (momentId: string, audioUrl: string) => void;
  removeMoment: (momentId: string) => void;
  endLecture: () => void;
  tick: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const CONFUSION_SNIPPETS = [
  { quote: "Source transformation is where most students get stuck.", topic: "Laplace Transform" },
  { quote: "The region of convergence determines whether the inverse transform exists.", topic: "ROC" },
  { quote: "Linearity lets us break complex transforms into simpler parts.", topic: "Properties" },
  { quote: "The shifting property changes how we handle exponential factors.", topic: "Shifting Theorem" },
  { quote: "Partial fraction decomposition is essential for inverse transforms.", topic: "Inverse Laplace" },
];

export function SessionProvider({ children, sessionId }: { children: React.ReactNode; sessionId: string }) {
  const [session, setSession] = useState<LectureSession | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const existing = getSession(sessionId);
    if (existing) {
      setSession(existing);
      setElapsed(Math.floor((Date.now() - existing.startedAt) / 1000));
    }
  }, [sessionId]);

  const initSession = useCallback(
    (id: string, title: string, studentName: string, code: string) => {
      const s = createSession(id, title, studentName, code);
      s.transcript = demoTranscript;
      saveSession(s);
      setSession(s);
    },
    []
  );

  const tick = useCallback(() => setElapsed((e) => e + 1), []);

  const captureMoment = useCallback(
    (quote?: string): CapturedMoment => {
      const snippet = CONFUSION_SNIPPETS[Math.floor(Math.random() * CONFUSION_SNIPPETS.length)];
      const moment: CapturedMoment = {
        id: `m-${Date.now()}`,
        timestamp: elapsed,
        quote: quote || snippet.quote,
        topic: snippet.topic,
        status: "unresolved",
        question: `Can you explain ${snippet.topic} again?`,
      };
      moment.explanation = generateExplanation(moment);

      if (session) {
        const updated = addMomentToSession(session.id, moment);
        if (updated) setSession({ ...updated });
      }

      return moment;
    },
    [elapsed, session]
  );

  const endLecture = useCallback(() => {
    if (session) {
      const updated = { ...session, endedAt: Date.now() };
      saveSession(updated);
      setSession(updated);
    }
  }, [session]);

  const attachAudio = useCallback((momentId: string, audioUrl: string) => {
    if (!session || !audioUrl) return;
    const updated = updateMomentAudio(session.id, momentId, audioUrl);
    if (updated) setSession({ ...updated });
  }, [session]);

  const removeMoment = useCallback((momentId: string) => {
    if (!session) return;
    const updated = removeMomentFromSession(session.id, momentId);
    if (updated) setSession({ ...updated });
  }, [session]);

  return (
    <SessionContext.Provider value={{ session, elapsed, initSession, captureMoment, attachAudio, removeMoment, endLecture, tick }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
