"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AIChatbot } from "@/components/AIChatbot";
import { ContextBell } from "@/components/ContextBell";
import { LectureTimeline } from "@/components/LectureTimeline";
import { WaveformVisualizer } from "@/components/WaveformVisualizer";
import { useSession } from "@/context/SessionContext";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { useSpeechTranscript } from "@/hooks/useSpeechTranscript";
import { getSession } from "@/lib/session-store";
import { formatTime } from "@/lib/utils";
import { Clock3, Mic, MicOff, Play, Sparkles, Square, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function LiveSessionContent({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { session, elapsed, initSession, captureMoment, attachAudio, removeMoment, endLecture, tick } = useSession();
  const { isListening, phase, error, startListening, stopListening, captureMoment: captureAudio } = useAudioCapture();
  const { lines, startTranscript, stopTranscript, latestContext } = useSpeechTranscript();
  const [toast, setToast] = useState("");
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (getSession(sessionId)) return;
    const draft = sessionStorage.getItem("contextbell-session-draft");
    const details = draft ? JSON.parse(draft) as { title?: string; name?: string } : {};
    initSession(sessionId, details.title || "Offline lecture", details.name || "Learner", "OFFLINE");
    sessionStorage.removeItem("contextbell-session-draft");
  }, [sessionId, initSession]);

  useEffect(() => {
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tick]);

  useEffect(() => () => {
    stopListening();
    stopTranscript();
  }, [stopListening, stopTranscript]);

  const moments = session?.moments ?? [];

  const handleCapture = useCallback(async () => {
    if (!isListening) {
      setToast("Start the microphone first, then ring the bell whenever a concept feels unclear.");
      return;
    }
    if (capturing) return;

    setCapturing(true);
    const moment = captureMoment(latestContext());
    setToast("Confusion point marked. Saving its 15-second context window…");
    const audioUrl = await captureAudio();
    attachAudio(moment.id, audioUrl);
    setToast("Context saved. Open the AI tutor for a step-by-step explanation.");
    setCapturing(false);
  }, [attachAudio, captureAudio, captureMoment, capturing, isListening]);

  const startRecording = async () => {
    await startListening();
    startTranscript();
  };

  const stopRecording = () => {
    stopListening();
    stopTranscript();
  };

  const handleEndSession = () => {
    endLecture();
    stopRecording();
    router.push(`/session/${sessionId}/review`);
  };

  const markers = moments.map((moment) => ({ id: moment.id, time: moment.timestamp, status: moment.status }));

  return (
    <main className="min-h-screen bg-bg-base text-text-primary">
      <header className="border-b border-white/5 bg-bg-elevated-1/80 backdrop-blur px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-accent-cyan">Offline session</p>
          <h1 className="font-[family-name:var(--font-plus-jakarta)] font-semibold text-base">{session?.title ?? "Preparing session"}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-text-secondary">{formatTime(elapsed)}</span>
          <span className={`hidden sm:flex items-center gap-1.5 text-xs ${isListening ? "text-status-understood" : "text-text-muted"}`}>
            {isListening ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            {isListening ? "Microphone recording" : "Microphone off"}
          </span>
          <button onClick={handleEndSession} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20">
            <Square className="w-3.5 h-3.5" /> End session
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-8 grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
        <section className="glass-panel rounded-3xl border border-white/8 p-6 sm:p-10 min-h-[570px] flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute inset-x-10 top-12 h-24 opacity-20"><WaveformVisualizer color="amber" animated={isListening} /></div>
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.2em] text-text-muted">In-person lecture recorder</p>
            <h2 className="mt-3 text-3xl font-[family-name:var(--font-plus-jakarta)] font-bold">Mark the moment you get stuck</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary">Your microphone records the lecture. Ring the bell at the exact confusion point and ContextBell saves the 15 seconds before and after it for review.</p>
          </div>

          <div className="relative mt-10">
            <ContextBell capturedCount={moments.length} onCapture={handleCapture} />
          </div>

          {!isListening ? (
            <button onClick={startRecording} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-accent-violet px-5 py-3 text-sm font-semibold text-white hover:bg-accent-violet/85">
              <Play className="w-4 h-4 fill-current" /> Start microphone recording
            </button>
          ) : (
            <button onClick={stopRecording} className="mt-8 inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-text-secondary hover:bg-white/5">
              <MicOff className="w-4 h-4" /> Pause recording
            </button>
          )}

          <div className="mt-5 inline-flex items-center gap-2 text-xs text-text-muted"><Clock3 className="w-3.5 h-3.5" /> 15 seconds before + 15 seconds after each bell</div>
          {phase === "capturing-after" && <p className="mt-4 text-sm text-accent-amber animate-pulse">Collecting the 15 seconds after this bell…</p>}
          {toast && <p className="mt-4 max-w-md text-sm text-accent-cyan">{toast}</p>}
          {error && <p className="mt-4 max-w-md text-sm text-red-400">{error}</p>}
          {lines.length > 0 && <p className="mt-4 max-w-lg text-xs leading-5 text-text-muted">Live transcript: {lines.slice(-2).join(" ")}</p>}
        </section>

        <aside className="glass-panel rounded-3xl border border-white/8 p-5 flex flex-col min-h-[570px]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-accent-amber">Confusion points</p>
              <h2 className="mt-1 font-semibold">{moments.length ? `${moments.length} marked moment${moments.length === 1 ? "" : "s"}` : "Nothing marked yet"}</h2>
            </div>
            <Sparkles className="w-5 h-5 text-accent-violet" />
          </div>

          <div className="mt-5 space-y-3 flex-1 overflow-y-auto">
            {moments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm leading-6 text-text-muted">When a part of the lecture is unclear, press the bell. It will appear here immediately, ready for AI explanation and quiz practice.</div>
            ) : moments.map((moment, index) => (
              <article key={moment.id} className="rounded-2xl bg-bg-elevated-2 border border-white/5 p-4">
                <div className="flex gap-3">
                  <span className="font-mono text-xs text-accent-amber pt-0.5">{formatTime(moment.timestamp)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-text-primary">{moment.topic}</p>
                    <p className="mt-1 text-xs leading-5 text-text-secondary">{moment.audioClipUrl ? "30-second context saved" : "Saving 30-second context…"}</p>
                  </div>
                  <button onClick={() => removeMoment(moment.id)} aria-label={`Delete confusion point ${index + 1}`} className="text-text-muted hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
                <Link href={`/moment/${moment.id}?session=${sessionId}`} className="mt-3 inline-flex text-xs font-medium text-accent-violet hover:text-accent-cyan">Open explanation →</Link>
              </article>
            ))}
          </div>

          <Link href={`/session/${sessionId}/review`} className="mt-5 rounded-xl border border-accent-violet/30 bg-accent-violet/10 px-4 py-3 text-center text-sm font-medium text-accent-violet hover:bg-accent-violet/20">Open revision workspace</Link>
        </aside>
      </div>

      <div className="max-w-6xl mx-auto px-5 pb-8"><LectureTimeline currentTime={elapsed} markers={markers} duration={3600} /></div>
      <AIChatbot sessionTitle={session?.title ?? "Offline lecture"} sessionId={sessionId} momentCount={moments.length} defaultOpen />
    </main>
  );
}
