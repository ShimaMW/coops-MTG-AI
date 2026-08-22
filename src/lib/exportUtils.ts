import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { MeetingRecord } from "./types";

export function formatJPDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
}

// ==========================================
// Googleカレンダー 登録URL生成
// ==========================================
export function getGoogleCalendarUrl(params: {
  title: string;
  meetingDate: string;
  duration?: string;
  dept: string;
  meetingType: string;
  details: string;
}): string {
  const d = params.meetingDate.replace(/-/g, "").replace(/\//g, "");
  const dateStr = d.length === 8 ? `${d}T100000/${d}T110000` : `${d}/${d}`;
  const text = encodeURIComponent(`【${params.dept}】${params.meetingType}`);
  const details = encodeURIComponent(params.details);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dateStr}&details=${details}`;
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
            font: "Noto Sans JP",
            size: 21, // 10.5pt
            color: "283136",
          },
          paragraph: {
            spacing: { line: 276 }, // 1.15倍行間
          },
        },
        heading1: {
          run: {
            font: "Noto Sans JP",
            size: 28, // 14pt
            bold: true,
            color: "283136",
          },
        },
        heading2: {
          run: {
            font: "Noto Sans JP",
            size: 24, // 12pt
            bold: true,
            color: "353F45",
          },
        },
        title: {
          run: {
            font: "Noto Sans JP",
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
