import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, BarChart3, Bell, Clock, Loader2, Sparkles } from "lucide-react";
import { Link, useParams } from "wouter";
import { useMemo } from "react";
import { Streamdown } from "streamdown";

export default function TeacherDashboard() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();

  const analyticsQuery = trpc.teacher.analytics.useQuery(
    { lectureId: id ?? "" },
    { enabled: !!id && isAuthenticated }
  );

  const formatTime = (seconds: number | null) => {
    if (!seconds) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const topicData = useMemo(() => {
    if (!analyticsQuery.data) return [];
    return analyticsQuery.data.topicBreakdown.map((t) => ({
      ...t,
      width: `${t.percentage}%`,
    }));
  }, [analyticsQuery.data]);

  if (analyticsQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!analyticsQuery.data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Analytics not available</p>
      </div>
    );
  }

  const { lecture, moments, topicBreakdown, suggestions } = analyticsQuery.data;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50">
        <div className="container flex items-center h-14 gap-3">
          <Link href="/teacher">
            <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
          </Link>
          <div>
            <h1 className="font-semibold text-lg">{lecture.title}</h1>
            <p className="text-xs text-muted-foreground">{lecture.topic ?? "No topic"}</p>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Stats */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Session Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-lg bg-secondary/50">
                  <p className="text-2xl font-bold text-primary">{lecture.totalConfusionPoints}</p>
                  <p className="text-xs text-muted-foreground mt-1">Confusion Points</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-secondary/50">
                  <p className="text-2xl font-bold">{formatTime(lecture.duration)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Duration</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Topic Breakdown */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Topic Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topicBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No confusion data available.
                </p>
              ) : (
                <div className="space-y-3">
                  {topicData.map((t, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium truncate">{t.topic}</span>
                        <span className="text-muted-foreground ml-2">{t.count} ({t.percentage}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: t.width }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Confusion Timeline */}
          <Card className="border-border lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Confusion Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {moments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No confusion points recorded.
                </p>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-4">
                    {moments.map((moment) => (
                      <div key={moment.id} className="flex items-start gap-4 relative">
                        <div className="w-3 h-3 rounded-full bg-primary border-2 border-background absolute left-[11px] top-1.5" />
                        <div className="ml-10 flex-1 p-3 rounded-lg bg-secondary/30 border border-border/50">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{moment.topic ?? "General"}</span>
                            <span className="text-xs text-muted-foreground">{formatTime(moment.timestamp)}</span>
                          </div>
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {moment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Teaching Suggestions */}
          <Card className="border-border lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                AI Teaching Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {suggestions ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <Streamdown>{suggestions}</Streamdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No suggestions available. Ensure your session has confusion points recorded.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
