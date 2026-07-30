import { generateQuizFromMoments } from "@/lib/ai-service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { moments } = await req.json();
  const questions = generateQuizFromMoments(moments || []);
  return NextResponse.json({ questions });
}
