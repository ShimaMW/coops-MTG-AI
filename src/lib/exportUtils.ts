import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { MeetingRecord } from "./types";

// ==========================================
// 日付フォーマッター（常に YYYY/M/D 形式へ正規化）
// ==========================================
export function formatSlashDate(dateStr?: string): string {
  if (!dateStr) {
    const d = new Date();
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  }
  const clean = String(dateStr).trim();
  // 既に YYYY/M/D や YYYY-MM-DD 等の形式の場合
  const match = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (match) {
    return `${match[1]}/${parseInt(match[2], 10)}/${parseInt(match[3], 10)}`;
  }
  // Dateパース可能な文字列（Mon Aug 24 2026 GMT... 等）
  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  }
  return dateStr;
}

export function formatJPDate(dateStr: string): string {
  if (!dateStr) return "";
  const slash = formatSlashDate(dateStr);
  const parts = slash.split("/");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const d = new Date(y, m - 1, day);
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    return `${y}年${m}月${day}日（${days[d.getDay()]}）`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
}

// ==========================================
// アジェンダ議題の自動改行・階層整形フォーマッター
// ==========================================
export function formatAgendaItemsText(text?: string): string {
  if (!text) return "";
  let formatted = text;
  // 確認ポイント・注意点・AIアドバイスの前に改行と「・」を付与
  formatted = formatted.replace(/([。、\s]*)確認ポイント[：:]\s*/g, "\n・確認ポイント：");
  formatted = formatted.replace(/([。、\s]*)注意点[：:]\s*/g, "\n・注意点：");
  formatted = formatted.replace(/([。、\s]*)AIアドバイス[：:]\s*/g, "\n・AIアドバイス：");
  // 各議題の開始（【報告】や数字付き見出し）の前に空行改行を付与
  formatted = formatted.replace(/([。、\s]*)(【(?:報告|決定|議論|共有|協議|連絡|審議|その他)】|\d+\.\s*【)/g, "\n\n$2");
  return formatted.trim();
}

// ==========================================
// Googleカレンダー 登録URL生成
// ==========================================
export function getGoogleCalendarUrl(params: {
  title?: string;
  meetingDate: string;
  startTime?: string;
  endTime?: string;
  duration?: string;
  dept: string;
  meetingType: string;
  details: string;
}): string {
  // 日付の正規化（YYYYMMDD形式へ）
  let year = "";
  let month = "";
  let day = "";

  const dateParts = params.meetingDate.replace(/-/g, "/").split("/");
  if (dateParts.length === 3) {
    year = dateParts[0].padStart(4, "0");
    month = dateParts[1].padStart(2, "0");
    day = dateParts[2].padStart(2, "0");
  } else {
    const d = new Date();
    year = String(d.getFullYear());
    month = String(d.getMonth() + 1).padStart(2, "0");
    day = String(d.getDate()).padStart(2, "0");
  }

  const ymd = `${year}${month}${day}`;

  // 開始時刻・終了時刻の取得
  let startH = "10";
  let startM = "00";
  let endH = "11";
  let endM = "00";

  if (params.startTime && params.startTime.includes(":")) {
    const [sh, sm] = params.startTime.split(":");
    startH = sh.padStart(2, "0");
    startM = sm.padStart(2, "0");
  }

  if (params.endTime && params.endTime.includes(":")) {
    const [eh, em] = params.endTime.split(":");
    endH = eh.padStart(2, "0");
    endM = em.padStart(2, "0");
  } else if (params.duration && params.duration.includes("〜")) {
    // duration文字列から「10:00〜11:30」などを抽出
    const match = params.duration.match(/(\d{1,2}):(\d{2})\s*〜\s*(\d{1,2}):(\d{2})/);
    if (match) {
      startH = match[1].padStart(2, "0");
      startM = match[2].padStart(2, "0");
      endH = match[3].padStart(2, "0");
      endM = match[4].padStart(2, "0");
    }
  }

  const startIso = `${ymd}T${startH}${startM}00`;
  const endIso = `${ymd}T${endH}${endM}00`;
  const datesParam = `${startIso}/${endIso}`;

  const text = encodeURIComponent(`【${params.dept}】${params.meetingType}`);
  const details = encodeURIComponent(params.details);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${datesParam}&details=${details}`;
}

// ==========================================
// LINE WORKS / チャット共有用サマリーテキスト
// ==========================================
export function getChatSummaryText(item: MeetingRecord): string {
  if (!item.minutes) return "";
  const nextText = item.minutes.next_steps || item.minutes.next_agenda || "";
  return [
    `📢 【${item.dept}】${item.meetingType} 議事録`,
    `📅 開催日: ${formatJPDate(item.meetingDate)}`,
    `👥 参加者: ${item.participants || "（未指定）"}`,
    "",
    "📌 【会議要約】",
    item.minutes.summary,
    "",
    "✨ 【決定事項・ToDo】",
    item.minutes.action_plans,
    "",
    nextText ? `📅 【次回検討・特記事項】\n${nextText}` : "",
  ].filter(Boolean).join("\n");
}

// ==========================================
// Word (.docx) ファイル生成 & ダウンロード（実例フォーマット準拠）
// ==========================================
export async function downloadMeetingDocx(item: MeetingRecord): Promise<void> {
  const children: Paragraph[] = [];

  // 1. タイトル
  children.push(
    new Paragraph({
      text: `📅 ${formatJPDate(item.meetingDate)} ${item.dept} ${item.meetingType} 議事録`,
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
    })
  );

  // 2. メタ情報（日時・場所・参加者）
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "日時： ", bold: true }),
        new TextRun({ text: `${formatJPDate(item.meetingDate)} ${item.duration || ""}` }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "部署・種別： ", bold: true }),
        new TextRun({ text: `${item.dept} ｜ ${item.meetingType}` }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "参加者： ", bold: true }),
        new TextRun({ text: item.participants || "（未指定）" }),
      ],
      spacing: { after: 240 },
    })
  );

  // テキストを行ごとに分解して適切な段落スタイルで追加するヘルパー
  const appendFormattedSection = (title: string, content?: string) => {
    if (!content) return;
    
    // セクション大見出し
    children.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
      })
    );

    const lines = content.split("\n");
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        children.push(new Paragraph({ text: "", spacing: { after: 60 } }));
        continue;
      }

      // 中見出し（例: "1. 【議題1】...", "✨ 直ちに取り組む...", "🤖 Gemini...", "① ...", "■ ...", "第1位: ..."）
      if (
        /^(?:[0-9]+\.\s*【|✨|🤖|①|②|③|④|⑤|■|🔎|📌|🎉)/.test(line)
      ) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: line, bold: true })],
            spacing: { before: 140, after: 60 },
          })
        );
      } else if (/^・/.test(line)) {
        // リスト項目
        children.push(
          new Paragraph({
            text: line,
            indent: { left: 360 },
            spacing: { after: 40 },
          })
        );
      } else {
        // 通常段落
        children.push(
          new Paragraph({
            text: line,
            spacing: { after: 60 },
          })
        );
      }
    }
  };

  // 3. 事前アジェンダ（存在する場合）
  if (item.agenda) {
    appendFormattedSection("📋 事前アジェンダ", [
      `【目的】\n${item.agenda.purpose || ""}`,
      `【達成成果】\n${item.agenda.outcome || ""}`,
      item.agenda.review ? `【前回の振り返り】\n${item.agenda.review}` : "",
      `【各議題】\n${item.agenda.agenda_items || ""}`,
      `【クロージング】\n${item.agenda.closing || ""}`,
    ].filter(Boolean).join("\n\n"));
  }

  // 4. 議事録セクション（4セクション）
  if (item.minutes) {
    const discText = item.minutes.discussions || [item.minutes.agenda_items, item.minutes.key_discussions].filter(Boolean).join("\n\n");
    const nextText = item.minutes.next_steps || [item.minutes.culture_notes, item.minutes.next_agenda, item.minutes.facilitator_feedback].filter(Boolean).join("\n\n");

    appendFormattedSection("📌 1. 会議要約・前提", item.minutes.summary);
    appendFormattedSection("💡 2. 議論内容・経緯（各議題ごとの発言・流れ）", discText);
    appendFormattedSection("✨ 3. 決定事項・アクションプラン（担当・期日）", item.minutes.action_plans);
    appendFormattedSection("📅 4. 次回検討・特記事項 ＆ AIファシリテーターレビュー", nextText);
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "BIZ UDGothic",
            size: 21, // 10.5pt
            color: "283136",
          },
          paragraph: {
            spacing: { line: 276 }, // 1.15倍行間
          },
        },
        heading1: {
          run: {
            font: "BIZ UDGothic",
            size: 28, // 14pt
            bold: true,
            color: "283136",
          },
        },
        heading2: {
          run: {
            font: "BIZ UDGothic",
            size: 24, // 12pt
            bold: true,
            color: "353F45",
          },
        },
        title: {
          run: {
            font: "BIZ UDGothic",
            size: 32, // 16pt
            bold: true,
            color: "1C2226",
          },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440, // 25.4mm
            right: 1440,
            bottom: 1440,
            left: 1440,
          },
        },
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `COOPs会議録_${item.dept}_${item.meetingDate}_${item.meetingType}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getMinutesPlainText(item: MeetingRecord): string {
  if (!item.minutes) return "";
  const discText = item.minutes.discussions || [item.minutes.agenda_items, item.minutes.key_discussions].filter(Boolean).join("\n\n");
  const nextText = item.minutes.next_steps || [item.minutes.culture_notes, item.minutes.next_agenda, item.minutes.facilitator_feedback].filter(Boolean).join("\n\n");

  return [
    `【COOPs 議事録】`,
    `会議日: ${formatJPDate(item.meetingDate)}`,
    `部署: ${item.dept} / 種別: ${item.meetingType}`,
    `参加者: ${item.participants || "（未指定）"}`,
    "",
    "📌 【1. 会議要約】",
    item.minutes.summary,
    "",
    "💡 【2. 議論内容・経緯】",
    discText,
    "",
    "✨ 【3. 決定事項・ToDo（担当・期日）】",
    item.minutes.action_plans,
    "",
    "📅 【4. 次回検討・特記事項】",
    nextText,
  ].filter(Boolean).join("\n");
}

export function getAgendaPlainText(item: MeetingRecord): string {
  if (!item.agenda) return "";
  return [
    `【COOPs 会議アジェンダ】`,
    `会議日: ${formatJPDate(item.meetingDate)}`,
    `部署: ${item.dept} / 種別: ${item.meetingType}`,
    `参加者: ${item.participants || "（未指定）"}`,
    `所要時間: ${item.duration || "未定"}`,
    "",
    "🎯 【目的】",
    item.agenda.purpose,
    "",
    "🏁 【達成したい成果】",
    item.agenda.outcome,
    "",
    item.agenda.review ? `🔄 【前回の振り返り】\n${item.agenda.review}\n` : "",
    "📋 【各議題】",
    item.agenda.agenda_items,
    "",
    "🏁 【クロージング】",
    item.agenda.closing,
  ].filter(Boolean).join("\n");
}
