"use client";

import React, { useState } from "react";
import { MasterData, AgendaData, MinutesData, UserProfile } from "@/lib/types";
import { saveMinutesItem } from "@/lib/storage";
import { downloadMinutesDocx, getMinutesPlainText, formatJPDate } from "@/lib/exportUtils";
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
  masterData: MasterData;
  agendas: AgendaData[];
  currentUser: UserProfile;
  onSaved: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export const MinutesTab: React.FC<MinutesTabProps> = ({
  masterData,
  agendas,
  currentUser,
  onSaved,
  showToast,
}) => {
  const today = new Date().toISOString().split("T")[0];

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: 会議情報
  const [selectedAgendaId, setSelectedAgendaId] = useState("");
  const [meetingDate, setMeetingDate] = useState(today);
  const [dept, setDept] = useState(currentUser.department || masterData.departments[0] || "");
  const [meetingType, setMeetingType] = useState(masterData.meetingTypes[0]?.name || "");
  const [participants, setParticipants] = useState<string[]>([]);
  const [clientName, setClientName] = useState("");

  // Step 2: 入力データ（テキスト & 音声）
  const [inputText, setInputText] = useState("");
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);

  // Step 3: AI生成結果
  const [isLoading, setIsLoading] = useState(false);
  const [minutesResult, setMinutesResult] = useState<any | null>(null);

  // 部署変更時に参加者一覧を取得
  const deptEmployees = masterData.employees.filter((e) => e.dept === dept);

  const toggleParticipant = (name: string) => {
    setParticipants((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  };

  // アジェンダ呼び出し
  const handleSelectAgenda = (id: string) => {
    setSelectedAgendaId(id);
    if (!id) return;
    const ag = agendas.find((a) => a.id === id);
    if (ag) {
      setMeetingDate(ag.meetingDate);
      setDept(ag.dept);
      setMeetingType(ag.meetingType);
      setParticipants(ag.participants);
      setClientName(ag.clientName || "");
      showToast("アジェンダ情報を読み込みました ✓");
    }
  };

  // 議事録生成
  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const selectedAgenda = agendas.find((a) => a.id === selectedAgendaId);
      const res = await fetch("/api/minutes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingDate,
          dept,
          meetingType,
          participants,
          clientName,
          agendaBody: selectedAgenda?.full_text || "",
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

  // 保存（楽観的ロック対応）
  const handleSave = () => {
    if (!minutesResult) return;

    const result = saveMinutesItem({
      agendaRecordId: selectedAgendaId || undefined,
      meetingDate,
      dept,
      meetingType,
      participants,
      clientName,
      inputText,
      audioFileName: audioFileName || undefined,
      transcript: minutesResult.transcript || "",
      summary: minutesResult.summary || "",
      agenda_items: minutesResult.agenda_items || "",
      key_discussions: minutesResult.key_discussions || "",
      action_plans: minutesResult.action_plans || "",
      culture_notes: minutesResult.culture_notes || "",
      next_agenda: minutesResult.next_agenda || "",
      facilitator_feedback: minutesResult.facilitator_feedback || "",
      status: "completed",
      createdById: currentUser.id,
    });

    if (result.success) {
      showToast("議事録を保存しました ✓");
      onSaved();
    } else {
      showToast("保存エラー: " + result.error, "error");
    }
  };

  // Word (.docx) ダウンロード
  const handleDownloadDocx = () => {
    if (!minutesResult) return;
    downloadMinutesDocx({
      id: "",
      meetingDate,
      dept,
      meetingType,
      participants,
      clientName,
      summary: minutesResult.summary,
      agenda_items: minutesResult.agenda_items,
      key_discussions: minutesResult.key_discussions,
      action_plans: minutesResult.action_plans,
      culture_notes: minutesResult.culture_notes,
      next_agenda: minutesResult.next_agenda,
      facilitator_feedback: minutesResult.facilitator_feedback,
      status: "completed",
      createdAt: "",
      updatedAt: "",
      version: 1,
    });
    showToast("Word (.docx) をダウンロードしました ✓");
  };

  const handleCopyText = () => {
    if (!minutesResult) return;
    const text = getMinutesPlainText({
      id: "",
      meetingDate,
      dept,
      meetingType,
      participants,
      clientName,
      summary: minutesResult.summary,
      agenda_items: minutesResult.agenda_items,
      key_discussions: minutesResult.key_discussions,
      action_plans: minutesResult.action_plans,
      culture_notes: minutesResult.culture_notes,
      next_agenda: minutesResult.next_agenda,
      facilitator_feedback: minutesResult.facilitator_feedback,
      status: "completed",
      createdAt: "",
      updatedAt: "",
      version: 1,
    });
    navigator.clipboard.writeText(text);
    showToast("議事録テキストをコピーしました ✓");
  };

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
            ステップ 1: 会議基本情報
          </h2>

          {/* 事前アジェンダ連携 */}
          {agendas.length > 0 && (
            <div className="p-3.5 bg-clover-50/80 border border-clover-200 rounded-xl">
              <label className="block text-xs font-bold text-clover-900 mb-1.5 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-clover-700" />
                事前アジェンダから呼び起こす（自動入力）
              </label>
              <select
                value={selectedAgendaId}
                onChange={(e) => handleSelectAgenda(e.target.value)}
                className="w-full bg-white border border-clover-300 rounded-lg px-3 py-2 text-xs md:text-sm outline-none focus:ring-2 focus:ring-clover-500/20"
              >
                <option value="">― アジェンダを選択（任意） ―</option>
                {agendas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.meetingDate} | {a.dept} | {a.meetingType} {a.clientName ? `(${a.clientName})` : ""}
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
                onChange={(e) => {
                  setDept(e.target.value);
                  setParticipants([]);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-clover-600 focus:bg-white transition"
              >
                {masterData.departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">📋 会議種別</label>
            <select
              value={meetingType}
              onChange={(e) => setMeetingType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-clover-600 focus:bg-white transition"
            >
              {masterData.meetingTypes.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* 参加者 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>👥 参加者（{participants.length}名選択中）</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 bg-slate-50 border border-slate-200 rounded-xl">
              {deptEmployees.map((emp) => {
                const isSelected = participants.includes(emp.name);
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => toggleParticipant(emp.name)}
                    className={`p-2 rounded-lg text-left text-xs transition flex items-center gap-2 border ${
                      isSelected
                        ? "bg-clover-50 border-clover-600 text-clover-900 font-bold"
                        : "bg-white border-slate-200 text-slate-700"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                        isSelected ? "bg-clover-700 text-white" : "border border-slate-300"
                      }`}
                    >
                      {isSelected ? "✓" : ""}
                    </div>
                    <div className="truncate">{emp.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              👤 対象利用者名（カンファレンス等）
            </label>
            <input
              type="text"
              placeholder="例：田中 花子 様"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-clover-600 focus:bg-white transition"
            />
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

          {/* 音声入力オプション（ボイスメモ / ブラウザ録音） */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ボイスメモアップローダー */}
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

            {/* ブラウザ直接録音 */}
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

          {/* テキストメモ欄 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              📝 テキストメモ・発言内容（任意・箇条書きでもOK）
            </label>
            <textarea
              rows={6}
              placeholder="会議中のメモや要点、発言者ごとの意見などを自由に入力してください。音声ファイルと組み合わせることも可能です。"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm outline-none focus:border-clover-600 focus:bg-white transition leading-relaxed"
            ></textarea>
          </div>

          {/* ナビゲーション */}
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
                <span>👥 {participants.join("、") || "（未指定）"}</span>
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

          {/* アクションボタンバー */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100 no-print">
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-clover-700 hover:bg-clover-800 text-white font-bold text-xs md:text-sm rounded-xl shadow-sm flex items-center gap-2 transition"
            >
              <Save className="w-4 h-4" /> 議事録を保存する
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
