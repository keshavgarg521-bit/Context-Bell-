import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, GraduationCap, Loader2, Sparkles, BookOpen, Brain } from "lucide-react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function SessionSummary() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();

  const sessionQuery = trpc.session.getById.useQuery(
    { id: id ?? "" },
    { enabled: !!id && isAuthenticated }
  );

  const summarizeMutation = trpc.ai.summarize.useMutation({
    onSuccess: () => {
      sessionQuery.refetch();
      toast.success("Summary generated!");
    },
    onError: () => toast.error("Failed to generate summary"),
  });

  if (!sessionQuery.data) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  const session = sessionQuery.data;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50">
        <div className="container flex items-center h-14 gap-3">
          <Link href="/revision">
            <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
          </Link>
          <div>
            <h1 className="font-semibold text-lg">{session.title}</h1>
            <p className="text-xs text-muted-foreground">AI Summary</p>
          </div>
          <div className="ml-auto flex gap-2">
            <Link href={`/session/${id}/review`}>
              <Button variant="outline" size="sm" className="cursor-pointer">
                <BookOpen className="w-4 h-4 mr-1" /> Review
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

      <main className="container py-8 max-w-2xl">
        {session.aiSummary ? (
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">AI Lecture Summary</CardTitle>
                  <p className="text-xs text-muted-foreground">Short and crisp overview of your lecture</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-invert prose-sm max-w-none">
                <Streamdown>{session.aiSummary}</Streamdown>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-16">
            <GraduationCap className="w-16 h-16 text-primary/50 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-3">AI Lecture Summary</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Get a short and crisp AI-generated summary of your entire lecture session.
            </p>
            <Button
              onClick={() => summarizeMutation.mutate({ lectureId: id! })}
              disabled={summarizeMutation.isPending}
              size="lg"
              className="cursor-pointer"
            >
              {summarizeMutation.isPending ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5 mr-2" />
              )}
              {summarizeMutation.isPending ? "Generating..." : "Generate Summary"}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
