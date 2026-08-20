import { NextRequest, NextResponse } from "next/server";
import { generateAgendaAI } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await generateAgendaAI(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Agenda Generation Error:", error);
    return NextResponse.json(
      { error: error.message || "アジェンダの生成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
