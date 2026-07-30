"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { SiteHeader } from "@/components/FlowStrip";
import { ArrowLeft, Loader2, Mic, Shield } from "lucide-react";
import { useState } from "react";

export default function PermissionsPage() {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const startOfflineSession = async () => {
    try {
      setStarting(true);
      setError("");
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.getTracks().forEach((track) => track.stop());
      router.push("/session/demo");
    } catch {
      setError("Microphone access is needed to start an offline session. Nothing is saved until you press the bell.");
      setStarting(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="pt-14 min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-lg relative">
          <Link
            href="/join"
            className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>

          <div className="glass-panel rounded-2xl p-8 border border-white/8">
            <h1 className="font-[family-name:var(--font-plus-jakarta)] text-2xl font-bold text-text-primary">
              Enable capture for this session
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              This is for an in-person lecture: ContextBell only uses your microphone and saves a 15-second window before and after a bell press.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-bg-elevated-2 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-violet/10 flex items-center justify-center">
                    <Mic className="w-5 h-5 text-accent-violet" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Microphone</p>
                    <p className="text-xs text-text-muted">Captures the lecture voice around you</p>
                  </div>
                </div>
                <span className="text-xs text-text-muted">Requested on start</span>
              </div>

            </div>

            <Button
              size="lg"
              className="w-full mt-8"
              disabled={starting}
              onClick={startOfflineSession}
            >
              {starting ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting session…</> : "Start offline session"}
            </Button>

            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

            <p className="mt-4 flex items-start gap-2 text-xs text-text-muted">
              <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              We only keep 15 seconds before and 15 seconds after a bell press. Nothing is stored otherwise.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
