import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, BarChart3, Bell, BookOpen, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { startLogin } from "@/const";

export default function TeacherOverview() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const overviewQuery = trpc.teacher.overview.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-3">Sign In Required</h1>
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
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h1 className="font-semibold text-lg">Teacher Analytics</h1>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {overviewQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : overviewQuery.data ? (
          <div>
            {/* Stats Cards */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Lectures</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{overviewQuery.data.totalLectures}</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Confusion Points</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{overviewQuery.data.totalConfusionPoints}</p>
                </CardContent>
              </Card>
            </div>

            {/* Lectures List */}
            <h2 className="text-lg font-semibold mb-4">Lecture Sessions</h2>
            {overviewQuery.data.lectures.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No lecture sessions yet.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {overviewQuery.data.lectures.map((lecture) => (
                  <Card
                    key={lecture.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors border-border"
                    onClick={() => navigate(`/teacher/${lecture.id}`)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm line-clamp-1">{lecture.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-xs text-muted-foreground">{lecture.topic ?? "No topic"}</p>
                      <div className="flex items-center gap-2">
                        <Bell className="w-3 h-3 text-primary" />
                        <span className="text-xs">{lecture.confusionCount} confusion points</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(lecture.date).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
