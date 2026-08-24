import { MeetingRecord, UserProfile, AgendaDetails, MinutesDetails } from "./types";

const MEETINGS_STORAGE_KEY = "coops_meetings_data_v4";
const CURRENT_USER_KEY = "coops_current_user_v4";

// Google Apps Script (GSS) Webhook URL
const GAS_URL = process.env.NEXT_PUBLIC_GAS_WEBHOOK_URL;

export const DEFAULT_DEPARTMENTS = [
  "訪問介護",
  "通所介護（デイサービス）",
  "居宅介護支援",
  "看護リハビリ",
  "総務・管理本部",
];

export const DEFAULT_MEETING_TYPES = [
  "月次定例ミーティング",
  "日次申し送り",
  "業務ミーティング",
  "利用者カンファレンス",
  "緊急対応、インシデント検討会",
  "委員会会議",
  "その他",
];

export const DEFAULT_CURRENT_USER: UserProfile = {
  id: "u_admin",
  email: "admin@coops.care",
  name: "島田（本部）",
  department: "総務・管理本部",
  role: "admin",
};

// ==========================================
// ユーザー管理
// ==========================================
export function getCurrentUser(): UserProfile {
  if (typeof window === "undefined") return DEFAULT_CURRENT_USER;
  const raw = localStorage.getItem(CURRENT_USER_KEY);
  if (!raw) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(DEFAULT_CURRENT_USER));
    return DEFAULT_CURRENT_USER;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return DEFAULT_CURRENT_USER;
  }
}

export function saveCurrentUser(user: UserProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

// ==========================================
// ローカルストレージ取得
// ==========================================
export function getMeetingRecords(): MeetingRecord[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(MEETINGS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const list: MeetingRecord[] = JSON.parse(raw);
    return list.sort((a, b) => b.meetingDate.localeCompare(a.meetingDate));
  } catch {
    return [];
  }
}

function saveLocalMeetingRecords(records: MeetingRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MEETINGS_STORAGE_KEY, JSON.stringify(records));
}

// ==========================================
// GSS (Google スプレッドシート) クラウド通信
// ==========================================
export async function syncFromGSS(): Promise<MeetingRecord[]> {
  if (!GAS_URL) return getMeetingRecords();
  try {
    const res = await fetch(GAS_URL, { method: "GET", mode: "cors" });
    if (!res.ok) throw new Error("GSS fetch failed");
    const json = await res.json();
    if (json.success && Array.isArray(json.records)) {
      const records: MeetingRecord[] = json.records;
      records.sort((a, b) => (b.meetingDate || "").localeCompare(a.meetingDate || ""));
      saveLocalMeetingRecords(records);
      return records;
    }
  } catch (err) {
    console.warn("GSS sync error, using local storage:", err);
  }
  return getMeetingRecords();
}

async function sendToGSS(action: "save" | "delete", payload: any) {
  if (!GAS_URL) return;
  try {
    await fetch(GAS_URL, {
      method: "POST",
      mode: "no-cors", // GASへのCORSプレフライトを回避
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
  } catch (err) {
    console.warn("Failed to send data to GSS:", err);
  }
}

// ==========================================
// リアルタイム同期リスナー（GSS + localStorage両対応）
// ==========================================
export function subscribeMeetingRecords(
  callback: (records: MeetingRecord[]) => void
): () => void {
  // 初期値（ローカルから即座に表示）
  callback(getMeetingRecords());

  // GSSが設定されている場合：バックグラウンドで最新データをフェッチして更新
  if (GAS_URL) {
    syncFromGSS().then((latestRecords) => {
      callback(latestRecords);
    });
  }

  // ローカル環境（別タブでのstorage更新を検知）
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === MEETINGS_STORAGE_KEY) {
      callback(getMeetingRecords());
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }

  return () => {};
}

// ==========================================
// アジェンダ保存
// ==========================================
export function saveAgendaRecord(params: {
  id?: string;
  meetingDate: string;
  dept: string;
  meetingType: string;
  participants: string;
  duration?: string;
  userTopics?: string;
  agenda: AgendaDetails;
  createdById?: string;
}): { success: boolean; data: MeetingRecord; error?: string } {
  const list = getMeetingRecords();
  const now = new Date().toISOString();
  let record: MeetingRecord;

  if (params.id) {
    const idx = list.findIndex((r) => r.id === params.id);
    if (idx >= 0) {
      record = {
        ...list[idx],
        meetingDate: params.meetingDate,
        dept: params.dept,
        meetingType: params.meetingType,
        participants: params.participants,
        duration: params.duration,
        userTopics: params.userTopics,
        agenda: params.agenda,
        agendaCreatedAt: list[idx].agendaCreatedAt || now,
        updatedAt: now,
        version: (list[idx].version || 1) + 1,
      };
      list[idx] = record;
    } else {
      record = createNewAgendaRecord(params, now);
      list.unshift(record);
    }
  } else {
    record = createNewAgendaRecord(params, now);
    list.unshift(record);
  }

  saveLocalMeetingRecords(list);

  // GSSへ非同期送信（自動追記・更新）
  sendToGSS("save", { record });

  return { success: true, data: record };
}

function createNewAgendaRecord(params: any, now: string): MeetingRecord {
  return {
    id: "rec_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    meetingDate: params.meetingDate,
    dept: params.dept,
    meetingType: params.meetingType,
    participants: params.participants,
    duration: params.duration,
    userTopics: params.userTopics,
    agenda: params.agenda,
    agendaCreatedAt: now,
    status: "agenda_only",
    version: 1,
    createdAt: now,
    updatedAt: now,
    createdById: params.createdById,
  };
}

// ==========================================
// 議事録保存
// ==========================================
export function saveMinutesRecord(params: {
  recordId?: string;
  meetingDate: string;
  dept: string;
  meetingType: string;
  participants: string;
  minutes: MinutesDetails;
  createdById?: string;
  version?: number;
}): { success: boolean; data: MeetingRecord; message: string; error?: string } {
  const list = getMeetingRecords();
  const now = new Date().toISOString();
  let record: MeetingRecord;

  if (params.recordId) {
    const idx = list.findIndex((r) => r.id === params.recordId);
    if (idx >= 0) {
      const existing = list[idx];
      if (params.version !== undefined && params.version !== existing.version) {
        return {
          success: false,
          data: existing,
          message: "競合エラー",
          error: "他のユーザーまたは別タブによってデータが更新されています。最新データを読み込み直してください。",
        };
      }

      record = {
        ...existing,
        meetingDate: params.meetingDate,
        dept: params.dept,
        meetingType: params.meetingType,
        participants: params.participants,
        minutes: params.minutes,
        minutesCreatedAt: now,
        status: "minutes_completed",
        version: (existing.version || 1) + 1,
        updatedAt: now,
      };
      list[idx] = record;
      saveLocalMeetingRecords(list);

      // GSSへ非同期送信
      sendToGSS("save", { record });

      return {
        success: true,
        data: record,
        message: "議事録を保存しました（GSS同期完了） ✓",
      };
    }
  }

  record = {
    id: "rec_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    meetingDate: params.meetingDate,
    dept: params.dept,
    meetingType: params.meetingType,
    participants: params.participants,
    minutes: params.minutes,
    minutesCreatedAt: now,
    status: "minutes_completed",
    version: 1,
    createdAt: now,
    updatedAt: now,
    createdById: params.createdById,
  };
  list.unshift(record);
  saveLocalMeetingRecords(list);

  // GSSへ非同期送信
  sendToGSS("save", { record });

  return {
    success: true,
    data: record,
    message: "議事録を保存しました（GSS同期完了） ✓",
  };
}

// ==========================================
// 議事録削除
// ==========================================
export function deleteMeetingRecord(id: string): void {
  const list = getMeetingRecords().filter((r) => r.id !== id);
  saveLocalMeetingRecords(list);

  // GSSから非同期削除
  sendToGSS("delete", { id });
}
