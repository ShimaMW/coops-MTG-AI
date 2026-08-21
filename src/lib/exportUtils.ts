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
  return [
    `📢 【${item.dept}】${item.meetingType} 議事録サマリー`,
    `📅 開催日: ${formatJPDate(item.meetingDate)}`,
    `👥 参加者: ${item.participants || "（未指定）"}`,
    "",
    "📌 【全体要約】",
    item.minutes.summary,
    "",
    "✨ 【決定事項・アクションプラン】",
    item.minutes.action_plans,
    "",
    "🎉 【次回検討事項】",
    item.minutes.next_agenda,
  ].join("\n");
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

  // 2. 議事録セクション
  if (item.minutes) {
    children.push(
      new Paragraph({ text: "【会議議事録】", heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: "■ 全体要約", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: item.minutes.summary || "（記載なし）" }),
      new Paragraph({ text: "■ 議題と振り返り", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: item.minutes.agenda_items || "（記載なし）" }),
      new Paragraph({ text: "■ 主な議論・発言内容", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: item.minutes.key_discussions || "（記載なし）" }),
      new Paragraph({ text: "■ 決定事項・アクションプラン", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: item.minutes.action_plans || "（記載なし）" }),
      new Paragraph({ text: "■ 組織文化・理念の気づき", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: item.minutes.culture_notes || "（記載なし）" }),
      new Paragraph({ text: "■ 次回の検討事項・宿題", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: item.minutes.next_agenda || "（記載なし）" }),
      new Paragraph({ text: "■ AIファシリテーター評価", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: item.minutes.facilitator_feedback || "（記載なし）" })
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
  return [
    `【COOPs 議事録】`,
    `会議日: ${formatJPDate(item.meetingDate)}`,
    `部署: ${item.dept} / 種別: ${item.meetingType}`,
    `参加者: ${item.participants || "（未指定）"}`,
    "",
    "📌 【全体要約】",
    item.minutes.summary,
    "",
    "🔎 【議題と振り返り】",
    item.minutes.agenda_items,
    "",
    "💡 【主な議論・発言】",
    item.minutes.key_discussions,
    "",
    "✨ 【決定事項・アクションプラン】",
    item.minutes.action_plans,
    "",
    "🍀 【組織文化・理念】",
    item.minutes.culture_notes,
    "",
    "🎉 【次回の検討事項】",
    item.minutes.next_agenda,
    "",
    "🌌 【AI評価・フィードバック】",
    item.minutes.facilitator_feedback,
  ].join("\n");
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
