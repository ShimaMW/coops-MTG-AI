import { AgendaData, MinutesData, MasterData, UserProfile } from "./types";

const MASTER_STORAGE_KEY = "coops_master_data_v1";
const AGENDA_STORAGE_KEY = "coops_agenda_data_v1";
const MINUTES_STORAGE_KEY = "coops_minutes_data_v1";
const CURRENT_USER_KEY = "coops_current_user_v1";

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
// ユーザー情報 & 権限
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
// アジェンダ
// ==========================================
export function getAgendas(): AgendaData[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(AGENDA_STORAGE_KEY);
  if (!raw) return [];
  try {
    const list: AgendaData[] = JSON.parse(raw);
    return list.sort((a, b) => b.meetingDate.localeCompare(a.meetingDate));
  } catch {
    return [];
  }
}

export function saveAgendaItem(item: Omit<AgendaData, "id" | "createdAt" | "updatedAt"> & { id?: string }): AgendaData {
  const list = getAgendas();
  const now = new Date().toISOString();
  let saved: AgendaData;

  if (item.id) {
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx >= 0) {
      saved = {
        ...list[idx],
        ...item,
        updatedAt: now,
      } as AgendaData;
      list[idx] = saved;
    } else {
      saved = {
        ...item,
        id: item.id,
        createdAt: now,
        updatedAt: now,
      } as AgendaData;
      list.push(saved);
    }
  } else {
    saved = {
      ...item,
      id: "ag_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      createdAt: now,
      updatedAt: now,
    } as AgendaData;
    list.unshift(saved);
  }

  localStorage.setItem(AGENDA_STORAGE_KEY, JSON.stringify(list));
  return saved;
}

export function deleteAgendaItem(id: string): void {
  const list = getAgendas().filter((x) => x.id !== id);
  localStorage.setItem(AGENDA_STORAGE_KEY, JSON.stringify(list));
}

// ==========================================
// 議事録（楽観的ロック・競合防止付き）
// ==========================================
export function getMinutesList(): MinutesData[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(MINUTES_STORAGE_KEY);
  if (!raw) return [];
  try {
    const list: MinutesData[] = JSON.parse(raw);
    return list.sort((a, b) => b.meetingDate.localeCompare(a.meetingDate));
  } catch {
    return [];
  }
}

export function saveMinutesItem(
  item: Omit<MinutesData, "id" | "createdAt" | "updatedAt" | "version"> & { id?: string; version?: number }
): { success: boolean; data?: MinutesData; error?: string } {
  const list = getMinutesList();
  const now = new Date().toISOString();
  let saved: MinutesData;

  if (item.id) {
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx >= 0) {
      const current = list[idx];
      // 楽観的ロック：バージョンチェック
      if (item.version !== undefined && item.version !== current.version) {
        return {
          success: false,
          error: "他のユーザーまたは別タブによってデータが更新されています。最新データを読み込み直してください。",
        };
      }
      saved = {
        ...current,
        ...item,
        version: (current.version || 1) + 1,
        updatedAt: now,
      } as MinutesData;
      list[idx] = saved;
    } else {
      saved = {
        ...item,
        id: item.id,
        version: 1,
        createdAt: now,
        updatedAt: now,
      } as MinutesData;
      list.push(saved);
    }
  } else {
    saved = {
      ...item,
      id: "min_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      version: 1,
      createdAt: now,
      updatedAt: now,
    } as MinutesData;
    list.unshift(saved);
  }

  localStorage.setItem(MINUTES_STORAGE_KEY, JSON.stringify(list));
  return { success: true, data: saved };
}

export function deleteMinutesItem(id: string): void {
  const list = getMinutesList().filter((x) => x.id !== id);
  localStorage.setItem(MINUTES_STORAGE_KEY, JSON.stringify(list));
}
