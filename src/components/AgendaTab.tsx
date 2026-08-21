"use client";

import React, { useState } from "react";
import { UserProfile, AgendaDetails } from "@/lib/types";
import { DEFAULT_DEPARTMENTS, DEFAULT_MEETING_TYPES, saveAgendaRecord } from "@/lib/storage";
import { formatJPDate, getGoogleCalendarUrl } from "@/lib/exportUtils";
import { FeatureHelpAccordion } from "./FeatureHelpAccordion";
import {
  Sparkles,
  Save,
  Copy,
  Printer,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Clock,
  Target,
  FileCheck,
  ArrowRight,
  CalendarPlus,
  Edit3,
} from "lucide-react";

interface AgendaTabProps {
  currentUser: UserProfile;
  onSaved: (createdId?: string) => void;
  onGoToMinutes?: (agendaId: string) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

const AGENDA_TEMPLATES = [
  {
    id: "teirei",
    name: "🏢 【月次定例】事業所全体・部門ミーティング",
    text: "【報告事項】\n・今月の稼働状況・利用者数・目標達成状況\n・ヒヤリハット・インシデント報告と傾向分析\n\n【検討・決定事項】\n・新規スタッフの同行・研修計画について\n・業務フロー見直し（申し送り手順・書類電子化）\n\n【その他・共有】\n・次回勉強会のテーマ検討\n・理念（クローバーイズム）に基づく現場実践の振り返り",
  },
  {
    id: "moushiokuri",
    name: "📋 【日次申し送り】業務引き継ぎ・日々の連携",
    text: "【本日の重要申し送り】\n・体調変化・特記のあった利用者様について\n・受診予定・送迎時間・サービス内容の変更点\n\n【スタッフ間業務連携】\n・本日のフォロー体制・業務分担\n・備品・衛生用品の在庫確認",
  },
  {
    id: "gyoumu",
    name: "💡 【業務ミーティング】業務改善・残業削減・ICT化",
    text: "【現状の課題】\n・記録作成や申し送りの時間短縮について\n・直行直帰やシフト調整の円滑化\n\n【改善アイデアの検討】\n・スマホ活用（音声入力・チャット報告）のルール決め\n・無駄な書類・転記作業の削減案\n\n【アクションプラン】\n・トライアル期間と担当者の選定",
  },
  {
    id: "conference",
    name: "👤 【利用者カンファレンス】状態変化・ケアプラン見直し",
    text: "【対象者情報・現状報告】\n・ADL（日常生活動作）・認知機能の変化について\n・主治医意見・看護リハビリからの評価\n\n【課題と支援方針の検討】\n・本人の希望・ご家族の意向のすり合わせ\n・ケアプランの変更ポイントと目標設定\n\n【決定事項】\n・各担当職種（看護・リハ・ヘルパー・ケアマネ）のアクション",
  },
  {
    id: "incident",
    name: "🚨 【事故・ヒヤリハット検討会】原因究明と再発防止",
    text: "【発生事象の時系列整理】\n・発生日時・場所・状況・初期対応の確認\n\n【要因分析（なぜなぜ分析）】\n・環境要因（床・動線・照明など）\n・人的要因（体調・手順・確認不足など）\n・組織的要因（引き継ぎ・人員体制）\n\n【具体的な再発防止策】\n・即時対応できる改善策\n・マニュアル更新と全職員への周知方法",
  },
  {
    id: "kansen",
    name: "🛡️ 【感染症対策委員会】衛生管理・マニュアル確認",
    text: "【衛生・感染状況の確認】\n・事業所内および地域での感染症流行状況\n・消毒液・PPE（防護具）の備蓄数確認\n\n【対策の徹底・見直し】\n・職員・利用者の健康チェック体制の再確認\n・陽性者・発熱者発生時の初動フロー確認\n\n【研修・周知】\n・手洗い・個人防護具着脱の職員ミニ研修計画",
  },
  {
    id: "gyakutai",
    name: "🕊️ 【身体拘束廃止・虐待防止委員会】権利擁護・研修",
    text: "【現場の実態把握・ヒアリング】\n・不適切なケアやスピーチロック（言葉の拘束）の有無\n・ストレスの高いケア場面の洗い出しとサポート策\n\n【事例検討】\n・対応に苦慮した事例の共有とポジティブなアプローチ検討\n\n【決定事項】\n・権利擁護マニュアルの周知と定期チェックシートの運用",
  },
  {
    id: "kanriha",
    name: "🩺 【看リハ合同ミーティング】看護・リハビリ連携",
    text: "【医療・リハ連携の重要ケース検討】\n・バイタル・服薬管理・皮膚トラブルの共有\n・リハビリプログラムの進捗と日常生活への反映\n\n【多職種協働の課題】\n・ケアマネ・ヘルパーへのフィードバック手順\n・緊急時対応手順のブラッシュアップ",
  },
  {
    id: "oneonone",
    name: "🤝 【1on1・個別面談】業務振り返り・キャリア支援",
    text: "【最近の業務の振り返り】\n・うまくいっていること・手応えを感じている業務\n・困っていること・不安や負担に感じている点\n\n【成長支援・目標設定】\n・今後挑戦したい分野・資格取得\n・事業所・上長に期待するサポート",
  },
];

export const AgendaTab: React.FC<AgendaTabProps> = ({
  currentUser,
  onSaved,
  onGoToMinutes,
  showToast,
}) => {
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  };

  const [meetingDate, setMeetingDate] = useState(getTodayStr());
  const [dept, setDept] = useState(currentUser.department || DEFAULT_DEPARTMENTS[0]);
  const [meetingType, setMeetingType] = useState(DEFAULT_MEETING_TYPES[0]);
  const [customMeetingType, setCustomMeetingType] = useState("");
  const [participants, setParticipants] = useState("");
  
  // 時間設定（シンプル一体型）
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [isManualDuration, setIsManualDuration] = useState(false);
  const [manualDurationText, setManualDurationText] = useState("");

  const [topics, setTopics] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [generatedAgenda, setGeneratedAgenda] = useState<AgendaDetails | null>(null);
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const effectiveMeetingType = meetingType === "その他" ? customMeetingType || "その他会議" : meetingType;

  // 所要時間の自動計算
  const calculateDurationMinutes = (start: string, end: string): string => {
    if (!start || !end) return "";
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return "";
    
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff < 0) diff += 24 * 60; // 日跨ぎ対応
    
    if (diff === 0) return "0分";
    if (diff < 60) return `${diff}分`;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`;
  };

  const currentDurationLabel = isManualDuration
    ? manualDurationText
    : `${startTime}〜${endTime}（${calculateDurationMinutes(startTime, endTime)}）`;

  // クイック所要時間ボタンが押されたとき（終了時刻を自動計算）
  const applyQuickDurationMinutes = (mins: number) => {
    setIsManualDuration(false);
    const [sh, sm] = startTime.split(":").map(Number);
    if (isNaN(sh) || isNaN(sm)) return;
    
    const totalMinutes = sh * 60 + sm + mins;
    const endH = Math.floor((totalMinutes / 60) % 24);
    const endM = totalMinutes % 60;
    
    const formattedEnd = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    setEndTime(formattedEnd);
  };

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

  // テンプレート選択
  const handleSelectTemplate = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    const tmpl = AGENDA_TEMPLATES.find((t) => t.id === tmplId);
    if (tmpl) {
      setTopics(tmpl.text);
      showToast(`「${tmpl.name.slice(0, 15)}...」を適用しました ✓`);
    }
  };

  const handleGenerate = async () => {
    if (!dept) {
      showToast("部署を選択してください", "error");
      return;
    }
    if (!effectiveMeetingType) {
      showToast("会議種別を入力してください", "error");
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
          meetingType: effectiveMeetingType,
          participants,
          duration: currentDurationLabel,
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
        meetingType: effectiveMeetingType,
        participants,
        duration: currentDurationLabel,
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
      `会議日: ${meetingDate}`,
      `部署: ${dept} / 種別: ${effectiveMeetingType}`,
      `参加者: ${participants || "（未指定）"}`,
      `所要時間: ${currentDurationLabel || "未定"}`,
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

  // Googleカレンダー登録リンク
  const handleOpenGoogleCalendar = () => {
    if (!generatedAgenda) return;
    const url = getGoogleCalendarUrl({
      title: `${dept} ${effectiveMeetingType}`,
      meetingDate,
      duration: currentDurationLabel,
      dept,
      meetingType: effectiveMeetingType,
      details: `【目的】\n${generatedAgenda.purpose}\n\n【各議題】\n${generatedAgenda.agenda_items}`,
    });
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* 入力フォーム */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-clover-700" />
          会議アジェンダの事前作成
        </h2>

        {/* 使い方アコーディオン */}
        <FeatureHelpAccordion
          title="💡 アジェンダ作成の使い方・活用ポイント"
          items={[
            {
              label: "事前準備",
              text: "議題テンプレートを選ぶか、話したいメモを入力して「AIアジェンダを生成する」を押すと、目的・達成成果・議題の確認ポイントが自動設計されます。",
            },
            {
              label: "時間設定",
              text: "開始・終了時間を選ぶと所要時間が自動計算されます。下の「30分」「1時間」ボタンで手軽に枠をセットすることも可能です。",
            },
            {
              label: "議事録連動",
              text: "保存したアジェンダは「アジェンダのみ」として履歴に残り、会議後にワンタップで議事録作成へ引き継げます。「Googleカレンダーに登録」も可能です。",
            },
          ]}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                  className="px-1.5 py-0.5 bg-clover-100 hover:bg-clover-200 text-clover-800 font-bold rounded text-[10px]"
                >
                  今日
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(1)}
                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px]"
                >
                  明日
                </button>
              </div>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="2026/8/21"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-clover-600 focus:bg-white transition"
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
                  <Calendar className="w-4 h-4 text-clover-700" />
                </button>
              </div>
            </div>
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

        {/* 会議種別 & 参加者 */}
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
            {meetingType === "その他" && (
              <input
                type="text"
                placeholder="会議種別名を入力（例: 業務改善検討会）"
                value={customMeetingType}
                onChange={(e) => setCustomMeetingType(e.target.value)}
                className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-clover-600 focus:bg-white transition"
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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-clover-600 focus:bg-white transition"
            />
          </div>
        </div>

        {/* ── 予定時間（すっきり一体型UI） ── */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-clover-700" />
              予定時間
            </label>
            <button
              type="button"
              onClick={() => {
                if (!isManualDuration) {
                  setManualDurationText(`${startTime}〜${endTime}`);
                }
                setIsManualDuration(!isManualDuration);
              }}
              className="text-[11px] text-clover-800 hover:text-clover-900 font-medium flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" />
              {isManualDuration ? "時間ピッカーに戻す" : "自由テキストで入力"}
            </button>
          </div>

          {isManualDuration ? (
            /* 自由テキストモード */
            <input
              type="text"
              placeholder="例：10:00〜11:30、または 1時間"
              value={manualDurationText}
              onChange={(e) => setManualDurationText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-clover-600 focus:bg-white transition"
            />
          ) : (
            /* 一体型タイムピッカー */
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500 font-medium">開始</span>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-800 outline-none focus:border-clover-600 transition"
                    />
                  </div>

                  <span className="text-slate-400 font-bold">〜</span>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500 font-medium">終了</span>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-800 outline-none focus:border-clover-600 transition"
                    />
                  </div>
                </div>

                {/* 自動計算された所要時間バッジ */}
                <div className="bg-clover-100 text-clover-900 border border-clover-300 font-bold text-xs px-3 py-1 rounded-full">
                  ⏱️ {calculateDurationMinutes(startTime, endTime)}
                </div>
              </div>

              {/* クイック所要時間ボタン */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">所要時間でセット:</span>
                {[
                  { label: "30分", mins: 30 },
                  { label: "45分", mins: 45 },
                  { label: "1時間", mins: 60 },
                  { label: "1.5時間", mins: 90 },
                  { label: "2時間", mins: 120 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => applyQuickDurationMinutes(item.mins)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition shadow-2xs"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 議題メモ（ドロップダウン式テンプレート選択付き） */}
        <div className="mb-5">
          <div className="mb-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              💡 介護事業所向け 議題テンプレート（ドロップダウンから選択可能）
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleSelectTemplate(e.target.value)}
              className="w-full bg-clover-50/70 border border-clover-300 rounded-xl px-3 py-2 text-xs md:text-sm text-clover-900 font-medium outline-none focus:ring-2 focus:ring-clover-500/20"
            >
              <option value="">― テンプレートを選択して議題に流し込む ―</option>
              {AGENDA_TEMPLATES.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.name}
                </option>
              ))}
            </select>
          </div>

          <label className="block text-xs font-bold text-slate-700 mb-1">
            📝 今回話したいこと・背景・議題メモ（自由に編集・追記可能）
          </label>
          <textarea
            rows={5}
            placeholder="例：&#10;・今月のヒヤリハット報告（転倒リスクの再確認）&#10;・新スタッフ2名の同行スケジュール決定&#10;・送迎ルート見直しの進捗確認"
            value={topics}
            onChange={(e) => setTopics(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-clover-600 focus:bg-white transition leading-relaxed font-mono"
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
                作成中...
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

          {/* 達成成果 */}
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
              onClick={handleOpenGoogleCalendar}
              className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs md:text-sm rounded-xl flex items-center gap-2 transition"
            >
              <CalendarPlus className="w-4 h-4" /> Googleカレンダーに登録
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
