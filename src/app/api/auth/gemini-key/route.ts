import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 500 });
  }
  return NextResponse.json({ apiKey });
}
