import { generateChatResponse } from "@/lib/ai-service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { message, session } = await req.json();

  const context = {
    title: session?.title || "Offline lecture",
    moments: session?.moments || [],
  };

  // When configured, the tutor uses a real model with the captured session
  // context. The local fallback keeps the interface usable without an API key.
  if (process.env.OPENAI_API_KEY) {
    const source = context.moments.map((moment: { topic?: string; quote?: string }) =>
      `Topic: ${moment.topic || "Untitled"}\nCaptured transcript: ${moment.quote || "No transcript available"}`
    ).join("\n\n");
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: `You are a precise personal tutor. Answer the learner's question using only this in-person lecture context when possible. Explain clearly and step by step.\n\nLecture: ${context.title}\n\n${source || "No confusion points have been marked yet."}\n\nLearner question: ${message}`,
      }),
    });
    if (response.ok) {
      const result = await response.json() as { output_text?: string };
      if (result.output_text) return NextResponse.json({ reply: result.output_text });
    }
  }

  const reply = generateChatResponse(message, context);
  return NextResponse.json({ reply });
}
