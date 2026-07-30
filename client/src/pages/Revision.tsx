import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Bell, BookOpen, Clock, Brain, GraduationCap, MessageCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { startLogin } from "@/const";
import { toast } from "sonner";

export default function Revision() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const lecturesQuery = trpc.session.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const formatTime = (seconds: number | null) => {
    if (!seconds) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-3">Sign In to View Revisions</h1>
          <Button onClick={() => startLogin()} className="cursor-pointer">Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50">
        <div className="container flex items-center h-14 gap-3">
          <Link href="/">
            <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
          </Link>
          <h1 className="font-semibold text-lg">Revision Workspace</h1>
        </div>
      </header>

      <main className="container py-8">
        {lecturesQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : lecturesQuery.data && lecturesQuery.data.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lecturesQuery.data.map((lecture) => (
              <Card
                key={lecture.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate(`/session/${lecture.id}/review`)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base line-clamp-1">{lecture.title}</CardTitle>
                  {lecture.topic && (
                    <p className="text-xs text-muted-foreground">{lecture.topic}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(lecture.duration)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Bell className="w-3 h-3" />
                      {lecture.status === "ended" ? "Ended" : "Active"}
                    </span>
                    <span>{new Date(lecture.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Link href={`/session/${lecture.id}/review`}>
                      <Button size="sm" variant="outline" className="cursor-pointer text-xs" onClick={(e: any) => e.stopPropagation()}>
                        <BookOpen className="w-3 h-3 mr-1" /> Review
                      </Button>
                    </Link>
                    <Link href={`/session/${lecture.id}/quiz`}>
                      <Button size="sm" variant="outline" className="cursor-pointer text-xs" onClick={(e: any) => e.stopPropagation()}>
                        <Brain className="w-3 h-3 mr-1" /> Quiz
                      </Button>
                    </Link>
                    <Link href={`/session/${lecture.id}/summary`}>
                      <Button size="sm" variant="outline" className="cursor-pointer text-xs" onClick={(e: any) => e.stopPropagation()}>
                        <GraduationCap className="w-3 h-3 mr-1" /> Summary
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No sessions yet</h2>
            <p className="text-muted-foreground mb-6">Start your first lecture session to begin using ContextBell.</p>
            <Link href="/join">
              <Button className="cursor-pointer">Start a Session</Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
