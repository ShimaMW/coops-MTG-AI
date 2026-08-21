export type UserRole = "admin" | "leader" | "staff";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  department: string;
  role: UserRole;
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

// アジェンダと議事録が紐づく統合レコード（事業所会議特化）
export interface MeetingRecord {
  id: string;
  meetingDate: string;
  dept: string;
  meetingType: string;
  participants: string; // テキスト入力（例: "佐藤、田中、高橋"）
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
