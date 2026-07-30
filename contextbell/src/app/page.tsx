"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ContextBell } from "@/components/ContextBell";
import { FlowStrip, SiteHeader } from "@/components/FlowStrip";
import { LectureTimeline } from "@/components/LectureTimeline";
import { WaveformVisualizer } from "@/components/WaveformVisualizer";
import { demoMoments } from "@/lib/mock-data";
import { motion } from "framer-motion";
import { Lock, Play, Radio } from "lucide-react";
import { useState } from "react";

export default function LandingPage() {
  const [captured, setCaptured] = useState(0);

  const markers = demoMoments.map((m) => ({
    id: m.id,
    time: m.timestamp,
    status: m.status,
  }));

  return (
    <>
      <SiteHeader />

      <main className="pt-14">
        {/* Hero */}
        <section className="relative min-h-[90vh] flex items-center overflow-hidden">
          {/* Background orbs */}
          <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-accent-violet/10 blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-accent-amber/10 blur-3xl" />

          <div className="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center w-full">
            {/* Left */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent-cyan/20 bg-accent-cyan/5 text-accent-cyan text-xs font-mono mb-6">
                <Radio className="w-3 h-3 animate-pulse" />
                Listening for the moments that matter
              </div>

              <h1 className="font-[family-name:var(--font-plus-jakarta)] text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-text-primary">
                Capture{" "}
                <span className="gradient-text">confusion</span>
                <br />
                the moment it happens
              </h1>

              <p className="mt-6 text-lg text-text-secondary max-w-md leading-relaxed">
                Start an offline lecture session. Audio stays in a rolling buffer — press the bell when confused to save 15 seconds before and after that moment.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/join">
                  <Button size="lg">Start Session</Button>
                </Link>
                <Link href="/session/demo">
                  <Button size="lg" variant="secondary">
                    <Play className="w-4 h-4" />
                    Watch Demo
                  </Button>
                </Link>
              </div>

              <p className="mt-4 flex items-center gap-2 text-xs text-text-muted">
                <Lock className="w-3 h-3" />
                Audio buffer only — nothing stored until you press the bell
              </p>
            </motion.div>

            {/* Right — interactive demo */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <div className="glass-panel rounded-2xl p-6 border border-white/8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-radial from-accent-amber/5 via-transparent to-transparent pointer-events-none" />

                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono text-accent-cyan flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    LIVE · Signals & Systems
                  </span>
                  <span className="font-mono text-xs text-text-muted">00:30:42</span>
                </div>

                <div className="h-12 mb-4 opacity-60">
                  <WaveformVisualizer color="violet" />
                </div>

                <div className="space-y-2 mb-6 text-sm">
                  <p className="text-text-muted font-mono text-xs">00:00:28</p>
                  <p className="text-text-primary">
                    Think of it as moving from the{" "}
                    <span className="text-accent-amber">time domain</span> to the s-domain.
                  </p>
                </div>

                <div className="flex justify-center py-4">
                  <ContextBell
                    size="sm"
                    capturedCount={captured}
                    onCapture={() => setCaptured((c) => c + 1)}
                  />
                </div>

                <div className="mt-4">
                  <LectureTimeline
                    currentTime={1842}
                    markers={markers.slice(0, captured || 1)}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Flow strip */}
        <section className="py-20 border-t border-white/5">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="font-[family-name:var(--font-plus-jakarta)] text-2xl font-bold text-text-primary mb-2">
              How it works
            </h2>
            <p className="text-text-secondary mb-10">Five steps from confusion to clarity</p>
            <FlowStrip />
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 text-center border-t border-white/5">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="font-[family-name:var(--font-plus-jakarta)] text-3xl font-bold text-text-primary">
              Never miss a moment again
            </h2>
            <p className="mt-4 text-text-secondary">
              Join your next lecture and capture confusion as it happens.
            </p>
            <Link href="/join" className="inline-block mt-8">
              <Button size="lg">Get Started</Button>
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
