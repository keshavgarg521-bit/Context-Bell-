import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { Bell, BookOpen, Mic, Sparkles, Play, Radio, Lock } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useState } from "react";
import { ContextBell } from "@/components/enhanced/ContextBell";
import { FlowStrip } from "@/components/enhanced/FlowStrip";
import { LectureTimeline } from "@/components/enhanced/LectureTimeline";
import { WaveformVisualizer } from "@/components/enhanced/WaveformVisualizer";
import { demoMoments } from "@/lib/mock-data";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [captured, setCaptured] = useState(0);

  const markers = demoMoments.map((m) => ({
    id: m.id,
    time: m.timestamp,
    status: m.status,
  }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-40 glass-panel border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">ContextBell</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/revision">
              <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Revision</span>
            </Link>
            <Link href="/teacher">
              <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Teacher</span>
            </Link>
          </nav>
          <div>
            {isAuthenticated ? (
              <Link href="/join">
                <Button size="sm" className="cursor-pointer">Start Session</Button>
              </Link>
            ) : (
              <Button size="sm" onClick={() => startLogin()} className="cursor-pointer">
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="pt-14">
        {/* Hero */}
        <section className="relative min-h-[90vh] flex items-center overflow-hidden">
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

              <h1 className="text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
                Capture <span className="gradient-text">confusion</span>
                <br />
                the moment it happens
              </h1>

              <p className="mt-6 text-lg text-muted-foreground max-w-md leading-relaxed">
                Ring the bell when you're lost. ContextBell captures the audio, transcribes the lecture,
                and uses AI to explain exactly what you missed.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                {isAuthenticated ? (
                  <Link href="/join">
                    <Button size="lg" className="text-lg px-8 cursor-pointer">
                      <Mic className="w-5 h-5 mr-2" />
                      Start a Session
                    </Button>
                  </Link>
                ) : (
                  <Button size="lg" onClick={() => startLogin()} className="text-lg px-8 cursor-pointer">
                    <Mic className="w-5 h-5 mr-2" />
                    Get Started Free
                  </Button>
                )}
                <Link href="/revision">
                  <Button size="lg" variant="outline" className="text-lg px-8 cursor-pointer">
                    <BookOpen className="w-5 h-5 mr-2" />
                    View Revisions
                  </Button>
                </Link>
              </div>

              <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
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
              <div className="glass-panel rounded-2xl p-6 border border-white/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-radial from-accent-amber/5 via-transparent to-transparent pointer-events-none" />

                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono text-accent-cyan flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    LIVE · Signals & Systems
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">00:30:42</span>
                </div>

                <div className="h-12 mb-4 opacity-60">
                  <WaveformVisualizer color="violet" />
                </div>

                <div className="space-y-2 mb-6 text-sm">
                  <p className="text-muted-foreground font-mono text-xs">00:00:28</p>
                  <p className="text-foreground">
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
            <h2 className="text-2xl font-bold text-foreground mb-2">
              How it works
            </h2>
            <p className="text-muted-foreground mb-10">Five steps from confusion to clarity</p>
            <FlowStrip />
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 text-center border-t border-white/5">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-foreground">
              Never miss a moment again
            </h2>
            <p className="mt-4 text-muted-foreground">
              Join your next lecture and capture confusion as it happens.
            </p>
            <Link href="/join" className="inline-block mt-8">
              <Button size="lg">Get Started</Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        <div className="container">
          <p>ContextBell — Ring the bell. Ring the clarity.</p>
        </div>
      </footer>
    </div>
  );
}
