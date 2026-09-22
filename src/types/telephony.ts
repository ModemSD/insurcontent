// Types for Quo (OpenPhone) API & Calls Analytics

export interface QuoUser {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phoneNumbers?: string[];
  role?: string;
}

export interface QuoCallParticipant {
  phoneNumber?: string;
  userId?: string;
  name?: string;
}

export interface QuoCall {
  id: string;
  direction: 'inbound' | 'outbound';
  status: 'completed' | 'missed' | 'voicemail' | 'cancelled';
  duration: number; // in seconds
  createdAt: string;
  completedAt?: string;
  from: string;
  to: string;
  userId?: string;
  userName?: string;
  phoneNumberId?: string;
  recordingUrl?: string;
  hasRecording?: boolean;
}

export interface TranscriptUtterance {
  speaker: 'agent' | 'customer';
  speakerName?: string;
  text: string;
  start?: number; // seconds
  end?: number;
}

export interface CallScorecard {
  greeting: number; // 0-10
  needsDiscovery: number; // 0-10
  objectionHandling: number; // 0-10
  closingAndNextStep: number; // 0-10
  politeness: number; // 0-10
}

export interface CallAnalysisResult {
  callId: string;
  score: number; // 0-100 overall
  sentiment: 'positive' | 'neutral' | 'negative';
  summary: string;
  keyPoints: string[];
  agreements: string[];
  managerStrengths: string[];
  managerMistakes: string[];
  actionItems: string[];
  scorecard: CallScorecard;
  transcript: TranscriptUtterance[];
}

export interface ManagerPerformance {
  userId: string;
  name: string;
  email?: string;
  totalCalls: number;
  completedCalls: number;
  missedCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  answeredOutboundCalls: number; // Отвеченные человеком при исходящем наборе
  outboundCallThroughRate: number; // % дозвона по исходящим (answeredOutbound / outboundCalls * 100)
  overallCallThroughRate: number; // % успешного соединения от всех звонков
  totalDurationMinutes: number;
  averageDurationMinutes: number;
  averageScore: number;
  scoresCount: number;
}
