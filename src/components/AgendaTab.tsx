"use client";

import React, { useState } from "react";
import { MasterData, AgendaData, UserProfile } from "@/lib/types";
import { saveAgendaItem } from "@/lib/storage";
import { getAgendaPlainText, formatJPDate } from "@/lib/exportUtils";
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
} from "lucide-react";

interface AgendaTabProps {
  masterData: MasterData;
  currentUser: UserProfile;
  onSaved: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export const AgendaTab: React.FC<AgendaTabProps> = ({
  masterData,
  currentUser,
  onSaved,
  showToast,
}) => {
  const today = new Date().toISOString().split("T")[0];

  const [meetingDate, setMeetingDate] = useState(today);
  const [dept, setDept] = useState(currentUser.department || masterData.departments[0] || "");
  const [meetingType, setMeetingType] = useState(masterData.meetingTypes[0]?.name || "");
  const [participants, setParticipants] = useState<string[]>([]);
  const [clientName, setClientName] = useState("");
  const [duration, setDuration] = useState("1時間");
  const [topics, setTopics] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [generatedAgenda, setGeneratedAgenda] = useState<any | null>(null);

  // 部署変更時に参加者をリセット
  const deptEmployees = masterData.employees.filter((e) => e.dept === dept);

  const toggleParticipant = (name: string) => {
    setParticipants((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  };

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
    try {
      const res = await fetch("/api/agenda/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingDate,
          dept,
          meetingType,
          participants,
          clientName,
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

    saveAgendaItem({
      meetingDate,
      dept,
      meetingType,
      participants,
      clientName,
      duration,
      topics,
      title: generatedAgenda.title || `${dept} ${meetingType}`,
      purpose: generatedAgenda.purpose || "",
      outcome: generatedAgenda.outcome || "",
      review: generatedAgenda.review || "",
      agenda_items: generatedAgenda.agenda_items || "",
      closing: generatedAgenda.closing || "",
      full_text: generatedAgenda.full_text || "",
      createdById: currentUser.id,
    });

    showToast("アジェンダを保存しました ✓");
    onSaved();
  };

  const handleCopy = () => {
    if (!generatedAgenda) return;
    const text = getAgendaPlainText({
      id: "",
      meetingDate,
      dept,
      meetingType,
      participants,
      clientName,
      duration,
      topics,
      title: generatedAgenda.title,
      purpose: generatedAgenda.purpose,
      outcome: generatedAgenda.outcome,
      review: generatedAgenda.review,
      agenda_items: generatedAgenda.agenda_items,
      closing: generatedAgenda.closing,
      full_text: generatedAgenda.full_text,
      createdAt: "",
      updatedAt: "",
    });
    navigator.clipboard.writeText(text);
    showToast("アジェンダをクリップボードにコピーしました ✓");
  };

  const durations = ["30分", "45分", "1時間", "1時間30分", "2時間"];

  return (
    <div className="space-y-6">
      {/* 入力フォーム */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-clover-700" />
          会議アジェンダの事前作成
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

        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-700 mb-1">📋 会議種別</label>
          <select
            value={meetingType}
            onChange={(e) => setMeetingType(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-clover-600 focus:bg-white transition"
          >
            {masterData.meetingTypes.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name} {t.desc ? `（${t.desc}）` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* 参加者選択 */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span>👥 参加者（{participants.length}名選択中）</span>
            <span className="text-[11px] text-slate-400 font-normal">タップで選択/解除</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 bg-slate-50 border border-slate-200 rounded-xl">
            {deptEmployees.length === 0 ? (
              <div className="col-span-full py-4 text-center text-xs text-slate-400">
                この部署に登録されているスタッフがいません
              </div>
            ) : (
              deptEmployees.map((emp) => {
                const isSelected = participants.includes(emp.name);
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => toggleParticipant(emp.name)}
                    className={`p-2 rounded-lg text-left text-xs transition flex items-center gap-2 border ${
                      isSelected
                        ? "bg-clover-50 border-clover-600 text-clover-900 font-bold"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                        isSelected ? "bg-clover-700 text-white" : "border border-slate-300"
                      }`}
                    >
                      {isSelected ? "✓" : ""}
                    </div>
                    <div className="truncate">
                      <div>{emp.name}</div>
                      {emp.role && <div className="text-[10px] text-slate-400 font-normal">{emp.role}</div>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 対象利用者 & 想定時間 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              👤 対象利用者名（カンファレンス等の場合）
            </label>
            <input
              type="text"
              placeholder="例：田中 花子 様"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-clover-600 focus:bg-white transition"
            />
          </div>

          <div>
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
                AIがアジェンダを設計中...
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

          {/* アクションボタン */}
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 no-print">
            <button
              onClick={handleSave}
              className="px-5 py-2.5 bg-clover-700 hover:bg-clover-800 text-white font-bold text-xs md:text-sm rounded-xl shadow-sm flex items-center gap-2 transition"
            >
              <Save className="w-4 h-4" /> アジェンダを保存する
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
