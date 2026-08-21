"use client";

import React, { useState } from "react";
import { MeetingRecord, UserProfile } from "@/lib/types";
import { DEFAULT_DEPARTMENTS, DEFAULT_MEETING_TYPES, deleteMeetingRecord } from "@/lib/storage";
import { downloadMeetingDocx, getMinutesPlainText, getAgendaPlainText, getChatSummaryText, formatJPDate } from "@/lib/exportUtils";
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
  Link as LinkIcon,
  CheckCircle2,
  Share2,
} from "lucide-react";

interface HistoryTabProps {
  meetingRecords: MeetingRecord[];
  currentUser: UserProfile;
  onRefresh: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  meetingRecords,
  currentUser,
  onRefresh,
  showToast,
}) => {
  const [filterDept, setFilterDept] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // モーダル表示用
  const [selectedRecord, setSelectedRecord] = useState<MeetingRecord | null>(null);
  const [modalTab, setModalTab] = useState<"minutes" | "agenda">("minutes");

  const isAdmin = currentUser.role === "admin";

  // 権限フィルタ & 絞り込み
  const filteredRecords = meetingRecords.filter((rec) => {
    if (!isAdmin && rec.dept !== currentUser.department) return false;
    if (filterDept !== "all" && rec.dept !== filterDept) return false;
    if (filterType !== "all" && rec.meetingType !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const content = `${rec.meetingDate} ${rec.dept} ${rec.meetingType} ${rec.participants} ${rec.agenda?.purpose || ""} ${rec.minutes?.summary || ""}`.toLowerCase();
      return content.includes(q);
    }
    return true;
  });

  const handleDelete = (id: string) => {
    if (!confirm("この記録を削除しますか？")) return;
    deleteMeetingRecord(id);
    showToast("記録を削除しました ✓");
    onRefresh();
  };

  const openModal = (rec: MeetingRecord, tab: "minutes" | "agenda") => {
    setSelectedRecord(rec);
    setModalTab(tab);
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

        {isAdmin && (
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm outline-none focus:border-clover-600 focus:bg-white transition"
          >
            <option value="all">すべての部署</option>
            {DEFAULT_DEPARTMENTS.map((d) => (
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
          {DEFAULT_MEETING_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* ログ一覧テーブル */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Table className="w-4 h-4 text-clover-700" />
            アジェンダ・議事録 ログ一覧（{filteredRecords.length}件）
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
                <th className="py-3 px-4 text-center whitespace-nowrap">ステータス</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">アジェンダ</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">議事録</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    該当する記録はありません
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isDone = rec.status === "minutes_completed";
                  return (
                    <tr key={rec.id} className="hover:bg-clover-50/40 transition">
                      <td className="py-3 px-4 font-medium whitespace-nowrap">
                        {formatJPDate(rec.meetingDate)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700">{rec.dept}</td>
                      <td className="py-3 px-4 text-slate-600">{rec.meetingType}</td>
                      <td className="py-3 px-4 text-slate-500 max-w-[150px] truncate">
                        {rec.participants || "―"}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 議事録完了
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-clover-50 text-clover-800 border border-clover-300">
                            アジェンダのみ
                          </span>
                        )}
                      </td>
                      {/* アジェンダ列 */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {rec.agenda ? (
                          <button
                            onClick={() => openModal(rec, "agenda")}
                            className="px-2.5 py-1 bg-white hover:bg-clover-50 text-clover-800 border border-clover-300 rounded-lg font-bold transition shadow-xs"
                          >
                            表示
                          </button>
                        ) : (
                          <span className="text-slate-300">―</span>
                        )}
                      </td>
                      {/* 議事録列 */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {rec.minutes ? (
                          <button
                            onClick={() => openModal(rec, "minutes")}
                            className="px-2.5 py-1 bg-clover-700 hover:bg-clover-800 text-white rounded-lg font-bold transition shadow-xs"
                          >
                            表示
                          </button>
                        ) : (
                          <span className="text-slate-300">―</span>
                        )}
                      </td>
                      {/* 操作列 */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => downloadMeetingDocx(rec)}
                            title="Wordダウンロード"
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {(isAdmin || currentUser.department === rec.dept) && (
                            <button
                              onClick={() => handleDelete(rec.id)}
                              title="削除"
                              className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 詳細閲覧モーダル ── */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-4 bg-clover-700 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm md:text-base">
                  {modalTab === "minutes" ? "📝 議事録" : "📋 アジェンダ"}｜{selectedRecord.dept} {selectedRecord.meetingType}
                </h3>
                <div className="text-xs text-white/80 mt-0.5">
                  開催日: {formatJPDate(selectedRecord.meetingDate)} / 参加者: {selectedRecord.participants || "未指定"}
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedRecord.agenda && selectedRecord.minutes && (
              <div className="flex bg-slate-100 p-1 border-b border-slate-200">
                <button
                  onClick={() => setModalTab("minutes")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    modalTab === "minutes"
                      ? "bg-white text-clover-800 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  📝 議事録を見る
                </button>
                <button
                  onClick={() => setModalTab("agenda")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    modalTab === "agenda"
                      ? "bg-white text-clover-800 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  📋 事前アジェンダを見る
                </button>
              </div>
            )}

            <div className="p-6 overflow-y-auto space-y-4 text-xs md:text-sm leading-relaxed text-slate-800">
              {modalTab === "minutes" && selectedRecord.minutes && (
                <>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="font-bold text-clover-800 mb-1">📌 全体要約</div>
                    <p className="whitespace-pre-wrap">{selectedRecord.minutes.summary}</p>
                  </div>

                  {selectedRecord.minutes.agenda_items && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="font-bold text-slate-800 mb-1">🔎 議題と振り返り</div>
                      <p className="whitespace-pre-wrap font-mono">{selectedRecord.minutes.agenda_items}</p>
                    </div>
                  )}

                  {selectedRecord.minutes.key_discussions && (
                    <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200">
                      <div className="font-bold text-blue-900 mb-1">💡 主な議論・発言内容</div>
                      <p className="whitespace-pre-wrap font-mono">{selectedRecord.minutes.key_discussions}</p>
                    </div>
                  )}

                  {selectedRecord.minutes.action_plans && (
                    <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200">
                      <div className="font-bold text-emerald-900 mb-1">✨ 決定事項・アクションプラン</div>
                      <p className="whitespace-pre-wrap font-mono">{selectedRecord.minutes.action_plans}</p>
                    </div>
                  )}

                  {selectedRecord.minutes.culture_notes && (
                    <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200">
                      <div className="font-bold text-purple-900 mb-1">🍀 組織文化・理念の気づき</div>
                      <p className="whitespace-pre-wrap">{selectedRecord.minutes.culture_notes}</p>
                    </div>
                  )}

                  {selectedRecord.minutes.next_agenda && (
                    <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200">
                      <div className="font-bold text-amber-900 mb-1">🎉 次回の検討事項</div>
                      <p className="whitespace-pre-wrap">{selectedRecord.minutes.next_agenda}</p>
                    </div>
                  )}

                  {selectedRecord.minutes.facilitator_feedback && (
                    <div className="p-4 bg-slate-100 rounded-xl border border-slate-300">
                      <div className="font-bold text-slate-900 mb-1">🌌 AIファシリテーター評価</div>
                      <p className="whitespace-pre-wrap">{selectedRecord.minutes.facilitator_feedback}</p>
                    </div>
                  )}
                </>
              )}

              {modalTab === "agenda" && selectedRecord.agenda && (
                <>
                  <div className="p-4 bg-clover-50/70 rounded-xl border border-clover-200">
                    <div className="font-bold text-clover-900 mb-1">🎯 目的（Purpose）</div>
                    <p className="whitespace-pre-wrap">{selectedRecord.agenda.purpose}</p>
                  </div>

                  <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200">
                    <div className="font-bold text-blue-900 mb-1">🏁 達成したい成果（Outcome）</div>
                    <p className="whitespace-pre-wrap">{selectedRecord.agenda.outcome}</p>
                  </div>

                  {selectedRecord.agenda.review && (
                    <div className="p-4 bg-amber-50/70 border border-amber-200">
                      <div className="font-bold text-amber-900 mb-1">🔄 前回の振り返り</div>
                      <p className="whitespace-pre-wrap">{selectedRecord.agenda.review}</p>
                    </div>
                  )}

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="font-bold text-slate-800 mb-1">📋 各議題の詳細</div>
                    <p className="whitespace-pre-wrap font-mono">{selectedRecord.agenda.agenda_items}</p>
                  </div>

                  <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200">
                    <div className="font-bold text-emerald-900 mb-1">🏁 クロージング</div>
                    <p className="whitespace-pre-wrap">{selectedRecord.agenda.closing}</p>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2">
              {modalTab === "minutes" && selectedRecord.minutes && (
                <button
                  onClick={() => {
                    const text = getChatSummaryText(selectedRecord);
                    navigator.clipboard.writeText(text);
                    showToast("LINE WORKS / チャット用要約をコピーしました 📢");
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
                >
                  <Share2 className="w-3.5 h-3.5" /> LINE WORKS用コピー
                </button>
              )}
              <button
                onClick={() => downloadMeetingDocx(selectedRecord)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" /> Word保存
              </button>
              <button
                onClick={() => {
                  const text =
                    modalTab === "minutes"
                      ? getMinutesPlainText(selectedRecord)
                      : getAgendaPlainText(selectedRecord);
                  navigator.clipboard.writeText(text);
                  showToast("テキストをコピーしました ✓");
                }}
                className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
              >
                <Copy className="w-3.5 h-3.5" /> 全文コピー
              </button>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" /> 印刷
              </button>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition"
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
