"use client";

import React, { useState } from "react";
import { UserProfile, AgendaDetails } from "@/lib/types";
import { DEFAULT_DEPARTMENTS, DEFAULT_MEETING_TYPES, saveAgendaRecord } from "@/lib/storage";
import { formatJPDate } from "@/lib/exportUtils";
import {
  Sparkles,
  Save,
  Copy,
  Printer,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Clock,
  Users,
  Target,
  FileCheck,
  ArrowRight,
} from "lucide-react";

interface AgendaTabProps {
  currentUser: UserProfile;
  onSaved: (createdId?: string) => void;
  onGoToMinutes?: (agendaId: string) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export const AgendaTab: React.FC<AgendaTabProps> = ({
  currentUser,
  onSaved,
  onGoToMinutes,
  showToast,
}) => {
  const today = new Date().toISOString().split("T")[0];

  const [meetingDate, setMeetingDate] = useState(today);
  const [dept, setDept] = useState(currentUser.department || DEFAULT_DEPARTMENTS[0]);
  const [meetingType, setMeetingType] = useState(DEFAULT_MEETING_TYPES[0]);
  const [participants, setParticipants] = useState("");
  const [duration, setDuration] = useState("1時間");
  const [topics, setTopics] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [generatedAgenda, setGeneratedAgenda] = useState<AgendaDetails | null>(null);
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const handleGenerate = async () => {
    if (!dept) {
      showToast("部署を選択してください", "error");
      return;
    }
    if (!meetingType) {
      showToast("会議種別を選択してください", "error");
      return;
    }

    setIsLoading(true);
    setSaveStatus("idle");
    setSavedRecordId(null);

    try {
      const res = await fetch("/api/agenda/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingDate,
          dept,
          meetingType,
          participants,
          duration,
          topics,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "生成に失敗しました");
      }

      const data = await res.json();
      setGeneratedAgenda(data);
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
        meetingType,
        participants,
        duration,
        userTopics: topics,
        agenda: generatedAgenda,
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
    const text = [
      `【COOPs 会議アジェンダ】`,
      `会議日: ${formatJPDate(meetingDate)}`,
      `部署: ${dept} / 種別: ${meetingType}`,
      `参加者: ${participants || "（未指定）"}`,
      `所要時間: ${duration || "未定"}`,
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

  const durations = ["30分", "45分", "1時間", "1時間30分", "2時間"];

  return (
    <div className="space-y-6">
      {/* 入力フォーム */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-clover-700" />
          会議アジェンダの事前作成（定例・事業所会議）
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">📅 会議予定日</label>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

        {/* 想定時間 */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-700 mb-1">⏱️ 想定所要時間</label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {durations.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  duration === d
                    ? "bg-clover-700 text-white font-bold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* 議題メモ */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-slate-700 mb-1">
            📝 今回話したいこと・背景・前回の課題
          </label>
          <textarea
            rows={4}
            placeholder="例：&#10;・今月のヒヤリハット報告（転倒リスクの再確認）&#10;・新規スタッフ2名の同行スケジュール決定&#10;・送迎ルート見直しの進捗確認"
            value={topics}
            onChange={(e) => setTopics(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-clover-600 focus:bg-white transition leading-relaxed"
          ></textarea>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full sm:w-auto px-8 py-3 bg-clover-700 hover:bg-clover-800 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 mx-auto transition"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Gemini 3.5 Flash-Lite がアジェンダを設計中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-emerald-300" />
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
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
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
          <div className="p-4 bg-clover-50/70 border border-clover-200 rounded-xl">
            <label className="block text-xs font-bold text-clover-800 mb-1 flex items-center gap-1">
              <Target className="w-3.5 h-3.5" /> 🎯 目的（Purpose）
            </label>
            <textarea
              rows={2}
              value={generatedAgenda.purpose || ""}
              onChange={(e) => setGeneratedAgenda({ ...generatedAgenda, purpose: e.target.value })}
              className="w-full bg-white border border-clover-200 rounded-lg p-2.5 text-xs md:text-sm outline-none focus:ring-2 focus:ring-clover-500/20 leading-relaxed"
            />
          </div>

          {/* 達成したい成果 */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl">
            <label className="block text-xs font-bold text-blue-800 mb-1 flex items-center gap-1">
              <FileCheck className="w-3.5 h-3.5" /> 🏁 達成したい成果・決定事項（Outcome）
            </label>
            <textarea
              rows={2}
              value={generatedAgenda.outcome || ""}
              onChange={(e) => setGeneratedAgenda({ ...generatedAgenda, outcome: e.target.value })}
              className="w-full bg-white border border-blue-200 rounded-lg p-2.5 text-xs md:text-sm outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
            />
          </div>

          {/* 振り返り */}
          {generatedAgenda.review && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl">
              <label className="block text-xs font-bold text-amber-800 mb-1">
                🔄 前回の振り返り・継続事項
              </label>
              <textarea
                rows={2}
                value={generatedAgenda.review || ""}
                onChange={(e) => setGeneratedAgenda({ ...generatedAgenda, review: e.target.value })}
                className="w-full bg-white border border-amber-200 rounded-lg p-2.5 text-xs md:text-sm outline-none focus:ring-2 focus:ring-amber-500/20 leading-relaxed"
              />
            </div>
          )}

          {/* 各議題 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="block text-xs font-bold text-slate-800 mb-1">
              📋 各議題の詳細（AIアドバイス・確認ポイント含む）
            </label>
            <textarea
              rows={8}
              value={generatedAgenda.agenda_items || ""}
              onChange={(e) => setGeneratedAgenda({ ...generatedAgenda, agenda_items: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs md:text-sm outline-none focus:ring-2 focus:ring-clover-500/20 leading-relaxed font-mono"
            />
          </div>

          {/* クロージング */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <label className="block text-xs font-bold text-emerald-800 mb-1">🏁 クロージング</label>
            <textarea
              rows={2}
              value={generatedAgenda.closing || ""}
              onChange={(e) => setGeneratedAgenda({ ...generatedAgenda, closing: e.target.value })}
              className="w-full bg-white border border-emerald-200 rounded-lg p-2.5 text-xs md:text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 leading-relaxed"
            />
          </div>

          {/* 保存ステータスバナー */}
          {saveStatus === "saved" && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                アジェンダがログ一覧に正常保存されました！
              </div>
              {onGoToMinutes && savedRecordId && (
                <button
                  type="button"
                  onClick={() => onGoToMinutes(savedRecordId)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition"
                >
                  このアジェンダで議事録を作成 <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 no-print">
            <button
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              className={`px-5 py-2.5 font-bold text-xs md:text-sm rounded-xl shadow-sm flex items-center gap-2 transition ${
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
                  <Save className="w-4 h-4" /> アジェンダを保存する
                </>
              )}
            </button>
            <button
              onClick={handleCopy}
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
