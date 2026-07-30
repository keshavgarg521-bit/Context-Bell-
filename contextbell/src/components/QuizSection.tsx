"use client";

import { cn } from "@/lib/utils";
import type { QuizQuestion } from "@/lib/types";
import { CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/Button";

interface QuizSectionProps {
  questions: QuizQuestion[];
}

export function QuizSection({ questions }: QuizSectionProps) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const q = questions[current];

  const handleSelect = (index: number) => {
    if (selected !== null) return;
    setSelected(index);
    setShowExplanation(true);
    if (index === q.correctIndex) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setShowExplanation(false);
    }
  };

  if (finished) {
    return (
      <div className="glass-panel rounded-2xl p-8 border border-white/5 text-center">
        <CheckCircle className="w-12 h-12 text-status-understood mx-auto mb-4" />
        <h3 className="font-[family-name:var(--font-plus-jakarta)] text-2xl font-bold text-text-primary">
          Quiz Complete!
        </h3>
        <p className="mt-2 text-text-secondary">
          You scored <span className="text-accent-amber font-semibold">{score}/{questions.length}</span>
        </p>
        <p className="mt-4 text-sm text-text-muted">
          {score === questions.length
            ? "Perfect! You've mastered your confusion points."
            : "Review the moments you got wrong and try again."}
        </p>
        <Button className="mt-6" onClick={() => { setCurrent(0); setSelected(null); setScore(0); setFinished(false); setShowExplanation(false); }}>
          Retake Quiz
        </Button>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="glass-panel rounded-2xl p-8 border border-white/5 text-center text-text-muted">
        No quiz questions available. Capture confusion moments during the lecture first.
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/5">
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs px-2 py-1 rounded bg-accent-violet/10 text-accent-violet border border-accent-violet/20">
          {q.topic}
        </span>
        <span className="font-mono text-xs text-text-muted">
          {current + 1} / {questions.length}
        </span>
      </div>

      <h3 className="font-[family-name:var(--font-plus-jakarta)] text-lg font-semibold text-text-primary mb-6">
        {q.question}
      </h3>

      <div className="space-y-3">
        {q.options.map((opt, i) => {
          const isCorrect = i === q.correctIndex;
          const isSelected = i === selected;
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={selected !== null}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl border text-sm transition-all",
                selected === null && "border-white/10 hover:border-accent-amber/30 hover:bg-white/5",
                selected !== null && isCorrect && "border-status-understood/40 bg-status-understood/10 text-status-understood",
                selected !== null && isSelected && !isCorrect && "border-red-500/40 bg-red-500/10 text-red-400",
                selected !== null && !isSelected && !isCorrect && "border-white/5 opacity-50"
              )}
            >
              <span className="flex items-center gap-2">
                {selected !== null && isCorrect && <CheckCircle className="w-4 h-4 shrink-0" />}
                {selected !== null && isSelected && !isCorrect && <XCircle className="w-4 h-4 shrink-0" />}
                {opt}
              </span>
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className="mt-4 p-4 rounded-xl bg-bg-elevated-2 border border-white/5 text-sm text-text-secondary">
          {q.explanation}
        </div>
      )}

      {selected !== null && (
        <Button className="mt-6 w-full" onClick={handleNext}>
          {current + 1 >= questions.length ? "See Results" : "Next Question"}
        </Button>
      )}
    </div>
  );
}
