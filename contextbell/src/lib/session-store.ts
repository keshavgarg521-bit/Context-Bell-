import type { CapturedMoment, LectureSession } from "./types";

const SESSION_KEY = "contextbell-session";
const TEACHER_KEY = "contextbell-teacher-stats";

export function getSession(id: string): LectureSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(`${SESSION_KEY}-${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LectureSession;
  } catch {
    return null;
  }
}

export function saveSession(session: LectureSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${SESSION_KEY}-${session.id}`, JSON.stringify(session));
  syncTeacherStats(session);
}

export function createSession(id: string, title: string, studentName: string, code: string): LectureSession {
  const session: LectureSession = {
    id,
    title,
    studentName,
    code,
    startedAt: Date.now(),
    moments: [],
    transcript: [],
  };
  saveSession(session);
  return session;
}

export function addMomentToSession(sessionId: string, moment: CapturedMoment): LectureSession | null {
  const session = getSession(sessionId);
  if (!session) return null;
  session.moments = [moment, ...session.moments];
  saveSession(session);
  return session;
}

export function updateMomentAudio(sessionId: string, momentId: string, audioClipUrl: string): LectureSession | null {
  const session = getSession(sessionId);
  if (!session) return null;
  session.moments = session.moments.map((moment) =>
    moment.id === momentId ? { ...moment, audioClipUrl } : moment
  );
  saveSession(session);
  return session;
}

export function removeMomentFromSession(sessionId: string, momentId: string): LectureSession | null {
  const session = getSession(sessionId);
  if (!session) return null;
  session.moments = session.moments.filter((moment) => moment.id !== momentId);
  saveSession(session);
  return session;
}

export function endSession(sessionId: string, summary?: string): LectureSession | null {
  const session = getSession(sessionId);
  if (!session) return null;
  session.endedAt = Date.now();
  if (summary) session.lectureSummary = summary;
  saveSession(session);
  return session;
}

function syncTeacherStats(session: LectureSession): void {
  if (typeof window === "undefined") return;
  const topicCounts: Record<string, number> = {};
  session.moments.forEach((m) => {
    topicCounts[m.topic] = (topicCounts[m.topic] || 0) + 1;
  });
  const total = session.moments.length || 1;
  const weakTopics = Object.entries(topicCounts)
    .map(([topic, moments]) => ({ topic, moments, percent: Math.round((moments / total) * 100) }))
    .sort((a, b) => b.moments - a.moments);

  const stats = {
    sessionId: session.id,
    title: session.title,
    date: new Date(session.startedAt).toLocaleDateString(),
    totalMoments: session.moments.length,
    studentCount: 1,
    weakTopics,
  };

  const existing: Record<string, typeof stats> = JSON.parse(localStorage.getItem(TEACHER_KEY) || "{}");
  existing[session.id] = stats;
  localStorage.setItem(TEACHER_KEY, JSON.stringify(existing));
}

export function getTeacherStats(): {
  sessionId: string;
  title: string;
  date: string;
  totalMoments: number;
  studentCount: number;
  weakTopics: { topic: string; percent: number; moments: number }[];
}[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(TEACHER_KEY);
  if (!raw) return [];
  return Object.values(JSON.parse(raw));
}
