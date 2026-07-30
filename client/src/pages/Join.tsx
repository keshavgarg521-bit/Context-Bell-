import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Bell, BookOpen, LogIn } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { startLogin } from "@/const";
import { Link, useLocation } from "wouter";

export default function JoinPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");

  const createMutation = trpc.session.create.useMutation({
    onSuccess: (data) => {
      toast.success("Session created! Starting recording...");
      navigate(`/session/${data.id}`);
    },
    onError: (err) => {
      toast.error(`Failed to create session: ${err.message}`);
    },
  });

  const handleStart = () => {
    if (!title.trim()) {
      toast.error("Please enter a session title");
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      topic: topic.trim() || undefined,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <LogIn className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Sign In to Start</h1>
          <p className="text-muted-foreground mb-6">You need to be signed in to create a session.</p>
          <Button onClick={() => startLogin()} size="lg" className="cursor-pointer">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <span className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-4">
              <Bell className="w-5 h-5" />
              ContextBell
            </span>
          </Link>
          <h1 className="text-3xl font-bold mb-2">New Lecture Session</h1>
          <p className="text-muted-foreground">
            Set up your offline lecture session. Ring the bell when you're confused.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Session Title *</label>
            <Input
              placeholder="e.g. Physics Lecture - Quantum Mechanics"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Topic (optional)</label>
            <Input
              placeholder="e.g. Wave-particle duality"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="h-11"
            />
          </div>

          <Button
            onClick={handleStart}
            disabled={createMutation.isPending || !title.trim()}
            className="w-full h-12 text-lg cursor-pointer"
          >
            {createMutation.isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Creating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Start Session
              </span>
            )}
          </Button>
        </div>

        <div className="mt-6 text-center">
          <Link href="/revision">
            <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              View past revisions →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
