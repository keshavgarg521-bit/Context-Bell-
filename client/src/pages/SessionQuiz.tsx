import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Brain, CheckCircle, XCircle, Loader2, Sparkles } from "lucide-react";
import { Link, useParams } from "wouter";
import { useState, useMemo } from "react";
import { toast } from "sonner";

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export default function SessionQuiz() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);

  const generateQuizMutation = trpc.ai.generateQuiz.useMutation({
    onSuccess: (data) => {
      if (data.quiz && Array.isArray(data.quiz)) {
        setQuiz(data.quiz as QuizQuestion[]);
        toast.success("Quiz generated! Answer the questions below.");
      } else {
        toast.error("Failed to parse quiz. Try again.");
      }
    },
    onError: () => toast.error("Failed to generate quiz"),
  });

  const handleGenerate = () => {
    if (id) {
      generateQuizMutation.mutate({ lectureId: id });
    }
  };

  const handleSelect = (questionIndex: number, optionIndex: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const score = useMemo(() => {
    if (!quiz) return 0;
    let correct = 0;
    quiz.forEach((q, i) => {
      if (selectedAnswers[i] === q.correctAnswer) correct++;
    });
    return correct;
  }, [quiz, selectedAnswers]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50">
        <div className="container flex items-center h-14 gap-3">
          <Link href="/revision">
            <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
          </Link>
          <h1 className="font-semibold text-lg">AI Quiz</h1>
        </div>
      </header>

      <main className="container py-8 max-w-2xl">
        {!quiz ? (
          <div className="text-center py-16">
            <Brain className="w-16 h-16 text-primary/50 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-3">Test Your Understanding</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              AI will generate quiz questions based on your actual confusion points from this session.
            </p>
            <Button
              onClick={handleGenerate}
              disabled={generateQuizMutation.isPending}
              size="lg"
              className="cursor-pointer"
            >
              {generateQuizMutation.isPending ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5 mr-2" />
              )}
              {generateQuizMutation.isPending ? "Generating Quiz..." : "Generate Quiz"}
            </Button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Your Quiz</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={generateQuizMutation.isPending}
                className="cursor-pointer"
              >
                Regenerate
              </Button>
            </div>

            <div className="space-y-6">
              {quiz.map((q, i) => (
                <Card key={i} className="border-border">
                  <CardHeader>
                    <CardTitle className="text-base">
                      <span className="text-primary mr-2">Q{i + 1}.</span>
                      {q.question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup
                      value={selectedAnswers[i]?.toString()}
                      onValueChange={(val) => handleSelect(i, parseInt(val))}
                    >
                      {q.options.map((option, j) => (
                        <div key={j} className="flex items-center space-x-3 py-2">
                          <RadioGroupItem value={j.toString()} id={`q${i}-opt${j}`} />
                          <Label
                            htmlFor={`q${i}-opt${j}`}
                            className={`cursor-pointer ${
                              showResults
                                ? j === q.correctAnswer
                                  ? "text-green-400 font-medium"
                                  : selectedAnswers[i] === j
                                  ? "text-red-400"
                                  : ""
                                : ""
                            }`}
                          >
                            {option}
                          </Label>
                          {showResults && j === q.correctAnswer && (
                            <CheckCircle className="w-4 h-4 text-green-400 ml-1" />
                          )}
                          {showResults && selectedAnswers[i] === j && j !== q.correctAnswer && (
                            <XCircle className="w-4 h-4 text-red-400 ml-1" />
                          )}
                        </div>
                      ))}
                    </RadioGroup>

                    {showResults && q.explanation && (
                      <div className="mt-3 p-3 rounded-lg bg-secondary/50 border border-border/50 text-sm">
                        <p className="font-medium text-primary mb-1">Explanation:</p>
                        <p className="text-muted-foreground">{q.explanation}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {!showResults && (
              <div className="mt-6 text-center">
                <Button
                  onClick={() => setShowResults(true)}
                  disabled={Object.keys(selectedAnswers).length < quiz.length}
                  size="lg"
                  className="cursor-pointer"
                >
                  Submit Answers ({Object.keys(selectedAnswers).length}/{quiz.length})
                </Button>
              </div>
            )}

            {showResults && (
              <div className="mt-6 p-6 rounded-xl bg-card border border-border text-center">
                <h3 className="text-2xl font-bold mb-2">
                  {score}/{quiz.length} Correct
                </h3>
                <p className="text-muted-foreground">
                  {score === quiz.length
                    ? "Perfect score! You've mastered this material."
                    : score >= quiz.length / 2
                    ? "Good effort! Review the explanations for questions you missed."
                    : "Keep reviewing! Check the explanations and try again."}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
