"use client";

import { SiteHeader } from "@/components/FlowStrip";
import { WaveformVisualizer } from "@/components/WaveformVisualizer";
import { getTeacherStats } from "@/lib/session-store";
import { teacherInsights } from "@/lib/mock-data";
import { AlertTriangle, Lightbulb, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";

export default function TeacherPage() {
  const [liveStats, setLiveStats] = useState<ReturnType<typeof getTeacherStats>>([]);

  useEffect(() => {
    setLiveStats(getTeacherStats());
  }, []);

  const latestSession = liveStats[liveStats.length - 1];
  const weakTopics = latestSession?.weakTopics.length
    ? latestSession.weakTopics
    : teacherInsights.weakTopics;
  const headline = latestSession
    ? `${latestSession.weakTopics[0]?.percent ?? 42}% of confusion occurred during ${latestSession.weakTopics[0]?.topic ?? "source transformation"}.`
    : teacherInsights.headline;
  const totalMoments = latestSession?.totalMoments ?? 38;
  const { suggestions, timelineSpikes } = teacherInsights;

  return (
    <>
      <SiteHeader />
      <main className="pt-14 min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="mb-10">
            <p className="text-xs uppercase tracking-wider text-text-muted mb-2">Teacher Analytics</p>
            <h1 className="font-[family-name:var(--font-plus-jakarta)] text-3xl font-bold text-text-primary">
              Lecture insights
            </h1>
            <p className="mt-1 text-sm text-text-muted flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Anonymous · {latestSession?.title ?? "Signals & Systems"} · {latestSession?.date ?? "Today"}
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-8 border border-accent-amber/20 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-amber/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <TrendingUp className="w-5 h-5 text-accent-amber mb-3" />
              <p className="font-[family-name:var(--font-plus-jakarta)] text-2xl lg:text-3xl font-bold text-text-primary leading-snug">
                {headline}
              </p>
              <p className="mt-3 text-sm text-text-secondary">
                Based on {totalMoments} captured confusion moments · Use this to improve your teaching approach
              </p>
            </div>
          </div>

          {/* Teaching improvement suggestions */}
          <section className="glass-panel rounded-xl p-6 border border-accent-violet/20 mb-8">
            <h2 className="font-[family-name:var(--font-plus-jakarta)] font-semibold text-text-primary mb-4">
              How to improve based on confusion data
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { title: "Slow down at weak topics", desc: "Students struggled most where bell presses clustered. Add pauses and check understanding." },
                { title: "Add concrete examples", desc: "Confusion often happens during abstract transitions. Use real-world analogies." },
                { title: "Recap before moving on", desc: "Spend 2–3 minutes summarizing before starting the next topic." },
              ].map((tip) => (
                <div key={tip.title} className="p-4 rounded-xl bg-bg-elevated-2 border border-white/5">
                  <p className="text-sm font-medium text-text-primary">{tip.title}</p>
                  <p className="text-xs text-text-muted mt-2">{tip.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-panel rounded-xl p-6 border border-white/5 mb-8">
            <h2 className="font-[family-name:var(--font-plus-jakarta)] font-semibold text-text-primary mb-4">
              Confusion timeline
            </h2>
            <div className="h-16 mb-4 opacity-60">
              <WaveformVisualizer color="violet" barCount={64} />
            </div>
            <div className="relative h-8 bg-bg-elevated-2 rounded-lg overflow-hidden">
              {timelineSpikes.map((pos, i) => (
                <div
                  key={i}
                  className="absolute bottom-0 w-1 bg-accent-amber rounded-t"
                  style={{
                    left: `${pos}%`,
                    height: `${30 + (i * 17) % 70}%`,
                    opacity: 0.4 + (i * 0.1) % 0.6,
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 font-mono text-xs text-text-muted">
              <span>00:00</span>
              <span>00:30</span>
              <span>01:00</span>
            </div>
          </section>

          <div className="grid md:grid-cols-2 gap-6">
            <section className="glass-panel rounded-xl p-6 border border-white/5">
              <div className="flex items-center gap-2 mb-5">
                <AlertTriangle className="w-4 h-4 text-accent-amber" />
                <h2 className="font-[family-name:var(--font-plus-jakarta)] font-semibold text-text-primary">
                  Weak topics (confusion points)
                </h2>
              </div>
              <div className="space-y-4">
                {weakTopics.map((topic) => (
                  <div key={topic.topic}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-text-primary">{topic.topic}</span>
                      <span className="font-mono text-accent-amber">{topic.percent}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-elevated-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent-amber to-accent-violet"
                        style={{ width: `${topic.percent}%` }}
                      />
                    </div>
                    <p className="text-xs text-text-muted mt-1">{topic.moments} confusion moment(s)</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="glass-panel rounded-xl p-6 border border-white/5">
              <div className="flex items-center gap-2 mb-5">
                <Lightbulb className="w-4 h-4 text-accent-violet" />
                <h2 className="font-[family-name:var(--font-plus-jakarta)] font-semibold text-text-primary">
                  AI teaching suggestions
                </h2>
              </div>
              <ul className="space-y-3">
                {suggestions.map((s, i) => (
                  <li
                    key={i}
                    className="flex gap-3 text-sm text-text-secondary leading-relaxed p-3 rounded-lg bg-bg-elevated-2/50 border border-white/5"
                  >
                    <span className="shrink-0 font-mono text-xs text-accent-violet pt-0.5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {liveStats.length > 0 && (
            <section className="mt-8 glass-panel rounded-xl p-6 border border-white/5">
              <h2 className="font-[family-name:var(--font-plus-jakarta)] font-semibold text-text-primary mb-4">
                Recent sessions
              </h2>
              <div className="space-y-3">
                {liveStats.map((s) => (
                  <div key={s.sessionId} className="flex items-center justify-between p-3 rounded-lg bg-bg-elevated-2/50 border border-white/5">
                    <div>
                      <p className="text-sm text-text-primary">{s.title}</p>
                      <p className="text-xs text-text-muted">{s.date}</p>
                    </div>
                    <span className="text-xs font-mono text-accent-amber">{s.totalMoments} moments</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
