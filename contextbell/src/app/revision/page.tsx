"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/FlowStrip";
import { getTeacherStats } from "@/lib/session-store";
import { BookOpen, ChevronRight, FolderOpen, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

type SessionFolder = ReturnType<typeof getTeacherStats>[number];

export default function RevisionPage() {
  const [folders, setFolders] = useState<SessionFolder[]>([]);

  useEffect(() => setFolders(getTeacherStats().sort((a, b) => b.date.localeCompare(a.date))), []);

  return (
    <>
      <SiteHeader />
      <main className="pt-14 min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <p className="text-xs uppercase tracking-[0.18em] text-accent-cyan">Revision workspace</p>
          <h1 className="mt-2 font-[family-name:var(--font-plus-jakarta)] text-3xl font-bold text-text-primary">Your lecture folders</h1>
          <p className="mt-3 max-w-2xl text-text-secondary">Every offline lecture is saved as one folder. Open a folder to see its doubt points, then open any doubt for its transcript, detailed AI explanation, and personal tutor.</p>

          <div className="mt-10 grid sm:grid-cols-2 gap-4">
            {folders.length === 0 ? (
              <div className="sm:col-span-2 glass-panel rounded-2xl p-10 border border-dashed border-white/10 text-center">
                <BookOpen className="w-9 h-9 mx-auto text-text-muted mb-3" />
                <p className="text-text-secondary">No lecture folders yet.</p>
                <Link href="/join" className="inline-flex mt-5 text-sm text-accent-violet">Create your first offline session →</Link>
              </div>
            ) : folders.map((folder) => (
              <Link key={folder.sessionId} href={`/session/${folder.sessionId}/review`} className="group glass-panel rounded-2xl border border-white/8 p-6 hover:border-accent-violet/40 hover:bg-white/[0.03] transition-colors">
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-accent-violet/10 flex items-center justify-center"><FolderOpen className="w-5 h-5 text-accent-violet" /></div>
                  <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-accent-violet transition-colors" />
                </div>
                <h2 className="mt-5 font-semibold text-text-primary">{folder.title}</h2>
                <p className="mt-1 text-sm text-text-muted">{folder.date} · {folder.totalMoments} doubt point{folder.totalMoments === 1 ? "" : "s"}</p>
                <div className="mt-5 flex items-center gap-2 text-xs text-accent-amber"><Sparkles className="w-3.5 h-3.5" /> Open doubts & AI review</div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
