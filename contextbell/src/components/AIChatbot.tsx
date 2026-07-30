"use client";

import { cn } from "@/lib/utils";
import { getSession } from "@/lib/session-store";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AIChatbotProps {
  sessionTitle: string;
  sessionId: string;
  momentCount: number;
  defaultOpen?: boolean;
}

export function AIChatbot({ sessionTitle, sessionId, momentCount, defaultOpen = false }: AIChatbotProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Hi! I'm your lecture assistant for **${sessionTitle}**. Ask me about any topic, your ${momentCount} confusion moment(s), or request a step-by-step explanation.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, sessionId, session: getSession(sessionId) }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, I couldn't process that. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full",
          "bg-gradient-to-br from-accent-violet to-accent-amber",
          "flex items-center justify-center shadow-lg shadow-accent-violet/30",
          "hover:scale-105 transition-transform",
          open && "hidden"
        )}
        aria-label="Open AI chat"
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </button>

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-h-[520px] flex flex-col glass-panel rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-bg-elevated-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent-violet" />
              <span className="text-sm font-medium text-text-primary">Lecture AI</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[360px]">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "text-sm leading-relaxed rounded-xl px-3 py-2 max-w-[90%]",
                  msg.role === "user"
                    ? "ml-auto bg-accent-amber/10 text-text-primary border border-accent-amber/20"
                    : "bg-bg-elevated-2 text-text-secondary border border-white/5"
                )}
              >
                {msg.content.split("\n").map((line, j) => (
                  <span key={j}>
                    {line.split("**").map((part, k) =>
                      k % 2 === 1 ? <strong key={k} className="text-text-primary">{part}</strong> : part
                    )}
                    {j < msg.content.split("\n").length - 1 && <br />}
                  </span>
                ))}
              </div>
            ))}
            {loading && (
              <div className="text-sm text-text-muted animate-pulse">Thinking…</div>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={sendMessage} className="p-3 border-t border-white/5 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about the lecture…"
              className="flex-1 px-3 py-2 rounded-lg bg-bg-elevated-2 border border-white/10 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-violet/50"
            />
            <button
              type="submit"
              disabled={loading}
              className="p-2 rounded-lg bg-accent-violet/20 text-accent-violet hover:bg-accent-violet/30 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
