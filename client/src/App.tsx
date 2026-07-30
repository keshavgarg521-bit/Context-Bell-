import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import JoinPage from "./pages/Join";
import LiveSession from "./pages/LiveSession";
import Revision from "./pages/Revision";
import SessionReview from "./pages/SessionReview";
import SessionQuiz from "./pages/SessionQuiz";
import SessionSummary from "./pages/SessionSummary";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherOverview from "./pages/TeacherOverview";
import GlobalChatbot from "./components/GlobalChatbot";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/join" component={JoinPage} />
      <Route path="/session/:id" component={LiveSession} />
      <Route path="/revision" component={Revision} />
      <Route path="/session/:id/review" component={SessionReview} />
      <Route path="/session/:id/quiz" component={SessionQuiz} />
      <Route path="/session/:id/summary" component={SessionSummary} />
      <Route path="/teacher" component={TeacherOverview} />
      <Route path="/teacher/:id" component={TeacherDashboard} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
          <GlobalChatbot />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
