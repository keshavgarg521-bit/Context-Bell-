import { eq, desc, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users,
  lectures,
  confusionMoments,
  transcripts,
  chatMessages,
  type User,
  type Lecture,
  type ConfusionMoment,
  type Transcript,
  type ChatMessage,
  type InsertUser,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance
export async function getDb() {
  if (!_db && process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("mysql://")) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect to MySQL, using mock instead:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Mock Data Store (for local development without MySQL) ──────────────────
const mockStore = {
  users: [] as User[],
  lectures: [] as Lecture[],
  confusionMoments: [] as ConfusionMoment[],
  transcripts: [] as Transcript[],
  chatMessages: [] as ChatMessage[],
};

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    const existing = mockStore.users.find(u => u.openId === user.openId);
    if (existing) {
      Object.assign(existing, {
        ...user,
        updatedAt: new Date(),
        lastSignedIn: user.lastSignedIn || new Date(),
      });
    } else {
      mockStore.users.push({
        id: mockStore.users.length + 1,
        openId: user.openId,
        name: user.name ?? null,
        email: user.email ?? null,
        loginMethod: user.loginMethod ?? null,
        role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: user.lastSignedIn || new Date(),
      } as User);
    }
    return;
  }
  
  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return mockStore.users.find(u => u.openId === openId);
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Lectures ────────────────────────────────────────────────────────────────

export async function createLecture(data: {
  id: string;
  userId: number;
  title: string;
  topic?: string;
}) {
  const db = await getDb();
  if (!db) {
    const lecture: Lecture = {
      id: data.id,
      userId: data.userId,
      title: data.title,
      topic: data.topic ?? null,
      duration: 0,
      status: "active",
      transcript: null,
      aiSummary: null,
      aiQuiz: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockStore.lectures.push(lecture);
    return lecture;
  }
  await db.insert(lectures).values({
    id: data.id,
    userId: data.userId,
    title: data.title,
    topic: data.topic ?? null,
  });
  return (await db.select().from(lectures).where(eq(lectures.id, data.id)).limit(1))[0];
}

export async function getLectureById(id: string) {
  const db = await getDb();
  if (!db) return mockStore.lectures.find(l => l.id === id) ?? null;
  const rows = await db.select().from(lectures).where(eq(lectures.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getUserLectures(userId: number) {
  const db = await getDb();
  if (!db) return mockStore.lectures.filter(l => l.userId === userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return db.select().from(lectures).where(eq(lectures.userId, userId)).orderBy(desc(lectures.createdAt));
}

export async function endLecture(id: string, duration: number) {
  const db = await getDb();
  if (!db) {
    const lecture = mockStore.lectures.find(l => l.id === id);
    if (lecture) {
      lecture.status = "ended";
      lecture.duration = duration;
      lecture.updatedAt = new Date();
    }
    return;
  }
  await db.update(lectures).set({ status: "ended", duration }).where(eq(lectures.id, id));
}

export async function setLectureTranscript(id: string, transcript: string) {
  const db = await getDb();
  if (!db) {
    const lecture = mockStore.lectures.find(l => l.id === id);
    if (lecture) lecture.transcript = transcript;
    return;
  }
  await db.update(lectures).set({ transcript }).where(eq(lectures.id, id));
}

export async function setLectureAISummary(id: string, summary: string) {
  const db = await getDb();
  if (!db) {
    const lecture = mockStore.lectures.find(l => l.id === id);
    if (lecture) lecture.aiSummary = summary;
    return;
  }
  await db.update(lectures).set({ aiSummary: summary }).where(eq(lectures.id, id));
}

export async function setLectureAIQuiz(id: string, quiz: string) {
  const db = await getDb();
  if (!db) {
    const lecture = mockStore.lectures.find(l => l.id === id);
    if (lecture) lecture.aiQuiz = quiz;
    return;
  }
  await db.update(lectures).set({ aiQuiz: quiz }).where(eq(lectures.id, id));
}

// ─── Confusion Moments ───────────────────────────────────────────────────────

export async function createConfusionMoment(data: {
  id: string;
  lectureId: string;
  timestamp: number;
  topic?: string;
  transcriptContext?: string;
  audioClipUrl?: string;
}) {
  const db = await getDb();
  if (!db) {
    const moment: ConfusionMoment = {
      id: data.id,
      lectureId: data.lectureId,
      timestamp: data.timestamp,
      topic: data.topic ?? null,
      transcriptContext: data.transcriptContext ?? null,
      audioClipUrl: data.audioClipUrl ?? null,
      aiExplanation: null,
      status: "new",
      createdAt: new Date(),
    };
    mockStore.confusionMoments.push(moment);
    return moment;
  }
  await db.insert(confusionMoments).values({
    id: data.id,
    lectureId: data.lectureId,
    timestamp: data.timestamp,
    topic: data.topic ?? null,
    transcriptContext: data.transcriptContext ?? null,
    audioClipUrl: data.audioClipUrl ?? null,
  });
  return (
    await db.select().from(confusionMoments).where(eq(confusionMoments.id, data.id)).limit(1)
  )[0];
}

export async function getConfusionMoments(lectureId: string) {
  const db = await getDb();
  if (!db) return mockStore.confusionMoments.filter(m => m.lectureId === lectureId).sort((a, b) => a.timestamp - b.timestamp);
  return db.select().from(confusionMoments).where(eq(confusionMoments.lectureId, lectureId)).orderBy(confusionMoments.timestamp);
}

export async function getConfusionMomentById(id: string) {
  const db = await getDb();
  if (!db) return mockStore.confusionMoments.find(m => m.id === id) ?? null;
  const rows = await db.select().from(confusionMoments).where(eq(confusionMoments.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function setMomentExplanation(id: string, explanation: string) {
  const db = await getDb();
  if (!db) {
    const moment = mockStore.confusionMoments.find(m => m.id === id);
    if (moment) {
      moment.aiExplanation = explanation;
      moment.status = "explained";
    }
    return;
  }
  await db
    .update(confusionMoments)
    .set({ aiExplanation: explanation, status: "explained" })
    .where(eq(confusionMoments.id, id));
}

export async function markMomentReviewed(id: string) {
  const db = await getDb();
  if (!db) {
    const moment = mockStore.confusionMoments.find(m => m.id === id);
    if (moment) moment.status = "reviewed";
    return;
  }
  await db.update(confusionMoments).set({ status: "reviewed" }).where(eq(confusionMoments.id, id));
}

// ─── Transcripts ─────────────────────────────────────────────────────────────

export async function createTranscript(data: {
  id: string;
  lectureId: string;
  text: string;
  timestamp: number;
}) {
  const db = await getDb();
  if (!db) {
    const transcript: Transcript = {
      ...data,
      createdAt: new Date(),
    };
    mockStore.transcripts.push(transcript);
    return transcript;
  }
  await db.insert(transcripts).values(data);
  return data;
}

export async function getTranscripts(lectureId: string) {
  const db = await getDb();
  if (!db) return mockStore.transcripts.filter(t => t.lectureId === lectureId).sort((a, b) => a.timestamp - b.timestamp);
  return db.select().from(transcripts).where(eq(transcripts.lectureId, lectureId)).orderBy(transcripts.timestamp);
}

// ─── Chat Messages ───────────────────────────────────────────────────────────

export async function createChatMessage(data: {
  id: string;
  lectureId: string;
  role: "user" | "assistant" | "system";
  content: string;
}) {
  const db = await getDb();
  if (!db) {
    const msg: ChatMessage = {
      ...data,
      createdAt: new Date(),
    };
    mockStore.chatMessages.push(msg);
    return msg;
  }
  await db.insert(chatMessages).values(data);
  return data;
}

export async function getChatMessages(lectureId: string) {
  const db = await getDb();
  if (!db) return mockStore.chatMessages.filter(m => m.lectureId === lectureId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return db.select().from(chatMessages).where(eq(chatMessages.lectureId, lectureId)).orderBy(chatMessages.createdAt);
}

export async function getLatestChatMessages(lectureId: string, limit: number = 20) {
  const db = await getDb();
  if (!db) return mockStore.chatMessages.filter(m => m.lectureId === lectureId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
  return db.select().from(chatMessages).where(eq(chatMessages.lectureId, lectureId)).orderBy(desc(chatMessages.createdAt)).limit(limit);
}
