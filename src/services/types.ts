

export type UserRole = 'student' | 'reviewer' | 'admin' | 'room';

export const SECTORS = [
  'Consulting',
  'Finance',
  'Marketing',
  'General Management',
  'Product Management',
  'Operations'
] as const;

export type Sector = typeof SECTORS[number];

export interface Room {
  id: string;
  name: string;
  // Credentials generated for the room account
  loginEmail?: string; 
  loginPassword?: string;
  linkedUserId?: string;
}

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  phone?: string;
  rollNo?: string; // Only for students
  password?: string; // In real app, hashed. Here, plain for mock.
  assignedRoomId?: string; // Only for reviewers
  
  // Security Fields
  failedLoginAttempts?: number;
  lockoutUntil?: number; // Timestamp
}

export interface StudentPreferences {
  uid: string;
  p1: Sector | '';
  p2: Sector | '';
  p3: Sector | '';
  p4: Sector | '';
}

// Reviewer now has one sector and a list of time strings
export interface ReviewerAvailability {
  uid: string;
  sector: Sector | '';
  slots: string[]; // e.g. ["09:00", "09:20"]
}

export interface Config {
  studentRegistrationStart: string;
  studentRegistrationEnd: string;
  reviewerRegistrationStart: string;
  reviewerRegistrationEnd: string;
  roomBuffer: number;
  isSchedulePublished: boolean;
}

export type AttendanceStatus = 'pending' | 'present' | 'late' | 'absent';

export interface ReviewFeedback {
  formatting: number; // 1-10
  alignment: number; // 1-10
  balance: number; // 1-10
  highlighting: number; // 1-10
  qualityOfPoints: number; // 1-10
  comments?: string;
  submittedAt: string;
}

export interface ScheduleItem {
  studentId: string;
  studentName: string;
  studentRoll: string;
  reviewerId: string;
  reviewerName: string;
  time: string;
  sector: Sector;
  roomName?: string;
  preferenceRank?: 'P1' | 'P2' | 'P3' | 'P4'; // Track which preference was matched
  attendance?: AttendanceStatus;
  feedback?: ReviewFeedback;
}

export interface AuditIssue {
  type: 'error' | 'warning' | 'success';
  message: string;
  entityId?: string;
  entityName?: string;
}

export interface MasterStudent {
  rollNo: string;
  name: string;
  email: string;
}

export type TrackingStatus = 'not_registered' | 'registered_no_prefs' | 'complete';

export interface StudentTrackingStatus {
  student: MasterStudent;
  status: TrackingStatus;
  registeredUser?: User;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  actorUid: string;
  actorName: string;
  actorRole: string;
  action: string;
  details?: string;
}