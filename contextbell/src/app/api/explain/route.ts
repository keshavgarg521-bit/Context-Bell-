import { generateExplanation } from "@/lib/ai-service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { moment } = await req.json();
  const explanation = generateExplanation(moment);
  return NextResponse.json({ explanation });
}
