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
  summary: string; // 1. 会議要約
  discussions: string; // 2. 議論内容・経緯
  action_plans: string; // 3. 決定事項・ToDo（担当・期日）
  next_steps: string; // 4. 次回検討・特記事項
  // 互換性維持
  agenda_items?: string;
  key_discussions?: string;
  culture_notes?: string;
  next_agenda?: string;
  facilitator_feedback?: string;
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
