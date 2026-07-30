import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Bell, BellOff, Loader2, Mic, StopCircle, Pause, Play } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { ContextBell } from "@/components/enhanced/ContextBell";
import { WaveformVisualizer } from "@/components/enhanced/WaveformVisualizer";
import { toast } from "sonner";
import { Link, useParams } from "wouter";

// ─── Audio Capture Hook with Rolling Buffer ────────────────────────────────────
function useAudioCapture(lectureId: string) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [interimText, setInterimText] = useState<string>("");

  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const rollingBufferRef = useRef<Blob[]>([]); // Rolling 15s buffer
  const fullChunksRef = useRef<Blob[]>([]); // Full recording for playback
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const bufferStartTimeRef = useRef<number>(0);
  const saveTranscriptMutation = trpc.transcript.save.useMutation();

  const syncState = (rec: boolean, paused: boolean) => {
    isRecordingRef.current = rec;
    isPausedRef.current = paused;
    setIsRecording(rec);
    setIsPaused(paused);
  };

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      rollingBufferRef.current = [];
      fullChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          const now = Date.now();
          rollingBufferRef.current.push(e.data);
          fullChunksRef.current.push(e.data);

          if (rollingBufferRef.current.length > 20) {
            rollingBufferRef.current = rollingBufferRef.current.slice(-15);
            bufferStartTimeRef.current = now - 15000;
          }
        }
      };

      recorder.start(1000); // 1-second chunks
      mediaRecorderRef.current = recorder;
      syncState(true, false);
      startTimeRef.current = Date.now();
      bufferStartTimeRef.current = Date.now();

      // Elapsed timer
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      // Speech recognition setup
      if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let finalChunk = "";
          let currentInterim = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const text = result[0].transcript;
            if (result.isFinal) {
              finalChunk += text + " ";
            } else {
              currentInterim += text;
            }
          }

          setInterimText(currentInterim);

          if (finalChunk.trim()) {
            const sessionSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
            saveTranscriptMutation.mutate({
              lectureId,
              text: finalChunk.trim(),
              timestamp: sessionSeconds,
            });
            setTranscript((prev) => [...prev, finalChunk.trim()]);
            setInterimText("");
          }
        };

        recognition.onerror = (err: any) => {
          console.warn("[SpeechRecognition Error]", err?.error || err);
        };

        recognition.onend = () => {
          if (isRecordingRef.current && !isPausedRef.current) {
            try {
              recognition.start();
            } catch {
              // Ignore if already starting
            }
          }
        };

        try {
          recognition.start();
        } catch (e) {
          console.warn("[SpeechRecognition] start error:", e);
        }
        recognitionRef.current = recognition;
      }
      toast.success("Voice recording & live listening started!");
    } catch (err) {
      console.error("Microphone access error:", err);
      toast.error("Microphone access failed. Please enable mic access in your browser.");
    }
  }, [lectureId, saveTranscriptMutation]);

  // Pause/Resume
  const pauseRecording = useCallback(() => {
    if (!mediaRecorderRef.current || !isRecordingRef.current) return;
    if (!isPausedRef.current) {
      try { mediaRecorderRef.current.pause(); } catch {}
      syncState(true, true);
    } else {
      try { mediaRecorderRef.current.resume(); } catch {}
      syncState(true, false);
      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch {}
      }
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      try { mediaRecorderRef.current.stop(); } catch {}
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    syncState(false, false);
    setInterimText("");
  }, []);

  const addSimulatedSpeech = useCallback((simulatedText: string) => {
    const sessionSeconds = Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000);
    saveTranscriptMutation.mutate({
      lectureId,
      text: simulatedText,
      timestamp: sessionSeconds,
    });
    setTranscript((prev) => [...prev, simulatedText]);
  }, [lectureId, saveTranscriptMutation]);

  // Capture complete 30-second audio clip (15s pre-bell + 15s post-bell merged into single playable Blob)
  const captureFull30sAudio = useCallback((): Promise<{ audioBase64: string; mimeType: string; sessionTimestamp: number }> => {
    const preChunks = [...rollingBufferRef.current];
    const sessionTimestamp = Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000);

    return new Promise((resolve) => {
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/wav";
      const postChunks: Blob[] = [];

      if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
        const stream = mediaRecorderRef.current.stream;
        const tempRecorder = new MediaRecorder(stream, { mimeType });

        tempRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) postChunks.push(e.data);
        };

        tempRecorder.onstop = () => {
          const combinedBlob = new Blob([...preChunks, ...postChunks], { type: mimeType });
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(",")[1];
            resolve({ audioBase64: base64, mimeType, sessionTimestamp });
          };
          reader.readAsDataURL(combinedBlob);
        };

        tempRecorder.start(1000);
        setTimeout(() => {
          if (tempRecorder.state !== "inactive") {
            try { tempRecorder.stop(); } catch {}
          }
        }, 15000);
      } else {
        const combinedBlob = new Blob(preChunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          resolve({ audioBase64: base64, mimeType: "audio/webm", sessionTimestamp });
        };
        reader.readAsDataURL(combinedBlob);
      }
    });
  }, []);

  const getTranscriptContext = useCallback(() => {
    return transcript.slice(-12).join(" ");
  }, [transcript]);

  const getSessionTimestamp = useCallback(() => {
    return Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000);
  }, []);

  return {
    isRecording,
    isPaused,
    elapsed,
    transcript,
    interimText,
    addSimulatedSpeech,
    startRecording,
    pauseRecording,
    stopRecording,
    captureFull30sAudio,
    getTranscriptContext,
    getSessionTimestamp,
  };
}

// Enhanced ContextBell component is imported from @/components/enhanced/ContextBell

// ─── Main Live Session Page ───────────────────────────────────────────────────
export default function LiveSession() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const [topic, setTopic] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [postCaptureTimer, setPostCaptureTimer] = useState<number | null>(null);

  const sessionQuery = trpc.session.getById.useQuery(
    { id: id ?? "" },
    { enabled: !!id && isAuthenticated }
  );

  const endSessionMutation = trpc.session.end.useMutation();
  const captureMutation = trpc.moment.capture.useMutation();
  const utils = trpc.useUtils();

  const {
    isRecording,
    isPaused,
    elapsed,
    transcript,
    interimText,
    addSimulatedSpeech,
    startRecording,
    pauseRecording,
    stopRecording,
    captureFull30sAudio,
    getTranscriptContext,
    getSessionTimestamp,
  } = useAudioCapture(id ?? "");

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleBellRing = useCallback(async (sessionTimestamp: number) => {
    if (isCapturing) return;
    setIsCapturing(true);
    toast.success("Bell rung! Capturing 15s pre & 15s post audio & transcript...");

    setPostCaptureTimer(15);
    const countdown = setInterval(() => {
      setPostCaptureTimer((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countdown);
          setPostCaptureTimer(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      const audioResult = await captureFull30sAudio();
      await captureMutation.mutateAsync({
        lectureId: id!,
        timestamp: audioResult.sessionTimestamp || sessionTimestamp,
        topic: topic || undefined,
        transcriptContext: getTranscriptContext(),
        audioBase64: audioResult.audioBase64 || undefined,
        mimeType: audioResult.mimeType || "audio/webm",
      });
      toast.success("30-second audio clip & transcript captured!");
      setTopic("");
      utils.moment.listByLecture.invalidate({ lectureId: id! });
    } catch (err) {
      console.error("Capture failed:", err);
      toast.error("Failed to capture confusion point");
    }

    setIsCapturing(false);
  }, [id, topic, isCapturing, captureFull30sAudio, getTranscriptContext, captureMutation, utils]);

  const handleEndSession = useCallback(() => {
    stopRecording();
    endSessionMutation.mutate(
      { id: id!, duration: elapsed },
      {
        onSuccess: () => {
          toast.success("Session ended. Check your revision!");
          window.location.href = `/session/${id}/review`;
        },
        onError: () => toast.error("Failed to end session"),
      }
    );
  }, [id, elapsed, endSessionMutation, stopRecording]);

  const momentsQuery = trpc.moment.listByLecture.useQuery(
    { lectureId: id ?? "" },
    { enabled: !!id }
  );

  if (sessionQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sessionQuery.data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Session not found</p>
      </div>
    );
  }

  const session = sessionQuery.data;
  const moments = momentsQuery.data ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-md bg-background/80 sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link href="/revision">
              <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
            </Link>
            <div>
              <h1 className="font-semibold text-sm truncate max-w-[200px] md:max-w-none">{session.title}</h1>
              {session.topic && <p className="text-xs text-muted-foreground">{session.topic}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="font-mono text-sm">
              {formatTime(elapsed)}
            </Badge>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleEndSession}
              className="cursor-pointer"
            >
              <StopCircle className="w-4 h-4 mr-1" />
              End
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container py-6">
        <div className="grid lg:grid-cols-[1fr,300px] gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Recording Controls */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-semibold text-lg">Recording</h2>
                  <p className="text-sm text-muted-foreground">
                    {isRecording ? (isPaused ? "Paused" : "Recording in progress") : "Ready to start"}
                  </p>
                </div>
                {isRecording && (
                  <div className={`w-3 h-3 rounded-full ${isPaused ? "bg-muted" : "bg-red-500 animate-pulse"}`} />
                )}
              </div>

              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  size="lg"
                  className="w-full h-14 text-lg cursor-pointer"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  Start Recording
                </Button>
              ) : (
                <Button
                  onClick={pauseRecording}
                  variant="outline"
                  size="lg"
                  className="w-full h-14 text-lg cursor-pointer"
                >
                  {isPaused ? (
                    <><Play className="w-5 h-5 mr-2" /> Resume</>
                  ) : (
                    <><Pause className="w-5 h-5 mr-2" /> Pause</>
                  )}
                </Button>
              )}
            </div>

            {/* Bell Section */}
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <h2 className="font-semibold text-lg mb-2">Confused?</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Ring the bell to capture your confusion point. We record 15s before and 15s after your click.
                You can't ring again for 15 seconds.
              </p>

              <div className="flex flex-col items-center gap-4">
                {postCaptureTimer !== null && (
                  <Badge variant="default" className="mb-2">
                    Capturing post-bell audio... {postCaptureTimer}s
                  </Badge>
                )}
                {isCapturing && (
                  <Badge variant="secondary" className="mb-2">
                    Processing capture...
                  </Badge>
                )}

                <ContextBell onCapture={() => handleBellRing(getSessionTimestamp())} capturedCount={moments.length} />

                <input
                  type="text"
                  placeholder="What confused you? (optional)"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={isCapturing}
                  className="w-full max-w-xs px-4 py-2 rounded-lg bg-secondary border border-border text-sm placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Confusion Points Timeline */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-semibold text-lg mb-4">
                Confusion Points ({moments.length})
              </h2>
              {moments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No confusion points yet. Ring the bell when you're confused!
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {moments.map((moment) => (
                    <div
                      key={moment.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/50"
                    >
                      <Bell className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{moment.topic ?? "General confusion"}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(moment.timestamp)} • {moment.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Live Transcript */}
          <div className="lg:sticky lg:top-20">
            <div className="bg-card border border-border rounded-xl p-4 h-[calc(100vh-100px)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Mic className="w-4 h-4 text-primary" />
                    Live Transcript
                  </h3>
                  {isRecording && (
                    <Badge variant="outline" className="text-xs animate-pulse text-red-400 border-red-500/30">
                      ● Live
                    </Badge>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 max-h-[calc(100vh-220px)] pr-1">
                  {transcript.length === 0 && !interimText ? (
                    <div className="text-center py-8 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {isRecording ? "Listening to microphone... Speak clearly into your mic." : "Click 'Start Recording' to listen to the lecture."}
                      </p>
                    </div>
                  ) : (
                    <>
                      {transcript.map((line, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-secondary/30 border border-border/40 text-sm leading-relaxed">
                          {line}
                        </div>
                      ))}
                      {interimText && (
                        <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary animate-pulse italic">
                          "{interimText}..."
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Speech Simulator Action */}
              <div className="pt-3 border-t border-border mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const samplePhrases = [
                      "The Laplace transform converts a function of time into a function of complex frequency.",
                      "Source transformation is where most students get confused during circuit reduction.",
                      "Remember that linearity allows us to break down complex expressions into simpler parts.",
                      "Let's review the Region of Convergence and poles in the s-domain."
                    ];
                    const randomPhrase = samplePhrases[Math.floor(Math.random() * samplePhrases.length)];
                    addSimulatedSpeech(randomPhrase);
                    toast.info("Added simulated lecture speech line!");
                  }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ⚡ Simulate Lecture Speech Line
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
