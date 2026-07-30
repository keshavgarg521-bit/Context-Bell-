import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock db module before importing appRouter
const mockDb: Record<string, ReturnType<typeof vi.fn>> = {
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
  getLatestChatMessages: vi.fn(),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
};

vi.mock("./db", () => ({ default: mockDb, ...mockDb }));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "AI-generated response" } }],
  }),
}));

// Import after mocking
const { appRouter } = await import("./routers");
import type { TrpcContext } from "./_core/context";
import { TRPCError } from "@trpc/server";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockLecture = {
  id: "test-lecture",
  userId: 1,
  title: "Physics 101",
  topic: "Quantum Mechanics",
  status: "ended",
  duration: 1800,
  transcript: "Quantum mechanics is a fundamental theory in physics...",
  aiSummary: null,
  aiQuiz: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockMoment = {
  id: "moment-1",
  lectureId: "test-lecture",
  timestamp: 120,
  topic: "Wave-particle duality",
  transcriptContext: "The wave function describes probability amplitude...",
  audioClipUrl: "https://example.com/clip.webm",
  aiExplanation: null,
  status: "captured",
  createdAt: new Date(),
  updatedAt: new Date(),
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userOverrides: Partial<AuthenticatedUser> = {}): TrpcContext {
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
    ...userOverrides,
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

// ─── Moment Capture Tests ───────────────────────────────────────────────────

describe("moment.capture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a confusion moment with audio clip uploaded", async () => {
    const ctx = createAuthContext();
    mockDb.getLectureById.mockResolvedValue(mockLecture);
    mockDb.createConfusionMoment.mockResolvedValue(mockMoment);

    const caller = appRouter.createCaller(ctx);
    const result = await caller.moment.capture({
      lectureId: "test-lecture",
      timestamp: 120,
      topic: "Wave-particle duality",
      transcriptContext: "The wave function describes...",
      audioBase64: "base64audiodata",
      mimeType: "audio/webm",
    });

    expect(mockDb.createConfusionMoment).toHaveBeenCalledWith(
      expect.objectContaining({
        lectureId: "test-lecture",
        timestamp: 120,
        topic: "Wave-particle duality",
      })
    );
    expect(result.id).toBe("moment-1");
  });

  it("creates a confusion moment without audio", async () => {
    const ctx = createAuthContext();
    mockDb.getLectureById.mockResolvedValue(mockLecture);
    mockDb.createConfusionMoment.mockResolvedValue(mockMoment);

    const caller = appRouter.createCaller(ctx);
    const result = await caller.moment.capture({
      lectureId: "test-lecture",
      timestamp: 300,
    });

    expect(mockDb.createConfusionMoment).toHaveBeenCalled();
    expect(result.id).toBe("moment-1");
  });

  it("creates a confusion moment even without lecture check", async () => {
    const ctx = createAuthContext();
    mockDb.createConfusionMoment.mockResolvedValue({ ...mockMoment, id: "new-moment" });

    const caller = appRouter.createCaller(ctx);
    const result = await caller.moment.capture({
      lectureId: "any-lecture",
      timestamp: 10,
    });

    // moment.capture does not check lecture existence - it creates the moment directly
    expect(mockDb.createConfusionMoment).toHaveBeenCalledWith(
      expect.objectContaining({
        lectureId: "any-lecture",
        timestamp: 10,
      })
    );
    expect(result.id).toBe("new-moment");
  });
});

describe("moment.listByLecture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns moments for a valid lecture", async () => {
    const ctx = createAuthContext();
    mockDb.getLectureById.mockResolvedValue(mockLecture);
    mockDb.getConfusionMoments.mockResolvedValue([mockMoment]);

    const caller = appRouter.createCaller(ctx);
    const result = await caller.moment.listByLecture({ lectureId: "test-lecture" });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("moment-1");
  });

  it("throws FORBIDDEN when user does not own the lecture", async () => {
    const ctx = createAuthContext();
    mockDb.getLectureById.mockResolvedValue({ ...mockLecture, userId: 999 });

    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.moment.listByLecture({ lectureId: "test-lecture" })
    ).rejects.toThrow(TRPCError);
  });
});

describe("moment.markReviewed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks a moment as reviewed", async () => {
    const ctx = createAuthContext();
    mockDb.markMomentReviewed.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(ctx);
    const result = await caller.moment.markReviewed({ id: "moment-1" });

    expect(mockDb.markMomentReviewed).toHaveBeenCalledWith("moment-1");
    expect(result.success).toBe(true);
  });
});

// ─── AI Flow Tests ──────────────────────────────────────────────────────────

describe("ai.explain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates an explanation for a confusion moment", async () => {
    const ctx = createAuthContext();
    mockDb.getConfusionMomentById.mockResolvedValue(mockMoment);
    mockDb.getLectureById.mockResolvedValue(mockLecture);
    mockDb.setMomentExplanation.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(ctx);
    const result = await caller.ai.explain({ momentId: "moment-1" });

    expect(mockDb.setMomentExplanation).toHaveBeenCalledWith(
      "moment-1",
      expect.any(String)
    );
    expect(result.explanation).toBeDefined();
  });

  it("throws NOT_FOUND for non-existent moment", async () => {
    const ctx = createAuthContext();
    mockDb.getConfusionMomentById.mockResolvedValue(null);

    const caller = appRouter.createCaller(ctx);
    await expect(caller.ai.explain({ momentId: "fake" })).rejects.toThrow(TRPCError);
  });
});

describe("ai.summarize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns cached summary if available", async () => {
    const ctx = createAuthContext();
    mockDb.getLectureById.mockResolvedValue({
      ...mockLecture,
      aiSummary: "This lecture covered quantum mechanics basics.",
    });

    const caller = appRouter.createCaller(ctx);
    const result = await caller.ai.summarize({ lectureId: "test-lecture" });

    expect(result.summary).toBe("This lecture covered quantum mechanics basics.");
  });

  it("generates a new summary when none exists", async () => {
    const ctx = createAuthContext();
    mockDb.getLectureById.mockResolvedValue(mockLecture);
    mockDb.getConfusionMoments.mockResolvedValue([mockMoment]);
    mockDb.setLectureAISummary.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(ctx);
    const result = await caller.ai.summarize({ lectureId: "test-lecture" });

    expect(mockDb.setLectureAISummary).toHaveBeenCalled();
    expect(result.summary).toBeDefined();
  });
});

describe("ai.generateQuiz", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates quiz from confusion moments", async () => {
    const ctx = createAuthContext();
    mockDb.getLectureById.mockResolvedValue(mockLecture);
    mockDb.getConfusionMoments.mockResolvedValue([mockMoment]);
    mockDb.setLectureAIQuiz.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(ctx);
    const result = await caller.ai.generateQuiz({ lectureId: "test-lecture" });

    expect(mockDb.setLectureAIQuiz).toHaveBeenCalled();
    expect(result.quiz).toBeDefined();
  });

  it("returns cached quiz if available", async () => {
    const ctx = createAuthContext();
    const quizData = [
      {
        question: "What is wave-particle duality?",
        options: ["A) Wave only", "B) Particle only", "C) Both", "D) Neither"],
        correctAnswer: 2,
        explanation: "Objects exhibit both wave and particle properties.",
      },
    ];
    mockDb.getLectureById.mockResolvedValue({
      ...mockLecture,
      aiQuiz: JSON.stringify(quizData),
    });

    const caller = appRouter.createCaller(ctx);
    const result = await caller.ai.generateQuiz({ lectureId: "test-lecture" });

    expect(result.quiz).toEqual(quizData);
  });
});

describe("ai.chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends a chat message and returns a response", async () => {
    const ctx = createAuthContext();
    mockDb.getLectureById.mockResolvedValue(mockLecture);
    mockDb.getConfusionMoments.mockResolvedValue([mockMoment]);
    mockDb.createChatMessage.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(ctx);
    const result = await caller.ai.chat({
      lectureId: "test-lecture",
      messages: [
        { role: "user", content: "What is wave-particle duality?" },
      ],
    });

    expect(mockDb.createChatMessage).toHaveBeenCalledTimes(2); // user + assistant
    expect(result.response).toBeDefined();
  });

  it("throws FORBIDDEN for unauthorized lecture access", async () => {
    const ctx = createAuthContext();
    mockDb.getLectureById.mockResolvedValue({ ...mockLecture, userId: 999 });

    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.ai.chat({
        lectureId: "test-lecture",
        messages: [{ role: "user", content: "Hello" }],
      })
    ).rejects.toThrow(TRPCError);
  });
});

// ─── Teacher Analytics Tests ────────────────────────────────────────────────

describe("teacher.analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns analytics with topic breakdown", async () => {
    const ctx = createAuthContext();
    mockDb.getLectureById.mockResolvedValue(mockLecture);
    mockDb.getConfusionMoments.mockResolvedValue([mockMoment]);

    const caller = appRouter.createCaller(ctx);
    const result = await caller.teacher.analytics({ lectureId: "test-lecture" });

    expect(result.lecture.id).toBe("test-lecture");
    expect(result.lecture.totalConfusionPoints).toBe(1);
    expect(result.topicBreakdown).toHaveLength(1);
    expect(result.topicBreakdown[0]?.topic).toBe("Wave-particle duality");
    expect(result.suggestions).toBeDefined();
  });

  it("throws NOT_FOUND for non-existent lecture", async () => {
    const ctx = createAuthContext();
    mockDb.getLectureById.mockResolvedValue(null);

    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.teacher.analytics({ lectureId: "nonexistent" })
    ).rejects.toThrow(TRPCError);
  });
});

describe("teacher.overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns overview with lecture summaries", async () => {
    const ctx = createAuthContext();
    mockDb.getUserLectures.mockResolvedValue([mockLecture]);
    mockDb.getConfusionMoments.mockResolvedValue([mockMoment]);

    const caller = appRouter.createCaller(ctx);
    const result = await caller.teacher.overview();

    expect(result.totalLectures).toBe(1);
    expect(result.totalConfusionPoints).toBe(1);
    expect(result.lectures).toHaveLength(1);
    expect(result.lectures[0]?.title).toBe("Physics 101");
  });
});

// ─── Transcript Tests ───────────────────────────────────────────────────────

describe("transcript.getByLecture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns transcript lines for a lecture", async () => {
    const ctx = createAuthContext();
    mockDb.getLectureById.mockResolvedValue(mockLecture);
    mockDb.getTranscripts.mockResolvedValue([
      { id: "t1", lectureId: "test-lecture", text: "Hello", timestamp: 10, createdAt: new Date() },
    ]);

    const caller = appRouter.createCaller(ctx);
    const result = await caller.transcript.getByLecture({ lectureId: "test-lecture" });

    expect(result).toHaveLength(1);
  });
});
