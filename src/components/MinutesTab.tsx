"use client";

import React, { useState, useEffect } from "react";
import { MeetingRecord, UserProfile, MinutesDetails } from "@/lib/types";
import { DEFAULT_DEPARTMENTS, DEFAULT_MEETING_TYPES, saveMinutesRecord } from "@/lib/storage";
import { downloadMeetingDocx, getMinutesPlainText, formatJPDate } from "@/lib/exportUtils";
import { AudioRecorder } from "./AudioRecorder";
import { AudioUploader } from "./AudioUploader";
import {
  FileText,
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
  HelpCircle,
  Lightbulb,
  Heart,
  Calendar,
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
  const today = new Date().toISOString().split("T")[0];

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: 会議情報
  const [selectedRecordId, setSelectedRecordId] = useState<string>(initialAgendaId || "");
  const [meetingDate, setMeetingDate] = useState(today);
  const [dept, setDept] = useState(currentUser.department || DEFAULT_DEPARTMENTS[0]);
  const [meetingType, setMeetingType] = useState(DEFAULT_MEETING_TYPES[0]);
  const [participants, setParticipants] = useState("");

  // Step 2: 入力データ（テキスト & 音声）
  const [inputText, setInputText] = useState("");
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);

  // Step 3: AI生成結果
  const [isLoading, setIsLoading] = useState(false);
  const [minutesResult, setMinutesResult] = useState<MinutesDetails | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [savedRecord, setSavedRecord] = useState<MeetingRecord | null>(null);

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
      setMeetingType(rec.meetingType);
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

      const res = await fetch("/api/minutes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingDate,
          dept,
          meetingType,
          participants,
          agendaBody,
          inputText,
          audioBase64,
          audioMimeType,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "議事録の生成に失敗しました");
      }

      const data = await res.json();
      setMinutesResult(data);
      setStep(3);
      showToast("議事録を生成しました ✨");
    } catch (err: any) {
      showToast("エラー: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // 保存（アジェンダ紐付け & 楽観的ロック）
  const handleSave = () => {
    if (!minutesResult) return;

    setSaveStatus("saving");

    const selectedRec = meetingRecords.find((r) => r.id === selectedRecordId);

    const result = saveMinutesRecord({
      recordId: selectedRecordId || undefined,
      meetingDate,
      dept,
      meetingType,
      participants,
      minutes: {
        ...minutesResult,
        inputText,
        audioFileName: audioFileName || undefined,
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
      meetingType,
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
        meetingType,
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

  // アジェンダが存在するレコード一覧
  const agendaRecords = meetingRecords.filter((r) => r.agenda);

  return (
    <div className="space-y-6">
      {/* ステップインジケーター */}
      <div className="flex items-center justify-between max-w-lg mx-auto mb-6 no-print">
        {[
          { num: 1, label: "会議情報" },
          { num: 2, label: "音声・メモ入力" },
          { num: 3, label: "議事録完成" },
        ].map((s, idx) => (
          <React.Fragment key={s.num}>
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s.num
                    ? "bg-clover-700 text-white shadow"
                    : step > s.num
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {step > s.num ? "✓" : s.num}
              </div>
              <span
                className={`text-xs font-medium ${
                  step === s.num ? "text-clover-800 font-bold" : "text-slate-500"
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < 2 && <div className="h-0.5 w-12 bg-slate-200"></div>}
          </React.Fragment>
        ))}
      </div>

      {/* ── STEP 1: 会議情報 ── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-clover-700" />
            ステップ 1: 会議基本情報（定例・事業所会議）
          </h2>

          {/* 事前アジェンダ連携 */}
          {agendaRecords.length > 0 && (
            <div className="p-3.5 bg-clover-50/80 border border-clover-200 rounded-xl">
              <label className="block text-xs font-bold text-clover-900 mb-1.5 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-clover-700" />
                事前アジェンダから呼び起こす（紐付け保存されます）
              </label>
              <select
                value={selectedRecordId}
                onChange={(e) => handleSelectRecord(e.target.value)}
                className="w-full bg-white border border-clover-300 rounded-lg px-3 py-2 text-xs md:text-sm outline-none focus:ring-2 focus:ring-clover-500/20"
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
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">📅 会議日</label>
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-clover-600 focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">🏢 部署</label>
              <select
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-clover-600 focus:bg-white transition"
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-clover-600 focus:bg-white transition"
              >
                {DEFAULT_MEETING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">👥 参加者（自由入力）</label>
              <input
                type="text"
                placeholder="例：佐藤、田中、高橋、渡辺"
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-clover-600 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-6 py-2.5 bg-clover-700 hover:bg-clover-800 text-white font-bold text-sm rounded-xl shadow-sm flex items-center gap-2 transition"
            >
              次へ：音声・メモ入力 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: 入力データ ── */}
      {step === 2 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-5">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-clover-700" />
            ステップ 2: 会議データ（音声・メモ）の取り込み
          </h2>

          {/* 音声入力オプション */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                📱 スマホのボイスメモ / 録音ファイル（推奨）
              </label>
              <AudioUploader
                onFileLoaded={(base64, mime, name, text) => {
                  if (text) {
                    setInputText((prev) => (prev ? `${prev}\n\n${text}` : text));
                    showToast("テキストファイルの内容を取り込みました ✓");
                  } else {
                    setAudioBase64(base64);
                    setAudioMimeType(mime);
                    setAudioFileName(name);
                    showToast(`${name} をセットしました ✓`);
                  }
                }}
                onClear={() => {
                  setAudioBase64(null);
                  setAudioMimeType(null);
                  setAudioFileName(null);
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                🎙️ ブラウザで今すぐ録音（スリープ防止）
              </label>
              <AudioRecorder
                onRecordingComplete={(base64, mime, liveTranscript) => {
                  setAudioBase64(base64);
                  setAudioMimeType(mime);
                  setAudioFileName("ブラウザ録音データ.webm");
                  if (liveTranscript) {
                    setInputText((prev) =>
                      prev ? `${prev}\n\n${liveTranscript}` : liveTranscript
                    );
                  }
                  showToast("録音データをセットしました ✓");
                }}
              />
            </div>
          </div>

          {/* テキストメモ */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              📝 テキストメモ・発言内容（任意）
            </label>
            <textarea
              rows={6}
              placeholder="会議中のメモや要点、発言者ごとの意見などを自由に入力してください。音声ファイルと組み合わせることも可能です。"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm outline-none focus:border-clover-600 focus:bg-white transition leading-relaxed"
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
              onClick={handleGenerate}
              disabled={isLoading || (!inputText && !audioBase64)}
              className="px-8 py-3 bg-clover-700 hover:bg-clover-800 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-sm flex items-center gap-2 transition"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Gemini 3.5 Flash-Lite が議事録を精査・生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                  AI議事録を生成する
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: 生成結果 & 編集 ── */}
      {step === 3 && minutesResult && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                議事録が完成しました（自由に修正可能）
              </h2>
              <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-1">
                <span>📅 {formatJPDate(meetingDate)}</span>
                <span>🏢 {dept}</span>
                <span>📋 {meetingType}</span>
                <span>👥 {participants || "（未指定）"}</span>
                {selectedRecordId && (
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" /> アジェンダ連携中
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> データ入力に戻る
            </button>
          </div>

          {/* 1. 全体要約 */}
          <div className="p-4 bg-clover-50/70 border border-clover-200 rounded-xl">
            <label className="block text-xs font-bold text-clover-800 mb-1 flex items-center gap-1">
              📌 全体要約
            </label>
            <textarea
              rows={4}
              value={minutesResult.summary || ""}
              onChange={(e) => setMinutesResult({ ...minutesResult, summary: e.target.value })}
              className="w-full bg-white border border-clover-200 rounded-lg p-3 text-xs md:text-sm outline-none focus:ring-2 focus:ring-clover-500/20 leading-relaxed"
            />
          </div>

          {/* 2. 議題 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
              🔎 議題と振り返り
            </label>
            <textarea
              rows={4}
              value={minutesResult.agenda_items || ""}
              onChange={(e) => setMinutesResult({ ...minutesResult, agenda_items: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs md:text-sm outline-none focus:ring-2 focus:ring-clover-500/20 leading-relaxed font-mono"
            />
          </div>

          {/* 3. 主な議論 */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl">
            <label className="block text-xs font-bold text-blue-800 mb-1 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" /> 💡 主な議論・発言内容（発言者：〜）
            </label>
            <textarea
              rows={6}
              value={minutesResult.key_discussions || ""}
              onChange={(e) =>
                setMinutesResult({ ...minutesResult, key_discussions: e.target.value })
              }
              className="w-full bg-white border border-blue-200 rounded-lg p-3 text-xs md:text-sm outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed font-mono"
            />
          </div>

          {/* 4. 決定事項・アクションプラン */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <label className="block text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1">
              <ListTodo className="w-3.5 h-3.5" /> ✨ 決定事項・アクションプラン（担当・期日）
            </label>
            <textarea
              rows={4}
              value={minutesResult.action_plans || ""}
              onChange={(e) => setMinutesResult({ ...minutesResult, action_plans: e.target.value })}
              className="w-full bg-white border border-emerald-200 rounded-lg p-3 text-xs md:text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 leading-relaxed font-mono"
            />
          </div>

          {/* 5. 理念・組織文化 */}
          <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl">
            <label className="block text-xs font-bold text-purple-800 mb-1 flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" /> 🍀 組織文化・理念に関する気づき
            </label>
            <textarea
              rows={3}
              value={minutesResult.culture_notes || ""}
              onChange={(e) => setMinutesResult({ ...minutesResult, culture_notes: e.target.value })}
              className="w-full bg-white border border-purple-200 rounded-lg p-3 text-xs md:text-sm outline-none focus:ring-2 focus:ring-purple-500/20 leading-relaxed"
            />
          </div>

          {/* 6. 次回の検討事項 */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl">
            <label className="block text-xs font-bold text-amber-800 mb-1 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" /> 🎉 次回の検討事項・宿題
            </label>
            <textarea
              rows={3}
              value={minutesResult.next_agenda || ""}
              onChange={(e) => setMinutesResult({ ...minutesResult, next_agenda: e.target.value })}
              className="w-full bg-white border border-amber-200 rounded-lg p-3 text-xs md:text-sm outline-none focus:ring-2 focus:ring-amber-500/20 leading-relaxed"
            />
          </div>

          {/* 7. AI評価 */}
          <div className="p-4 bg-slate-100 border border-slate-300 rounded-xl">
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> 🌌 AIファシリテーター評価
            </label>
            <textarea
              rows={4}
              value={minutesResult.facilitator_feedback || ""}
              onChange={(e) =>
                setMinutesResult({ ...minutesResult, facilitator_feedback: e.target.value })
              }
              className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs md:text-sm outline-none focus:ring-2 focus:ring-clover-500/20 leading-relaxed"
            />
          </div>

          {/* 保存ステータスバナー */}
          {saveStatus === "saved" && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                議事録が正常に保存されました！（ステータス：議事録完了）
              </div>
              {onGoToHistory && (
                <button
                  type="button"
                  onClick={onGoToHistory}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition"
                >
                  ログ一覧で確認 <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* アクションボタンバー */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100 no-print">
            <button
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              className={`px-6 py-2.5 font-bold text-xs md:text-sm rounded-xl shadow-sm flex items-center gap-2 transition ${
                saveStatus === "saved"
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-clover-700 hover:bg-clover-800 text-white"
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
              onClick={handleDownloadDocx}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs md:text-sm rounded-xl shadow-sm flex items-center gap-2 transition"
            >
              <Download className="w-4 h-4" /> Word (.docx) 保存
            </button>
            <button
              onClick={handleCopyText}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs md:text-sm rounded-xl flex items-center gap-2 transition"
            >
              <Copy className="w-4 h-4" /> テキストをコピー
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs md:text-sm rounded-xl flex items-center gap-2 transition"
            >
              <Printer className="w-4 h-4" /> 印刷
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
