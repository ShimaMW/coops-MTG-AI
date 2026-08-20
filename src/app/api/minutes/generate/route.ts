import { NextRequest, NextResponse } from "next/server";
import { generateMinutesAI } from "@/lib/gemini";

export const maxDuration = 60; // Vercel 実行時間拡張

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await generateMinutesAI(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Minutes Generation Error:", error);
    return NextResponse.json(
      { error: error.message || "議事録の生成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
