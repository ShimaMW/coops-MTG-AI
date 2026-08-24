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
  files?: { base64: string; mimeType: string; fileName?: string }[];
  // 後方互換性
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

  const prompt = `あなたは介護事業所のプロフェッショナル会議ファシリテーターAIです。
以下の会議情報、議題メモ、および添付資料（複数画像・PDF・テキスト等）をもとに、実務的で進行しやすい会議アジェンダを作成してください。

【会議情報】
- 会議日: ${params.meetingDate || "未定"}
- 部署: ${params.dept || "未定"}
- 会議種別: ${params.meetingType || "定例ミーティング"}
- 参加者: ${params.participants || "未定"}
- 想定所要時間: ${params.duration || "未定"}

【議題メモ（ユーザー入力）】
${params.topics || "（特記事項なし）"}
${params.attachmentText ? `\n【添付資料テキスト】\n${params.attachmentText}` : ""}

【作成方針と視認性・改行ルール（極めて重要）】
- 【各議題の詳細（agenda_items）のフォーマット】:
  文章を1行に詰め込まず、必ず各項目ごとに改行（\\n）を入れ、空行で議題間を区切って以下のような極めて読みやすい階層構造で出力してください：

  1. 【報告】議題タイトル
  ・確認ポイント：確認すべき重要事項や数値
  ・注意点：現場への影響やリスク
  ・AIアドバイス：ファシリテーションの助言

  2. 【決定】議題タイトル
  ・確認ポイント：合意すべき基準や方針
  ・注意点：スタッフ負担やマニュアル改定の考慮点
  ・AIアドバイス：決定を円滑に進めるためのアドバイス

  3. 【議論】議題タイトル
  ・確認ポイント：現場の課題感やアイデア
  ・注意点：フォロー体制や定着の課題
  ・AIアドバイス：活発な議論を促すための問いかけ

- 目的（purpose）と達成成果（outcome）も、要点を箇条書きや改行で整理し、一目でわかるようにしてください。
- 添付されたすべての画像資料（複数枚のホワイトボード写真、前月報告書、企画案等）やPDF資料を余すことなく詳細に読み解き、今回の会議で協議・決定すべき論点として反映してください。
- 介護事業所の運営・業務効率化・スタッフ連携・安全管理・クローバーイズム（組織理念）の観点を盛り込んでください。
- すべて日本語表記とし、英語表記は使用しないでください。`;

  const contents: any[] = [];

  // 複数ファイル（画像・PDF）
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

// ==========================================
// 議事録生成（テキスト＋音声＋複数画像/PDF OCRマルチモーダル対応）
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
  audioFileUri?: string; // Google Gemini File API経由の大容量音声URI
  files?: { base64: string; mimeType: string; fileName?: string }[];
  // 後方互換性
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

  const prompt = `あなたは介護・福祉事業所（クローバーズ／COOPs）の最高峰のエグゼクティブ・ファシリテーター兼議事録AIです。
提供された情報（テキストメモ、音声データ、添付された複数枚の画像・ホワイトボード写真・PDF資料等）をもとに、実務的で極めて解像度の高い【4セクション構成】の公式議事録を作成してください。

【会議情報】
- 会議日: ${params.meetingDate || "未記載"}
- 部署: ${params.dept || "未記載"}
- 会議種別: ${params.meetingType || "定例ミーティング"}
- 参加者: ${params.participants || "未記載"}
${params.agendaBody ? `\n【事前アジェンダ】\n${params.agendaBody}` : ""}

【テキストメモ・入力データ】
${params.inputText || "（テキスト入力なし：添付音声/画像より生成）"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【超重要：専門性・精度向上のための5大ルール】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 【人名・発言者のマッピング】:
   - 参加者リスト（${params.participants || "未指定"}）を参照し、音声中の発言者を可能な限り登録されている名前に正しく照合してください。聞き取れない場合は役職や文脈で補完してください。

2. 【介護・福祉の専門用語・制度・固有名詞の自動補正】:
   - 業界特有の用語（例: ケアプラン、担当者会議、ケアマネ、サ責、バイタル、ヒヤリハット、処遇改善加算、特定処遇改善、加算要件、実地指導、ショートステイ、デイサービス、訪問看護、特変、ADL/IADL、看取り、申し送り、記録簿、送迎表等）は、音声のゆらぎや誤変換を文脈から正式な業界用語・正しい漢字表記に自動補正してください。

3. 【雑談・脱線のトリミングと議論密度の最大化】:
   - 1時間以上の長尺会議特有の「世間話」「脱線」「同じ話の堂々巡り」は大胆にカットし、「現場のファクトデータ（数値・具体的事例）」「方針決定の理由」「対立点・懸念点」に集中して凝縮してください。

4. 【ToDo・決定事項のSMART原則（曖昧さの完全排除）】:
   - 「〜について検討する」「共有する」といった曖昧な表現は禁止です。「【誰が】【いつまでに】【何を完了状態とするか（完了の定義）】」を具体的に記載してください。

5. 【添付資料・ホワイトボード写真（OCR）・PDFの数値統合】:
   - 添付資料がある場合は、そこに記載された数値、稼働率、実績、手書きの課題点を議論内容およびToDoに漏れなく統合してください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【4セクションの作成基準（模範例に基づくプロ仕様スタイル）】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 会議要約・前提（summary）:
   - 会議全体の結論・決定事項ハイライトを2〜3文で簡潔にまとめてください。
   - 会議の背景や組織状態・前提概念があれば「0. はじめに：前提と組織状態」として冒頭に付記してください。

2. 議論内容・経緯（discussions）:
   - 各議題（「1. 【議題1】〜」「2. 【議題2】〜」）ごとに構造化して記載してください。
   - 単なる発言の羅列ではなく、以下の深さで整理してください：
     ① 定量的ファクト・現状の課題分析（アンケート結果や数値、現場の具体的な出来事）
     ② 参加者間の対話・議論のグラデーション（例：「〇〇氏の提起：〜」「〇〇氏の構造的反論：〜」など、対立軸や検討の経緯を克明に記録）
     ③ 合意された方針や構造的転換（「なぜその結論に至ったか」のロジック）

3. 決定事項・ToDo（action_plans）:
   - 時期別・担当者別の実効的なフォーマットで出力してください：
     ✨ 直ちに取り組むアクションプラン（1〜2週間以内）
     ・［項目名］：具体的なタスク内容［担当：氏名／期日：〇月〇日］
     ✨ 1ヶ月以内のアクションプラン
     ・［項目名］：具体的なタスク内容［担当：氏名／期日：〇月〇日］

4. 次回検討・特記事項 ＆ AIファシリテーターレビュー（next_steps）:
   - 次回の開催予定と持ち越し検討事項（「次回は〇月〇日開催。〜を検証」など）
   - 🤖 Geminiファシリテーターレビュー：
     1. 本会議のファシリテーション評価（良かった点：合意形成プロセス、視座の高さなど）
     2. 課題と次回への改善提案（タイムマネジメント、報告と議論の比率、現場行動への落とし込みなど辛口かつ建設的な助言）`;

  const contents: any[] = [];

  // 大容量音声（Google Gemini File API直接アップロードされたURI）
  if (params.audioFileUri && params.audioMimeType) {
    contents.push({
      fileData: {
        fileUri: params.audioFileUri,
        mimeType: params.audioMimeType,
      },
    });
  }

  // 音声データ（Base64）
  if (params.audioBase64 && params.audioMimeType && !params.audioFileUri) {
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
