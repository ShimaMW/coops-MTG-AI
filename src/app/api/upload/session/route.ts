import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEYが設定されていません" }, { status: 500 });
    }

    const { fileName, mimeType, numBytes } = await req.json();

    if (!mimeType || !numBytes) {
      return NextResponse.json({ error: "ファイル情報（mimeType, numBytes）が不足しています" }, { status: 400 });
    }

    // Google Gemini Resumable Upload Initial Request
    const initRes = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "X-Goog-Upload-Protocol": "resumable",
          "X-Goog-Upload-Command": "start",
          "X-Goog-Upload-Header-Content-Length": String(numBytes),
          "X-Goog-Upload-Header-Content-Type": mimeType,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file: {
            display_name: fileName || "uploaded_audio",
          },
        }),
      }
    );

    if (!initRes.ok) {
      const errText = await initRes.text();
      throw new Error(`Google Upload Init Failed (${initRes.status}): ${errText}`);
    }

    // Googleから返されたアップロード専用URLを取得
    const uploadUrl = initRes.headers.get("x-goog-upload-url");
    if (!uploadUrl) {
      throw new Error("アップロードURLを取得できませんでした");
    }

    return NextResponse.json({ uploadUrl });
  } catch (error: any) {
    console.error("Upload session creation error:", error);
    return NextResponse.json(
      { error: error.message || "アップロードセッションの作成に失敗しました" },
      { status: 500 }
    );
  }
}
