import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Bell, BookOpen, Brain, GraduationCap, Sparkles, MessageCircle, Loader2 } from "lucide-react";
import { Link, useParams } from "wouter";
import { useState, useEffect } from "react";

import { toast } from "sonner";
import { Streamdown } from "streamdown";

function MomentDoubtSolver({ lectureId, topic, context }: { lectureId: string; topic: string | null; context: string | null }) {
  const [doubtText, setDoubtText] = useState("");
  const [answers, setAnswers] = useState<Array<{ question: string; answer: string }>>([]);

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data, variables) => {
      const userQ = variables.messages[variables.messages.length - 1]?.content || doubtText;
      setAnswers((prev) => [...prev, { question: userQ, answer: data.response }]);
      setDoubtText("");
    },
    onError: () => toast.error("Failed to solve doubt"),
  });

  const handleAsk = () => {
    if (!doubtText.trim()) return;
    const prompt = `Student doubt regarding topic "${topic || "Lecture Concept"}": "${doubtText.trim()}". Captured transcript context: "${context || "N/A"}"`;
    chatMutation.mutate({
      lectureId,
      messages: [{ role: "user", content: prompt }],
    });
  };

  return (
    <div className="mt-4 pt-4 border-t border-border/40 space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
        <MessageCircle className="w-3.5 h-3.5" />
        <span>Ask a Doubt about this Topic</span>
      </div>

      {answers.map((item, idx) => (
        <div key={idx} className="p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-2 text-sm">
          <p className="font-medium text-foreground">❓ {item.question}</p>
          <div className="prose prose-invert prose-sm max-w-none text-muted-foreground">
            <Streamdown>{item.answer}</Streamdown>
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <input
          type="text"
          value={doubtText}
          onChange={(e) => setDoubtText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          placeholder={`Ask any specific doubt about ${topic || "this topic"}...`}
          disabled={chatMutation.isPending}
          className="flex-1 px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs outline-none focus:border-primary/50"
        />
        <Button
          size="sm"
          onClick={handleAsk}
          disabled={!doubtText.trim() || chatMutation.isPending}
          className="text-xs h-8 px-3 cursor-pointer shrink-0"
        >
          {chatMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Ask AI"}
        </Button>
      </div>
    </div>
  );
}

export default function SessionReview() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();

  const sessionQuery = trpc.session.getById.useQuery(
    { id: id ?? "" },
    { enabled: !!id && isAuthenticated }
  );

  const momentsQuery = trpc.moment.listByLecture.useQuery(
    { lectureId: id ?? "" },
    { enabled: !!id }
  );

  const explainMutation = trpc.ai.explainAll.useMutation({
    onSuccess: () => {
      toast.success("AI explanations generated for all moments!");
      momentsQuery.refetch();
    },
    onError: () => toast.error("Failed to generate explanations"),
  });

  const explainSingleMutation = trpc.ai.explain.useMutation({
    onSuccess: () => {
      toast.success("AI explanation generated!");
      momentsQuery.refetch();
    },
    onError: () => toast.error("Failed to generate explanation"),
  });

  const markReviewedMutation = trpc.moment.markReviewed.useMutation({
    onSuccess: () => momentsQuery.refetch(),
  });

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Check if an AI API key is configured
  const [hasAiKey, setHasAiKey] = useState(true);
  useEffect(() => {
    try {
      const key = localStorage.getItem("contextbell_ai_key");
      setHasAiKey(!!key);
    } catch { setHasAiKey(false); }
  }, []);

  if (!sessionQuery.data) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  const session = sessionQuery.data;
  const moments = momentsQuery.data ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50">
        <div className="container flex items-center h-14 gap-3">
          <Link href="/revision">
            <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
          </Link>
          <div>
            <h1 className="font-semibold text-lg">{session.title}</h1>
            <p className="text-xs text-muted-foreground">Session Review</p>
          </div>
          <div className="ml-auto flex gap-2">
            <Link href={`/session/${id}/summary`}>
              <Button variant="outline" size="sm" className="cursor-pointer">
                <GraduationCap className="w-4 h-4 mr-1" /> Summary
              </Button>
            </Link>
            <Link href={`/session/${id}/quiz`}>
              <Button variant="outline" size="sm" className="cursor-pointer">
                <Brain className="w-4 h-4 mr-1" /> Quiz
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* AI Key Warning Banner */}
        {!hasAiKey && (
          <div className="mb-6 flex items-center gap-3 p-4 rounded-xl border border-yellow-500/40
                          bg-yellow-500/10 text-yellow-400">
            <span className="text-lg">⚠️</span>
            <div className="flex-1 text-sm">
              <strong>No AI API Key configured.</strong> Explanations will use a basic fallback.
              Click the <strong>🔑 key icon</strong> (bottom-right) to add your free
              Gemini or OpenAI key for real AI-powered, transcript-based explanations.
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">

          <div>
            <h2 className="text-xl font-bold">Confusion Points ({moments.length})</h2>
            <p className="text-sm text-muted-foreground">
              AI-generated explanations for each moment you pressed the bell.
            </p>
          </div>
          {moments.length > 0 && (
            <Button
              onClick={() => explainMutation.mutate({ lectureId: id! })}
              disabled={explainMutation.isPending}
              className="cursor-pointer"
            >
              {explainMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {explainMutation.isPending ? "Generating..." : "Generate All Explanations"}
            </Button>
          )}
        </div>

        {moments.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No confusion points</h3>
            <p className="text-muted-foreground">No bells were pressed during this session.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {moments.map((moment) => (
              <Card key={moment.id} className="border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-primary" />
                      <CardTitle className="text-base">
                        {moment.topic ?? "General confusion"}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono">
                        {formatTime(moment.timestamp)}
                      </Badge>
                      <Badge
                        variant={
                          moment.status === "reviewed"
                            ? "default"
                            : moment.status === "explained"
                            ? "outline"
                            : "destructive"
                        }
                      >
                        {moment.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="explanation">
                    <TabsList>
                      <TabsTrigger value="explanation">AI Explanation</TabsTrigger>
                      {moment.transcriptContext && (
                        <TabsTrigger value="transcript">Transcript Context</TabsTrigger>
                      )}
                    </TabsList>
                    <TabsContent value="explanation" className="pt-4">
                      {moment.aiExplanation ? (
                        <div className="prose prose-invert prose-sm max-w-none leading-relaxed bg-secondary/20 p-4 rounded-xl border border-border/40">
                          <Streamdown>{moment.aiExplanation}</Streamdown>
                        </div>
                      ) : (
                        <div className="py-4 text-center space-y-3">
                          <p className="text-sm text-muted-foreground">
                            Generate an in-depth step-by-step explanation with real-world analogies for this confusion point.
                          </p>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => explainSingleMutation.mutate({ momentId: moment.id })}
                            disabled={explainSingleMutation.isPending}
                            className="cursor-pointer"
                          >
                            {explainSingleMutation.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin text-primary" />
                            ) : (
                              <Sparkles className="w-4 h-4 mr-2 text-primary" />
                            )}
                            Generate In-Depth Explanation
                          </Button>
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="transcript" className="pt-4">
                      {moment.transcriptContext ? (
                        <p className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-4">
                          {moment.transcriptContext}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">No transcript context available.</p>
                      )}
                    </TabsContent>
                  </Tabs>

                  {moment.audioClipUrl ? (
                    <div className="mt-4 p-3 rounded-xl bg-secondary/30 border border-border/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                          <span>🎵 Captured 30-Second Voice Recording</span>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">15s pre + 15s post</Badge>
                        </div>
                        <a
                          href={moment.audioClipUrl}
                          download={`lecture_moment_${moment.timestamp}s.webm`}
                          className="text-[11px] text-muted-foreground hover:text-primary underline transition-colors"
                        >
                          Download Audio
                        </a>
                      </div>
                      <audio
                        controls
                        src={moment.audioClipUrl}
                        className="w-full h-10 rounded-lg outline-none"
                        preload="metadata"
                      />
                    </div>
                  ) : (
                    <div className="mt-4 p-3 rounded-xl bg-secondary/10 border border-border/30 text-xs text-muted-foreground text-center">
                      🎙️ No audio recorded for this confusion point
                    </div>
                  )}

                  {moment.status !== "reviewed" && moment.aiExplanation && (
                    <div className="mt-4 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markReviewedMutation.mutate({ id: moment.id })}
                        className="cursor-pointer text-xs"
                      >
                        Mark as Reviewed
                      </Button>
                    </div>
                  )}

                  {/* Interactive Per-Moment Doubt Solver */}
                  <MomentDoubtSolver
                    lectureId={id!}
                    topic={moment.topic}
                    context={moment.transcriptContext}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
