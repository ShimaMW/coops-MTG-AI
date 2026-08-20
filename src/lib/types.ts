export type UserRole = "admin" | "leader" | "staff";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  department: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface Employee {
  id: string;
  dept: string;
  name: string;
  role: string;
}

export interface MeetingType {
  id: string;
  name: string;
  desc: string;
}

export interface AgendaData {
  id: string;
  meetingDate: string;
  dept: string;
  meetingType: string;
  participants: string[];
  clientName?: string;
  duration?: string;
  topics: string;
  title: string;
  purpose: string;
  outcome: string;
  review?: string;
  agenda_items: string;
  closing: string;
  full_text: string;
  createdAt: string;
  updatedAt: string;
  createdById?: string;
}

export interface MinutesData {
  id: string;
  agendaRecordId?: string;
  meetingDate: string;
  dept: string;
  meetingType: string;
  participants: string[];
  clientName?: string;
  inputText?: string;
  audioFileUri?: string;
  audioFileName?: string;
  transcript?: string; // 完全文字起こし
  summary: string;     // 全体要約
  agenda_items: string;// 議題と振り返り
  key_discussions: string; // 主な議論・発言
  action_plans: string;    // 決定事項・ToDo
  culture_notes: string;   // 組織文化・理念
  next_agenda: string;     // 次回の検討事項
  facilitator_feedback: string; // AI評価・アドバイス
  status: "draft" | "completed";
  createdAt: string;
  updatedAt: string;
  createdById?: string;
  version: number;
}

export interface MasterData {
  departments: string[];
  meetingTypes: MeetingType[];
  employees: Employee[];
}
