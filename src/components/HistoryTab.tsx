"use client";

import React, { useState } from "react";
import { MeetingRecord, UserProfile } from "@/lib/types";
import { DEFAULT_DEPARTMENTS, DEFAULT_MEETING_TYPES, deleteMeetingRecord } from "@/lib/storage";
import { downloadMeetingDocx, getMinutesPlainText, getAgendaPlainText, getChatSummaryText, formatJPDate } from "@/lib/exportUtils";
import {
  Table,
  Search,
  Trash2,
  Download,
  Copy,
  Printer,
  X,
  CheckCircle2,
  Share2,
  Maximize2,
  Minimize2,
  FileText,
  Target,
  FileCheck,
  RotateCcw,
  ListTodo,
  MessageSquare,
  Calendar,
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
  const [isFullScreen, setIsFullScreen] = useState(false);

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
    setIsFullScreen(false);
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
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm outline-none focus:border-slate-600 focus:bg-white transition"
          />
        </div>

        {isAdmin && (
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm outline-none focus:border-slate-600 focus:bg-white transition"
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
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm outline-none focus:border-slate-600 focus:bg-white transition"
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
            <Table className="w-4 h-4 text-slate-700" />
            アジェンダ・議事録 ログ一覧（{filteredRecords.length}件）
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#283136] text-white font-bold">
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
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition">
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
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                            <CheckCircle2 className="w-3 h-3 text-slate-600" /> 議事録完了
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-50 text-slate-600 border border-slate-200">
                            アジェンダのみ
                          </span>
                        )}
                      </td>
                      {/* アジェンダ列 */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {rec.agenda ? (
                          <button
                            onClick={() => openModal(rec, "agenda")}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg font-bold transition shadow-xs"
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
                            className="px-2.5 py-1 bg-[#283136] hover:bg-[#1c2226] text-white rounded-lg font-bold transition shadow-xs"
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
                            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
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

      {/* ── 詳細閲覧モーダル（大画面ワイド＆フルスクリーン対応・外側クリックで閉じる） ── */}
      {selectedRecord && (
        <div
          onClick={() => setSelectedRecord(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`bg-white rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150 transition-all cursor-default ${
              isFullScreen
                ? "w-[98vw] h-[96vh] max-w-none max-h-none"
                : "max-w-5xl w-full max-h-[90vh]"
            }`}
          >
            {/* モーダルヘッダー */}
            <div className="px-5 py-3.5 bg-[#283136] text-white flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-white/10 text-white">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm md:text-base text-white flex items-center gap-2">
                    <span>{modalTab === "minutes" ? "議事録確認" : "事前アジェンダ確認"}</span>
                    <span className="text-xs font-normal text-slate-300">
                      ｜ {selectedRecord.dept} {selectedRecord.meetingType}
                    </span>
                  </h3>
                  <div className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-3">
                    <span>📅 開催日: {formatJPDate(selectedRecord.meetingDate)}</span>
                    <span>👥 参加者: {selectedRecord.participants || "未指定"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* フルスクリーントグルボタン */}
                <button
                  type="button"
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="p-1.5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition"
                  title={isFullScreen ? "通常サイズに戻す" : "画面いっぱいに拡大"}
                >
                  {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="p-1.5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* タブ切り替え（アジェンダと議事録の両方がある場合） */}
            {selectedRecord.agenda && selectedRecord.minutes && (
              <div className="flex bg-slate-100 p-1.5 border-b border-slate-200">
                <button
                  onClick={() => setModalTab("minutes")}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                    modalTab === "minutes"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  📝 議事録を見る
                </button>
                <button
                  onClick={() => setModalTab("agenda")}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                    modalTab === "agenda"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  📋 事前アジェンダを見る
                </button>
              </div>
            )}

            {/* モーダル本文（トンマナ統一・すっきりスレートカード） */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs md:text-sm leading-relaxed text-slate-800 bg-white">
              {modalTab === "minutes" && selectedRecord.minutes && (
                <div className="space-y-4">
                  {/* 1. 会議要約 */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                      📌 1. 会議要約（ハイライト）
                    </div>
                    <p className="whitespace-pre-wrap text-slate-700 leading-relaxed font-sans">
                      {selectedRecord.minutes.summary}
                    </p>
                  </div>

                  {/* 2. 議論内容・経緯 */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                      <MessageSquare className="w-4 h-4 text-slate-600" />
                      💡 2. 議論内容・経緯（各議題ごとの発言・流れ）
                    </div>
                    <p className="whitespace-pre-wrap font-mono text-slate-700 leading-relaxed">
                      {selectedRecord.minutes.discussions ||
                        [selectedRecord.minutes.agenda_items, selectedRecord.minutes.key_discussions]
                          .filter(Boolean)
                          .join("\n\n")}
                    </p>
                  </div>

                  {/* 3. 決定事項・ToDo */}
                  <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl border-l-4 border-l-slate-700">
                    <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                      <ListTodo className="w-4 h-4 text-slate-700" />
                      ✨ 3. 決定事項・ToDo（担当・期日）
                    </div>
                    <p className="whitespace-pre-wrap font-mono text-slate-800 leading-relaxed font-medium">
                      {selectedRecord.minutes.action_plans}
                    </p>
                  </div>

                  {/* 4. 次回検討・特記事項 */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                      <Calendar className="w-4 h-4 text-slate-600" />
                      📅 4. 次回検討・特記事項（宿題・理念・助言）
                    </div>
                    <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                      {selectedRecord.minutes.next_steps ||
                        [
                          selectedRecord.minutes.culture_notes,
                          selectedRecord.minutes.next_agenda,
                          selectedRecord.minutes.facilitator_feedback,
                        ]
                          .filter(Boolean)
                          .join("\n\n")}
                    </p>
                  </div>
                </div>
              )}

              {modalTab === "agenda" && selectedRecord.agenda && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                      <Target className="w-4 h-4 text-slate-600" />
                      🎯 目的（Purpose）
                    </div>
                    <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">{selectedRecord.agenda.purpose}</p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                      <FileCheck className="w-4 h-4 text-slate-600" />
                      🏁 達成したい成果（Outcome）
                    </div>
                    <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">{selectedRecord.agenda.outcome}</p>
                  </div>

                  {selectedRecord.agenda.review && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                        <RotateCcw className="w-4 h-4 text-slate-600" />
                        🔄 前回の振り返り
                      </div>
                      <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">{selectedRecord.agenda.review}</p>
                    </div>
                  )}

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                      📋 各議題の詳細
                    </div>
                    <p className="whitespace-pre-wrap font-mono text-slate-700 leading-relaxed">{selectedRecord.agenda.agenda_items}</p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5 pb-1 border-b border-slate-200">
                      🏁 クロージング
                    </div>
                    <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">{selectedRecord.agenda.closing}</p>
                  </div>
                </div>
              )}
            </div>

            {/* フッターアクションバー（トンマナ統一） */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2.5">
              {modalTab === "minutes" && selectedRecord.minutes && (
                <button
                  onClick={() => {
                    const text = getChatSummaryText(selectedRecord);
                    navigator.clipboard.writeText(text);
                    showToast("LINE WORKS / チャット用要約をコピーしました 📢");
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5" /> LINE WORKS用コピー
                </button>
              )}
              <button
                onClick={() => downloadMeetingDocx(selectedRecord)}
                className="px-4 py-2 bg-[#283136] hover:bg-[#1c2226] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm"
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
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
              >
                <Copy className="w-3.5 h-3.5" /> 全文コピー
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" /> 印刷
              </button>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition"
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
