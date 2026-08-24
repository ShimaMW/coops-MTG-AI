"use client";

import React, { useState, useEffect } from "react";
import { UserProfile, AgendaDetails, UploadedFileItem } from "@/lib/types";
import { DEFAULT_DEPARTMENTS, DEFAULT_MEETING_TYPES, saveAgendaRecord } from "@/lib/storage";
import { getGoogleCalendarUrl, formatAgendaItemsText, formatSlashDate } from "@/lib/exportUtils";
import { FeatureHelpAccordion } from "./FeatureHelpAccordion";
import { MediaUploader } from "./AudioUploader";
import {
  Sparkles,
  Save,
  Copy,
  Printer,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Clock,
  Target,
  FileCheck,
  ArrowRight,
  CalendarPlus,
  Edit3,
  Paperclip,
} from "lucide-react";

interface AgendaTabProps {
  currentUser: UserProfile;
  departments: string[];
  onSaved: (createdId?: string) => void;
  onGoToMinutes?: (agendaId: string) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

const AGENDA_TEMPLATES = [
  {
    id: "teirei",
    name: "🏢 【月次定例】事業所全体・部門ミーティング",
    text: "【報告事項】\n・今月の稼働状況・利用者数・目標達成状況\n・ヒヤリハット・インシデント報告と傾向分析\n\n【検討・決定事項】\n・新規スタッフの同行・研修計画について\n・業務フロー見直し（申し送り手順・書類電子化）\n\n【その他・共有】\n・次回勉強会のテーマ検討\n・現場のケア品質・業務改善の振り返り",
  },
  {
    id: "moushiokuri",
    name: "📋 【日次申し送り】業務引き継ぎ・日々の連携",
    text: "【本日の重要申し送り】\n・体調変化・特記のあった利用者様について\n・受診予定・送迎時間・サービス内容の変更点\n\n【スタッフ間業務連携】\n・本日のフォロー体制・業務分担\n・備品・衛生用品の在庫確認",
  },
  {
    id: "gyoumu",
    name: "💡 【業務ミーティング】業務改善・残業削減・ICT化",
    text: "【現状の課題】\n・記録作成や申し送りの時間短縮について\n・直行直帰やシフト調整の円滑化\n\n【改善アイデアの検討】\n・スマホ活用（音声入力・チャット報告）のルール決め\n・無駄な書類・転記作業の削減案\n\n【アクションプラン】\n・トライアル期間と担当者の選定",
  },
  {
    id: "conference",
    name: "👤 【利用者カンファレンス】状態変化・ケアプラン見直し",
    text: "【対象者情報・現状報告】\n・ADL（日常生活動作）・認知機能の変化について\n・主治医意見・看護リハビリからの評価\n\n【課題と支援方針の検討】\n・本人の希望・ご家族の意向のすり合わせ\n・ケアプランの変更ポイントと目標設定\n\n【決定事項】\n・各担当職種（看護・リハ・ヘルパー・ケアマネ）のアクション",
  },
  {
    id: "incident",
    name: "🚨 【事故・ヒヤリハット検討会】原因究明と再発防止",
    text: "【発生事象の時系列整理】\n・発生日時・場所・状況・初期対応の確認\n\n【要因分析（なぜなぜ分析）】\n・環境要因（床・動線・照明など）\n・人的要因（体調・手順・確認不足など）\n・組織的要因（引き継ぎ・人員体制）\n\n【具体的な再発防止策】\n・即時対応できる改善策\n・マニュアル更新と全職員への周知方法",
  },
  {
    id: "kansen",
    name: "🛡️ 【感染症対策委員会】衛生管理・マニュアル確認",
    text: "【衛生・感染状況の確認】\n・事業所内および地域での感染症流行状況\n・消毒液・PPE（防護具）の備蓄数確認\n\n【対策の徹底・見直し】\n・職員・利用者の健康チェック体制の再確認\n・陽性者・発熱者発生時の初動フロー確認\n\n【研修・周知】\n・手洗い・個人防護具着脱の職員ミニ研修計画",
  },
  {
    id: "gyakutai",
    name: "🕊️ 【身体拘束廃止・虐待防止委員会】権利擁護・研修",
    text: "【現場の実態把握・ヒアリング】\n・不適切なケアやスピーチロック（言葉の拘束）の有無\n・ストレスの高いケア場面の洗い出しとサポート策\n\n【事例検討】\n・対応に苦慮した事例の共有とポジティブなアプローチ検討\n\n【決定事項】\n・権利擁護マニュアルの周知と定期チェックシートの運用",
  },
  {
    id: "kanriha",
    name: "🩺 【看リハ合同ミーティング】看護・リハビリ連携",
    text: "【医療・リハ連携の重要ケース検討】\n・バイタル・服薬管理・皮膚トラブルの共有\n・リハビリプログラムの進捗と日常生活への反映\n\n【多職種協働の課題】\n・ケアマネ・ヘルパーへのフィードバック手順\n・緊急時対応手順のブラッシュアップ",
  },
  {
    id: "oneonone",
    name: "🤝 【1on1・個別面談】業務振り返り・キャリア支援",
    text: "【最近の業務の振り返り】\n・うまくいっていること・手応えを感じている業務\n・困っていること・不安や負担に感じている点\n\n【成長支援・目標設定】\n・今後挑戦したい分野・資格取得\n・事業所・上長に期待するサポート",
  },
];

export const AgendaTab: React.FC<AgendaTabProps> = ({
  currentUser,
  departments,
  onSaved,
  onGoToMinutes,
  showToast,
}) => {
  const getTodayStr = () => {
    return formatSlashDate();
  };

  const [meetingDate, setMeetingDate] = useState(getTodayStr());
  const [dept, setDept] = useState(currentUser.department || departments[0] || "福禄寿");
  const [meetingType, setMeetingType] = useState(DEFAULT_MEETING_TYPES[0]);
  const [customMeetingType, setCustomMeetingType] = useState("");
  const [participants, setParticipants] = useState("");

  // ユーザーの所属部署が変わったら即座に反映
  useEffect(() => {
    if (currentUser.department) {
      setDept(currentUser.department);
    }
  }, [currentUser]);
  
  // 時間設定（シンプル一体型）
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [isManualDuration, setIsManualDuration] = useState(false);
  const [manualDurationText, setManualDurationText] = useState("");

  // 議題メモ & テンプレート
  const [topics, setTopics] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  // 複数添付資料
  const [attachmentFiles, setAttachmentFiles] = useState<UploadedFileItem[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [generatedAgenda, setGeneratedAgenda] = useState<AgendaDetails | null>(null);
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const effectiveMeetingType = meetingType === "その他" ? customMeetingType || "その他会議" : meetingType;

  // 所要時間の自動計算
  const calculateDurationMinutes = (start: string, end: string): string => {
    if (!start || !end) return "";
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return "";
    
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff < 0) diff += 24 * 60; // 日跨ぎ対応
    
    if (diff === 0) return "0分";
    if (diff < 60) return `${diff}分`;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`;
  };

  const currentDurationLabel = isManualDuration
    ? manualDurationText
    : `${startTime}〜${endTime}（${calculateDurationMinutes(startTime, endTime)}）`;

  // クイック所要時間ボタンが押されたとき（終了時刻を自動計算）
  const applyQuickDurationMinutes = (mins: number) => {
    setIsManualDuration(false);
    const [sh, sm] = startTime.split(":").map(Number);
    if (isNaN(sh) || isNaN(sm)) return;
    
    const totalMinutes = sh * 60 + sm + mins;
    const endH = Math.floor((totalMinutes / 60) % 24);
    const endM = totalMinutes % 60;
    
    const formattedEnd = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    setEndTime(formattedEnd);
  };

  // 日付クイック設定
  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setMeetingDate(`${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`);
  };

  // カレンダーUIからの日付更新
  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const parts = e.target.value.split("-");
    if (parts.length === 3) {
      setMeetingDate(`${parts[0]}/${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`);
    }
  };

  // テンプレート選択
  const handleSelectTemplate = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    const tmpl = AGENDA_TEMPLATES.find((t) => t.id === tmplId);
    if (tmpl) {
      setTopics(tmpl.text);
      showToast(`「${tmpl.name.slice(0, 15)}...」を適用しました ✓`);
    }
  };

  const handleGenerate = async () => {
    if (!dept) {
      showToast("部署を選択してください", "error");
      return;
    }
    if (!effectiveMeetingType) {
      showToast("会議種別を入力してください", "error");
      return;
    }

    setIsLoading(true);
    setSaveStatus("idle");
    setSavedRecordId(null);

    try {
      // 画像・PDFファイル配列
      const mediaFiles = attachmentFiles
        .filter((f) => (f.type === "image" || f.type === "pdf") && f.base64 && f.mimeType)
        .map((f) => ({ base64: f.base64!, mimeType: f.mimeType!, fileName: f.name }));

      // テキストファイル内容の合算
      const textFilesContent = attachmentFiles
        .filter((f) => f.type === "text" && f.textContent)
        .map((f) => `【資料: ${f.name}】\n${f.textContent}`)
        .join("\n\n");

      const res = await fetch("/api/agenda/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingDate,
          dept,
          meetingType: effectiveMeetingType,
          participants,
          duration: currentDurationLabel,
          topics,
          files: mediaFiles,
          attachmentText: textFilesContent,
        }),
      });

      if (!res.ok) {
        const resText = await res.text();
        let errorMsg = "生成に失敗しました";
        try {
          const errObj = JSON.parse(resText);
          errorMsg = errObj.error || errorMsg;
        } catch {
          if (res.status === 413 || resText.includes("Request Entity") || resText.includes("Payload Too Large")) {
            errorMsg = "添付された資料のサイズが通信上限（約4.5MB）を超えています。資料数を減らすか、軽量なファイルをお試しください。";
          } else if (resText) {
            errorMsg = resText.slice(0, 120);
          }
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      setGeneratedAgenda({
        ...data,
        agenda_items: formatAgendaItemsText(data.agenda_items),
        attachments: attachmentFiles,
      });
      showToast("アジェンダを生成しました ✨");
    } catch (err: any) {
      showToast("エラー: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!generatedAgenda) return;

    setSaveStatus("saving");

    try {
      const res = saveAgendaRecord({
        id: savedRecordId || undefined,
        meetingDate,
        dept,
        meetingType: effectiveMeetingType,
        participants,
        duration: currentDurationLabel,
        userTopics: topics,
        agenda: {
          ...generatedAgenda,
          attachments: attachmentFiles,
        },
        createdById: currentUser.id,
      });

      if (res.success) {
        setSavedRecordId(res.data.id);
        setSaveStatus("saved");
        showToast("アジェンダを保存しました ✓", "success");
        onSaved(res.data.id);
      }
    } catch (err: any) {
      setSaveStatus("idle");
      showToast("保存エラー: " + err.message, "error");
    }
  };

  const handleCopy = () => {
    if (!generatedAgenda) return;
    const cleanDate = formatSlashDate(meetingDate);
    const text = [
      `【COOPs 会議アジェンダ】`,
      `会議日: ${cleanDate}`,
      `部署: ${dept} / 種別: ${effectiveMeetingType}`,
      `参加者: ${participants || "（未指定）"}`,
      `所要時間: ${currentDurationLabel || "未定"}`,
      "",
      "🎯 【目的】",
      generatedAgenda.purpose,
      "",
      "🏁 【達成したい成果】",
      generatedAgenda.outcome,
      "",
      generatedAgenda.review ? `🔄 【前回の振り返り】\n${generatedAgenda.review}\n` : "",
      "📋 【各議題】",
      generatedAgenda.agenda_items,
      "",
      "🏁 【クロージング】",
      generatedAgenda.closing,
    ].filter(Boolean).join("\n");

    navigator.clipboard.writeText(text);
    showToast("アジェンダをコピーしました ✓");
  };

  // Googleカレンダー登録リンク
  const handleOpenGoogleCalendar = () => {
    if (!generatedAgenda) return;
    const cleanDate = formatSlashDate(meetingDate);
    const url = getGoogleCalendarUrl({
      title: `${dept} ${effectiveMeetingType}`,
      meetingDate: cleanDate,
      startTime: !isManualDuration ? startTime : undefined,
      endTime: !isManualDuration ? endTime : undefined,
      duration: currentDurationLabel,
      dept,
      meetingType: effectiveMeetingType,
      details: `【目的】\n${generatedAgenda.purpose}\n\n【各議題】\n${generatedAgenda.agenda_items}`,
    });
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* 入力フォーム */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-700" />
          会議アジェンダの事前作成
        </h2>

        {/* 使い方アコーディオン */}
        <FeatureHelpAccordion
          title="💡 アジェンダ事前作成の使い方・3つの活用ポイント"
          items={[
            {
              label: "① カンタン事前設計",
              text: "「議題テンプレート」を選ぶか、話したいメモを入力して生成ボタンを押すだけで、会議の「目的」「達成したいゴール」「議題ごとの確認ポイント」をAIが自動設計します。",
            },
            {
              label: "② 配布資料・ホワイトボード写真の添付",
              text: "前月の稼働実績PDFや前回議事録、ホワイトボード写真・手書きメモを添付すると、AIが資料内の数字や課題を読み取って具体的な論点をアジェンダに自動反映します。",
            },
            {
              label: "③ 会議・Googleカレンダー連携",
              text: "保存したアジェンダは「ログ一覧」に残り、会議後にワンタップで議事録作成へそのまま引き継げます。「Googleカレンダーに登録」を押すと予定日時と議題内容がセットされた状態で即カレンダー登録できます。",
            },
          ]}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* 日付入力 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>📅 会議日</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setQuickDate(-1)}
                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px]"
                >
                  昨日
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(0)}
                  className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded text-[10px]"
                >
                  今日
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(1)}
                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px]"
                >
                  明日
                </button>
              </div>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="2026/8/21"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-slate-600 focus:bg-white transition"
              />
              <div className="relative">
                <input
                  type="date"
                  onChange={handleDatePickerChange}
                  className="w-10 h-10 opacity-0 absolute inset-0 cursor-pointer z-10"
                  title="カレンダーから選択"
                />
                <button
                  type="button"
                  className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center justify-center transition border border-slate-200"
                >
                  <Calendar className="w-4 h-4 text-slate-700" />
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">🏢 部署・事業所</label>
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-slate-600 focus:bg-white transition"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 会議種別 & 参加者 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">📋 会議種別</label>
            <select
              value={meetingType}
              onChange={(e) => setMeetingType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-slate-600 focus:bg-white transition"
            >
              {DEFAULT_MEETING_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {meetingType === "その他" && (
              <input
                type="text"
                placeholder="会議種別名を入力（例: 業務改善検討会）"
                value={customMeetingType}
                onChange={(e) => setCustomMeetingType(e.target.value)}
                className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-slate-600 focus:bg-white transition"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">👥 参加者</label>
            <input
              type="text"
              placeholder="例：佐藤、田中、高橋、渡辺"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-slate-600 focus:bg-white transition"
            />
          </div>
        </div>

        {/* ── 予定時間 ── */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-700" />
              予定時間
            </label>
            <button
              type="button"
              onClick={() => {
                if (!isManualDuration) {
                  setManualDurationText(`${startTime}〜${endTime}`);
                }
                setIsManualDuration(!isManualDuration);
              }}
              className="text-[11px] text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" />
              {isManualDuration ? "時間選択に戻す" : "手入力に切り替え"}
            </button>
          </div>

          {isManualDuration ? (
            /* 自由テキストモード */
            <input
              type="text"
              placeholder="例：10:00〜11:30、または 1時間"
              value={manualDurationText}
              onChange={(e) => setManualDurationText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-slate-600 focus:bg-white transition"
            />
          ) : (
            /* 一体型タイムピッカー */
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3 sm:px-4 sm:py-2.5 gap-2.5">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500 font-medium whitespace-nowrap flex-shrink-0">開始</span>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs sm:text-sm font-bold text-slate-800 outline-none focus:border-slate-600 transition"
                    />
                  </div>

                  <span className="text-slate-400 font-bold">〜</span>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500 font-medium whitespace-nowrap flex-shrink-0">終了</span>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs sm:text-sm font-bold text-slate-800 outline-none focus:border-slate-600 transition"
                    />
                  </div>
                </div>

                {/* 自動計算された所要時間バッジ */}
                <div className="self-start sm:self-auto bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 flex items-center gap-1">
                  ⏱️ {calculateDurationMinutes(startTime, endTime)}
                </div>
              </div>

              {/* クイック所要時間ボタン */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-400 whitespace-nowrap">クイック設定:</span>
                {[
                  { label: "30分", mins: 30 },
                  { label: "45分", mins: 45 },
                  { label: "1時間", mins: 60 },
                  { label: "1.5時間", mins: 90 },
                  { label: "2時間", mins: 120 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => applyQuickDurationMinutes(item.mins)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition shadow-2xs"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 議題メモ ＆ 添付資料エリア（2カラム） */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {/* 左：議題メモ */}
          <div className="flex flex-col h-full">
            <div className="mb-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                💡 議題テンプレート
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-800 font-medium outline-none focus:border-slate-600"
              >
                <option value="">― テンプレートを選択 ―</option>
                {AGENDA_TEMPLATES.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="block text-xs font-bold text-slate-700 mb-1">
              📝 議題メモ・共有事項
            </label>
            <textarea
              rows={5}
              placeholder="例：&#10;・今月のヒヤリハット報告（転倒リスクの再確認）&#10;・新スタッフ2名の同行スケジュール決定&#10;・送迎ルート見直しの進捗確認"
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
              className="w-full flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-slate-600 focus:bg-white transition leading-relaxed font-mono"
            ></textarea>
          </div>

          {/* 右：事前資料・写真の添付 */}
          <div className="flex flex-col h-full">
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-slate-600" />
              📎 事前資料・添付ファイル
            </label>
            <div className="flex-1 flex flex-col">
              <MediaUploader
                title="事前資料を選択"
                subtitle="PDF・Word・画像等 (.pdf, .docx, .jpg)"
                accept="image/*,application/pdf,.pdf,text/plain,.txt,.md,.csv,.doc,.docx"
                allowMultiple={true}
                initialFiles={attachmentFiles}
                onFilesChanged={(items) => {
                  setAttachmentFiles(items);
                  if (items.length > 0) {
                    showToast(`${items.length}件の資料をセットしました ✓`);
                  }
                }}
                onClear={() => setAttachmentFiles([])}
              />
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full sm:w-auto px-8 py-3 bg-[#283136] hover:bg-[#1c2226] disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 mx-auto transition"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                作成中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-300" />
                AIアジェンダを生成する
              </>
            )}
          </button>
        </div>
      </div>

      {/* 生成結果ブロック */}
      {generatedAgenda && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-slate-700" />
              生成されたアジェンダ（編集可能）
            </h3>
            <button
              onClick={() => setGeneratedAgenda(null)}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> 閉じる
            </button>
          </div>

          {/* 目的 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <Target className="w-3.5 h-3.5 text-slate-600" /> 🎯 目的（Purpose）
            </label>
            <textarea
              rows={2}
              value={generatedAgenda.purpose || ""}
              onChange={(e) => setGeneratedAgenda({ ...generatedAgenda, purpose: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs md:text-sm outline-none focus:ring-2 focus:ring-slate-500/20 leading-relaxed"
            />
          </div>

          {/* 達成成果 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <FileCheck className="w-3.5 h-3.5 text-slate-600" /> 🏁 達成したい成果・決定事項（Outcome）
            </label>
            <textarea
              rows={2}
              value={generatedAgenda.outcome || ""}
              onChange={(e) => setGeneratedAgenda({ ...generatedAgenda, outcome: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs md:text-sm outline-none focus:ring-2 focus:ring-slate-500/20 leading-relaxed"
            />
          </div>

          {/* 振り返り */}
          {generatedAgenda.review && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                🔄 前回の振り返り・継続事項
              </label>
              <textarea
                rows={2}
                value={generatedAgenda.review || ""}
                onChange={(e) => setGeneratedAgenda({ ...generatedAgenda, review: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs md:text-sm outline-none focus:ring-2 focus:ring-slate-500/20 leading-relaxed"
              />
            </div>
          )}

          {/* 各議題 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5 pb-1 border-b border-slate-200">
              📋 各議題の詳細（AIアドバイス・確認ポイント含む）
            </label>
            <textarea
              rows={8}
              value={generatedAgenda.agenda_items || ""}
              onChange={(e) => setGeneratedAgenda({ ...generatedAgenda, agenda_items: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs md:text-sm outline-none focus:ring-2 focus:ring-slate-500/20 leading-relaxed font-mono"
            />
          </div>

          {/* クロージング */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5 pb-1 border-b border-slate-200">
              🏁 クロージング
            </label>
            <textarea
              rows={2}
              value={generatedAgenda.closing || ""}
              onChange={(e) => setGeneratedAgenda({ ...generatedAgenda, closing: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs md:text-sm outline-none focus:ring-2 focus:ring-slate-500/20 leading-relaxed"
            />
          </div>

          {/* 保存ステータスバナー */}
          {saveStatus === "saved" && (
            <div className="p-3.5 bg-slate-100 border border-slate-300 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-slate-700 flex-shrink-0" />
                アジェンダがログ一覧に正常保存されました！
              </div>
              {onGoToMinutes && savedRecordId && (
                <button
                  type="button"
                  onClick={() => onGoToMinutes(savedRecordId)}
                  className="px-3 py-1.5 bg-[#283136] hover:bg-[#1c2226] text-white rounded-lg text-xs font-bold flex items-center gap-1 transition"
                >
                  このアジェンダで議事録を作成 <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-100 no-print">
            <button
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              className={`px-5 py-2.5 font-bold text-xs md:text-sm rounded-xl shadow-sm flex items-center gap-2 transition ${
                saveStatus === "saved"
                  ? "bg-slate-700 text-white hover:bg-slate-800"
                  : "bg-[#283136] hover:bg-[#1c2226] text-white"
              }`}
            >
              {saveStatus === "saving" ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  保存中...
                </>
              ) : saveStatus === "saved" ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" /> 保存完了（更新する）
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> アジェンダを保存する
                </>
              )}
            </button>
            <button
              onClick={handleOpenGoogleCalendar}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs md:text-sm rounded-xl flex items-center gap-2 transition shadow-sm"
            >
              <CalendarPlus className="w-4 h-4" /> Googleカレンダーに登録
            </button>
            <button
              onClick={handleCopy}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs md:text-sm rounded-xl flex items-center gap-2 transition"
            >
              <Copy className="w-4 h-4" /> テキストをコピー
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs md:text-sm rounded-xl flex items-center gap-2 transition"
            >
              <Printer className="w-4 h-4" /> 印刷
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
