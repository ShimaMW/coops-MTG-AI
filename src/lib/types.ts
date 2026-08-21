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

export interface AgendaDetails {
  title: string;
  purpose: string;
  outcome: string;
  review?: string;
  agenda_items: string;
  closing: string;
  full_text: string;
}

export interface MinutesDetails {
  inputText?: string;
  audioFileName?: string;
  transcript?: string;
  summary: string;
  agenda_items: string;
  key_discussions: string;
  action_plans: string;
  culture_notes: string;
  next_agenda: string;
  facilitator_feedback: string;
}

// アジェンダと議事録が紐づく統合レコード
export interface MeetingRecord {
  id: string;
  meetingDate: string;
  dept: string;
  meetingType: string;
  participants: string[];
  clientName?: string;
  duration?: string;
  userTopics?: string;
  
  agenda?: AgendaDetails;
  agendaCreatedAt?: string;

  minutes?: MinutesDetails;
  minutesCreatedAt?: string;

  status: "agenda_only" | "minutes_completed";
  version: number;
  createdAt: string;
  updatedAt: string;
  createdById?: string;
}

export interface MasterData {
  departments: string[];
  meetingTypes: MeetingType[];
  employees: Employee[];
}
