import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  createLecture: vi.fn(),
  getLectureById: vi.fn(),
  getUserLectures: vi.fn(),
  endLecture: vi.fn(),
  setLectureTranscript: vi.fn(),
  setLectureAISummary: vi.fn(),
  setLectureAIQuiz: vi.fn(),
  createConfusionMoment: vi.fn(),
  getConfusionMoments: vi.fn(),
  getConfusionMomentById: vi.fn(),
  setMomentExplanation: vi.fn(),
  markMomentReviewed: vi.fn(),
  createTranscript: vi.fn(),
  getTranscripts: vi.fn(),
  createChatMessage: vi.fn(),
  getChatMessages: vi.fn(),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getLatestChatMessages: vi.fn(),
}));

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

describe("session.create", () => {
  it("creates a lecture with the given title and topic", async () => {
    const { ctx } = createAuthContext();
    const db = await import("./db");
    const mockLecture = {
      id: "test-id-123",
      userId: 1,
      title: "Physics Lecture",
      topic: "Quantum Mechanics",
      status: "active",
      duration: 0,
      transcript: null,
      aiSummary: null,
      aiQuiz: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(db.createLecture).mockResolvedValue(mockLecture as any);

    const caller = appRouter.createCaller(ctx);
    const result = await caller.session.create({
      title: "Physics Lecture",
      topic: "Quantum Mechanics",
    });

    expect(db.createLecture).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Physics Lecture",
        topic: "Quantum Mechanics",
        userId: 1,
      })
    );
    expect(result.title).toBe("Physics Lecture");
  });

  it("creates a lecture with only a title (no topic)", async () => {
    const { ctx } = createAuthContext();
    const db = await import("./db");
    const mockLecture = {
      id: "test-id-456",
      userId: 1,
      title: "Math Lecture",
      topic: null,
      status: "active",
      duration: 0,
      transcript: null,
      aiSummary: null,
      aiQuiz: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(db.createLecture).mockResolvedValue(mockLecture as any);

    const caller = appRouter.createCaller(ctx);
    const result = await caller.session.create({
      title: "Math Lecture",
    });

    expect(db.createLecture).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Math Lecture",
        topic: undefined,
      })
    );
    expect(result.title).toBe("Math Lecture");
  });
});

describe("session.end", () => {
  it("ends a lecture and sets duration", async () => {
    const { ctx } = createAuthContext();
    const db = await import("./db");
    vi.mocked(db.endLecture).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(ctx);
    const result = await caller.session.end({
      id: "test-id-123",
      duration: 3600,
    });

    expect(db.endLecture).toHaveBeenCalledWith("test-id-123", 3600);
    expect(result.success).toBe(true);
  });
});

describe("transcript.save", () => {
  it("saves a transcript line and aggregates into lecture transcript", async () => {
    const { ctx } = createAuthContext();
    const db = await import("./db");
    vi.mocked(db.createTranscript).mockResolvedValue(undefined as any);
    vi.mocked(db.getLectureById).mockResolvedValue({
      id: "test-id",
      userId: 1,
      title: "Test",
      topic: null,
      status: "active",
      duration: 0,
      transcript: null,
      aiSummary: null,
      aiQuiz: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    vi.mocked(db.setLectureTranscript).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(ctx);
    const result = await caller.transcript.save({
      lectureId: "test-id",
      text: "Hello world this is a test",
      timestamp: 30,
    });

    expect(db.createTranscript).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Hello world this is a test",
        timestamp: 30,
      })
    );
    expect(db.setLectureTranscript).toHaveBeenCalledWith("test-id", "Hello world this is a test");
    expect(result.success).toBe(true);
  });
});

describe("auth.me", () => {
  it("returns the current user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();

    expect(result).toEqual(ctx.user);
  });
});
