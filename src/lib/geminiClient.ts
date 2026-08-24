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

  const prompt = `あなたは介護・福祉事業所の現場実務に精通した、正確で明瞭な議事録作成AIです。
提供された情報（テキストメモ、音声データ、添付された画像・ホワイトボード写真・PDF資料等）をもとに、現場スタッフや管理者がひと目で把握できる実務的な公式議事録を作成してください。

【会議情報】
- 会議日: ${params.meetingDate || "未記載"}
- 部署: ${params.dept || "未記載"}
- 会議種別: ${params.meetingType || "定例ミーティング"}
- 参加者: ${params.participants || "未記載"}
${params.agendaBody ? `\n【事前アジェンダ】\n${params.agendaBody}` : ""}

【テキストメモ・入力データ】
${params.inputText || "（テキスト入力なし：添付音声/画像より生成）"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【実務精度を高める6大ルール】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 【事前アジェンダとの連動・骨格マッピング（最重要）】:
   - 事前アジェンダが提供されている場合、アジェンダに記載された【各議題（報告・決定・議論など）】の項目・見出しをベース（骨格）として、会議中の発言や議論内容を対応する各議題にマッピングして整理してください。
   - アジェンダの「目的」や「達成したい成果」に対して、会議を通じてどのような結論が出たのかを「1. 会議要約」および「3. 決定事項」に明確に反映してください。
   - アジェンダに載っていなかった突発的な話題や追加事項がある場合は、「【追加議題・その他】」として自然に整理してください。

2. 【人名・発言者のマッピング】:
   - 参加者リスト（${params.participants || "未指定"}）を参照し、音声中の発言者を可能な限り登録されている名前に正しく照合してください。

3. 【介護・福祉の専門用語の自動補正】:
   - 業界特有の用語（例: ケアプラン、担当者会議、ケアマネ、サ責、バイタル、ヒヤリハット、処遇改善加算、特定処遇改善、加算要件、実地指導、ショートステイ、デイサービス、訪問看護、特変、ADL/IADL、看取り、申し送り、記録簿、送迎表等）は、音声のゆらぎや誤変換を文脈から正式な業界用語・正しい漢字表記に自動補正してください。

4. 【雑談のカットと議論密度の最適化】:
   - 会議特有の「世間話」「脱線」「同じ話の堂々巡り」はカットし、「現場の事実・数値」「方針決定の理由」「課題点」に集中して分かりやすく整理してください。

5. 【ToDo・決定事項の具体化】:
   - 「〜について検討する」「共有する」といった曖昧な表現を避け、「【誰が】【いつまでに】【何をするか】」を明確に記載してください。

6. 【理念・文化の無理なこじつけの禁止（重要）】:
   - 会議の中で実際に話されていない抽象的な理念論や精神論を勝手に創作・追加することは禁止です。あくまで現場で話し合われた事実と決定事項に忠実にまとめてください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【4セクションの作成基準】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 会議要約（summary）:
   - 会議全体の結論・決定事項のハイライトを2〜3文で簡潔にまとめてください。

2. 議論内容・経緯（discussions）:
   - 議題ごとに番号を振って構造化し、以下の流れで簡潔に記載してください：
     ・現状の状況・課題（数値や具体的事例）
     ・出た意見や検討のポイント
     ・決まった方針・結論とその理由

3. 決定事項・ToDo（action_plans）:
   - すぐに取り組むアクションと期日・担当者を明確に出力してください：
     ・［タスク名］：具体的な内容［担当：氏名／期日：〇月〇日］

4. 次回検討・特記事項（next_steps）:
   - 次回の開催予定や持ち越し事項
   - 🤖 AIからのワンポイント助言（タイムマネジメントや次回への準備など、現場に役立つ建設的・客観的な改善アドバイス）`;

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
