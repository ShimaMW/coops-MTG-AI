import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const MODEL_NAME = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-2.5-flash";

function cleanAndParseJson(text: string) {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return JSON.parse(cleaned);
}

export async function generateMinutesAIClientSide(params: {
  meetingDate: string;
  dept: string;
  meetingType: string;
  participants: string;
  agendaBody?: string;
  inputText?: string;
  audioBase64?: string;
  audioMimeType?: string;
  files?: { base64: string; mimeType: string; fileName?: string }[];
  imageBase64?: string;
  imageMimeType?: string;
}) {
  let apiKey =
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    try {
      const res = await fetch("/api/auth/gemini-key");
      if (res.ok) {
        const data = await res.json();
        apiKey = data.apiKey;
      }
    } catch (e) {
      console.warn("Failed to fetch API key from /api/auth/gemini-key", e);
    }
  }

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY が取得できませんでした。");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          transcript: { type: SchemaType.STRING, description: "音声または画像がある場合の要点テキスト起こし" },
          summary: { type: SchemaType.STRING, description: "1. 会議要約（会議の目的と決定事項のハイライトを2〜3文で簡潔に）" },
          discussions: { type: SchemaType.STRING, description: "2. 議論内容・経緯（各議題ごとのスタッフ発言や議論の流れを分かりやすく箇条書き）" },
          action_plans: { type: SchemaType.STRING, description: "3. 決定事項・ToDo（【誰が】【いつまでに】【何をするか】を明確に記載）" },
          next_steps: { type: SchemaType.STRING, description: "4. 次回検討・特記事項（次回への宿題、理念の気づき、AIからのワンポイント助言）" },
        },
        required: [
          "summary",
          "discussions",
          "action_plans",
          "next_steps",
        ],
      },
    },
  });

  const prompt = `あなたは介護・福祉事業所（クローバーズ／COOPs）の最高峰の会議ファシリテーター兼議事録AIです。
提供された情報（テキストメモ、音声データ、添付された複数枚の画像・ホワイトボード写真・PDF資料等）をもとに、実務的で極めて解像度の高い【4セクション構成】の公式議事録を作成してください。

【会議情報】
- 会議日: ${params.meetingDate || "未記載"}
- 部署: ${params.dept || "未記載"}
- 会議種別: ${params.meetingType || "定例ミーティング"}
- 参加者: ${params.participants || "未記載"}
${params.agendaBody ? `\n【事前アジェンダ】\n${params.agendaBody}` : ""}

【テキストメモ・入力データ】
${params.inputText || "（テキスト入力なし：添付音声/画像より生成）"}

【4セクションの作成基準（模範例に基づくプロ仕様スタイル）】

1. 会議要約・前提（summary）:
   - 会議全体の結論・要点ハイライトを2〜3文で簡潔にまとめてください。
   - 会議の背景や組織状態・前提概念があれば「0. はじめに：前提と組織状態」として冒頭に付記してください。

2. 議論内容・経緯（discussions）:
   - 各議題（「1. 【議題1】〜」「2. 【議題2】〜」）ごとに構造化して記載してください。
   - 単なる発言の羅列ではなく、以下の深さで整理してください：
     ① 定量的ファクト・現状の課題分析（アンケート結果や数値、現場の具体的な出来事）
     ② 参加者間の対話・議論のグラデーション（例：「〇〇氏の提起：〜」「〇〇氏の構造的反論：〜」など、対立軸や検討の経緯を克明に記録）
     ③ 合意された方針や構造的転換（「なぜその結論に至ったか」のロジック）
   - 添付資料（ホワイトボード写真OCR、PDF資料）の数値やキーワードを漏れなく統合してください。

3. 決定事項・ToDo（action_plans）:
   - 時期別・担当者別の実効的なフォーマットで出力してください：
     ✨ 直ちに取り組むアクションプラン（1〜2週間以内）
     ・［項目名］：具体的なタスク内容［担当：氏名］
     ✨ 1ヶ月以内のアクションプラン
     ・［項目名］：具体的なタスク内容［担当：氏名］

4. 次回検討・特記事項 ＆ AIファシリテーターレビュー（next_steps）:
   - 次回の開催予定と持ち越し検討事項（「次回は〇月〇日開催。〜を検証」など）
   - 🤖 Geminiファシリテーターレビュー：
     1. 本会議のファシリテーション評価（良かった点：視座の高さ、合意形成プロセスなど）
     2. 課題と次回への改善提案（タイムマネジメント、現場行動への落とし込みなど）`;

  const contents: any[] = [];

  // 音声データ（Base64）
  if (params.audioBase64 && params.audioMimeType) {
    contents.push({
      inlineData: {
        data: params.audioBase64,
        mimeType: params.audioMimeType,
      },
    });
  }

  // 複数ファイル（画像データ、PDF、ホワイトボード写真等）
  if (params.files && params.files.length > 0) {
    for (const f of params.files) {
      if (f.base64 && f.mimeType) {
        contents.push({
          inlineData: {
            data: f.base64,
            mimeType: f.mimeType,
          },
        });
      }
    }
  }

  // 単一ファイル（後方互換）
  if (params.imageBase64 && params.imageMimeType && (!params.files || params.files.length === 0)) {
    contents.push({
      inlineData: {
        data: params.imageBase64,
        mimeType: params.imageMimeType,
      },
    });
  }

  contents.push(prompt);

  const result = await model.generateContent(contents);
  const text = result.response.text();
  return cleanAndParseJson(text);
}
