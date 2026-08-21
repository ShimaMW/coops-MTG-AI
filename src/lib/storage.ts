import { MeetingRecord, MasterData, UserProfile, AgendaDetails, MinutesDetails } from "./types";

const MASTER_STORAGE_KEY = "coops_master_data_v2";
const MEETINGS_STORAGE_KEY = "coops_meetings_data_v2";
const CURRENT_USER_KEY = "coops_current_user_v2";

export const DEFAULT_MASTER_DATA: MasterData = {
  departments: [
    "訪問介護",
    "通所介護（デイサービス）",
    "居宅介護支援",
    "看護リハビリ",
    "総務・管理本部",
  ],
  meetingTypes: [
    { id: "1", name: "月次定例ミーティング", desc: "月に一度の全体・部門会議" },
    { id: "2", name: "日次終礼・引き継ぎ", desc: "毎日の終礼・業務引き継ぎ" },
    { id: "3", name: "利用者カンファレンス", desc: "利用者のケアプラン検討・担当者会議" },
    { id: "4", name: "看リハ合同ミーティング", desc: "看護師・リハビリ職の合同連携会議" },
    { id: "5", name: "研修・勉強会", desc: "スタッフのスキル向上・事例検討" },
    { id: "6", name: "緊急対応・インシデント検討", desc: "事故・急変時の振り返りと再発防止" },
    { id: "7", name: "リーダー・幹部会議", desc: "事業所運営・人事採用・経営戦略" },
  ],
  employees: [
    { id: "e1", dept: "訪問介護", name: "佐藤 健一", role: "サービス提供責任者" },
    { id: "e2", dept: "訪問介護", name: "鈴木 美咲", role: "ヘルパー" },
    { id: "e3", dept: "通所介護（デイサービス）", name: "高橋 誠", role: "管理者" },
    { id: "e4", dept: "通所介護（デイサービス）", name: "田中 陽子", role: "生活相談員" },
    { id: "e5", dept: "居宅介護支援", name: "渡辺 裕子", role: "主任ケアマネジャー" },
    { id: "e6", dept: "看護リハビリ", name: "伊藤 俊介", role: "理学療法士" },
    { id: "e7", dept: "看護リハビリ", name: "小林 直美", role: "看護師" },
    { id: "e8", dept: "総務・管理本部", name: "島田 幹事", role: "統括責任者" },
  ],
};

export const DEFAULT_CURRENT_USER: UserProfile = {
  id: "u_admin",
  email: "admin@coops.care",
  name: "島田（本部）",
  department: "総務・管理本部",
  role: "admin",
};

// ==========================================
// マスタデータ
// ==========================================
export function getMasterData(): MasterData {
  if (typeof window === "undefined") return DEFAULT_MASTER_DATA;
  const raw = localStorage.getItem(MASTER_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(DEFAULT_MASTER_DATA));
    return DEFAULT_MASTER_DATA;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return DEFAULT_MASTER_DATA;
  }
}

export function saveMasterData(data: MasterData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(data));
}

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
  participants: string[];
  clientName?: string;
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
        clientName: params.clientName,
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
    clientName: params.clientName,
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
// 議事録保存（アジェンダとの紐付け・ステータス更新・楽観的ロック）
// ==========================================
export function saveMinutesRecord(params: {
  recordId?: string; // 紐付けるアジェンダ/会議レコードのID
  meetingDate: string;
  dept: string;
  meetingType: string;
  participants: string[];
  clientName?: string;
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
      // 楽観的ロックチェック
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
        clientName: params.clientName,
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
        message: "既存のアジェンダに紐づけて議事録を保存しました ✓",
      };
    }
  }

  // 新規レコードとして作成
  record = {
    id: "rec_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    meetingDate: params.meetingDate,
    dept: params.dept,
    meetingType: params.meetingType,
    participants: params.participants,
    clientName: params.clientName,
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

// ==========================================
// 削除
// ==========================================
export function deleteMeetingRecord(id: string): void {
  const list = getMeetingRecords().filter((r) => r.id !== id);
  localStorage.setItem(MEETINGS_STORAGE_KEY, JSON.stringify(list));
}
