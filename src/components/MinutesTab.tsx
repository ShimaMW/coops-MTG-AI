"use client";

import React, { useState, useEffect } from "react";
import { MeetingRecord, UserProfile, MinutesDetails } from "@/lib/types";
import { DEFAULT_DEPARTMENTS, DEFAULT_MEETING_TYPES, saveMinutesRecord } from "@/lib/storage";
import { downloadMeetingDocx, getMinutesPlainText, getChatSummaryText, formatJPDate } from "@/lib/exportUtils";
import { AudioRecorder } from "./AudioRecorder";
import { MediaUploader } from "./AudioUploader";
import { FeatureHelpAccordion } from "./FeatureHelpAccordion";
import {
  Sparkles,
  Save,
  Download,
  Copy,
  Printer,
  ArrowRight,
  ArrowLeft,
  Link as LinkIcon,
  CheckCircle2,
  ListTodo,
  MessageSquare,
  Calendar,
  Share2,
  Mic,
  Image as ImageIcon,
  Sliders,
} from "lucide-react";

interface MinutesTabProps {
  meetingRecords: MeetingRecord[];
  currentUser: UserProfile;
  initialAgendaId?: string | null;
  onSaved: () => void;
  onGoToHistory?: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export const MinutesTab: React.FC<MinutesTabProps> = ({
  meetingRecords,
  currentUser,
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
  const [dept, setDept] = useState(currentUser.department || DEFAULT_DEPARTMENTS[0]);
  const [meetingType, setMeetingType] = useState(DEFAULT_MEETING_TYPES[0]);
  const [customMeetingType, setCustomMeetingType] = useState("");
  const [participants, setParticipants] = useState("");

  // Step 2: 音声入力 & 文字起こし
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [transcriptPreview, setTranscriptPreview] = useState<string>("");

  // Step 3: 資料写真・メモ・AI指示
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [aiFocusInstruction, setAiFocusInstruction] = useState("");

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
      setMeetingDate(rec.meetingDate);
      setDept(rec.dept);
      if (DEFAULT_MEETING_TYPES.includes(rec.meetingType)) {
        setMeetingType(rec.meetingType);
        setCustomMeetingType("");
      } else {
        setMeetingType("その他");
        setCustomMeetingType(rec.meetingType);
      }
      setParticipants(rec.participants);
      showToast("アジェンダ情報を読み込みました ✓");
    }
  };

  // 議事録生成
  const handleGenerate = async () => {
    setIsLoading(true);
    setSaveStatus("idle");
    setSavedRecord(null);

    try {
      const selectedRec = meetingRecords.find((r) => r.id === selectedRecordId);
      const agendaBody = selectedRec?.agenda?.full_text || "";

      // テキストメモと文字起こし、AI指示を統合
      const combinedInputText = [
        transcriptPreview ? `【音声文字起こし/プレビュー】\n${transcriptPreview}` : "",
        inputText ? `【追加メモ・発言内容】\n${inputText}` : "",
        aiFocusInstruction ? `【AIへのフォーカス指示】\n${aiFocusInstruction}` : "",
      ].filter(Boolean).join("\n\n");

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
          imageBase64,
          imageMimeType,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "議事録の生成に失敗しました");
      }

      const data = await res.json();
      setMinutesResult(data);
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
        audioFileName: audioFileName || imageFileName || undefined,
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

  const focusSuggestions = [
    "決定事項と担当者を重点的にまとめる",
    "各スタッフの具体的な発言や意見の対立点を残す",
    "理念（利用者本位・安全管理）の実践観点を強調する",
    "次回の宿題・ToDoを箇条書きで明確にする",
  ];

  const agendaRecords = meetingRecords.filter((r) => r.agenda);

  // 互換性ヘルパー
  const displayDiscussions = minutesResult?.discussions || [minutesResult?.agenda_items, minutesResult?.key_discussions].filter(Boolean).join("\n\n");
  const displayNextSteps = minutesResult?.next_steps || [minutesResult?.culture_notes, minutesResult?.next_agenda, minutesResult?.facilitator_feedback].filter(Boolean).join("\n\n");

  return (
    <div className="space-y-6">
      {/* ── 4ステップ インジケーター（ダーク背景に適した高コントラスト表示） ── */}
      <div className="flex items-center justify-between w-full max-w-2xl mx-auto mb-6 no-print px-1 sm:px-2">
        {[
          { num: 1, label: "会議情報" },
          { num: 2, label: "音声・文字起こし" },
          { num: 3, label: "資料写真・指示" },
          { num: 4, label: "議事録完成" },
        ].map((s, idx) => (
          <React.Fragment key={s.num}>
            <button
              type="button"
              onClick={() => {
                if (s.num < step) setStep(s.num as any);
              }}
              className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group focus:outline-none"
            >
              <div
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-bold transition-all ${
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
                {s.label}
              </span>
            </button>
            {idx < 3 && (
              <div
                className={`flex-1 h-0.5 mx-1.5 sm:mx-3 transition-all ${
                  step > idx + 1 ? "bg-white/40" : "bg-white/15"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── STEP 1: 会議基本情報 ── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-700" />
            ステップ 1: 会議基本情報
          </h2>

          {/* Step 1 説明アコーディオン */}
          <FeatureHelpAccordion
            title="💡 会議基本情報の入力ポイント"
            items={[
              {
                label: "アジェンダ連動",
                text: "事前にアジェンダを作成している場合は、ドロップダウンから選択すると日時・部署・種別・議題内容が自動入力され、同一レコードとして紐付け保存されます。",
              },
              {
                label: "新規作成",
                text: "アジェンダがない場合でも、会議日（テキストまたはカレンダー）・部署・会議種別・参加者を入力してすぐに議事録を作成できます。",
              },
            ]}
          />

          {/* 事前アジェンダ連携 */}
          {agendaRecords.length > 0 && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-slate-600" />
                事前アジェンダから呼び起こす（紐付け保存されます）
              </label>
              <select
                value={selectedRecordId}
                onChange={(e) => handleSelectRecord(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs md:text-sm outline-none focus:ring-2 focus:ring-slate-500/20"
              >
                <option value="">― アジェンダを選択（新規の場合は未選択） ―</option>
                {agendaRecords.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.meetingDate} | {a.dept} | {a.meetingType}
                    {a.status === "minutes_completed" ? " [議事録あり]" : " [アジェンダのみ]"}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 日付入力 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>📅 会議日（テキスト＆カレンダー選択）</span>
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
                </div>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
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
              <label className="block text-xs font-bold text-slate-700 mb-1">🏢 部署</label>
              <select
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-slate-600 focus:bg-white transition"
              >
                {DEFAULT_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  placeholder="会議種別名を入力"
                  value={customMeetingType}
                  onChange={(e) => setCustomMeetingType(e.target.value)}
                  className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-slate-600 focus:bg-white transition"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">👥 参加者（自由入力）</label>
              <input
                type="text"
                placeholder="例：佐藤、田中、高橋、渡辺"
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-slate-600 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-6 py-2.5 bg-[#283136] hover:bg-[#1c2226] text-white font-bold text-sm rounded-xl shadow-md flex items-center gap-2 transition"
            >
              次へ：音声・文字起こし <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: 音声データの提出 / 録音 ➔ 文字起こし ── */}
      {step === 2 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-5">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Mic className="w-5 h-5 text-slate-700" />
            ステップ 2: 音声データの提出 / ブラウザ録音 ➔ 文字起こし
          </h2>

          {/* Step 2 説明アコーディオン */}
          <FeatureHelpAccordion
            title="💡 音声データの取り込みと文字起こし機能について"
            items={[
              {
                label: "ボイスメモ提出",
                text: "iPhoneのボイスメモ（.m4a）やICレコーダー・Androidの録音ファイル（.mp3, .wav等）を直接アップロードできます。AIが音声を直接高精度に解析します。",
              },
              {
                label: "ブラウザ直接録音",
                text: "パソコンやスマホのマイクを使ってこの画面で直接録音できます。画面のスリープを自動防止し、リアルタイムで文字起こしプレビューを表示します。",
              },
              {
                label: "音声なし・手動メモ",
                text: "音声データがない場合でも、下のテキスト欄に発言メモや要点を手動で入力して次へ進むことができます。",
              },
            ]}
          />

          {/* 左右均等グリッド */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            <div className="flex flex-col h-full">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                📱 スマホのボイスメモ（iPhone .m4a / Androidレコーダー）
              </label>
              <div className="flex-1 flex flex-col">
                <MediaUploader
                  onFileLoaded={(data) => {
                    if (data.audioBase64) {
                      setAudioBase64(data.audioBase64);
                      setAudioMimeType(data.audioMimeType || "audio/m4a");
                      setAudioFileName(data.fileName);
                      showToast(`音声「${data.fileName}」をセットしました ✓`);
                    }
                  }}
                  onClear={() => {
                    setAudioBase64(null);
                    setAudioMimeType(null);
                    setAudioFileName(null);
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col h-full">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                🎙️ ブラウザで今すぐ録音（スリープ防止）
              </label>
              <div className="flex-1 flex flex-col">
                <AudioRecorder
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
                />
              </div>
            </div>
          </div>

          {/* 文字起こしプレビュー & 手動メモエリア */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>📝 文字起こしテキスト / 音声の要点（音声なしで手動入力も可）</span>
              <span className="text-[11px] text-slate-400 font-normal">自由に加筆・修正できます</span>
            </label>
            <textarea
              rows={5}
              placeholder="リアルタイム録音の文字起こし結果がここに表示されます。また、音声ファイルがない場合はここに会議の発言や要点を直接入力してください。"
              value={transcriptPreview}
              onChange={(e) => setTranscriptPreview(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm outline-none focus:border-slate-600 focus:bg-white transition leading-relaxed font-mono"
            ></textarea>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl flex items-center gap-2 transition"
            >
              <ArrowLeft className="w-4 h-4" /> 戻る
            </button>

            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-6 py-2.5 bg-[#283136] hover:bg-[#1c2226] text-white font-bold text-sm rounded-xl shadow-md flex items-center gap-2 transition"
            >
              次へ：資料写真・指示 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: 会議資料（写真・PDF）/ テキストメモの共有と指示 ── */}
      {step === 3 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-5">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-slate-700" />
            ステップ 3: 会議資料（写真・メモ）の共有 ＆ AIへの指示
          </h2>

          {/* Step 3 説明アコーディオン */}
          <FeatureHelpAccordion
            title="💡 資料写真OCR解析とAIへのフォーカス指示について"
            items={[
              {
                label: "ホワイトボードOCR",
                text: "会議室のホワイトボードや紙の配布資料、手書きメモの写真をアップロードすると、AIが画像を文字認識（OCR）して議事録の議論や決定事項に統合します。",
              },
              {
                label: "AIフォーカス指示",
                text: "「決定事項と担当者を重点的に」「対立点を詳しく残す」「理念（利用者本位）の観点を強調」など、AIに意識してほしいまとめ方の重点をワンタップまたは自由テキストで指定できます。",
              },
            ]}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            {/* 写真アップローダー */}
            <div className="flex flex-col h-full">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                📷 ホワイトボード写真・手書きメモ・配布資料（OCR解析）
              </label>
              <div className="flex-1 flex flex-col">
                <MediaUploader
                  onFileLoaded={(data) => {
                    if (data.imageBase64) {
                      setImageBase64(data.imageBase64);
                      setImageMimeType(data.imageMimeType || "image/jpeg");
                      setImageFileName(data.fileName);
                      showToast(`写真「${data.fileName}」を取り込みました（AIがOCR解析します）✓`);
                    } else if (data.textContent) {
                      setInputText((prev) => (prev ? `${prev}\n\n${data.textContent}` : data.textContent!));
                      showToast("テキストを取り込みました ✓");
                    }
                  }}
                  onClear={() => {
                    setImageBase64(null);
                    setImageMimeType(null);
                    setImageFileName(null);
                  }}
                />
              </div>
            </div>

            {/* 追加テキストメモ */}
            <div className="flex flex-col h-full">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                📝 追加テキストメモ・補足事項（任意）
              </label>
              <textarea
                rows={6}
                placeholder="会議の補足事項や、写真に関するメモがあれば入力してください。"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-slate-600 focus:bg-white transition leading-relaxed"
              ></textarea>
            </div>
          </div>

          {/* AIへの指示 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-slate-600" />
              🎯 AIへの指示・フォーカスポイント（任意）
            </label>
            <input
              type="text"
              placeholder="例：決定事項と担当者を重点的にまとめる、議論の対立点を詳しく残す など"
              value={aiFocusInstruction}
              onChange={(e) => setAiFocusInstruction(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs md:text-sm outline-none focus:ring-2 focus:ring-slate-500/20"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {focusSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setAiFocusInstruction(s)}
                  className="px-2 py-0.5 bg-white border border-slate-300 text-slate-700 rounded-full text-[11px] hover:bg-slate-100 transition"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl flex items-center gap-2 transition"
            >
              <ArrowLeft className="w-4 h-4" /> 戻る
            </button>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading || (!audioBase64 && !transcriptPreview && !inputText && !imageBase64)}
              className="px-8 py-3 bg-[#283136] hover:bg-[#1c2226] disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md flex items-center gap-2 transition"
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
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-slate-700" />
                議事録が完成しました（自由に修正可能）
              </h2>
              <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-1">
                <span>📅 {formatJPDate(meetingDate)}</span>
                <span>🏢 {dept}</span>
                <span>📋 {effectiveMeetingType}</span>
                <span>👥 {participants || "（未指定）"}</span>
                {selectedRecordId && (
                  <span className="text-slate-800 font-bold bg-slate-100 px-2 py-0.5 rounded-full border border-slate-300 flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" /> アジェンダ連携中
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => setStep(3)}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> データ入力に戻る
            </button>
          </div>

          {/* Step 4 説明アコーディオン */}
          <FeatureHelpAccordion
            title="💡 議事録の確認・編集・共有方法について"
            items={[
              {
                label: "自由な編集",
                text: "各セクションの枠内をクリックして、文章の追記・修正が自由に行えます。「議事録を保存する」を押すとログ一覧に最新状態で保存されます。",
              },
              {
                label: "ワンタップ共有",
                text: "「LINE WORKS用コピー」で要約テキストをクリップボードにコピーし、チャットツールへ即座に共有できます。「Word保存」で公式文書ファイル（.docx）をダウンロードできます。",
              },
            ]}
          />

          {/* 1. 会議要約 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              📌 1. 会議要約（ハイライト）
            </label>
            <textarea
              rows={3}
              value={minutesResult.summary || ""}
              onChange={(e) => setMinutesResult({ ...minutesResult, summary: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs md:text-sm outline-none focus:ring-2 focus:ring-slate-500/20 leading-relaxed"
            />
          </div>

          {/* 2. 議論内容・経緯 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
              💡 2. 議論内容・経緯（各議題ごとの発言・流れ）
            </label>
            <textarea
              rows={7}
              value={minutesResult.discussions !== undefined ? minutesResult.discussions : displayDiscussions}
              onChange={(e) =>
                setMinutesResult({ ...minutesResult, discussions: e.target.value })
              }
              className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs md:text-sm outline-none focus:ring-2 focus:ring-slate-500/20 leading-relaxed font-mono"
            />
          </div>

          {/* 3. 決定事項・ToDo */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <ListTodo className="w-3.5 h-3.5 text-slate-600" />
              ✨ 3. 決定事項・ToDo（担当・期日）
            </label>
            <textarea
              rows={4}
              value={minutesResult.action_plans || ""}
              onChange={(e) => setMinutesResult({ ...minutesResult, action_plans: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs md:text-sm outline-none focus:ring-2 focus:ring-slate-500/20 leading-relaxed font-mono"
            />
          </div>

          {/* 4. 次回検討・特記事項 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-600" />
              📅 4. 次回検討・特記事項（宿題・理念・AI助言）
            </label>
            <textarea
              rows={3}
              value={minutesResult.next_steps !== undefined ? minutesResult.next_steps : displayNextSteps}
              onChange={(e) => setMinutesResult({ ...minutesResult, next_steps: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs md:text-sm outline-none focus:ring-2 focus:ring-slate-500/20 leading-relaxed"
            />
          </div>

          {/* 保存ステータスバナー */}
          {saveStatus === "saved" && (
            <div className="p-3.5 bg-slate-100 border border-slate-300 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <CheckCircle2 className="w-5 h-5 text-slate-700 flex-shrink-0" />
                議事録が正常に保存されました！（ステータス：議事録完了）
              </div>
              {onGoToHistory && (
                <button
                  type="button"
                  onClick={onGoToHistory}
                  className="px-3 py-1.5 bg-[#283136] hover:bg-[#1c2226] text-white rounded-lg text-xs font-bold flex items-center gap-1 transition"
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
                  <Save className="w-4 h-4" /> 議事録を保存する
                </>
              )}
            </button>
            <button
              onClick={handleCopyChatSummary}
              className="px-3.5 py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs md:text-sm rounded-xl shadow-sm flex items-center gap-1.5 transition"
            >
              <Share2 className="w-4 h-4" /> LINE WORKS用コピー
            </button>
            <button
              onClick={handleDownloadDocx}
              className="px-3.5 py-2.5 bg-slate-600 hover:bg-slate-700 text-white font-bold text-xs md:text-sm rounded-xl shadow-sm flex items-center gap-1.5 transition"
            >
              <Download className="w-4 h-4" /> Word保存
            </button>
            <button
              onClick={handleCopyText}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs md:text-sm rounded-xl flex items-center gap-1.5 transition"
            >
              <Copy className="w-4 h-4" /> 全文コピー
            </button>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs md:text-sm rounded-xl flex items-center gap-1.5 transition"
            >
              <Printer className="w-4 h-4" /> 印刷
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
