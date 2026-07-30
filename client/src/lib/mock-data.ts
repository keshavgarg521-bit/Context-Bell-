export type { CapturedMoment, MomentExplanation, MomentStatus, TranscriptLine } from "./types";
import type { CapturedMoment, TranscriptLine } from "./types";

export const demoTranscript: TranscriptLine[] = [
  { id: "1", speaker: "Professor", text: "Today we'll explore Laplace transforms and their applications.", time: 0 },
  { id: "2", speaker: "Professor", text: "The transform converts a function of time into a function of complex frequency.", time: 12 },
  { id: "3", speaker: "Professor", text: "Think of it as moving from the time domain to the s-domain.", time: 28, isActive: true },
  { id: "4", speaker: "Professor", text: "Source transformation is where most students get stuck.", time: 45 },
  { id: "5", speaker: "Professor", text: "We apply linearity and the shifting property here.", time: 62 },
];

export const demoMoments: CapturedMoment[] = [
  {
    id: "m1",
    timestamp: 1842,
    quote: "Source transformation is where most students get stuck.",
    topic: "Laplace Transform",
    status: "unresolved",
    question: "Why do we shift s in source transformation?",
    explanation: {
      simple: "Source transformation moves a function in the s-domain by adding a constant to s. It tells us how multiplying by e^(-at) in time becomes a shift in frequency.",
      steps: [
        "Start with F(s) — the Laplace transform of f(t)",
        "Apply the shifting theorem: L{e^(-at)f(t)} = F(s + a)",
        "Identify the exponential factor in your time-domain function",
        "Replace every s with (s + a) in the transform",
      ],
      analogy: "Like retuning a radio — shifting s moves the 'frequency dial' so the same signal appears at a different station.",
      important: "The shift constant a must match the exponent in the time-domain exponential exactly.",
    },
  },
  {
    id: "m2",
    timestamp: 920,
    quote: "The region of convergence determines whether the inverse transform exists.",
    topic: "ROC",
    status: "reviewing",
    question: "What happens outside the ROC?",
  },
  {
    id: "m3",
    timestamp: 456,
    quote: "Linearity lets us break complex transforms into simpler parts.",
    topic: "Properties",
    status: "understood",
  },
];

export const teacherInsights = {
  headline: "42% of confusion occurred during source transformation.",
  weakTopics: [
    { topic: "Source Transformation", percent: 42, moments: 18 },
    { topic: "Region of Convergence", percent: 28, moments: 12 },
    { topic: "Inverse Laplace", percent: 18, moments: 8 },
  ],
  suggestions: [
    "Re-explain source transformation with a concrete circuit example",
    "Add a 5-minute recap on ROC before moving to inverse transforms",
    "Provide a one-page cheat sheet for shifting properties",
  ],
  timelineSpikes: [12, 18, 45, 62, 78, 92, 105],
};

export const flowSteps = [
  { step: 1, label: "Start", desc: "Name your offline lecture" },
  { step: 2, label: "Listen", desc: "Rolling audio buffer" },
  { step: 3, label: "Bell", desc: "Tap when confused" },
  { step: 4, label: "Capture", desc: "15 seconds either side saved" },
  { step: 5, label: "Learn", desc: "AI explanation + flashcards" },
];
