import { generateLectureSummary } from "@/lib/ai-service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { title, moments } = await req.json();
  const summary = generateLectureSummary(title || "Lecture", moments || []);
  return NextResponse.json({ summary });
}
