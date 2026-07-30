"use client";

import { useCallback, useRef, useState } from "react";

type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
};

type RecognitionConstructor = new () => Recognition;

export function useSpeechTranscript() {
  const [lines, setLines] = useState<string[]>([]);
  const recognition = useRef<Recognition | null>(null);

  const startTranscript = useCallback(() => {
    const SpeechRecognition = (window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }).SpeechRecognition
      ?? (window as Window & { webkitSpeechRecognition?: RecognitionConstructor }).webkitSpeechRecognition;
    if (!SpeechRecognition || recognition.current) return;
    const engine = new SpeechRecognition();
    engine.continuous = true;
    engine.interimResults = false;
    engine.lang = navigator.language || "en-US";
    engine.onresult = (event) => {
      const next = Array.from(event.results).filter((result) => result.isFinal).map((result) => result[0].transcript.trim()).filter(Boolean);
      if (next.length) setLines((previous) => [...previous, ...next].slice(-30));
    };
    engine.onerror = () => undefined;
    engine.start();
    recognition.current = engine;
  }, []);

  const stopTranscript = useCallback(() => {
    recognition.current?.stop();
    recognition.current = null;
  }, []);

  const latestContext = useCallback(() => lines.slice(-4).join(" "), [lines]);

  return { lines, startTranscript, stopTranscript, latestContext };
}
