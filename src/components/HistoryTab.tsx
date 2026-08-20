"use client";

import React, { useState } from "react";
import { AgendaData, MinutesData, MasterData, UserProfile } from "@/lib/types";
import { deleteAgendaItem, deleteMinutesItem } from "@/lib/storage";
import { downloadMinutesDocx, getMinutesPlainText, formatJPDate } from "@/lib/exportUtils";
import {
  Table,
  Search,
  Filter,
  Eye,
  Trash2,
  Download,
  Calendar,
  FileText,
  Copy,
  Printer,
  X,
} from "lucide-react";

interface HistoryTabProps {
  agendas: AgendaData[];
  minutesList: MinutesData[];
  masterData: MasterData;
  currentUser: UserProfile;
  onRefresh: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  agendas,
  minutesList,
  masterData,
  currentUser,
  onRefresh,
  showToast,
}) => {
  const [filterDept, setFilterDept] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [viewingMinutes, setViewingMinutes] = useState<MinutesData | null>(null);
  const [viewingAgenda, setViewingAgenda] = useState<AgendaData | null>(null);

  const isAdmin = currentUser.role === "admin";

  // 権限フィルタ & 絞り込み
  const filteredMinutes = minutesList.filter((m) => {
    // 権限チェック: 一般スタッフは自部署のみ
    if (!isAdmin && m.dept !== currentUser.department) return false;
    if (filterDept !== "all" && m.dept !== filterDept) return false;
    if (filterType !== "all" && m.meetingType !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const content = `${m.meetingDate} ${m.dept} ${m.meetingType} ${m.participants.join(" ")} ${m.summary} ${m.action_plans}`.toLowerCase();
      return content.includes(q);
    }
    return true;
  });

  const handleDeleteMinutes = (id: string) => {
    if (!confirm("この議事録を削除しますか？")) return;
    deleteMinutesItem(id);
    showToast("議事録を削除しました ✓");
    onRefresh();
  };

  const handleDeleteAgenda = (id: string) => {
    if (!confirm("このアジェンダを削除しますか？")) return;
    deleteAgendaItem(id);
    showToast("アジェンダを削除しました ✓");
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* フィルタ & 検索バー */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-wrap items-center gap-3 no-print">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="キーワード・参加者・内容で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm outline-none focus:border-clover-600 focus:bg-white transition"
          />
        </div>

        {/* 部署フィルタ（Adminのみ全選択可） */}
        {isAdmin && (
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm outline-none focus:border-clover-600 focus:bg-white transition"
          >
            <option value="all">すべての部署</option>
            {masterData.departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm outline-none focus:border-clover-600 focus:bg-white transition"
        >
          <option value="all">すべての会議種別</option>
          {masterData.meetingTypes.map((t) => (
            <option key={t.id} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* 議事録一覧テーブル */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-clover-700" />
            保存済み議事録一覧（{filteredMinutes.length}件）
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-clover-700 text-white font-bold">
                <th className="py-3 px-4 whitespace-nowrap">開催日</th>
                <th className="py-3 px-4">部署</th>
                <th className="py-3 px-4">会議種別</th>
                <th className="py-3 px-4">参加者</th>
                <th className="py-3 px-4">全体要約（冒頭）</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMinutes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    該当する議事録はありません
                  </td>
                </tr>
              ) : (
                filteredMinutes.map((m) => (
                  <tr key={m.id} className="hover:bg-clover-50/40 transition">
                    <td className="py-3 px-4 font-medium whitespace-nowrap">{formatJPDate(m.meetingDate)}</td>
                    <td className="py-3 px-4 font-bold text-slate-700">{m.dept}</td>
                    <td className="py-3 px-4 text-slate-600">{m.meetingType}</td>
                    <td className="py-3 px-4 text-slate-500 max-w-[150px] truncate">
                      {m.participants.join("、") || "―"}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-[240px] truncate">
                      {m.summary || "―"}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewingMinutes(m)}
                          className="px-2.5 py-1 bg-clover-50 hover:bg-clover-100 text-clover-800 rounded-lg font-bold flex items-center gap-1 transition"
                        >
                          <Eye className="w-3.5 h-3.5" /> 閲覧
                        </button>
                        <button
                          onClick={() => downloadMinutesDocx(m)}
                          title="Wordダウンロード"
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {(isAdmin || currentUser.department === m.dept) && (
                          <button
                            onClick={() => handleDeleteMinutes(m.id)}
                            title="削除"
                            className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 議事録 詳細閲覧モーダル ── */}
      {viewingMinutes && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* モーダルヘッダー */}
            <div className="p-4 bg-clover-700 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm md:text-base">
                  📝 議事録｜{viewingMinutes.dept} {viewingMinutes.meetingType}
                </h3>
                <div className="text-xs text-white/80 mt-0.5">
                  開催日: {formatJPDate(viewingMinutes.meetingDate)} / 参加者: {viewingMinutes.participants.join("、") || "未指定"}
                </div>
              </div>
              <button
                onClick={() => setViewingMinutes(null)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* モーダル本文 */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs md:text-sm leading-relaxed text-slate-800">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-clover-800 mb-1">📌 全体要約</div>
                <p className="whitespace-pre-wrap">{viewingMinutes.summary}</p>
              </div>

              {viewingMinutes.agenda_items && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-800 mb-1">🔎 議題と振り返り</div>
                  <p className="whitespace-pre-wrap font-mono">{viewingMinutes.agenda_items}</p>
                </div>
              )}

              {viewingMinutes.key_discussions && (
                <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200">
                  <div className="font-bold text-blue-900 mb-1">💡 主な議論・発言</div>
                  <p className="whitespace-pre-wrap font-mono">{viewingMinutes.key_discussions}</p>
                </div>
              )}

              {viewingMinutes.action_plans && (
                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200">
                  <div className="font-bold text-emerald-900 mb-1">✨ 決定事項・アクションプラン</div>
                  <p className="whitespace-pre-wrap font-mono">{viewingMinutes.action_plans}</p>
                </div>
              )}

              {viewingMinutes.culture_notes && (
                <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200">
                  <div className="font-bold text-purple-900 mb-1">🍀 組織文化・理念の気づき</div>
                  <p className="whitespace-pre-wrap">{viewingMinutes.culture_notes}</p>
                </div>
              )}

              {viewingMinutes.next_agenda && (
                <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200">
                  <div className="font-bold text-amber-900 mb-1">🎉 次回の検討事項</div>
                  <p className="whitespace-pre-wrap">{viewingMinutes.next_agenda}</p>
                </div>
              )}

              {viewingMinutes.facilitator_feedback && (
                <div className="p-4 bg-slate-100 rounded-xl border border-slate-300">
                  <div className="font-bold text-slate-900 mb-1">🌌 AIファシリテーター評価</div>
                  <p className="whitespace-pre-wrap">{viewingMinutes.facilitator_feedback}</p>
                </div>
              )}
            </div>

            {/* モーダルフッター */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => downloadMinutesDocx(viewingMinutes)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" /> Word保存
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(getMinutesPlainText(viewingMinutes));
                  showToast("テキストをコピーしました ✓");
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
              >
                <Copy className="w-3.5 h-3.5" /> テキストコピー
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" /> 印刷
              </button>
              <button
                onClick={() => setViewingMinutes(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
