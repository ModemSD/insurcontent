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
  answeredAt?: string | null;
  answeredByHuman?: boolean; // Реально ответил ли живой человек, а не автоответчик
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

export type InsurvoiceCallType =
  | 'Auto'
  | 'Confirmation / Pre-Call'
  | 'Discovery'
  | 'Demo'
  | 'Discovery + Demo'
  | 'Follow-up / Close';

export type InsurvoiceScoreBand =
  | 'Strong'
  | 'Solid'
  | 'Needs Coaching'
  | 'Priority Focus';

export type InsurvoiceSectionId =
  | 'opening'
  | 'discovery'
  | 'pain'
  | 'demo'
  | 'objections'
  | 'close'
  | 'presence';

export type CheckpointResult = 'Y' | 'N' | 'N/A';

export interface EvaluatedCheckpoint {
  id: string; // '1.1' .. '7.3'
  sectionId: InsurvoiceSectionId;
  sectionTitle: string;
  title: string;
  titleEn: string;
  result: CheckpointResult;
  evidence: string;
}

export interface EvaluatedSection {
  id: InsurvoiceSectionId;
  title: string;
  shortTitle: string;
  weight: number;
  qualityRating: number; // 1-5
  checkpointsHit: number;
  checkpointsApplicable: number;
  sectionScore: number | null; // 0-100 percentage, or null if skipped/N/A
  rationale?: string;
}

export interface CallScorecard {
  greeting: number; // 0-10
  needsDiscovery: number; // 0-10
  objectionHandling: number; // 0-10
  closingAndNextStep: number; // 0-10
  politeness: number; // 0-10
  // Insurvoice Scorecard v1.0 fields
  rubricVersion?: string;
  callType?: InsurvoiceCallType;
  band?: InsurvoiceScoreBand;
  sections?: EvaluatedSection[];
  checkpoints?: EvaluatedCheckpoint[];
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
