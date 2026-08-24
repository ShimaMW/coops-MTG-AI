"use client";

import React, { useState, useEffect } from "react";
import { UserProfile, MeetingRecord, MinutesDetails, UploadedFileItem } from "@/lib/types";
import {
  DEFAULT_DEPARTMENTS,
  DEFAULT_MEETING_TYPES,
  saveMinutesRecord,
} from "@/lib/storage";
import { downloadMeetingDocx, getMinutesPlainText, getChatSummaryText, formatJPDate, formatSlashDate } from "@/lib/exportUtils";
import { FeatureHelpAccordion } from "./FeatureHelpAccordion";
import { AudioRecorder } from "./AudioRecorder";
import { MediaUploader } from "./AudioUploader";
import { generateMinutesAIClientSide } from "@/lib/geminiClient";
import {
  Sparkles,
  Save,
  Download,
  Copy,
  Printer,
  Calendar,
  Mic,
  Image as ImageIcon,
  CheckCircle2,
  Share2,
  ArrowRight,
  ArrowLeft,
  Link as LinkIcon,
  Sliders,
  MessageSquare,
  ListTodo,
} from "lucide-react";

// カテゴリ別AIフォーカス指示マスタ
const FOCUS_OPTION_GROUPS = [
  {
    category: "📋 会議進行・ToDo",
    items: [
      "決定事項と担当者を重点的にまとめる",
      "次回の宿題・ToDoを箇条書きで明確にする",
      "予定アジェンダに縛られず、実際の議論の展開・流れを重視する",
      "突発的な重要議論も独立した議題として詳しく残す",
    ],
  },
  {
    category: "🏥 ケア・安全・多職種",
    items: [
      "利用者の体調変化・受診対応・特変事項を最優先で整理する",
      "事故・ヒヤリハットの原因分析と再発防止策を具体化する",
      "職種別（看護・リハ・介護・ケアマネ）の役割分担を整理する",
    ],
  },
  {
    category: "💬 トーン・共有・面談",
    items: [
      "LINE WORKS等のチャットで即共有できるよう極めて簡潔に要約する",
      "各スタッフの具体的な発言や意見の対立点を詳しく残す",
      "スタッフの悩み・課題と今後のフォロー方針を明確化する",
      "業務改善のアイデアと試行（トライアル）計画を整理する",
    ],
  },
];

interface MinutesTabProps {
  meetingRecords: MeetingRecord[];
  currentUser: UserProfile;
  departments: string[];
  initialAgendaId?: string | null;
  onSaved: () => void;
  onGoToHistory?: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export const MinutesTab: React.FC<MinutesTabProps> = ({
  meetingRecords,
  currentUser,
  departments,
  initialAgendaId,
  onSaved,
  onGoToHistory,
  showToast,
}) => {
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  };

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: 会議情報
  const [selectedRecordId, setSelectedRecordId] = useState<string>(initialAgendaId || "");
  const [meetingDate, setMeetingDate] = useState(getTodayStr());
  const [dept, setDept] = useState(currentUser.department || departments[0] || "福禄寿");
  const [meetingType, setMeetingType] = useState(DEFAULT_MEETING_TYPES[0]);
  const [customMeetingType, setCustomMeetingType] = useState("");
  const [participants, setParticipants] = useState("");

  // ユーザー所属の変更検知
  useEffect(() => {
    if (currentUser.department) {
      setDept(currentUser.department);
    }
  }, [currentUser]);

  // Step 2: 音声入力 & 文字起こし
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string | null>(null);
  const [audioFileUri, setAudioFileUri] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [transcriptPreview, setTranscriptPreview] = useState<string>("");

  // Step 3: 複数資料（写真・PDF・メモ）・AI指示
  const [attachmentFiles, setAttachmentFiles] = useState<UploadedFileItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [selectedFocusItems, setSelectedFocusItems] = useState<string[]>([]);
  const [customFocusText, setCustomFocusText] = useState("");

  // Step 4: AI生成結果
  const [isLoading, setIsLoading] = useState(false);
  const [minutesResult, setMinutesResult] = useState<MinutesDetails | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [savedRecord, setSavedRecord] = useState<MeetingRecord | null>(null);

  const effectiveMeetingType = meetingType === "その他" ? customMeetingType || "その他会議" : meetingType;

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

  // アジェンダ初期選択の反映
  useEffect(() => {
    if (initialAgendaId) {
      handleSelectRecord(initialAgendaId);
    }
  }, [initialAgendaId, meetingRecords]);

  // アジェンダ呼び出し
  const handleSelectRecord = (id: string) => {
    setSelectedRecordId(id);
    if (!id) return;
    const rec = meetingRecords.find((r) => r.id === id);
    if (rec) {
      setMeetingDate(formatSlashDate(rec.meetingDate));
      setDept(rec.dept);
      if (DEFAULT_MEETING_TYPES.includes(rec.meetingType)) {
        setMeetingType(rec.meetingType);
        setCustomMeetingType("");
      } else {
        setMeetingType("その他");
        setCustomMeetingType(rec.meetingType);
      }
      setParticipants(rec.participants);

      // アジェンダの添付資料をStep 3へ自動引き継ぎ
      if (rec.agenda?.attachments && rec.agenda.attachments.length > 0) {
        setAttachmentFiles(rec.agenda.attachments);
      } else if (rec.agenda?.imageBase64) {
        setAttachmentFiles([
          {
            id: "att_legacy",
            name: rec.agenda.attachmentFileName || "事前アジェンダ添付資料",
            size: "添付済",
            type: rec.agenda.imageMimeType === "application/pdf" ? "pdf" : "image",
            base64: rec.agenda.imageBase64,
            mimeType: rec.agenda.imageMimeType || "image/jpeg",
          },
        ]);
      }

      if (rec.agenda?.attachmentText) {
        setInputText((prev) =>
          prev ? `${prev}\n\n${rec.agenda?.attachmentText}` : rec.agenda!.attachmentText!
        );
      }

      showToast("アジェンダ情報（添付資料含む）を読み込みました ✓");
    }
  };

  // 議事録生成
  const handleGenerate = async () => {
    setIsLoading(true);
    setSaveStatus("idle");
    setSavedRecord(null);

    try {
      const selectedRec = meetingRecords.find((r) => r.id === selectedRecordId);
      const agendaBody = selectedRec?.agenda
        ? [
            `【目的】\n${selectedRec.agenda.purpose || ""}`,
            `【達成したい成果】\n${selectedRec.agenda.outcome || ""}`,
            selectedRec.agenda.review ? `【前回の振り返り】\n${selectedRec.agenda.review}` : "",
            `【設定アジェンダ・各議題】\n${selectedRec.agenda.agenda_items || ""}`,
            selectedRec.agenda.closing ? `【クロージング】\n${selectedRec.agenda.closing}` : "",
          ]
            .filter(Boolean)
            .join("\n\n")
        : "";

      // 添付テキストファイルの合算
      const textFilesContent = attachmentFiles
        .filter((f) => f.type === "text" && f.textContent)
        .map((f) => `【資料: ${f.name}】\n${f.textContent}`)
        .join("\n\n");

      // テキストメモと文字起こし、AI指示を統合
      const combinedAiFocus = [
        ...selectedFocusItems.map((item) => `・${item}`),
        customFocusText.trim(),
      ]
        .filter(Boolean)
        .join("\n");

      const combinedInputText = [
        transcriptPreview ? `【音声文字起こし/プレビュー】\n${transcriptPreview}` : "",
        inputText ? `【追加メモ・発言内容】\n${inputText}` : "",
        textFilesContent ? `【添付資料テキスト】\n${textFilesContent}` : "",
        combinedAiFocus ? `【AIへのフォーカス指示・まとめ方】\n${combinedAiFocus}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      // 添付画像・PDF配列
      const mediaFiles = attachmentFiles
        .filter((f) => (f.type === "image" || f.type === "pdf") && f.base64 && f.mimeType)
        .map((f) => ({ base64: f.base64!, mimeType: f.mimeType!, fileName: f.name }));

      let data: any = null;

      // 1. クライアント側直接Gemini呼び出し（Vercel 4.5MB制限を完全回避）
      try {
        data = await generateMinutesAIClientSide({
          meetingDate,
          dept,
          meetingType: effectiveMeetingType,
          participants,
          agendaBody,
          inputText: combinedInputText,
          audioBase64: audioBase64 || undefined,
          audioMimeType: audioMimeType || undefined,
          files: mediaFiles,
        });
      } catch (clientErr: any) {
        console.warn("Client direct call fallback to API:", clientErr);

        // 2. サーバーAPIルートへのフォールバック
        const res = await fetch("/api/minutes/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meetingDate,
            dept,
            meetingType: effectiveMeetingType,
            participants,
            agendaBody,
            inputText: combinedInputText,
            audioBase64,
            audioMimeType,
            files: mediaFiles,
          }),
        });

        if (!res.ok) {
          const resText = await res.text();
          let errorMsg = clientErr.message || "議事録の生成に失敗しました";
          try {
            const errObj = JSON.parse(resText);
            errorMsg = errObj.error || errorMsg;
          } catch {
            if (res.status === 413 || resText.includes("Request Entity") || resText.includes("Payload Too Large")) {
              errorMsg = "送信データが通信上限を超えています。ブラウザからの直接解析エラー: " + (clientErr.message || "");
            }
          }
          throw new Error(errorMsg);
        }

        data = await res.json();
      }

      setMinutesResult({
        ...data,
        attachments: attachmentFiles,
      });
      setStep(4);
      showToast("議事録を生成しました ✨");
    } catch (err: any) {
      showToast("エラー: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // 保存
  const handleSave = () => {
    if (!minutesResult) return;

    setSaveStatus("saving");

    const selectedRec = meetingRecords.find((r) => r.id === selectedRecordId);

    const result = saveMinutesRecord({
      recordId: selectedRecordId || undefined,
      meetingDate,
      dept,
      meetingType: effectiveMeetingType,
      participants,
      minutes: {
        ...minutesResult,
        inputText,
        audioFileName: audioFileName || (attachmentFiles.length > 0 ? `${attachmentFiles.length}件の資料` : undefined),
        attachments: attachmentFiles,
      },
      createdById: currentUser.id,
      version: selectedRec?.version,
    });

    if (result.success) {
      setSavedRecord(result.data);
      setSaveStatus("saved");
      showToast(result.message, "success");
      onSaved();
    } else {
      setSaveStatus("idle");
      showToast("保存エラー: " + (result.error || "保存に失敗しました"), "error");
    }
  };

  // Word (.docx) ダウンロード
  const handleDownloadDocx = () => {
    if (!minutesResult) return;
    const selectedRec = meetingRecords.find((r) => r.id === selectedRecordId);

    const recToDownload: MeetingRecord = savedRecord || {
      id: "temp",
      meetingDate,
      dept,
      meetingType: effectiveMeetingType,
      participants,
      agenda: selectedRec?.agenda,
      minutes: minutesResult,
      status: "minutes_completed",
      version: 1,
      createdAt: "",
      updatedAt: "",
    };

    downloadMeetingDocx(recToDownload);
    showToast("Word (.docx) をダウンロードしました ✓");
  };

  const handleCopyText = () => {
    if (!minutesResult) return;
    const selectedRec = meetingRecords.find((r) => r.id === selectedRecordId);

    const text = getMinutesPlainText(
      savedRecord || {
        id: "",
        meetingDate,
        dept,
        meetingType: effectiveMeetingType,
        participants,
        agenda: selectedRec?.agenda,
        minutes: minutesResult,
        status: "minutes_completed",
        version: 1,
        createdAt: "",
        updatedAt: "",
      }
    );
    navigator.clipboard.writeText(text);
    showToast("議事録テキストをコピーしました ✓");
  };

  // LINE WORKS / チャット用コピー
  const handleCopyChatSummary = () => {
    if (!minutesResult) return;
    const selectedRec = meetingRecords.find((r) => r.id === selectedRecordId);

    const text = getChatSummaryText(
      savedRecord || {
        id: "",
        meetingDate,
        dept,
        meetingType: effectiveMeetingType,
        participants,
        agenda: selectedRec?.agenda,
        minutes: minutesResult,
        status: "minutes_completed",
        version: 1,
        createdAt: "",
        updatedAt: "",
      }
    );
    navigator.clipboard.writeText(text);
    showToast("LINE WORKS / チャット用要約をコピーしました 📢");
  };

  const agendaRecords = meetingRecords.filter((r) => r.agenda);

  // 互換性ヘルパー
  const displayDiscussions = minutesResult?.discussions || [minutesResult?.agenda_items, minutesResult?.key_discussions].filter(Boolean).join("\n\n");
  const displayNextSteps = minutesResult?.next_steps || [minutesResult?.culture_notes, minutesResult?.next_agenda, minutesResult?.facilitator_feedback].filter(Boolean).join("\n\n");

  return (
    <div className="space-y-6">
      {/* ── 4ステップ インジケーター（レスポンシブ対応・横スクロール防止） ── */}
      <div className="flex items-center justify-between w-full max-w-2xl mx-auto mb-6 no-print px-1 sm:px-2">
        {[
          { num: 1, label: "会議情報", shortLabel: "基本" },
          { num: 2, label: "音声・文字起こし", shortLabel: "音声" },
          { num: 3, label: "資料写真・指示", shortLabel: "資料" },
          { num: 4, label: "議事録完成", shortLabel: "完成" },
        ].map((s, idx) => (
          <React.Fragment key={s.num}>
            <button
              type="button"
              onClick={() => {
                if (s.num < step) setStep(s.num as any);
              }}
              className="flex items-center gap-1 sm:gap-2 cursor-pointer group focus:outline-none flex-shrink-0"
            >
              <div
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-bold transition-all flex-shrink-0 ${
                  step === s.num
                    ? "bg-white text-slate-900 shadow-md scale-105"
                    : step > s.num
                    ? "bg-[#283136] text-white border border-white/30"
                    : "bg-black/20 text-slate-400 border border-white/10"
                }`}
              >
                {step > s.num ? "✓" : s.num}
              </div>
              <span
                className={`text-[11px] sm:text-xs whitespace-nowrap transition-colors ${
                  step === s.num
                    ? "text-white font-bold drop-shadow-xs"
                    : step > s.num
                    ? "text-slate-200 group-hover:text-white font-medium"
                    : "text-slate-400"
                }`}
              >
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.shortLabel}</span>
              </span>
            </button>
            {idx < 3 && (
              <div
                className={`flex-1 h-0.5 mx-1 sm:mx-3 transition-all min-w-[8px] ${
                  step > idx + 1 ? "bg-white/40" : "bg-white/15"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── STEP 1: 会議基本情報 ── */}
      {/* ── STEP 1: 会議基本情報 ── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-700" />
            ステップ 1: 会議基本情報
          </h2>

          {/* Step 1 説明アコーディオン */}
          <FeatureHelpAccordion
            title="💡 会議基本情報の入力ポイント"
            items={[
              {
                label: "事前アジェンダ連動",
                text: "「事前アジェンダから呼び起こす」を選ぶと、日付・部署・参加者・議題内容・事前添付資料が一括で自動セットされ、アジェンダと同じ記録として紐付けて保存されます。",
              },
              {
                label: "新規作成",
                text: "アジェンダを作っていない会議でも、日付・部署・参加者等を入れるだけで直接ここから議事録作成をスタートできます。",
              },
            ]}
          />

          {/* 事前アジェンダ連携 */}
          {agendaRecords.length > 0 && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <LinkIcon className="w-4 h-4 text-slate-600" />
                事前アジェンダから呼び起こす（紐付け保存されます）
              </label>
              <select
                value={selectedRecordId}
                onChange={(e) => handleSelectRecord(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-slate-500/20"
              >
                <option value="">― アジェンダを選択（新規の場合は未選択） ―</option>
                {agendaRecords.map((a) => (
                  <option key={a.id} value={a.id}>
                    {formatSlashDate(a.meetingDate)} ｜ {a.dept} ｜ {a.meetingType}
                    {a.status === "minutes_completed" ? " [議事録あり]" : " [アジェンダのみ]"}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 日付入力 */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>📅 会議日</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setQuickDate(-1)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs font-medium"
                  >
                    昨日
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(0)}
                    className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded text-xs"
                  >
                    今日
                  </button>
                </div>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm sm:text-base outline-none focus:border-slate-600 focus:bg-white transition"
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
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">🏢 部署・事業所</label>
              <select
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm sm:text-base outline-none focus:border-slate-600 focus:bg-white transition"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">📋 会議種別</label>
              <select
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm sm:text-base outline-none focus:border-slate-600 focus:bg-white transition"
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
                  placeholder="会議種別名を入力"
                  value={customMeetingType}
                  onChange={(e) => setCustomMeetingType(e.target.value)}
                  className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-slate-600 focus:bg-white transition"
                />
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">👥 参加者</label>
              <input
                type="text"
                placeholder="例：佐藤、田中、高橋、渡辺"
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm sm:text-base outline-none focus:border-slate-600 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-6 py-2.5 bg-[#283136] hover:bg-[#1c2226] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center gap-2 transition"
            >
              次へ：音声・文字起こし <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: 音声データの提出 / 録音 ➔ 文字起こし ── */}
      {step === 2 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-5">
          <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
            <Mic className="w-5 h-5 text-slate-700" />
            ステップ 2: 会議音声・メモの入力
          </h2>

          {/* Step 2 説明アコーディオン */}
          <FeatureHelpAccordion
            title="💡 音声取り込み・文字起こしの使い方"
            items={[
              {
                label: "① ボイスメモ提出",
                text: "iPhoneのボイスメモ（.m4a）やICレコーダー・Androidの録音ファイル（.mp3, .wav等）をそのままアップロードできます。AIが音声全体を高精度に直接解析します。",
              },
              {
                label: "② マイクで直接録音",
                text: "パソコンやスマホのマイクを使ってその場で録音可能。画面のスリープを自動防止し、話した内容がリアルタイムでプレビュー表示されます。",
              },
              {
                label: "③ 音声なし・手動メモのみ",
                text: "音声データがない場合でも、下のテキスト欄に発言の要点やメモを直接入力してそのまま議事録を作成できます。",
              },
            ]}
          />

          {/* 左右均等グリッド */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            <div className="flex flex-col h-full">
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
                📱 ボイスメモ・録音ファイル
              </label>
              <div className="flex-1 flex flex-col">
                <MediaUploader
                  title="ボイスメモを選択"
                  subtitle="録音ファイル (.m4a, .mp3, .wav, .aac)"
                  accept="audio/*,.m4a,.mp3,.wav,.aac,.webm"
                  allowMultiple={false}
                  initialFiles={
                    audioFileName && audioFileName !== "ブラウザ録音データ.webm"
                      ? [
                          {
                            id: "uploaded_voice",
                            name: audioFileName,
                            size: "セット済",
                            type: "audio",
                            base64: audioBase64 || undefined,
                            mimeType: audioMimeType || "audio/m4a",
                          },
                        ]
                      : []
                  }
                  onFileLoaded={(data) => {
                    if (data.audioBase64) {
                      setAudioBase64(data.audioBase64);
                      setAudioMimeType(data.audioMimeType || "audio/m4a");
                      setAudioFileName(data.fileName);
                      showToast(`音声「${data.fileName}」をセットしました ✓`);
                    }
                  }}
                  onClear={() => {
                    if (audioFileName !== "ブラウザ録音データ.webm") {
                      setAudioBase64(null);
                      setAudioMimeType(null);
                      setAudioFileName(null);
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col h-full">
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
                🎙️ マイクで直接録音
              </label>
              <div className="flex-1 flex flex-col">
                <AudioRecorder
                  initialAudioBase64={audioFileName === "ブラウザ録音データ.webm" ? audioBase64 : null}
                  initialAudioMimeType={audioMimeType}
                  onRecordingComplete={(base64, mime, liveTranscript) => {
                    setAudioBase64(base64);
                    setAudioMimeType(mime);
                    setAudioFileName("ブラウザ録音データ.webm");
                    if (liveTranscript) {
                      setTranscriptPreview((prev) =>
                        prev ? `${prev}\n\n${liveTranscript}` : liveTranscript
                      );
                    }
                    showToast("録音データをセットしました ✓");
                  }}
                  onClearAudio={() => {
                    if (audioFileName === "ブラウザ録音データ.webm") {
                      setAudioBase64(null);
                      setAudioMimeType(null);
                      setAudioFileName(null);
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* 文字起こしプレビュー & 手動メモエリア */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>📝 文字起こし・メモ</span>
              <span className="text-xs text-slate-400 font-normal">自由に加筆・修正できます</span>
            </label>
            <textarea
              rows={5}
              placeholder="録音データの文字起こし結果がここに表示されます。音声ファイルがない場合は、会議の要点やメモを直接入力してください。"
              value={transcriptPreview}
              onChange={(e) => setTranscriptPreview(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm sm:text-base outline-none focus:border-slate-600 focus:bg-white transition leading-relaxed font-mono"
            ></textarea>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 transition"
            >
              <ArrowLeft className="w-4 h-4" /> 戻る
            </button>

            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-6 py-2.5 bg-[#283136] hover:bg-[#1c2226] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center gap-2 transition"
            >
              次へ：資料添付・指示 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: 会議資料（複数写真・PDF）/ テキストメモの共有と指示 ── */}
      {step === 3 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-5">
          <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-slate-700" />
            ステップ 3: 会議資料の共有 ＆ 指示
          </h2>

          {/* Step 3 説明アコーディオン */}
          <FeatureHelpAccordion
            title="💡 資料写真OCR/PDF解析 ＆ AIフォーカス指示の使い方"
            items={[
              {
                label: "① 複数資料の写真・PDF",
                text: "ホワイトボード写真（複数枚）、配布レジュメ、前月実績PDF、手書きメモをまとめて添付可能。AIが全資料の文字・数値を自動OCR認識して議論内容に統合します。",
              },
              {
                label: "② AIフォーカス指示（複数選択可）",
                text: "「議論の展開・流れを重視」「決定事項とToDoを明確に」などのボタンを複数選ぶだけで、AIがその日の会議の目的に合わせて最適なトーン・密度の議事録を作成します。",
              },
            ]}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* 追加テキストメモ（8カラム、広々確保） */}
            <div className="lg:col-span-8 flex flex-col h-full space-y-1.5">
              <label className="block text-xs sm:text-sm font-bold text-slate-800">
                📝 追加テキストメモ・補足発言
              </label>
              <textarea
                rows={9}
                placeholder="会議の補足事項や、写真に関するメモ、重要発言があれば自由に入力してください。"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full flex-1 min-h-[240px] bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm sm:text-base outline-none focus:border-slate-600 focus:bg-white transition leading-relaxed resize-y"
              ></textarea>
            </div>

            {/* 複数写真・PDFアップローダー（4カラム、コンパクト表示） */}
            <div className="lg:col-span-4 flex flex-col h-full space-y-1.5">
              <label className="block text-xs sm:text-sm font-bold text-slate-700">
                📷 会議資料・写真・PDF（任意）
              </label>
              <div className="flex-1 flex flex-col min-h-[240px]">
                <MediaUploader
                  title="資料・写真を選択"
                  subtitle="ホワイトボード写真・配布PDF等"
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

          {/* AIへの指示（カテゴリ別複数トグル選択 ＋ 自由メモ） */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-slate-700" />
                🎯 AIへのフォーカス指示・まとめ方（複数選択可能）
              </label>
              {selectedFocusItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedFocusItems([])}
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  選択をクリア
                </button>
              )}
            </div>

            {/* カテゴリ別ワンタップ・トグルボタン群 */}
            <div className="space-y-2">
              {FOCUS_OPTION_GROUPS.map((group) => (
                <div key={group.category} className="space-y-1">
                  <div className="text-xs font-bold text-slate-600">{group.category}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((item) => {
                      const isSelected = selectedFocusItems.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedFocusItems(selectedFocusItems.filter((i) => i !== item));
                            } else {
                              setSelectedFocusItems([...selectedFocusItems, item]);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition flex items-center gap-1 cursor-pointer border ${
                            isSelected
                              ? "bg-[#283136] text-white border-[#283136] shadow-xs font-bold"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:border-slate-400"
                          }`}
                        >
                          <span>{isSelected ? "✓" : "+"}</span>
                          <span>{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* 自由追記エリア */}
            <div className="pt-2 border-t border-slate-200/80">
              <label className="block text-xs font-bold text-slate-600 mb-1">
                ✏️ その他の自由な追加指示（任意）
              </label>
              <input
                type="text"
                placeholder="例：〇〇さんの発言を特に詳しく残す、結論の理由を丁寧に記載 など"
                value={customFocusText}
                onChange={(e) => setCustomFocusText(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-slate-500/20"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 transition"
            >
              <ArrowLeft className="w-4 h-4" /> 戻る
            </button>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading || (!audioBase64 && !audioFileUri && !transcriptPreview && !inputText && attachmentFiles.length === 0)}
              className="w-full sm:w-auto px-8 py-3 bg-[#283136] hover:bg-[#1c2226] disabled:opacity-50 text-white font-bold text-sm sm:text-base rounded-xl shadow-md flex items-center justify-center gap-2 transition"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  作成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-300" />
                  AI議事録を作成する
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: 議事録完成 & 編集・出力（洗練された4セクション構成） ── */}
      {step === 4 && minutesResult && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-slate-700" />
                議事録が完成しました（自由に修正可能）
              </h2>
              <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-slate-600 mt-1">
                <span>📅 {formatJPDate(meetingDate)}</span>
                <span>🏢 {dept}</span>
                <span>📋 {effectiveMeetingType}</span>
                <span>👥 {participants || "（未指定）"}</span>
                {selectedRecordId && (
                  <span className="text-slate-800 font-bold bg-slate-100 px-2 py-0.5 rounded-full border border-slate-300 flex items-center gap-1">
                    <LinkIcon className="w-3.5 h-3.5" /> アジェンダ連携中
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => setStep(3)}
              className="text-xs sm:text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> データ入力に戻る
            </button>
          </div>

          {/* Step 4 説明アコーディオン */}
          <FeatureHelpAccordion
            title="💡 議事録の確認・編集・共有の使い方"
            items={[
              {
                label: "① 自由な加筆・編集",
                text: "枠内をクリックして、文章の追記やスタッフ名の修正などが自由に行えます。「議事録を保存する」を押すとログ一覧に最新状態で保存されます。",
              },
              {
                label: "② ワンタップ共有・Word保存",
                text: "「LINE WORKS用コピー」で要約テキストをクリップボードにコピーし、チャットへ即座に共有できます。「Word保存」で公式文書ファイル（.docx）をダウンロードできます。",
              },
            ]}
          />

          {/* 1. 会議要約 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              📌 1. 会議要約（ハイライト）
            </label>
            <textarea
              rows={3}
              value={minutesResult.summary || ""}
              onChange={(e) => setMinutesResult({ ...minutesResult, summary: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm sm:text-base outline-none focus:ring-2 focus:ring-slate-500/20 leading-relaxed"
            />
          </div>

          {/* 2. 議論内容・経緯 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-slate-600" />
              💡 2. 議論内容・経緯（各議題ごとの発言・流れ）
            </label>
            <textarea
              rows={8}
              value={minutesResult.discussions !== undefined ? minutesResult.discussions : displayDiscussions}
              onChange={(e) =>
                setMinutesResult({ ...minutesResult, discussions: e.target.value })
              }
              className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm sm:text-base outline-none focus:ring-2 focus:ring-slate-500/20 leading-relaxed font-mono"
            />
          </div>

          {/* 3. 決定事項・ToDo */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <ListTodo className="w-4 h-4 text-slate-600" />
              ✨ 3. 決定事項・ToDo（担当・期日）
            </label>
            <textarea
              rows={5}
              value={minutesResult.action_plans || ""}
              onChange={(e) => setMinutesResult({ ...minutesResult, action_plans: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm sm:text-base outline-none focus:ring-2 focus:ring-slate-500/20 leading-relaxed font-mono"
            />
          </div>

          {/* 4. 次回検討・特記事項 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-600" />
              📅 4. 次回検討・特記事項（宿題・理念・AI助言）
            </label>
            <textarea
              rows={3}
              value={minutesResult.next_steps !== undefined ? minutesResult.next_steps : displayNextSteps}
              onChange={(e) => setMinutesResult({ ...minutesResult, next_steps: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm sm:text-base outline-none focus:ring-2 focus:ring-slate-500/20 leading-relaxed"
            />
          </div>

          {/* 保存ステータスバナー */}
          {saveStatus === "saved" && (
            <div className="p-3.5 bg-slate-100 border border-slate-300 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
                <CheckCircle2 className="w-5 h-5 text-slate-700 flex-shrink-0" />
                議事録が正常に保存されました！（ステータス：議事録完了）
              </div>
              {onGoToHistory && (
                <button
                  type="button"
                  onClick={onGoToHistory}
                  className="px-3 py-1.5 bg-[#283136] hover:bg-[#1c2226] text-white rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1 transition"
                >
                  ログ一覧で確認 <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* アクションボタンバー */}
          <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-slate-100 no-print">
            <button
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              className={`px-5 py-2.5 font-bold text-xs sm:text-sm rounded-xl shadow-sm flex items-center gap-2 transition ${
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
                  <Save className="w-4 h-4" /> 議事録を保存する
                </>
              )}
            </button>
            <button
              onClick={handleCopyChatSummary}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 transition shadow-sm"
            >
              <Share2 className="w-4 h-4" /> LINE WORKS用コピー
            </button>
            <button
              onClick={handleDownloadDocx}
              className="px-4 py-2.5 bg-[#283136] hover:bg-[#1c2226] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 transition shadow-sm"
            >
              <Download className="w-4 h-4" /> Word保存
            </button>
            <button
              onClick={handleCopyText}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 transition"
            >
              <Copy className="w-4 h-4" /> テキストをコピー
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 transition"
            >
              <Printer className="w-4 h-4" /> 印刷
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
