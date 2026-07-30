"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CHUNK_MS = 1000;
const BUFFER_SECONDS = 15;

interface AudioChunk {
  blob: Blob;
  time: number;
}

export type CapturePhase = "idle" | "recording" | "capturing-after";

interface PendingCapture {
  beforeChunks: Blob[];
  captureTime: number;
  resolve: (url: string) => void;
}

export function useAudioCapture() {
  const [isListening, setIsListening] = useState(false);
  const [phase, setPhase] = useState<CapturePhase>("idle");
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<AudioChunk[]>([]);
  const pendingRef = useRef<PendingCapture | null>(null);
  const afterChunksRef = useRef<Blob[]>([]);

  const pruneBuffer = useCallback((now: number) => {
    const cutoff = now - BUFFER_SECONDS * 1000;
    chunksRef.current = chunksRef.current.filter((c) => c.time >= cutoff);
  }, []);

  const combineBlobs = useCallback(async (blobs: Blob[]): Promise<string> => {
    if (blobs.length === 0) return "";
    const combined = new Blob(blobs, { type: blobs[0]?.type || "audio/webm" });
    return URL.createObjectURL(combined);
  }, []);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size === 0) return;
        const now = Date.now();
        chunksRef.current.push({ blob: e.data, time: now });
        pruneBuffer(now);

        if (pendingRef.current) {
          afterChunksRef.current.push(e.data);
          const elapsed = now - pendingRef.current.captureTime;
          if (elapsed >= BUFFER_SECONDS * 1000) {
            const allChunks = [...pendingRef.current.beforeChunks, ...afterChunksRef.current];
            combineBlobs(allChunks).then((url) => {
              pendingRef.current?.resolve(url);
              pendingRef.current = null;
              afterChunksRef.current = [];
              setPhase("recording");
            });
          }
        }
      };

      recorder.start(CHUNK_MS);
      setIsListening(true);
      setPhase("recording");
    } catch {
      setError("Microphone access denied. Enable mic in browser settings.");
    }
  }, [combineBlobs, pruneBuffer]);

  const stopListening = useCallback(() => {
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    recorderRef.current = null;
    streamRef.current = null;
    chunksRef.current = [];
    setIsListening(false);
    setPhase("idle");
  }, []);

  const captureMoment = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      const now = Date.now();
      const beforeChunks = chunksRef.current
        .filter((c) => c.time >= now - BUFFER_SECONDS * 1000 && c.time <= now)
        .map((c) => c.blob);

      if (!isListening) {
        resolve("");
        return;
      }

      setPhase("capturing-after");
      pendingRef.current = { beforeChunks, captureTime: now, resolve };
      afterChunksRef.current = [];

      setTimeout(() => {
        if (pendingRef.current) {
          const allChunks = [...pendingRef.current.beforeChunks, ...afterChunksRef.current];
          combineBlobs(allChunks).then((url) => {
            pendingRef.current?.resolve(url);
            pendingRef.current = null;
            afterChunksRef.current = [];
            setPhase("recording");
          });
        }
      }, BUFFER_SECONDS * 1000 + 500);
    });
  }, [combineBlobs, isListening]);

  useEffect(() => {
    return () => {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { isListening, phase, error, startListening, stopListening, captureMoment };
}
