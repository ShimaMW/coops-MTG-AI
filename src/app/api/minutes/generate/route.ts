import { NextRequest, NextResponse } from "next/server";
import { generateMinutesAI } from "@/lib/gemini";

export const maxDuration = 60; // Vercel タイムアウト延長（最大60秒）

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      meetingDate,
      dept,
      meetingType,
      participants,
      agendaBody,
      inputText,
      audioBase64,
      audioMimeType,
      imageBase64,
      imageMimeType,
      files,
    } = body;

    if (!inputText && !audioBase64 && !imageBase64 && (!files || files.length === 0)) {
      return NextResponse.json(
        { error: "テキストメモ、音声データ、または写真/画像を入力してください。" },
        { status: 400 }
      );
    }

    const result = await generateMinutesAI({
      meetingDate,
      dept,
      meetingType,
      participants,
      agendaBody,
      inputText,
      audioBase64,
      audioMimeType,
      imageBase64,
      imageMimeType,
      files,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Minutes generation error:", error);
    return NextResponse.json(
      { error: error.message || "議事録の生成中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
