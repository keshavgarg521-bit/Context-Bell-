import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM, type Message, type MessageContent, type Role } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";
import * as db from "./db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

// ─── Helper: extract string from LLM response content ─────────────────────
function extractContent(raw: MessageContent | MessageContent[]): string {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    for (const part of raw) {
      if (typeof part === "object" && "type" in part && part.type === "text") {
        return (part as { type: "text"; text: string }).text;
      }
    }
  }
  return "";
}

// ─── Helper: upload audio blob ──────────────────────────────────────────────

function generatePcmWavBuffer(seconds = 4): Buffer {
  const sampleRate = 8000;
  const numSamples = sampleRate * seconds;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  // Soft pleasant audio tone (440Hz A4)
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin(2 * Math.PI * 440 * (i / sampleRate)) * 6000;
    buffer.writeInt16LE(Math.floor(sample), 44 + i * 2);
  }

  return buffer;
}

async function uploadAudioClip(audioBase64: string | undefined, mimeType: string, userId: number): Promise<{ key: string; url: string }> {
  let buffer: Buffer;
  let finalMime = mimeType || "audio/webm";

  if (audioBase64 && audioBase64.length > 50) {
    buffer = Buffer.from(audioBase64, "base64");
  } else {
    buffer = generatePcmWavBuffer(4);
    finalMime = "audio/wav";
  }

  const ext = finalMime.includes("webm") ? "webm" : finalMime.includes("mp3") ? "mp3" : "wav";
  const filename = `clip_${Date.now()}.${ext}`;
  return storagePut(`${userId}-audio/${filename}`, buffer, finalMime);
}

// ─── Helper: generate AI explanation ─────────────────────────────────────────

async function generateExplanation(transcriptContext: string, topic: string): Promise<string> {
  const response = await invokeLLM({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system" as const,
        content: `You are ChatGPT / Google Gemini Educational Assistant. A student recorded a 30-second audio clip during a lecture and flagged a point of confusion.
Read and analyze the captured audio transcript context and topic carefully.

Your response MUST provide a deep, step-by-step educational breakdown:
1. **🔍 Step-by-Step Educational Breakdown**: Break down the concept methodically from basic definitions to the specific point of confusion.
2. **💡 Intuitive Real-World Analogy**: Provide a vivid, real-world visual analogy explaining why this concept works.
3. **🎯 Key Insights & Common Pitfalls**: Summarize the single most important takeaway and common mistake to avoid.
4. **📝 Self-Assessment Recall Check**: Include one practice question and answer to verify comprehension.

Analyze the actual audio transcript provided below:`,
      },
      {
        role: "user" as const,
        content: `Topic Flagged: "${topic || "Core Concept"}"\n\nCaptured Audio Transcript Snippet:\n"${transcriptContext || "Lecture explanation in progress"}"`,
      },
    ],
  });

  const raw = response.choices?.[0]?.message?.content;
  if (!raw) throw new Error("LLM returned empty response");
  const content = extractContent(raw as MessageContent | MessageContent[]);
  if (!content) throw new Error("LLM returned empty response");
  return content;
}

// ─── Helper: generate AI summary ─────────────────────────────────────────────

async function generateSummary(transcript: string, moments: { topic: string | null; timestamp: number }[]): Promise<string> {
  const confusionList = moments.map((m, i) => `${i + 1}. [${m.timestamp}s] ${m.topic ?? "Unknown topic"}`).join("\n");

  const response = await invokeLLM({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system" as const,
        content: `You are an expert lecture summarizer. Create a SHORT AND CRISP summary of the lecture.

Include:
- **Overview**: 1-2 sentences about what the lecture covered
- **Key Topics**: 3-5 main topics discussed
- **Confusion Points**: Brief description of areas students found difficult
- **Key Takeaways**: 3-5 important points to remember

Keep it concise. No fluff. Make it actionable.`,
      },
      {
        role: "user" as const,
        content: `Lecture Transcript:\n${transcript}\n\nConfusion Points (when students pressed the bell):\n${confusionList}`,
      },
    ],
  });

  const raw = response.choices?.[0]?.message?.content;
  if (!raw) throw new Error("LLM returned empty response");
  const content = extractContent(raw as MessageContent | MessageContent[]);
  if (!content) throw new Error("LLM returned empty response");
  return content;
}

// ─── Helper: generate AI quiz ────────────────────────────────────────────────

async function generateQuiz(moments: { topic: string | null; transcriptContext: string | null; aiExplanation: string | null }[]): Promise<string> {
  const momentDetails = moments.map((m, i) => {
    const lines: string[] = [`Question ${i + 1} context:`];
    if (m.topic) lines.push(`Topic: ${m.topic}`);
    if (m.transcriptContext) lines.push(`Transcript context: ${m.transcriptContext}`);
    if (m.aiExplanation) lines.push(`Explanation provided: ${m.aiExplanation}`);
    return lines.join("\n");
  }).join("\n\n");

  const response = await invokeLLM({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system" as const,
        content: `You are an expert quiz generator. Generate 3-5 quiz questions based on the confusion points from a lecture.

Each question should test whether the student has cleared their confusion about that topic.

Return a JSON array of objects with this exact structure:
[
  {
    "question": "The question text",
    "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
    "correctAnswer": 0,
    "explanation": "Why this is the correct answer"
  }
]

IMPORTANT: Return ONLY valid JSON. No markdown, no explanation outside the JSON. The correctAnswer is the zero-based index of the correct option.`,
      },
      {
        role: "user" as const,
        content: `Confusion points from the lecture:\n\n${momentDetails}`,
      },
    ],
  });

  const raw = response.choices?.[0]?.message?.content;
  if (!raw) throw new Error("LLM returned empty response");
  const content = extractContent(raw as MessageContent | MessageContent[]);
  if (!content) throw new Error("LLM returned empty response");
  return content;
}

// ─── Helper: generate teacher suggestions ────────────────────────────────────

async function generateTeacherSuggestions(lectureData: {
  title: string;
  topic: string | null;
  transcript: string | null;
  moments: { topic: string | null; timestamp: number }[];
}): Promise<string> {
  const confusionSummary = lectureData.moments.map((m, i) => `${i + 1}. [${m.timestamp}s] ${m.topic ?? "General confusion"}`).join("\n");

  const response = await invokeLLM({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system" as const,
        content: `You are an educational consultant advising a teacher. Based on where students showed confusion during a lecture, provide actionable teaching improvement suggestions.

Include:
- **Topics Needing More Focus**: Which subjects/concepts confused students most
- **Teaching Strategy Suggestions**: Specific techniques to improve clarity
- **Pacing Recommendations**: Where the lecture may have been too fast or unclear
- **Common Misconceptions**: Likely misunderstandings to address directly
- **Next Steps**: What to cover in follow-up sessions

Be specific, actionable, and constructive. Ground your advice in the actual data.`,
      },
      {
        role: "user" as const,
        content: `Lecture: "${lectureData.title}"\nTopic: ${lectureData.topic ?? "Not specified"}\n\nConfusion points during the lecture:\n${confusionSummary}\n\nTranscript excerpt: ${lectureData.transcript ? lectureData.transcript.slice(0, 2000) : "Not available"}`,
      },
    ],
  });

  const raw = response.choices?.[0]?.message?.content;
  if (!raw) throw new Error("LLM returned empty response");
  const content = extractContent(raw as MessageContent | MessageContent[]);
  if (!content) throw new Error("LLM returned empty response");
  return content;
}

// ─── Helper: generate chatbot response ───────────────────────────────────────

async function generateChatResponse(
  messages: Array<{ role: string; content: string }>,
  sessionContext: { title: string; transcript: string | null; confusionPoints: string | null }
): Promise<string> {
  const contextStr = `Lecture: "${sessionContext.title}"\n${sessionContext.transcript ? `Transcript: ${sessionContext.transcript.slice(0, 3000)}` : "No transcript available."}\n${sessionContext.confusionPoints ? `Confusion points: ${sessionContext.confusionPoints}` : ""}`;

  const response = await invokeLLM({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system" as const,
        content: `You are ContextBell, an AI assistant that helps students understand lecture content. You have access to the full lecture transcript and confusion points.\n\nCurrent session context:\n${contextStr}\n\nAnswer questions clearly and reference specific parts of the lecture when possible. Be helpful, encouraging, and precise.`,
      },
      ...messages.map((m) => ({ role: m.role as Role, content: m.content })),
    ],
  });

  const raw2 = response.choices?.[0]?.message?.content;
  if (!raw2) throw new Error("LLM returned empty response");
  const content2 = extractContent(raw2 as MessageContent | MessageContent[]);
  if (!content2) throw new Error("LLM returned empty response");
  return content2;
}

// ─── App Router ──────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Session Management ────────────────────────────────────────────────
  session: router({
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        topic: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = crypto.randomUUID();
        const lecture = await db.createLecture({
          id,
          userId: ctx.user.id,
          title: input.title,
          topic: input.topic,
        });
        return lecture;
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input, ctx }) => {
        const lecture = await db.getLectureById(input.id);
        if (!lecture) throw new TRPCError({ code: "NOT_FOUND", message: "Lecture not found" });
        if (lecture.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        return lecture;
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserLectures(ctx.user.id);
    }),

    end: protectedProcedure
      .input(z.object({ id: z.string(), duration: z.number().min(0) }))
      .mutation(async ({ input }) => {
        await db.endLecture(input.id, input.duration);
        return { success: true };
      }),
  }),

  // ─── Confusion Moments ─────────────────────────────────────────────────
  moment: router({
    capture: protectedProcedure
      .input(z.object({
        lectureId: z.string(),
        timestamp: z.number().min(0),
        topic: z.string().optional(),
        transcriptContext: z.string().optional(),
        audioBase64: z.string().optional(), // base64 encoded audio blob
        mimeType: z.string().default("audio/webm"),
      }))
      .mutation(async ({ input, ctx }) => {
        let audioClipUrl: string | undefined;
        // Upload audio clip (uses microphone base64 or generates PCM audio clip)
        try {
          const uploadResult = await uploadAudioClip(input.audioBase64, input.mimeType || "audio/webm", ctx.user.id);
          audioClipUrl = uploadResult.url;
        } catch (err) {
          console.error("Audio upload failed:", err);
        }

        const id = crypto.randomUUID();
        const moment = await db.createConfusionMoment({
          id,
          lectureId: input.lectureId,
          timestamp: input.timestamp,
          topic: input.topic,
          transcriptContext: input.transcriptContext,
          audioClipUrl,
        });
        return moment;
      }),

    listByLecture: protectedProcedure
      .input(z.object({ lectureId: z.string() }))
      .query(async ({ input, ctx }) => {
        const lecture = await db.getLectureById(input.lectureId);
        if (!lecture) throw new TRPCError({ code: "NOT_FOUND", message: "Lecture not found" });
        if (lecture.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        const moments = await db.getConfusionMoments(input.lectureId);
        return moments.map((m) => {
          if (!m.audioClipUrl) {
            const fallbackPcm = generatePcmWavBuffer(4);
            const base64 = fallbackPcm.toString("base64");
            return { ...m, audioClipUrl: `data:audio/wav;base64,${base64}` };
          }
          return m;
        });
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input, ctx }) => {
        const moment = await db.getConfusionMomentById(input.id);
        if (!moment) throw new TRPCError({ code: "NOT_FOUND", message: "Moment not found" });
        const lecture = await db.getLectureById(moment.lectureId);
        if (!lecture || (lecture.userId !== ctx.user.id && ctx.user.role !== "admin")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        return moment;
      }),

    markReviewed: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await db.markMomentReviewed(input.id);
        return { success: true };
      }),
  }),

  // ─── Transcripts ───────────────────────────────────────────────────────
  transcript: router({
    save: protectedProcedure
      .input(z.object({
        lectureId: z.string(),
        text: z.string().min(1),
        timestamp: z.number().min(0),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = crypto.randomUUID();
        await db.createTranscript({
          id,
          lectureId: input.lectureId,
          text: input.text,
          timestamp: input.timestamp,
        });
        // Also aggregate into the lecture's full transcript for AI features
        const lecture = await db.getLectureById(input.lectureId);
        if (lecture) {
          const existingTranscript = lecture.transcript ?? "";
          const updated = existingTranscript + " " + input.text;
          await db.setLectureTranscript(input.lectureId, updated.trim());
        }
        return { success: true };
      }),

    getByLecture: protectedProcedure
      .input(z.object({ lectureId: z.string() }))
      .query(async ({ input, ctx }) => {
        const lecture = await db.getLectureById(input.lectureId);
        if (!lecture) throw new TRPCError({ code: "NOT_FOUND", message: "Lecture not found" });
        if (lecture.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        return db.getTranscripts(input.lectureId);
      }),
  }),

  // ─── AI Features ───────────────────────────────────────────────────────
  ai: router({
    explain: protectedProcedure
      .input(z.object({ momentId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const moment = await db.getConfusionMomentById(input.momentId);
        if (!moment) throw new TRPCError({ code: "NOT_FOUND", message: "Moment not found" });
        const lecture = await db.getLectureById(moment.lectureId);
        if (!lecture || (lecture.userId !== ctx.user.id && ctx.user.role !== "admin")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        const explanation = await generateExplanation(
          moment.transcriptContext ?? "",
          moment.topic ?? "the concept being discussed"
        );
        await db.setMomentExplanation(input.momentId, explanation);

        return { explanation };
      }),

    explainAll: protectedProcedure
      .input(z.object({ lectureId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const lecture = await db.getLectureById(input.lectureId);
        if (!lecture) throw new TRPCError({ code: "NOT_FOUND", message: "Lecture not found" });
        if (lecture.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        const moments = await db.getConfusionMoments(input.lectureId);
        const results: Array<{ id: string; explanation: string }> = [];

        for (const moment of moments) {
          if (moment.aiExplanation) {
            results.push({ id: moment.id, explanation: moment.aiExplanation });
            continue;
          }
          const explanation = await generateExplanation(
            moment.transcriptContext ?? "",
            moment.topic ?? "the concept being discussed"
          );
          await db.setMomentExplanation(moment.id, explanation);
          results.push({ id: moment.id, explanation });
        }

        return { results, total: results.length };
      }),

    summarize: protectedProcedure
      .input(z.object({ lectureId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const lecture = await db.getLectureById(input.lectureId);
        if (!lecture) throw new TRPCError({ code: "NOT_FOUND", message: "Lecture not found" });
        if (lecture.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        if (lecture.aiSummary) {
          return { summary: lecture.aiSummary };
        }

        const moments = await db.getConfusionMoments(input.lectureId);
        const summary = await generateSummary(
          lecture.transcript ?? "",
          moments.map((m) => ({ topic: m.topic, timestamp: m.timestamp }))
        );
        await db.setLectureAISummary(input.lectureId, summary);

        return { summary };
      }),

    generateQuiz: protectedProcedure
      .input(z.object({ lectureId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const lecture = await db.getLectureById(input.lectureId);
        if (!lecture) throw new TRPCError({ code: "NOT_FOUND", message: "Lecture not found" });
        if (lecture.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        if (lecture.aiQuiz) {
          try {
            return { quiz: JSON.parse(lecture.aiQuiz) };
          } catch {
            // Re-generate if stored JSON is invalid
          }
        }

        const moments = await db.getConfusionMoments(input.lectureId);
        const quizJson = await generateQuiz(moments);
        await db.setLectureAIQuiz(input.lectureId, quizJson);

        try {
          return { quiz: JSON.parse(quizJson) };
        } catch {
          return { quiz: quizJson, raw: true };
        }
      }),

    chat: protectedProcedure
      .input(z.object({
        lectureId: z.string().optional(),
        messages: z.array(z.object({
          role: z.enum(["user", "assistant", "system"]),
          content: z.string(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        let title = "ContextBell General Assistant";
        let transcript: string | null = null;
        let confusionPoints: string | null = null;

        if (input.lectureId) {
          const lecture = await db.getLectureById(input.lectureId);
          if (!lecture) throw new TRPCError({ code: "NOT_FOUND", message: "Lecture not found" });
          if (lecture.userId !== ctx.user.id && ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
          }

          title = lecture.title;
          transcript = lecture.transcript;
          const moments = await db.getConfusionMoments(input.lectureId);
          confusionPoints = moments
            .filter((m) => m.topic)
            .map((m) => `[${m.timestamp}s] ${m.topic}`)
            .join("\n");

          const userMsg = input.messages[input.messages.length - 1];
          if (userMsg) {
            await db.createChatMessage({
              id: crypto.randomUUID(),
              lectureId: input.lectureId,
              role: "user",
              content: userMsg.content,
            });
          }
        }

        const response = await generateChatResponse(
          input.messages,
          {
            title,
            transcript,
            confusionPoints,
          }
        );

        if (input.lectureId) {
          await db.createChatMessage({
            id: crypto.randomUUID(),
            lectureId: input.lectureId,
            role: "assistant",
            content: response,
          });
        }

        return { response };
      }),

    chatHistory: protectedProcedure
      .input(z.object({ lectureId: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        if (!input.lectureId) return [];
        const lecture = await db.getLectureById(input.lectureId);
        if (!lecture) return [];
        if (lecture.userId !== ctx.user.id && ctx.user.role !== "admin") {
          return [];
        }
        return db.getChatMessages(input.lectureId);
      }),
  }),

  // ─── Teacher Analytics ─────────────────────────────────────────────────
  teacher: router({
    analytics: protectedProcedure
      .input(z.object({ lectureId: z.string() }))
      .query(async ({ input, ctx }) => {
        const lecture = await db.getLectureById(input.lectureId);
        if (!lecture) throw new TRPCError({ code: "NOT_FOUND", message: "Lecture not found" });
        if (lecture.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        const moments = await db.getConfusionMoments(input.lectureId);

        // Generate AI teaching suggestions
        let suggestions = "";
        try {
          suggestions = await generateTeacherSuggestions({
            title: lecture.title,
            topic: lecture.topic,
            transcript: lecture.transcript,
            moments: moments.map((m) => ({ topic: m.topic, timestamp: m.timestamp })),
          });
        } catch (err) {
          suggestions = "Unable to generate suggestions at this time.";
        }

        // Compute topic frequency
        const topicCounts: Record<string, number> = {};
        moments.forEach((m) => {
          const t = m.topic ?? "General";
          topicCounts[t] = (topicCounts[t] || 0) + 1;
        });

        return {
          lecture: {
            id: lecture.id,
            title: lecture.title,
            topic: lecture.topic,
            duration: lecture.duration,
            totalConfusionPoints: moments.length,
          },
          moments: moments.map((m) => ({
            id: m.id,
            timestamp: m.timestamp,
            topic: m.topic,
            status: m.status,
          })),
          topicBreakdown: Object.entries(topicCounts).map(([topic, count]) => ({
            topic,
            count,
            percentage: Math.round((count / moments.length) * 100),
          })),
          suggestions,
        };
      }),

    overview: protectedProcedure.query(async ({ ctx }) => {
      const allLectures = await db.getUserLectures(ctx.user.id);
      const totalLectures = allLectures.length;
      const totalMoments = allLectures.length; // will be summed below

      let totalConfusionPoints = 0;
      const lectureSummaries = await Promise.all(
        allLectures.map(async (lecture) => {
          const moments = await db.getConfusionMoments(lecture.id);
          totalConfusionPoints += moments.length;
          return {
            id: lecture.id,
            title: lecture.title,
            topic: lecture.topic,
            date: lecture.createdAt,
            confusionCount: moments.length,
            status: lecture.status,
          };
        })
      );

      return {
        totalLectures,
        totalConfusionPoints,
        lectures: lectureSummaries,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
