import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";
import { MinutesData, AgendaData } from "./types";

export function formatJPDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
}

// ==========================================
// Word (.docx) ファイル生成 & ダウンロード
// ==========================================
export async function downloadMinutesDocx(item: MinutesData): Promise<void> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: `COOPs 議事録｜${item.dept} ${item.meetingType}`,
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
              new TextRun({ text: `参加者：${item.participants.join("、") || "（未指定）"}` }),
              item.clientName ? new TextRun({ text: `　対象利用者：${item.clientName}` }) : new TextRun(""),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "--------------------------------------------------" }),

          // 1. 全体要約
          new Paragraph({ text: "■ 全体要約", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: item.summary || "（記載なし）" }),

          // 2. 議題
          new Paragraph({ text: "■ 議題と振り返り", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: item.agenda_items || "（記載なし）" }),

          // 3. 主な議論・発言
          new Paragraph({ text: "■ 主な議論・発言", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: item.key_discussions || "（記載なし）" }),

          // 4. 決定事項・アクションプラン
          new Paragraph({ text: "■ 決定事項・アクションプラン", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: item.action_plans || "（記載なし）" }),

          // 5. 組織文化・理念
          new Paragraph({ text: "■ 組織文化・理念の気づき", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: item.culture_notes || "（記載なし）" }),

          // 6. 次回の検討事項
          new Paragraph({ text: "■ 次回の検討事項・宿題", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: item.next_agenda || "（記載なし）" }),

          // 7. AIファシリテーター評価
          new Paragraph({ text: "■ AIファシリテーター評価", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: item.facilitator_feedback || "（記載なし）" }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `議事録_${item.dept}_${item.meetingDate}_${item.meetingType}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==========================================
// テキスト / Markdown コピー
// ==========================================
export function getMinutesPlainText(item: MinutesData): string {
  return [
    `【COOPs 議事録】`,
    `会議日: ${formatJPDate(item.meetingDate)}`,
    `部署: ${item.dept} / 種別: ${item.meetingType}`,
    `参加者: ${item.participants.join("、") || "（未指定）"}${item.clientName ? ` / 対象利用者: ${item.clientName}` : ""}`,
    "",
    "📌 【全体要約】",
    item.summary,
    "",
    "🔎 【議題と振り返り】",
    item.agenda_items,
    "",
    "💡 【主な議論・発言】",
    item.key_discussions,
    "",
    "✨ 【決定事項・アクションプラン】",
    item.action_plans,
    "",
    "🍀 【組織文化・理念】",
    item.culture_notes,
    "",
    "🎉 【次回の検討事項】",
    item.next_agenda,
    "",
    "🌌 【AI評価・フィードバック】",
    item.facilitator_feedback,
  ].join("\n");
}

export function getAgendaPlainText(item: AgendaData): string {
  return [
    `【COOPs 会議アジェンダ】`,
    `会議日: ${formatJPDate(item.meetingDate)}`,
    `部署: ${item.dept} / 種別: ${item.meetingType}`,
    `参加者: ${item.participants.join("、") || "（未指定）"}${item.clientName ? ` / 対象利用者: ${item.clientName}` : ""}`,
    `所要時間: ${item.duration || "未定"}`,
    "",
    "🎯 【目的】",
    item.purpose,
    "",
    "🏁 【達成したい成果】",
    item.outcome,
    "",
    item.review ? `🔄 【前回の振り返り】\n${item.review}\n` : "",
    "📋 【各議題】",
    item.agenda_items,
    "",
    "🏁 【クロージング】",
    item.closing,
  ].filter(Boolean).join("\n");
}
