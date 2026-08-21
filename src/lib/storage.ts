import { MeetingRecord, UserProfile, AgendaDetails, MinutesDetails } from "./types";

const MEETINGS_STORAGE_KEY = "coops_meetings_data_v3";
const CURRENT_USER_KEY = "coops_current_user_v3";

export const DEFAULT_DEPARTMENTS = [
  "訪問介護",
  "通所介護（デイサービス）",
  "居宅介護支援",
  "看護リハビリ",
  "総務・管理本部",
];

export const DEFAULT_MEETING_TYPES = [
  "月次定例ミーティング",
  "日次終礼・引き継ぎ",
  "看リハ合同ミーティング",
  "リーダー・幹部会議",
  "研修・勉強会",
  "緊急対応・インシデント検討",
];

export const DEFAULT_CURRENT_USER: UserProfile = {
  id: "u_admin",
  email: "admin@coops.care",
  name: "島田（本部）",
  department: "総務・管理本部",
  role: "admin",
};

// ==========================================
// ユーザー情報
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
// 会議レコード一覧（アジェンダ ＆ 議事録統合）
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

  localStorage.setItem(MEETINGS_STORAGE_KEY, JSON.stringify(list));
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
// 議事録保存（アジェンダ紐付け & 楽観的ロック）
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
      localStorage.setItem(MEETINGS_STORAGE_KEY, JSON.stringify(list));
      return {
        success: true,
        data: record,
        message: "事前アジェンダに紐づけて議事録を保存しました ✓",
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
  localStorage.setItem(MEETINGS_STORAGE_KEY, JSON.stringify(list));
  return {
    success: true,
    data: record,
    message: "議事録を新規保存しました ✓",
  };
}

export function deleteMeetingRecord(id: string): void {
  const list = getMeetingRecords().filter((r) => r.id !== id);
  localStorage.setItem(MEETINGS_STORAGE_KEY, JSON.stringify(list));
}
