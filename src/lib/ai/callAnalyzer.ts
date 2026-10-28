import fs from 'fs';
import path from 'path';
import {
  CallAnalysisResult,
  EvaluatedCheckpoint,
  EvaluatedSection,
  InsurvoiceCallType,
  TranscriptUtterance,
} from '@/types/telephony';
import {
  calculateInsurvoiceScorecard,
  CALL_TYPE_WEIGHTS,
  INSURVOICE_CHECKPOINTS,
  INSURVOICE_RUBRIC_VERSION,
  INSURVOICE_SECTIONS,
} from './insurvoiceRubric';

export const CALL_SCORER_SKILL_PATH = path.join(
  process.cwd(),
  '.agent/skills/insurvoice-call-scorer/SKILL.md'
);

export function readCallScorerSkill(): string {
  try {
    if (fs.existsSync(CALL_SCORER_SKILL_PATH)) {
      return fs.readFileSync(CALL_SCORER_SKILL_PATH, 'utf8');
    }
  } catch (err) {
    console.warn('Failed to read SKILL.md:', err);
  }
  return '';
}

export function writeCallScorerSkill(content: string): void {
  const dir = path.dirname(CALL_SCORER_SKILL_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CALL_SCORER_SKILL_PATH, content, 'utf8');
}

const VOICEMAIL_PATTERNS = [
  'leave your message',
  'leave a message',
  'leave an additional message',
  'voice mail',
  'voicemail',
  'after the tone',
  'after the beep',
  'reply after the tone',
  'mailbox is full',
  'not available',
  'person is not available',
  'unavailable to take your call',
  'person you are trying to reach',
  'forwarded to an automated voice',
  'record your name and reason',
  'see if this person is available',
  'screening your call',
  'оставьте сообщение',
  'абонент временно недоступен',
  'после сигнала',
];

const SHORT_BOT_FILLERS = new Set([
  'hi',
  'hi.',
  'hello',
  'hello.',
  'thanks',
  'thanks.',
  'thank you',
  'thank you.',
  "i'm sorry",
  "i'm sorry.",
  'sorry',
  'sorry.',
  'one moment',
  'one moment.',
  'hold on',
  'please hold',
]);

/**
 * Checks whether a call is a voicemail, unanswered, or too short for a real sales evaluation.
 */
export function detectNonEvaluableCall(params: {
  transcript: TranscriptUtterance[];
  durationSeconds?: number;
  lang?: 'ru' | 'en';
}): { isNonEvaluable: boolean; reason: string } {
  const { transcript, durationSeconds, lang = 'ru' } = params;
  const isEn = lang === 'en';

  if (!transcript || transcript.length === 0) {
    return {
      isNonEvaluable: true,
      reason: isEn
        ? 'Call transcript is empty — no live conversation occurred or recording is missing.'
        : 'Стенограмма звонка пуста — разговор не состоялся или запись отсутствует.',
    };
  }

  const fullText = transcript.map((u) => u.text.trim()).join(' ');
  const lowerText = fullText.toLowerCase();

  const matchedVoicemail = VOICEMAIL_PATTERNS.some((pattern) => lowerText.includes(pattern));
  const agentUtterances = transcript.filter((u) => u.speaker === 'agent' && u.text.trim().length > 2);
  const customerUtterances = transcript.filter((u) => u.speaker === 'customer' && u.text.trim().length > 2);

  // Filter out customer utterances that are automated voicemail / AI call-screener prompts or short bot fillers ("Hi.", "Thanks.", "I'm sorry.")
  const humanCustomerUtterances = customerUtterances.filter((u) => {
    const uLower = u.text.trim().toLowerCase();
    if (SHORT_BOT_FILLERS.has(uLower)) return false;
    return !VOICEMAIL_PATTERNS.some((pattern) => uLower.includes(pattern));
  });

  const isAiScreener =
    lowerText.includes('record your name and reason') ||
    lowerText.includes('see if this person is available');

  if (matchedVoicemail && humanCustomerUtterances.length === 0) {
    const leftMessage = agentUtterances.length > 0;
    if (isAiScreener) {
      return {
        isNonEvaluable: true,
        reason: isEn
          ? leftMessage
            ? 'Call reached an AI Call Screener ("Record your name and reason for calling... This person is not available"), and the AE left a voice message. No live prospect conversation occurred — rubric scoring is N/A.'
            : 'Call reached the prospect\'s AI Call Screener ("This person is not available"). No live conversation occurred.'
          : leftMessage
          ? 'Звонок принял ИИ-секретарь / фильтр вызовов клиента («Record your name and reason for calling... This person is not available»), после чего менеджер оставил голосовое сообщение. Живой диалог с клиентом не состоялся — оценка не применяется.'
          : 'Звонок принял ИИ-секретарь клиента («This person is not available»). Живой диалог не состоялся.',
      };
    }
    return {
      isNonEvaluable: true,
      reason: isEn
        ? leftMessage
          ? 'Call reached Voicemail. The AE left a voice message for the prospect — no live sales conversation took place (N/A).'
          : `Call reached Voicemail: "${fullText.slice(0, 140)}". No live conversation took place.`
        : leftMessage
        ? 'Звонок попал на автоответчик (Voicemail). Менеджер оставил голосовое сообщение для клиента — живой диалог не состоялся, оценка по скрипту продаж не применяется.'
        : `Звонок попал на автоответчик (Voicemail): «${fullText.slice(0, 140)}». Живой диалог с клиентом не состоялся.`,
    };
  }

  if (typeof durationSeconds === 'number' && durationSeconds > 0 && durationSeconds < 20) {
    return {
      isNonEvaluable: true,
      reason: isEn
        ? `Call duration is only ${durationSeconds}s. Too short for a live sales conversation.`
        : `Длительность звонка всего ${durationSeconds} сек. Полноценный диалог по скрипту продаж за это время не состоялся.`,
    };
  }

  if (agentUtterances.length === 0 || customerUtterances.length === 0) {
    return {
      isNonEvaluable: true,
      reason: isEn
        ? matchedVoicemail
          ? `Call reached Voicemail: "${fullText.slice(0, 140)}".`
          : 'Transcript only contains one speaker — no two-way conversation occurred between AE and prospect.'
        : matchedVoicemail
        ? `Звонок попал на голосовую почту (Voicemail): «${fullText.slice(0, 140)}».`
        : 'В стенограмме присутствуют реплики только одной стороны — двусторонний диалог между менеджером и клиентом не состоялся.',
    };
  }

  return { isNonEvaluable: false, reason: '' };
}

/**
 * Builds an explicit N/A result for voicemail / dropped / <20s calls so no fake scores are generated.
 */
export function buildNonEvaluableAnalysis(params: {
  callId: string;
  transcript: TranscriptUtterance[];
  reason: string;
  callType?: InsurvoiceCallType;
  lang?: 'ru' | 'en';
}): CallAnalysisResult {
  const isEn = params.lang === 'en';
  const callType: Exclude<InsurvoiceCallType, 'Auto'> =
    params.callType && params.callType !== 'Auto' ? params.callType : 'Discovery + Demo';
  const weights = CALL_TYPE_WEIGHTS[callType];

  const sections: EvaluatedSection[] = INSURVOICE_SECTIONS.map((sec) => ({
    id: sec.id,
    title: isEn ? sec.titleEn : sec.title,
    shortTitle: sec.shortTitle,
    weight: weights[sec.id] ?? 0,
    qualityRating: 0,
    checkpointsHit: 0,
    checkpointsApplicable: 0,
    sectionScore: null,
    rationale: isEn
      ? 'Not applicable (Voicemail / no live conversation)'
      : 'Не применимо (разговор не состоялся / автоответчик)',
  }));

  const checkpoints: EvaluatedCheckpoint[] = INSURVOICE_CHECKPOINTS.map((cp) => ({
    id: cp.id,
    sectionId: cp.sectionId,
    sectionTitle: cp.sectionTitle,
    title: cp.title,
    titleEn: cp.titleEn,
    result: 'N/A',
    evidence: isEn
      ? 'No live conversation with prospect (Voicemail / short call)'
      : 'Разговор с клиентом не состоялся (Voicemail / короткий звонок)',
  }));

  return {
    callId: params.callId,
    score: 0,
    sentiment: 'neutral',
    summary: params.reason,
    keyPoints: [
      isEn
        ? 'No two-way conversation took place with the prospect'
        : 'Двусторонний разговор с клиентом не состоялся',
    ],
    agreements: [],
    managerStrengths: [],
    managerMistakes: [],
    actionItems: [
      isEn
        ? 'Follow up via phone or SMS/email after reaching voicemail'
        : 'Перезвонить клиенту или отправить SMS/email после попадания на автоответчик',
    ],
    scorecard: {
      greeting: 0,
      needsDiscovery: 0,
      objectionHandling: 0,
      closingAndNextStep: 0,
      politeness: 0,
      rubricVersion: INSURVOICE_RUBRIC_VERSION,
      callType,
      band: 'Priority Focus',
      sections,
      checkpoints,
    },
    transcript: params.transcript,
  };
}

export async function analyzeCallWithGPT(params: {
  callId: string;
  transcript: TranscriptUtterance[];
  managerName?: string;
  durationSeconds?: number;
  customCriteria?: string;
  model?: string;
  callType?: InsurvoiceCallType;
  lang?: 'ru' | 'en';
}): Promise<CallAnalysisResult> {
  const lang = params.lang || 'ru';
  const isEn = lang === 'en';

  // 1. Immediately filter out voicemails, <20s calls, or 1-sided transcripts
  const check = detectNonEvaluableCall({
    transcript: params.transcript,
    durationSeconds: params.durationSeconds,
    lang,
  });

  if (check.isNonEvaluable) {
    return buildNonEvaluableAnalysis({
      callId: params.callId,
      transcript: params.transcript,
      reason: check.reason,
      callType: params.callType,
      lang,
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      isEn ? 'OPENAI_API_KEY is not configured in environment variables' : 'OPENAI_API_KEY не настроен в переменных окружения'
    );
  }

  const formattedDialog = params.transcript
    .map((u, idx) => {
      const role = u.speaker === 'agent' ? `[AE / Менеджер ${params.managerName || ''}]` : '[Prospect / Клиент]';
      const timePrefix =
        typeof u.start === 'number'
          ? `[${Math.floor(u.start / 60)}:${String(Math.floor(u.start % 60)).padStart(2, '0')}] `
          : `[#${idx + 1}] `;
      return `${timePrefix}${role}: ${u.text}`;
    })
    .join('\n');

  const skillMarkdown = params.customCriteria?.trim() || readCallScorerSkill();

  const rubricSectionsText = INSURVOICE_SECTIONS.map(
    (s) =>
      `### ${s.title} (id: "${s.id}")\n- Уровень 5 (Отлично): ${s.level5}\n- Уровень 3 (Средне): ${s.level3}\n- Уровень 1 (Плохо/Отсутствует): ${s.level1}`
  ).join('\n\n');

  const checkpointsListText = INSURVOICE_CHECKPOINTS.map(
    (cp) => `- "${cp.id}" (${cp.sectionTitle}): ${cp.title} [Original: ${cp.titleEn}]`
  ).join('\n');

  const languageInstruction = isEn
    ? 'IMPORTANT LANGUAGE RULE: Write ALL text fields (summary, keyPoints, agreements, managerStrengths, managerMistakes, actionItems, sectionRatings.*.rationale, checkpoints.*.evidence) STRICTLY IN ENGLISH.'
    : 'ВАЖНОЕ ПРАВИЛО ЯЗЫКА: Все текстовые поля (summary, keyPoints, agreements, managerStrengths, managerMistakes, actionItems, rationale, evidence) пиши НА РУССКОМ ЯЗЫКЕ (допускается сохранять профильные термины: P&C, L&H, EZLynx, GHL, 90-day pilot, Caller ID и короткие цитаты из речи).';

  const systemPrompt = `Ты — строгий аудитор качества звонков отдела продаж Insurvoice.ai (AE Sales Call Scorecard Rubric v1.0, калибровка Kyle & Adithya).
Твоя задача — проанализировать стенограмму звонка между Account Executive (AE) и страховым агентством (Prospect) и оценить звонок СТРОГО по официальному скиллу (SKILL.md) ниже.

=== ОФИЦИАЛЬНЫЙ СКИЛЛ ОЦЕНКИ ЗВОНКОВ (.agent/skills/insurvoice-call-scorer/SKILL.md) ===
${skillMarkdown || `${rubricSectionsText}\n\n${checkpointsListText}`}
=== КОНЕЦ СКИЛЛА ===

${languageInstruction}

Верни ТОЛЬКО валидный JSON следующей структуры:
{
  "isVoicemailOrUnconnected": boolean, // true, если звонок попал на автоответчик/голосовую почту, ИИ-секретаря, IVR или клиент не ответил (даже если менеджер наговорил голосовое сообщение)
  "callType": "Confirmation / Pre-Call" | "Discovery" | "Demo" | "Discovery + Demo" | "Follow-up / Close",
  "sentiment": "positive" | "neutral" | "negative",
  "summary": "Емкое резюме реального звонка (2-3 предложения)",
  "keyPoints": ["тезис 1", "тезис 2"],
  "agreements": ["договоренность 1", "договоренность 2"],
  "managerStrengths": ["Сильная сторона 1", "Сильная сторона 2"],
  "managerMistakes": ["Ошибка / зона роста 1", "Ошибка / зона роста 2"],
  "actionItems": ["конкретный шаг 1", "конкретный шаг 2"],
  "sectionRatings": {
    "opening": { "qualityRating": 1..5, "rationale": "краткое обоснование оценки 1-5" },
    "discovery": { "qualityRating": 1..5, "rationale": "краткое обоснование оценки 1-5" },
    "pain": { "qualityRating": 1..5, "rationale": "краткое обоснование оценки 1-5" },
    "demo": { "qualityRating": 1..5, "rationale": "краткое обоснование оценки 1-5" },
    "objections": { "qualityRating": 1..5, "rationale": "краткое обоснование оценки 1-5" },
    "close": { "qualityRating": 1..5, "rationale": "краткое обоснование оценки 1-5" },
    "presence": { "qualityRating": 1..5, "rationale": "краткое обоснование оценки 1-5" }
  },
  "checkpoints": {
    "1.1": { "result": "Y" | "N" | "N/A", "evidence": "цитата или факт из стенограммы" },
    "1.2": { "result": "Y" | "N" | "N/A", "evidence": "..." },
    "1.3": { "result": "Y" | "N" | "N/A", "evidence": "..." },
    "2.1": { "result": "Y" | "N" | "N/A", "evidence": "..." },
    "2.2": { "result": "Y" | "N" | "N/A", "evidence": "..." },
    "2.3": { "result": "Y" | "N" | "N/A", "evidence": "..." },
    "2.4": { "result": "Y" | "N" | "N/A", "evidence": "..." },
    "2.5": { "result": "Y" | "N" | "N/A", "evidence": "..." },
    "3.1": { "result": "Y" | "N" | "N/A", "evidence": "..." },
    "3.2": { "result": "Y" | "N" | "N/A", "evidence": "..." },
    "3.3": { "result": "Y" | "N" | "N/A", "evidence": "..." },
    "3.4": { "result": "Y" | "N" | "N/A", "evidence": "..." },
    "4.1": { "result": "Y" | "N" | "N/A", "evidence": "..." },
    "4.2": { "result": "Y" | "N" | "N/A", "evidence": "..." },
    "4.3": { "result": "Y" | "N" | "N/A", "evidence": "..." },
    "4.4": { "result": "Y" | "N" | "N/A", "evidence": "..." },
    "5.1": { "result": "Y" | "N" | "N/A", "evidence": "..." },
    "5.2": { "result": "Y" | "N" | "N/A", "evidence": "..." },
    "5.3": { "result": "Y" | "N" | "N/A", "evidence": "..." },
    "6.1": { "result": "Y" | "N" | "N/A", "evidence": "..." },
    "6.2": { "result": "Y" | "N" | "N/A", "evidence": "..." },
    "6.3": { "result": "Y" | "N" | "N/A", "evidence": "..." },
    "6.4": { "result": "Y" | "N" | "N/A", "evidence": "..." },
    "7.1": { "result": "Y" | "N" | "N/A", "evidence": "..." },
    "7.2": { "result": "Y" | "N" | "N/A", "evidence": "..." },
    "7.3": { "result": "Y" | "N" | "N/A", "evidence": "..." }
  }
}`;

  const model = params.model || 'gpt-6.1-terra';

  const explicitCallType =
    params.callType && params.callType !== 'Auto' ? params.callType : undefined;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `${
            explicitCallType
              ? `Заданный тип звонка (Call Type): ${explicitCallType}\n`
              : 'Определи наиболее подходящий тип звонка (Call Type) автоматически по содержанию диалога (например, "Confirmation / Pre-Call" для короткого звонка-подтверждения встречи в Google Meet, либо "Discovery", "Discovery + Demo", "Follow-up / Close").\n'
          }${
            params.durationSeconds ? `Длительность звонка: ${params.durationSeconds} сек.\n` : ''
          }\nСтенограмма звонка:\n${formattedDialog}`,
        },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('OpenAI Error:', errText);
    throw new Error(`Ошибка OpenAI API (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const parsed = JSON.parse(data.choices[0].message.content);

  if (parsed.isVoicemailOrUnconnected) {
    return buildNonEvaluableAnalysis({
      callId: params.callId,
      transcript: params.transcript,
      reason:
        parsed.summary ||
        (isEn
          ? 'Call reached Voicemail or no live conversation with the prospect took place — sales rubric scoring is N/A.'
          : 'Звонок попал на автоответчик (Voicemail) или живой диалог с клиентом не состоялся — оценка по матрице продаж не применяется.'),
      callType: explicitCallType,
      lang,
    });
  }

  const resolvedCallType: InsurvoiceCallType =
    explicitCallType || parsed.callType || 'Discovery + Demo';

  const { totalScore, scorecard } = calculateInsurvoiceScorecard({
    callType: resolvedCallType,
    rawCheckpoints: parsed.checkpoints,
    rawSectionRatings: parsed.sectionRatings,
  });

  return {
    callId: params.callId,
    score: totalScore,
    sentiment: parsed.sentiment || 'neutral',
    summary: parsed.summary || 'Разговор проанализирован по матрице Insurvoice v1.0',
    keyPoints: parsed.keyPoints || [],
    agreements: parsed.agreements || [],
    managerStrengths: parsed.managerStrengths || [],
    managerMistakes: parsed.managerMistakes || [],
    actionItems: parsed.actionItems || [],
    scorecard,
    transcript: params.transcript,
  };
}
