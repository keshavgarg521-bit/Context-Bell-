export type MomentStatus = "unresolved" | "reviewing" | "understood";

export interface MomentExplanation {
  simple: string;
  steps: string[];
  analogy: string;
  important: string;
}

export interface CapturedMoment {
  id: string;
  timestamp: number;
  quote: string;
  topic: string;
  status: MomentStatus;
  question?: string;
  explanation?: MomentExplanation;
  audioClipUrl?: string;
  transcriptBefore?: string;
  transcriptAfter?: string;
}

export interface TranscriptLine {
  id: string;
  speaker: string;
  text: string;
  time: number;
  isActive?: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
}

export interface LectureSession {
  id: string;
  title: string;
  studentName: string;
  code: string;
  startedAt: number;
  endedAt?: number;
  moments: CapturedMoment[];
  transcript: TranscriptLine[];
  lectureSummary?: string;
}

export interface TeacherSessionStats {
  sessionId: string;
  title: string;
  date: string;
  totalMoments: number;
  studentCount: number;
  weakTopics: { topic: string; percent: number; moments: number }[];
}
