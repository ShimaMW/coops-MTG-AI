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
// Word (.docx) ファイル生成 & ダウンロード
// ==========================================
export async function downloadMeetingDocx(item: MeetingRecord): Promise<void> {
  const children: Paragraph[] = [
    new Paragraph({
      text: `COOPs 会議録｜${item.dept} ${item.meetingType}`,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `開催日：${formatJPDate(item.meetingDate)}　`, bold: true }),
        new TextRun({ text: `部署：${item.dept}　` }),
        new TextRun({ text: `種別：${item.meetingType}` }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `参加者：${item.participants || "（未指定）"}` }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ text: "--------------------------------------------------" }),
  ];

  // 1. 事前アジェンダセクション
  if (item.agenda) {
    children.push(
      new Paragraph({ text: "【事前アジェンダ】", heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: "■ 目的（Purpose）", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: item.agenda.purpose || "（未設定）" }),
      new Paragraph({ text: "■ 達成したい成果（Outcome）", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: item.agenda.outcome || "（未設定）" })
    );

    if (item.agenda.review) {
      children.push(
        new Paragraph({ text: "■ 前回の振り返り", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: item.agenda.review })
      );
    }

    children.push(
      new Paragraph({ text: "■ 各議題（AIアドバイス含む）", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: item.agenda.agenda_items || "（未設定）" }),
      new Paragraph({ text: "■ クロージング", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: item.agenda.closing || "（未設定）" }),
      new Paragraph({ text: "--------------------------------------------------" })
    );
  }

  // 2. 議事録セクション（4セクション）
  if (item.minutes) {
    const discText = item.minutes.discussions || [item.minutes.agenda_items, item.minutes.key_discussions].filter(Boolean).join("\n\n");
    const nextText = item.minutes.next_steps || [item.minutes.culture_notes, item.minutes.next_agenda, item.minutes.facilitator_feedback].filter(Boolean).join("\n\n");

    children.push(
      new Paragraph({ text: "【会議議事録】", heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: "■ 1. 会議要約", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: item.minutes.summary || "（記載なし）" }),
      new Paragraph({ text: "■ 2. 議論内容・経緯", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: discText || "（記載なし）" }),
      new Paragraph({ text: "■ 3. 決定事項・ToDo（担当・期日）", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: item.minutes.action_plans || "（記載なし）" }),
      new Paragraph({ text: "■ 4. 次回検討・特記事項", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: nextText || "（記載なし）" })
    );
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
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
