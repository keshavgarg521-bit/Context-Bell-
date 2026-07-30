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

// ─── Helper: generate AI explanation with actual audio via Gemini multimodal ──

async function generateExplanationWithAudio(
  audioClipUrl: string,
  transcriptContext: string,
  topic: string
): Promise<string> {
  const GEMINI_KEY = process.env.GEMINI_API_KEY || "AIzaSyAkgJ-X58fnsxxf-h04aT8BErU3ewKWJjw";

  // Extract base64 audio for Gemini inline data
  // Node.js fetch() does NOT support data: URLs, so we handle them manually.
  let audioBase64 = "";
  let mimeType = "audio/webm";
  try {
    if (audioClipUrl.startsWith("data:")) {
      // data:audio/webm;base64,XXXX — split at the comma
      const commaIdx = audioClipUrl.indexOf(",");
      if (commaIdx !== -1) {
        const header = audioClipUrl.slice(5, commaIdx); // strip "data:"
        const mimeMatch = header.match(/^([^;]+)/);
        if (mimeMatch) mimeType = mimeMatch[1];
        audioBase64 = audioClipUrl.slice(commaIdx + 1);
      }
    } else if (audioClipUrl.startsWith("http")) {
      // Real HTTP URL — download it
      const audioRes = await fetch(audioClipUrl);
      if (audioRes.ok) {
        const buf = await audioRes.arrayBuffer();
        audioBase64 = Buffer.from(buf).toString("base64");
        mimeType = audioRes.headers.get("content-type") || "audio/webm";
      }
    }
  } catch (err) {
    console.warn("[Audio Download] Failed to extract audio for explanation:", err);
  }
  console.log(`[Gemini Multimodal] Audio extracted: ${audioBase64.length} base64 chars, mime: ${mimeType}`);

  const geminiModels = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"];

  for (const model of geminiModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;

      // Build parts — always include the text prompt; add audio inline if we have it
      const userParts: Record<string, unknown>[] = [];

      if (audioBase64) {
        userParts.push({
          inlineData: { mimeType, data: audioBase64 },
        });
      }

      userParts.push({
        text: audioBase64
          ? `IMPORTANT: Listen carefully to the audio recording attached above. First transcribe what you heard in the audio, then explain the concept being discussed.\n\nTopic label the student gave: "${topic || "Core Concept"}"\nText transcript hint: "${transcriptContext || "listen to audio"}"\n\nStep 1: Transcribe what you heard in the audio.\nStep 2: Based on what was actually spoken in the audio, provide a clear educational explanation.`
          : `Topic: "${topic || "Core Concept"}"\nTranscript: "${transcriptContext || "no audio available"}"\n\nProvide a clear educational explanation of this topic.`,
      });

      const body = {
        systemInstruction: {
          parts: [
            {
              text: audioBase64
                ? `You are an expert educational AI. A student was confused during a lecture and their microphone recorded the 30-second audio clip attached.

CRITICAL INSTRUCTIONS:
1. FIRST listen to the audio — transcribe exactly what was being said in the recording.
2. THEN identify what concept or topic was being explained at the point of confusion.
3. THEN explain that specific concept clearly and thoroughly.

Your response format:
**🎙️ What I Heard**: [Transcribe the key content from the audio]
**🔍 The Concept Being Explained**: [Identify the specific topic]
**💡 Clear Explanation**: [Explain it step-by-step from basics to the confusing part]
**🌍 Real-World Analogy**: [Give an intuitive analogy]
**🎯 Key Takeaway**: [Single most important point]
**📝 Quick Check**: [One practice question + answer]

Base EVERYTHING on what is actually said in the audio. Do NOT give generic explanations.`
                : `You are an expert educational AI. A student was confused during a lecture.
Topic: "${topic || "the concept being discussed"}"
Transcript context: "${transcriptContext || "not available"}"

Provide a helpful, structured educational explanation:
**🔍 Concept Explained**: [What this topic is about]
**💡 Step-by-Step Breakdown**: [Explain from basics]
**🌍 Real-World Analogy**: [Intuitive analogy]
**🎯 Key Takeaway**: [Most important point]
**📝 Quick Check**: [Practice question + answer]`,
            },
          ],
        },
        contents: [{ role: "user", parts: userParts }],
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (text) {
          console.log(`[Gemini Multimodal] Audio explanation generated via ${model}`);
          return text;
        }
      } else {
        console.warn(`[Gemini Multimodal] ${model} failed:`, res.status, await res.text().catch(() => ""));
      }
    } catch (err) {
      console.warn(`[Gemini Multimodal] ${model} error:`, err);
    }
  }

  // Fallback to text-only explanation
  console.warn("[Gemini Multimodal] All models failed, falling back to text-only explanation");
  return generateExplanation(transcriptContext, topic);
}

// ─── Helper: generate AI summary using Gemini with full session context ───────

async function generateSummaryWithAudio(
  transcript: string,
  moments: { topic: string | null; timestamp: number; transcriptContext: string | null; audioClipUrl: string | null }[]
): Promise<string> {
  const GEMINI_KEY = process.env.GEMINI_API_KEY || "AIzaSyAkgJ-X58fnsxxf-h04aT8BErU3ewKWJjw";

  const confusionList = moments
    .map((m, i) => `${i + 1}. [${m.timestamp}s] Topic: ${m.topic ?? "Unknown"} — Context: ${m.transcriptContext ?? "N/A"}`)
    .join("\n");

  // Try to collect audio clips for richer context (up to 3 clips to stay within limits)
  const audioClips: { base64: string; mimeType: string; timestamp: number }[] = [];
  for (const m of moments.slice(0, 3)) {
    if (!m.audioClipUrl) continue;
    try {
      let base64 = "";
      let mime = "audio/webm";
      if (m.audioClipUrl.startsWith("data:")) {
        // Node.js fetch() does NOT support data: URLs — extract manually
        const commaIdx = m.audioClipUrl.indexOf(",");
        if (commaIdx !== -1) {
          const header = m.audioClipUrl.slice(5, commaIdx);
          const mimeMatch = header.match(/^([^;]+)/);
          if (mimeMatch) mime = mimeMatch[1];
          base64 = m.audioClipUrl.slice(commaIdx + 1);
        }
      } else if (m.audioClipUrl.startsWith("http")) {
        const r = await fetch(m.audioClipUrl);
        if (r.ok) {
          base64 = Buffer.from(await r.arrayBuffer()).toString("base64");
          mime = r.headers.get("content-type") || "audio/webm";
        }
      }
      if (base64) audioClips.push({ base64, mimeType: mime, timestamp: m.timestamp });
    } catch { /* skip */ }
  }

  const geminiModels = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"];

  for (const model of geminiModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;

      const userParts: Record<string, unknown>[] = [];

      // Add audio clips as inline data
      for (const clip of audioClips) {
        userParts.push({ text: `[Audio clip at ${clip.timestamp}s — confusion moment]:` });
        userParts.push({ inlineData: { mimeType: clip.mimeType, data: clip.base64 } });
      }

      userParts.push({
        text: `Full Lecture Transcript:\n${transcript || "Not available"}\n\nConfusion Points (when student pressed the bell):\n${confusionList}\n\nGenerate a comprehensive yet concise AI summary of this lecture session.`,
      });

      const body = {
        systemInstruction: {
          parts: [
            {
              text: `You are an expert lecture summarizer. You have access to the full lecture transcript and audio recordings from confusion moments.
Analyze ALL the provided content — transcript text AND audio clips — to generate an accurate summary.

Your summary must include:
- **📖 Overview**: 2-3 sentences describing what the lecture actually covered (based on real content)
- **🔑 Key Topics Covered**: 4-6 main concepts that were taught
- **❓ Confusion Points**: What specifically confused the student at each bell-press moment, with brief clarification
- **💡 Key Takeaways**: 3-5 most important points to remember from this lecture
- **📚 Suggested Review**: What the student should revisit or practice

Base your summary on the ACTUAL audio and transcript content — not generic knowledge. Make it specific and useful.`,
            },
          ],
        },
        contents: [{ role: "user", parts: userParts }],
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (text) {
          console.log(`[Gemini Summary] Generated via ${model} with ${audioClips.length} audio clips`);
          return text;
        }
      } else {
        console.warn(`[Gemini Summary] ${model} failed:`, res.status, await res.text().catch(() => ""));
      }
    } catch (err) {
      console.warn(`[Gemini Summary] ${model} error:`, err);
    }
  }

  // Fallback to text-only summary
  return generateSummary(transcript, moments);
}

// ─── Helper: generate AI summary (text-only fallback) ─────────────────────────

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
        // Return moments as-is. audioClipUrl may be a real URL or a data: URL.
        // Do NOT replace missing audio with a fake PCM beep — that confuses Gemini.
        return moments;
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

        // Use audio-powered Gemini multimodal explanation if audio is available
        const explanation = moment.audioClipUrl
          ? await generateExplanationWithAudio(
              moment.audioClipUrl,
              moment.transcriptContext ?? "",
              moment.topic ?? "the concept being discussed"
            )
          : await generateExplanation(
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
          const explanation = moment.audioClipUrl
            ? await generateExplanationWithAudio(
                moment.audioClipUrl,
                moment.transcriptContext ?? "",
                moment.topic ?? "the concept being discussed"
              )
            : await generateExplanation(
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

        const moments = await db.getConfusionMoments(input.lectureId);

        // Use Gemini multimodal with real audio + transcript for a grounded summary
        const summary = await generateSummaryWithAudio(
          lecture.transcript ?? "",
          moments.map((m) => ({
            topic: m.topic,
            timestamp: m.timestamp,
            transcriptContext: m.transcriptContext,
            audioClipUrl: m.audioClipUrl,
          }))
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
