import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY || "";
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

const genAI = new GoogleGenerativeAI(API_KEY);

// 堅牢なJSONパースヘルパー
function cleanAndParseJson(rawText: string) {
  let text = rawText.trim();
  // マークダウンの ```json ... ``` または ``` ... ``` を除去
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    // 最初の { から最後の } までを抽出して再試行
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("AIの出力をJSON形式として読み込めませんでした。再度お試しください。");
  }
}

// ==========================================
// アジェンダ生成
// ==========================================
export async function generateAgendaAI(params: {
  meetingDate: string;
  dept: string;
  meetingType: string;
  participants: string;
  duration?: string;
  topics: string;
}) {
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING, description: "会議タイトル" },
          purpose: { type: SchemaType.STRING, description: "会議の目的（2〜3文）" },
          outcome: { type: SchemaType.STRING, description: "達成したい成果・決定事項（2〜3文）" },
          review: { type: SchemaType.STRING, description: "前回からの継続事項・振り返り（なければ空文字）" },
          agenda_items: { type: SchemaType.STRING, description: "各議題の詳細（【報告】【決定】【議論】等の区分、確認ポイント、注意点、AIアドバイス）" },
          closing: { type: SchemaType.STRING, description: "クロージング・次回予告に関するテキスト" },
          full_text: { type: SchemaType.STRING, description: "配布・印刷用整形テキスト" },
        },
        required: ["title", "purpose", "outcome", "agenda_items", "closing", "full_text"],
      },
    },
  });

  const prompt = `あなたは介護事業所の会議ファシリテーターAIです。
以下の会議情報と議題メモをもとに、実務的で進行しやすい会議アジェンダを作成してください。

【会議情報】
- 会議日: ${params.meetingDate || "未定"}
- 部署: ${params.dept || "未定"}
- 会議種別: ${params.meetingType || "定例ミーティング"}
- 参加者: ${params.participants || "未定"}
- 想定所要時間: ${params.duration || "未定"}

【議題メモ（ユーザー入力）】
${params.topics || "（特記事項なし）"}

【作成方針】
- 各議題には「確認すべきポイント」「注意点」「AIからのアドバイス」を追記してください。
- 介護事業所の運営・業務効率化・スタッフ連携・安全管理・クローバーイズム（組織理念）の観点を盛り込んでください。
- 【報告】【決定】【議論】等の種別を各議題に付与してください。すべて日本語表記とし、英語表記は使用しないでください。`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return cleanAndParseJson(text);
}

// ==========================================
// 議事録生成（テキスト＋音声＋画像OCRマルチモーダル対応）
// ==========================================
export async function generateMinutesAI(params: {
  meetingDate: string;
  dept: string;
  meetingType: string;
  participants: string;
  agendaBody?: string;
  inputText?: string;
  audioBase64?: string;
  audioMimeType?: string;
  imageBase64?: string;
  imageMimeType?: string;
}) {
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          transcript: { type: SchemaType.STRING, description: "音声または画像がある場合の要点テキスト起こしまたは全文" },
          summary: { type: SchemaType.STRING, description: "会議全体の要約（500〜2000文字）" },
          agenda_items: { type: SchemaType.STRING, description: "議題と振り返り（箇条書き・アジェンダとの対応）" },
          key_discussions: { type: SchemaType.STRING, description: "主な議論・発言（発言者：内容の形式）" },
          action_plans: { type: SchemaType.STRING, description: "決定事項・アクションプラン（担当者・期日を明記）" },
          culture_notes: { type: SchemaType.STRING, description: "組織文化・理念・チーム運営に関する発言や気づき" },
          next_agenda: { type: SchemaType.STRING, description: "次回の検討事項・宿題" },
          facilitator_feedback: { type: SchemaType.STRING, description: "AIファシリテーターとしての評価（良かった点2つ・改善提案2つ）" },
        },
        required: [
          "summary",
          "agenda_items",
          "key_discussions",
          "action_plans",
          "culture_notes",
          "next_agenda",
          "facilitator_feedback",
        ],
      },
    },
  });

  const prompt = `あなたは介護事業所向けのプロフェッショナル会議ファシリテーターAIです。
提供された情報（テキストメモ、音声データ、添付画像・ホワイトボード写真等）をもとに、実務に直結する明瞭で詳細な議事録を作成してください。

【会議情報】
- 会議日: ${params.meetingDate || "未記載"}
- 部署: ${params.dept || "未記載"}
- 会議種別: ${params.meetingType || "定例ミーティング"}
- 参加者: ${params.participants || "未記載"}
${params.agendaBody ? `\n【事前アジェンダ】\n${params.agendaBody}` : ""}

【テキストメモ・入力データ】
${params.inputText || "（テキスト入力なし：添付音声/画像より生成）"}

【作成方針】
1. 音声、テキスト、添付画像（ホワイトボードや手書きメモ、配布資料）の情報を詳細まで読み込み、文字を正確に認識して議論の経緯と結論を記録してください。
2. アジェンダがある場合は各議題に対応した議論・結論を整理してください。アジェンダ外の議論も客観的に整理してください。
3. 発言者が特定できる場合は「氏名：〜」の形式で記録してください。
4. アクションプランには必ず「担当者」と「期日（または目安時期）」を明記してください。
5. 事業所運営やチームワーク、介護理念（利用者本位、安心・安全、スタッフ連携）に関する気づきを「組織文化・理念」に盛り込んでください。
6. 会議に出ていないスタッフが見ても、なぜその決定になったのかが明確に伝わる丁寧な文章にしてください。
7. AI評価では、会議の進行・発言バランス・決定の質について具体的なフィードバックを提示してください。`;

  const contents: any[] = [];

  // 音声データ
  if (params.audioBase64 && params.audioMimeType) {
    contents.push({
      inlineData: {
        data: params.audioBase64,
        mimeType: params.audioMimeType,
      },
    });
  }

  // 画像データ（ホワイトボード写真、手書きメモ、紙レジュメ）
  if (params.imageBase64 && params.imageMimeType) {
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
