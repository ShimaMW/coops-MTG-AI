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
  imageBase64?: string;
  imageMimeType?: string;
  attachmentText?: string;
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
以下の会議情報、議題メモ、および添付資料（画像・テキスト）をもとに、実務的で進行しやすい会議アジェンダを作成してください。

【会議情報】
- 会議日: ${params.meetingDate || "未定"}
- 部署: ${params.dept || "未定"}
- 会議種別: ${params.meetingType || "定例ミーティング"}
- 参加者: ${params.participants || "未定"}
- 想定所要時間: ${params.duration || "未定"}

【議題メモ（ユーザー入力）】
${params.topics || "（特記事項なし）"}
${params.attachmentText ? `\n【添付資料テキスト】\n${params.attachmentText}` : ""}

【作成方針】
- 添付された画像資料（ホワイトボード写真、前月報告書、企画案等）やテキスト資料がある場合は、その内容・データを詳細に読み解き、今回の会議で協議・決定すべき論点としてアジェンダに反映してください。
- 各議題には「確認すべきポイント」「注意点」「AIからのアドバイス」を追記してください。
- 介護事業所の運営・業務効率化・スタッフ連携・安全管理・クローバーイズム（組織理念）の観点を盛り込んでください。
- 【報告】【決定】【議論】等の種別を各議題に付与してください。すべて日本語表記とし、英語表記は使用しないでください。`;

  const contents: any[] = [];

  // 画像データ（ホワイトボード写真、手書きメモ、前月レジュメ写真等）
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

  const prompt = `あなたは介護事業所向けのプロフェッショナル会議ファシリテーターAIです。
提供された情報（テキストメモ、音声データ、添付画像・ホワイトボード写真等）をもとに、現場スタッフが見やすく実務に直結する【4セクション構成】の明瞭な議事録を作成してください。

【会議情報】
- 会議日: ${params.meetingDate || "未記載"}
- 部署: ${params.dept || "未記載"}
- 会議種別: ${params.meetingType || "定例ミーティング"}
- 参加者: ${params.participants || "未記載"}
${params.agendaBody ? `\n【事前アジェンダ】\n${params.agendaBody}` : ""}

【テキストメモ・入力データ】
${params.inputText || "（テキスト入力なし：添付音声/画像より生成）"}

【4セクションの作成方針】
1. 会議要約（summary）:
   - 会議全体の結論・要点を2〜3文で簡潔にまとめてください。
2. 議論内容・経緯（discussions）:
   - 議題ごとに話し合われた内容やスタッフの発言（「氏名：〜」）、検討の経緯を整理してください。
3. 決定事項・ToDo（action_plans）:
   - 【担当者】と【期日・時期】を必ず明記し、誰が何をすべきか一目でわかるようにしてください。
4. 次回検討・特記事項（next_steps）:
   - 次回までに持ち越す課題や宿題、介護理念（利用者本位・安全管理等）の実践ポイント、AIからのワンポイント改善助言をコンパクトにまとめてください。`;

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
