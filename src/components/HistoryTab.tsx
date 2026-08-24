"use client";

import React, { useState } from "react";
import { MeetingRecord, UserProfile, MinutesDetails, AgendaDetails } from "@/lib/types";
import {
  DEFAULT_DEPARTMENTS,
  DEFAULT_MEETING_TYPES,
  deleteMeetingRecord,
  saveMinutesRecord,
  saveAgendaRecord,
  syncFromGSS,
} from "@/lib/storage";
import {
  downloadMeetingDocx,
  getMinutesPlainText,
  getAgendaPlainText,
  getChatSummaryText,
  formatJPDate,
  formatAgendaItemsText,
  getGoogleCalendarUrl,
} from "@/lib/exportUtils";
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
  CalendarPlus,
  Edit3,
  Save,
  RefreshCw,
} from "lucide-react";
import { FeatureHelpAccordion } from "./FeatureHelpAccordion";

interface HistoryTabProps {
  meetingRecords: MeetingRecord[];
  currentUser: UserProfile;
  departments: string[];
  onRefresh: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  meetingRecords,
  currentUser,
  departments,
  onRefresh,
  showToast,
}) => {
  const [filterDept, setFilterDept] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState(false);

  // モーダル表示用
  const [selectedRecord, setSelectedRecord] = useState<MeetingRecord | null>(null);
  const [modalTab, setModalTab] = useState<"minutes" | "agenda">("minutes");
  const [isFullScreen, setIsFullScreen] = useState(false);

  // 編集モード管理
  const [isEditing, setIsEditing] = useState(false);
  const [editParticipants, setEditParticipants] = useState("");
  const [editMinutes, setEditMinutes] = useState<MinutesDetails | null>(null);
  const [editAgenda, setEditAgenda] = useState<AgendaDetails | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = currentUser.role === "admin";

  // 絞り込みフィルター（全スタッフが全部署の公開ログをオープンに参照可能）
  const filteredRecords = meetingRecords.filter((rec) => {
    if (filterDept !== "all" && rec.dept !== filterDept) return false;
    if (filterType !== "all" && rec.meetingType !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const content = `${rec.meetingDate} ${rec.dept} ${rec.meetingType} ${rec.participants} ${rec.agenda?.purpose || ""} ${rec.minutes?.summary || ""}`.toLowerCase();
      return content.includes(q);
    }
    return true;
  });

  // 手動で最新データを再同期
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncFromGSS();
      onRefresh();
      showToast("最新のデータを取得しました ✓");
    } catch (err: any) {
      showToast("取得エラー: " + err.message, "error");
    } finally {
      setIsSyncing(false);
    }
  };

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
    setIsEditing(false);
    setEditParticipants(rec.participants || "");
    setEditMinutes(rec.minutes ? { ...rec.minutes } : null);
    setEditAgenda(
      rec.agenda
        ? {
            ...rec.agenda,
            agenda_items: formatAgendaItemsText(rec.agenda.agenda_items),
          }
        : null
    );
  };

  const handleStartEdit = async () => {
    if (!selectedRecord) return;
    setIsSyncing(true);
    try {
      const latestList = await syncFromGSS();
      const latest = latestList.find((r) => r.id === selectedRecord.id) || selectedRecord;
      setSelectedRecord(latest);
      setEditParticipants(latest.participants || "");
      setEditMinutes(latest.minutes ? { ...latest.minutes } : null);
      setEditAgenda(
        latest.agenda
          ? {
              ...latest.agenda,
              agenda_items: formatAgendaItemsText(latest.agenda.agenda_items),
            }
          : null
      );
      setIsEditing(true);
    } catch (err) {
      setIsEditing(true);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCancelEdit = () => {
    if (!selectedRecord) return;
    setEditParticipants(selectedRecord.participants || "");
    setEditMinutes(selectedRecord.minutes ? { ...selectedRecord.minutes } : null);
    setEditAgenda(
      selectedRecord.agenda
        ? {
            ...selectedRecord.agenda,
            agenda_items: formatAgendaItemsText(selectedRecord.agenda.agenda_items),
          }
        : null
    );
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    if (!selectedRecord) return;
    setIsSaving(true);

    try {
      if (modalTab === "minutes" && editMinutes) {
        const res = saveMinutesRecord({
          recordId: selectedRecord.id,
          meetingDate: selectedRecord.meetingDate,
          dept: selectedRecord.dept,
          meetingType: selectedRecord.meetingType,
          participants: editParticipants,
          minutes: editMinutes,
          createdById: selectedRecord.createdById,
          version: selectedRecord.version,
        });

        if (res.success) {
          setSelectedRecord(res.data);
          setIsEditing(false);
          showToast("議事録を保存しました ✓", "success");
          onRefresh();
        } else {
          showToast("保存エラー: " + (res.error || res.message), "error");
        }
      } else if (modalTab === "agenda" && editAgenda) {
        const res = saveAgendaRecord({
          id: selectedRecord.id,
          meetingDate: selectedRecord.meetingDate,
          dept: selectedRecord.dept,
          meetingType: selectedRecord.meetingType,
          participants: editParticipants,
          duration: selectedRecord.duration,
          userTopics: selectedRecord.userTopics,
          agenda: {
            ...editAgenda,
            agenda_items: formatAgendaItemsText(editAgenda.agenda_items),
          },
          createdById: selectedRecord.createdById,
        });

        if (res.success) {
          setSelectedRecord(res.data);
          setIsEditing(false);
          showToast("アジェンダを保存しました ✓", "success");
          onRefresh();
        } else {
          showToast("保存エラー: " + res.error, "error");
        }
      }
    } catch (err: any) {
      showToast("保存処理中にエラーが発生しました: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ログ一覧 使い方アコーディオン */}
      <FeatureHelpAccordion
        title="💡 会議録一覧（ログ）の使い方・3つの活用ポイント"
        items={[
          {
            label: "① 閲覧・再編集",
            text: "一覧の行をクリックすると詳細モーダルが開き、アジェンダ・議事録の全内容を確認できます。「編集」ボタンを押すと内容の修正や追記・再保存が可能です。",
          },
          {
            label: "② スピーディな共有・出力",
            text: "「LINE WORKS用コピー」で要約を即座にチャット送信でき、「Word保存」で公式文書（.docx）をダウンロードできます。「Googleカレンダーに登録」も可能です。",
          },
          {
            label: "③ リアルタイム同期",
            text: "右上の「最新の情報に更新」ボタンを押すと、スプレッドシートや他スタッフの更新内容が即座に同期されます。",
          },
        ]}
      />

      {/* フィルタ & 検索バー & 再同期ボタン */}
      <div className="bg-[#f4f6f8] rounded-2xl p-4 shadow-sm border border-slate-300/80 flex flex-wrap items-center gap-3 no-print">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="キーワード・参加者・内容で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm outline-none focus:border-slate-600 transition"
          />
        </div>

        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm outline-none focus:border-slate-600 transition font-medium"
        >
          <option value="all">すべての事業所・部署</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm outline-none focus:border-slate-600 transition font-medium"
        >
          <option value="all">すべての会議種別</option>
          {DEFAULT_MEETING_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {/* 最新データ再取得ボタン */}
        <button
          type="button"
          onClick={handleManualSync}
          disabled={isSyncing}
          className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 transition border border-slate-300 shadow-2xs"
          title="最新の情報を再取得"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-slate-800" : "text-slate-600"}`} />
          <span>{isSyncing ? "更新中..." : "最新の情報に更新"}</span>
        </button>
      </div>

      {/* ログ一覧テーブル */}
      <div className="bg-[#f4f6f8] rounded-2xl shadow-sm border border-slate-300/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
            <Table className="w-4 h-4 text-slate-700" />
            アジェンダ・議事録 ログ一覧（{filteredRecords.length}件）
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-[#283136] text-white font-bold text-xs sm:text-sm">
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
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" /> 議事録完了
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200">
                            アジェンダのみ
                          </span>
                        )}
                      </td>
                      {/* アジェンダ列 */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {rec.agenda ? (
                          <button
                            onClick={() => openModal(rec, "agenda")}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold transition shadow-xs"
                          >
                            表示・編集
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
                            className="px-2.5 py-1 bg-[#283136] hover:bg-[#1c2226] text-white rounded-lg text-xs font-bold transition shadow-xs"
                          >
                            表示・編集
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

      {/* ── 詳細閲覧・編集モーダル（外側クリックで閉じる対応） ── */}
      {selectedRecord && (
        <div
          onClick={() => {
            if (isEditing && !confirm("編集中の内容を破棄して閉じますか？")) return;
            setSelectedRecord(null);
            setIsEditing(false);
          }}
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
                  <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                    <span>{modalTab === "minutes" ? "議事録確認・編集" : "事前アジェンダ確認・編集"}</span>
                    {isEditing && (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-bold rounded">
                        編集中
                      </span>
                    )}
                    <span className="text-xs sm:text-sm font-normal text-slate-300">
                      ｜ {selectedRecord.dept} {selectedRecord.meetingType}
                    </span>
                  </h3>
                  <div className="text-xs text-slate-300 mt-0.5 flex items-center gap-3">
                    <span>📅 開催日: {formatJPDate(selectedRecord.meetingDate)}</span>
                    {!isEditing ? (
                      <span>👥 参加者: {selectedRecord.participants || "未指定"}</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span>👥 参加者:</span>
                        <input
                          type="text"
                          value={editParticipants}
                          onChange={(e) => setEditParticipants(e.target.value)}
                          className="bg-white/20 border border-white/30 rounded px-2 py-0.5 text-xs sm:text-sm text-white outline-none focus:bg-white/30"
                          placeholder="参加者名"
                        />
                      </div>
                    )}
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
                  onClick={() => {
                    if (isEditing && !confirm("編集中の内容を破棄して閉じますか？")) return;
                    setSelectedRecord(null);
                    setIsEditing(false);
                  }}
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
                  onClick={() => {
                    if (isEditing && !confirm("タブを切り替えると編集内容がリセットされます。切り替えますか？")) return;
                    setModalTab("minutes");
                    setIsEditing(false);
                  }}
                  className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition ${
                    modalTab === "minutes"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  📝 議事録を見る・編集
                </button>
                <button
                  onClick={() => {
                    if (isEditing && !confirm("タブを切り替えると編集内容がリセットされます。切り替えますか？")) return;
                    setModalTab("agenda");
                    setIsEditing(false);
                  }}
                  className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition ${
                    modalTab === "agenda"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  📋 事前アジェンダを見る・編集
                </button>
              </div>
            )}

            {/* モーダル本文（閲覧 / 編集モード） */}
            <div className="p-6 overflow-y-auto space-y-4 text-sm sm:text-base leading-relaxed text-slate-800 bg-white">
              {modalTab === "minutes" && (selectedRecord.minutes || editMinutes) && (
                <div className="space-y-4">
                  {/* 1. 会議要約 */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5 pb-1 border-b border-slate-200 text-xs sm:text-sm">
                      📌 1. 会議要約（ハイライト）
                    </div>
                    {!isEditing ? (
                      <p className="whitespace-pre-wrap text-slate-700 leading-relaxed font-sans text-sm sm:text-base">
                        {selectedRecord.minutes?.summary}
                      </p>
                    ) : (
                      <textarea
                        rows={4}
                        value={editMinutes?.summary || ""}
                        onChange={(e) =>
                          setEditMinutes({ ...(editMinutes || selectedRecord.minutes!), summary: e.target.value })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm sm:text-base outline-none focus:ring-2 focus:ring-slate-500/20 leading-relaxed"
                      />
                    )}
                  </div>

                  {/* 2. 議論内容・経緯 */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5 pb-1 border-b border-slate-200 text-xs sm:text-sm">
                      <MessageSquare className="w-4 h-4 text-slate-600" />
                      💡 2. 議論内容・経緯（各議題ごとの発言・流れ）
                    </div>
                    {!isEditing ? (
                      <p className="whitespace-pre-wrap font-mono text-slate-700 leading-relaxed text-sm sm:text-base">
                        {selectedRecord.minutes?.discussions ||
                          [selectedRecord.minutes?.agenda_items, selectedRecord.minutes?.key_discussions]
                            .filter(Boolean)
                            .join("\n\n")}
                      </p>
                    ) : (
                      <textarea
                        rows={8}
                        value={
                          editMinutes?.discussions ||
                          [editMinutes?.agenda_items, editMinutes?.key_discussions].filter(Boolean).join("\n\n") ||
                          ""
                        }
                        onChange={(e) =>
                          setEditMinutes({ ...(editMinutes || selectedRecord.minutes!), discussions: e.target.value })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm sm:text-base outline-none focus:ring-2 focus:ring-slate-500/20 leading-relaxed font-mono"
                      />
                    )}
                  </div>

                  {/* 3. 決定事項・ToDo */}
                  <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl border-l-4 border-l-slate-700">
                    <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5 pb-1 border-b border-slate-200 text-xs sm:text-sm">
                      <ListTodo className="w-4 h-4 text-slate-700" />
                      ✨ 3. 決定事項・ToDo（担当・期日）
                    </div>
                    {!isEditing ? (
                      <p className="whitespace-pre-wrap font-mono text-slate-800 leading-relaxed font-medium text-sm sm:text-base">
                        {selectedRecord.minutes?.action_plans}
                      </p>
                    ) : (
                      <textarea
                        rows={6}
                        value={editMinutes?.action_plans || ""}
                        onChange={(e) =>
                          setEditMinutes({ ...(editMinutes || selectedRecord.minutes!), action_plans: e.target.value })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm sm:text-base outline-none focus:ring-2 focus:ring-slate-500/20 leading-relaxed font-mono font-medium"
                      />
                    )}
                  </div>

                  {/* 4. 次回検討・特記事項 */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5 pb-1 border-b border-slate-200 text-xs sm:text-sm">
                      <Calendar className="w-4 h-4 text-slate-600" />
                      📅 4. 次回検討・特記事項（宿題・理念・助言）
                    </div>
                    {!isEditing ? (
                      <p className="whitespace-pre-wrap text-slate-700 leading-relaxed text-sm sm:text-base">
                        {selectedRecord.minutes?.next_steps ||
                          [
                            selectedRecord.minutes?.culture_notes,
                            selectedRecord.minutes?.next_agenda,
                            selectedRecord.minutes?.facilitator_feedback,
                          ]
                            .filter(Boolean)
                            .join("\n\n")}
                      </p>
                    ) : (
                      <textarea
                        rows={5}
                        value={
                          editMinutes?.next_steps ||
                          [
                            editMinutes?.culture_notes,
                            editMinutes?.next_agenda,
                            editMinutes?.facilitator_feedback,
                          ]
                            .filter(Boolean)
                            .join("\n\n") ||
                          ""
                        }
                        onChange={(e) =>
                          setEditMinutes({ ...(editMinutes || selectedRecord.minutes!), next_steps: e.target.value })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm sm:text-base outline-none focus:ring-2 focus:ring-slate-500/20 leading-relaxed"
                      />
                    )}
                  </div>
                </div>
              )}

              {modalTab === "agenda" && (selectedRecord.agenda || editAgenda) && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5 pb-1 border-b border-slate-200 text-xs sm:text-sm">
                      <Target className="w-4 h-4 text-slate-600" />
                      🎯 目的（Purpose）
                    </div>
                    {!isEditing ? (
                      <p className="whitespace-pre-wrap text-slate-700 leading-relaxed text-sm sm:text-base">{selectedRecord.agenda?.purpose}</p>
                    ) : (
                      <textarea
                        rows={2}
                        value={editAgenda?.purpose || ""}
                        onChange={(e) =>
                          setEditAgenda({ ...(editAgenda || selectedRecord.agenda!), purpose: e.target.value })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm sm:text-base outline-none focus:ring-2 focus:ring-slate-500/20 leading-relaxed"
                      />
                    )}
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5 pb-1 border-b border-slate-200 text-xs sm:text-sm">
                      <FileCheck className="w-4 h-4 text-slate-600" />
                      🏁 達成したい成果（Outcome）
                    </div>
                    {!isEditing ? (
                      <p className="whitespace-pre-wrap text-slate-700 leading-relaxed text-sm sm:text-base">{selectedRecord.agenda?.outcome}</p>
                    ) : (
                      <textarea
                        rows={2}
                        value={editAgenda?.outcome || ""}
                        onChange={(e) =>
                          setEditAgenda({ ...(editAgenda || selectedRecord.agenda!), outcome: e.target.value })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm sm:text-base outline-none focus:ring-2 focus:ring-slate-500/20 leading-relaxed"
                      />
                    )}
                  </div>

                  {(selectedRecord.agenda?.review || isEditing) && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5 pb-1 border-b border-slate-200 text-xs sm:text-sm">
                        <RotateCcw className="w-4 h-4 text-slate-600" />
                        🔄 前回の振り返り
                      </div>
                      {!isEditing ? (
                        <p className="whitespace-pre-wrap text-slate-700 leading-relaxed text-sm sm:text-base">{selectedRecord.agenda?.review}</p>
                      ) : (
                        <textarea
                          rows={2}
                          value={editAgenda?.review || ""}
                          onChange={(e) =>
                            setEditAgenda({ ...(editAgenda || selectedRecord.agenda!), review: e.target.value })
                          }
                          className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm sm:text-base outline-none focus:ring-2 focus:ring-slate-500/20 leading-relaxed"
                        />
                      )}
                    </div>
                  )}

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5 pb-1 border-b border-slate-200 text-xs sm:text-sm">
                      📋 各議題の詳細
                    </div>
                    {!isEditing ? (
                      <p className="whitespace-pre-wrap font-mono text-slate-700 leading-relaxed text-sm sm:text-base">
                        {formatAgendaItemsText(selectedRecord.agenda?.agenda_items)}
                      </p>
                    ) : (
                      <textarea
                        rows={8}
                        value={editAgenda?.agenda_items || ""}
                        onChange={(e) =>
                          setEditAgenda({ ...(editAgenda || selectedRecord.agenda!), agenda_items: e.target.value })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm sm:text-base outline-none focus:ring-2 focus:ring-slate-500/20 leading-relaxed font-mono"
                      />
                    )}
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5 pb-1 border-b border-slate-200 text-xs sm:text-sm">
                      🏁 クロージング
                    </div>
                    {!isEditing ? (
                      <p className="whitespace-pre-wrap text-slate-700 leading-relaxed text-sm sm:text-base">{selectedRecord.agenda?.closing}</p>
                    ) : (
                      <textarea
                        rows={2}
                        value={editAgenda?.closing || ""}
                        onChange={(e) =>
                          setEditAgenda({ ...(editAgenda || selectedRecord.agenda!), closing: e.target.value })
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm sm:text-base outline-none focus:ring-2 focus:ring-slate-500/20 leading-relaxed"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* フッターアクションバー */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <button
                    onClick={handleStartEdit}
                    disabled={isSyncing}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Edit3 className="w-4 h-4" /> 編集する
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 transition shadow-sm"
                    >
                      {isSaving ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          保存中...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" /> 変更を保存
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition"
                    >
                      キャンセル
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {modalTab === "minutes" && selectedRecord.minutes && !isEditing && (
                  <button
                    onClick={() => {
                      const text = getChatSummaryText(selectedRecord);
                      navigator.clipboard.writeText(text);
                      showToast("LINE WORKS / チャット用要約をコピーしました 📢");
                    }}
                    className="px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Share2 className="w-4 h-4" /> LINE WORKS用コピー
                  </button>
                )}
                {modalTab === "agenda" && selectedRecord.agenda && !isEditing && (
                  <button
                    onClick={() => {
                      const url = getGoogleCalendarUrl({
                        title: `${selectedRecord.dept} ${selectedRecord.meetingType}`,
                        meetingDate: selectedRecord.meetingDate,
                        duration: selectedRecord.duration,
                        dept: selectedRecord.dept,
                        meetingType: selectedRecord.meetingType,
                        details: `【目的】\n${selectedRecord.agenda?.purpose || ""}\n\n【各議題】\n${selectedRecord.agenda?.agenda_items || ""}`,
                      });
                      window.open(url, "_blank");
                    }}
                    className="px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 transition shadow-sm"
                  >
                    <CalendarPlus className="w-4 h-4" /> Googleカレンダーに登録
                  </button>
                )}
                <button
                  onClick={() => downloadMeetingDocx(selectedRecord)}
                  className="px-3.5 py-2 bg-[#283136] hover:bg-[#1c2226] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 transition shadow-sm"
                >
                  <Download className="w-4 h-4" /> Word保存
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
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 transition"
                >
                  <Copy className="w-4 h-4" /> 全文コピー
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 transition"
                >
                  <Printer className="w-4 h-4" /> 印刷
                </button>
                <button
                  onClick={() => {
                    if (isEditing && !confirm("編集中の内容を破棄して閉じますか？")) return;
                    setSelectedRecord(null);
                    setIsEditing(false);
                  }}
                  className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
