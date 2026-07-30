"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { SiteHeader } from "@/components/FlowStrip";
import { ArrowLeft } from "lucide-react";
import { FormEvent, useState } from "react";

export default function JoinPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const id = `offline-${Date.now()}`;
    sessionStorage.setItem("contextbell-session-draft", JSON.stringify({ title: title.trim(), name: name.trim() }));
    router.push(`/session/${id}`);
  };

  return (
    <>
      <SiteHeader />
      <main className="pt-14 min-h-screen flex items-center justify-center px-6">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-accent-violet/5 blur-3xl pointer-events-none" />

        <div className="w-full max-w-md relative">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>

          <div className="glass-panel rounded-2xl p-8 border border-white/8">
            <h1 className="font-[family-name:var(--font-plus-jakarta)] text-2xl font-bold text-text-primary">
              Create an offline session
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Give this in-person lecture a name, then start recording with your microphone.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label htmlFor="title" className="block text-xs uppercase tracking-wider text-text-muted mb-2">
                  Lecture title
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Introduction to thermodynamics"
                  className="w-full px-4 py-3 rounded-lg bg-bg-elevated-2 border border-white/10 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-amber/50 focus:ring-1 focus:ring-accent-amber/30 transition-colors"
                  required
                />
              </div>

              <div>
                <label htmlFor="name" className="block text-xs uppercase tracking-wider text-text-muted mb-2">
                  Your name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Chen"
                  className="w-full px-4 py-3 rounded-lg bg-bg-elevated-2 border border-white/10 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-amber/50 focus:ring-1 focus:ring-accent-amber/30 transition-colors"
                  required
                />
              </div>

              <Button type="submit" size="lg" className="w-full mt-2">
                Create session
              </Button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
