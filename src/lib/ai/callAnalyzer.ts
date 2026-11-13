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
}): { isNonEvaluable: boolean; reason: string; reasonRu: string; reasonEn: string } {
  const { transcript, durationSeconds, lang = 'ru' } = params;
  const isEn = lang === 'en';

  if (!transcript || transcript.length === 0) {
    const reasonRu = 'Стенограмма звонка пуста — разговор не состоялся или запись отсутствует.';
    const reasonEn = 'Call transcript is empty — no live conversation occurred or recording is missing.';
    return {
      isNonEvaluable: true,
      reason: isEn ? reasonEn : reasonRu,
      reasonRu,
      reasonEn,
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
      const reasonRu = leftMessage
        ? 'Звонок принял ИИ-секретарь / фильтр вызовов клиента («Record your name and reason for calling... This person is not available»), после чего менеджер оставил голосовое сообщение. Живой диалог с клиентом не состоялся — оценка не применяется.'
        : 'Звонок принял ИИ-секретарь клиента («This person is not available»). Живой диалог не состоялся.';
      const reasonEn = leftMessage
        ? 'Call reached an AI Call Screener ("Record your name and reason for calling... This person is not available"), and the AE left a voice message. No live prospect conversation occurred — rubric scoring is N/A.'
        : 'Call reached the prospect\'s AI Call Screener ("This person is not available"). No live conversation occurred.';
      return {
        isNonEvaluable: true,
        reason: isEn ? reasonEn : reasonRu,
        reasonRu,
        reasonEn,
      };
    }
    const reasonRu = leftMessage
      ? 'Звонок попал на автоответчик (Voicemail). Менеджер оставил голосовое сообщение для клиента — живой диалог не состоялся, оценка по скрипту продаж не применяется.'
      : `Звонок попал на автоответчик (Voicemail): «${fullText.slice(0, 140)}». Живой диалог с клиентом не состоялся.`;
    const reasonEn = leftMessage
      ? 'Call reached Voicemail. The AE left a voice message for the prospect — no live sales conversation took place (N/A).'
      : `Call reached Voicemail: "${fullText.slice(0, 140)}". No live conversation took place.`;
    return {
      isNonEvaluable: true,
      reason: isEn ? reasonEn : reasonRu,
      reasonRu,
      reasonEn,
    };
  }

  if (typeof durationSeconds === 'number' && durationSeconds > 0 && durationSeconds < 20) {
    const reasonRu = `Длительность звонка всего ${durationSeconds} сек. Полноценный диалог по скрипту продаж за это время не состоялся.`;
    const reasonEn = `Call duration is only ${durationSeconds}s. Too short for a live sales conversation.`;
    return {
      isNonEvaluable: true,
      reason: isEn ? reasonEn : reasonRu,
      reasonRu,
      reasonEn,
    };
  }

  if (agentUtterances.length === 0 || customerUtterances.length === 0) {
    const reasonRu = matchedVoicemail
      ? `Звонок попал на голосовую почту (Voicemail): «${fullText.slice(0, 140)}».`
      : 'В стенограмме присутствуют реплики только одной стороны — двусторонний диалог между менеджером и клиентом не состоялся.';
    const reasonEn = matchedVoicemail
      ? `Call reached Voicemail: "${fullText.slice(0, 140)}".`
      : 'Transcript only contains one speaker — no two-way conversation occurred between AE and prospect.';
    return {
      isNonEvaluable: true,
      reason: isEn ? reasonEn : reasonRu,
      reasonRu,
      reasonEn,
    };
  }

  return { isNonEvaluable: false, reason: '', reasonRu: '', reasonEn: '' };
}

/**
 * Builds an explicit N/A result for voicemail / dropped / <20s calls so no fake scores are generated.
 */
export function buildNonEvaluableAnalysis(params: {
  callId: string;
  transcript: TranscriptUtterance[];
  reason: string;
  reasonRu?: string;
  reasonEn?: string;
  callType?: InsurvoiceCallType;
  lang?: 'ru' | 'en';
}): CallAnalysisResult {
  const isEn = params.lang === 'en';
  const callType: Exclude<InsurvoiceCallType, 'Auto'> =
    params.callType && params.callType !== 'Auto' ? params.callType : 'Discovery + Demo';
  const weights = CALL_TYPE_WEIGHTS[callType];

  const rationaleRu = 'Не применимо (разговор не состоялся / автоответчик)';
  const rationaleEn = 'Not applicable (Voicemail / no live conversation)';

  const sections: EvaluatedSection[] = INSURVOICE_SECTIONS.map((sec) => ({
    id: sec.id,
    title: isEn ? sec.titleEn : sec.title,
    shortTitle: sec.shortTitle,
    weight: weights[sec.id] ?? 0,
    qualityRating: 0,
    checkpointsHit: 0,
    checkpointsApplicable: 0,
    sectionScore: null,
    rationale: isEn ? rationaleEn : rationaleRu,
    rationaleRu,
    rationaleEn,
  }));

  const evidenceRu = 'Разговор с клиентом не состоялся (Voicemail / короткий звонок)';
  const evidenceEn = 'No live conversation with prospect (Voicemail / short call)';

  const checkpoints: EvaluatedCheckpoint[] = INSURVOICE_CHECKPOINTS.map((cp) => ({
    id: cp.id,
    sectionId: cp.sectionId,
    sectionTitle: cp.sectionTitle,
    title: cp.title,
    titleEn: cp.titleEn,
    result: 'N/A',
    evidence: isEn ? evidenceEn : evidenceRu,
    evidenceRu,
    evidenceEn,
  }));

  const summaryRu =
    params.reasonRu ||
    'Звонок попал на автоответчик (Voicemail) или живой диалог с клиентом не состоялся — оценка по скрипту продаж не применяется.';
  const summaryEn =
    params.reasonEn ||
    'Call reached Voicemail or no live conversation with the prospect took place — sales rubric scoring is N/A.';

  const ruText = {
    summary: summaryRu,
    keyPoints: ['Двусторонний разговор с клиентом не состоялся'],
    agreements: [],
    managerStrengths: [],
    managerMistakes: [],
    actionItems: ['Перезвонить клиенту или отправить SMS/email после попадания на автоответчик'],
  };

  const enText = {
    summary: summaryEn,
    keyPoints: ['No two-way conversation took place with the prospect'],
    agreements: [],
    managerStrengths: [],
    managerMistakes: [],
    actionItems: ['Follow up via phone or SMS/email after reaching voicemail'],
  };

  const activeText = isEn ? enText : ruText;

  return {
    callId: params.callId,
    score: 0,
    sentiment: 'neutral',
    summary: activeText.summary,
    keyPoints: activeText.keyPoints,
    agreements: activeText.agreements,
    managerStrengths: activeText.managerStrengths,
    managerMistakes: activeText.managerMistakes,
    actionItems: activeText.actionItems,
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
      i18n: {
        ru: ruText,
        en: enText,
      },
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
      reasonRu: check.reasonRu,
      reasonEn: check.reasonEn,
      callType: params.callType,
      lang,
    });
  }

  const model = params.model || 'claude-fable-5-2';
  const isClaude = model.startsWith('claude');

  const apiKey = isClaude ? process.env.CLAUDE_API_KEY : process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const keyName = isClaude ? 'CLAUDE_API_KEY' : 'OPENAI_API_KEY';
    throw new Error(
      isEn ? `${keyName} is not configured in environment variables` : `${keyName} не настроен в переменных окружения`
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

  const languageInstruction = `ВАЖНОЕ ДВУЯЗЫЧНОЕ ПРАВИЛО (BILINGUAL OUTPUT RULE):
Ты должен заполнить ВСЕ текстовые поля СРАЗУ НА ДВУХ ЯЗЫКАХ (русском и английском), чтобы пользователь в интерфейсе мог мгновенно переключать язык RU ↔ EN без повторного запроса к API:
- Поля без суффикса (summary, keyPoints, agreements, managerStrengths, managerMistakes, actionItems, rationale, evidence) — пиши НА РУССКОМ ЯЗЫКЕ (сохраняя термины P&C, L&H, EZLynx, GHL, 90-day pilot, Caller ID и точные цитаты из речи).
- Поля с суффиксом En (summaryEn, keyPointsEn, agreementsEn, managerStrengthsEn, managerMistakesEn, actionItemsEn, rationaleEn, evidenceEn) — пиши СТРОГО НА АНГЛИЙСКОМ ЯЗЫКЕ (STRICTLY IN ENGLISH).`;

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
  "summary": "Емкое резюме реального звонка на русском (2-3 предложения)",
  "summaryEn": "Concise summary of the actual call in English (2-3 sentences)",
  "keyPoints": ["тезис 1 на русском", "тезис 2 на русском"],
  "keyPointsEn": ["key point 1 in English", "key point 2 in English"],
  "agreements": ["договоренность 1 на русском", "договоренность 2 на русском"],
  "agreementsEn": ["agreement 1 in English", "agreement 2 in English"],
  "managerStrengths": ["Сильная сторона 1 на русском", "Сильная сторона 2 на русском"],
  "managerStrengthsEn": ["Strength 1 in English", "Strength 2 in English"],
  "managerMistakes": ["Ошибка / зона роста 1 на русском", "Ошибка / зона роста 2 на русском"],
  "managerMistakesEn": ["Mistake / coaching area 1 in English", "Mistake / coaching area 2 in English"],
  "actionItems": ["конкретный шаг 1 на русском", "конкретный шаг 2 на русском"],
  "actionItemsEn": ["concrete action item 1 in English", "concrete action item 2 in English"],
  "sectionRatings": {
    "opening": { "qualityRating": 1..5, "rationale": "краткое обоснование на русском", "rationaleEn": "brief rationale in English" },
    "discovery": { "qualityRating": 1..5, "rationale": "...", "rationaleEn": "..." },
    "pain": { "qualityRating": 1..5, "rationale": "...", "rationaleEn": "..." },
    "demo": { "qualityRating": 1..5, "rationale": "...", "rationaleEn": "..." },
    "objections": { "qualityRating": 1..5, "rationale": "...", "rationaleEn": "..." },
    "close": { "qualityRating": 1..5, "rationale": "...", "rationaleEn": "..." },
    "presence": { "qualityRating": 1..5, "rationale": "...", "rationaleEn": "..." }
  },
  "checkpoints": {
    "1.1": { "result": "Y" | "N" | "N/A", "evidence": "цитата или факт (RU)", "evidenceEn": "quote or fact (EN)" },
    "1.2": { "result": "Y" | "N" | "N/A", "evidence": "...", "evidenceEn": "..." },
    "1.3": { "result": "Y" | "N" | "N/A", "evidence": "...", "evidenceEn": "..." },
    "2.1": { "result": "Y" | "N" | "N/A", "evidence": "...", "evidenceEn": "..." },
    "2.2": { "result": "Y" | "N" | "N/A", "evidence": "...", "evidenceEn": "..." },
    "2.3": { "result": "Y" | "N" | "N/A", "evidence": "...", "evidenceEn": "..." },
    "2.4": { "result": "Y" | "N" | "N/A", "evidence": "...", "evidenceEn": "..." },
    "2.5": { "result": "Y" | "N" | "N/A", "evidence": "...", "evidenceEn": "..." },
    "3.1": { "result": "Y" | "N" | "N/A", "evidence": "...", "evidenceEn": "..." },
    "3.2": { "result": "Y" | "N" | "N/A", "evidence": "...", "evidenceEn": "..." },
    "3.3": { "result": "Y" | "N" | "N/A", "evidence": "...", "evidenceEn": "..." },
    "3.4": { "result": "Y" | "N" | "N/A", "evidence": "...", "evidenceEn": "..." },
    "4.1": { "result": "Y" | "N" | "N/A", "evidence": "...", "evidenceEn": "..." },
    "4.2": { "result": "Y" | "N" | "N/A", "evidence": "...", "evidenceEn": "..." },
    "4.3": { "result": "Y" | "N" | "N/A", "evidence": "...", "evidenceEn": "..." },
    "4.4": { "result": "Y" | "N" | "N/A", "evidence": "...", "evidenceEn": "..." },
    "5.1": { "result": "Y" | "N" | "N/A", "evidence": "...", "evidenceEn": "..." },
    "5.2": { "result": "Y" | "N" | "N/A", "evidence": "...", "evidenceEn": "..." },
    "5.3": { "result": "Y" | "N" | "N/A", "evidence": "...", "evidenceEn": "..." },
    "6.1": { "result": "Y" | "N" | "N/A", "evidence": "...", "evidenceEn": "..." },
    "6.2": { "result": "Y" | "N" | "N/A", "evidence": "...", "evidenceEn": "..." },
    "6.3": { "result": "Y" | "N" | "N/A", "evidence": "...", "evidenceEn": "..." },
    "6.4": { "result": "Y" | "N" | "N/A", "evidence": "...", "evidenceEn": "..." },
    "7.1": { "result": "Y" | "N" | "N/A", "evidence": "...", "evidenceEn": "..." },
    "7.2": { "result": "Y" | "N" | "N/A", "evidence": "...", "evidenceEn": "..." },
    "7.3": { "result": "Y" | "N" | "N/A", "evidence": "...", "evidenceEn": "..." }
  }
}`;

  const explicitCallType =
    params.callType && params.callType !== 'Auto' ? params.callType : undefined;

  const userPrompt = `${
    explicitCallType
      ? `Заданный тип звонка (Call Type): ${explicitCallType}\n`
      : 'Определи наиболее подходящий тип звонка (Call Type) автоматически по содержанию диалога (например, "Confirmation / Pre-Call" для короткого звонка-подтверждения встречи в Google Meet, либо "Discovery", "Discovery + Demo", "Follow-up / Close").\n'
  }${
    params.durationSeconds ? `Длительность звонка: ${params.durationSeconds} сек.\n` : ''
  }\nСтенограмма звонка:\n${formattedDialog}`;

  const endpoint = isClaude
    ? 'https://api.anthropic.com/v1/messages'
    : 'https://api.openai.com/v1/chat/completions';

  const headers: Record<string, string> = isClaude
    ? {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      }
    : {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      };

  const requestPayload = JSON.stringify(
    isClaude
      ? {
          model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }
      : {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
        }
  );

  const providerLabel = isClaude ? 'Claude' : 'OpenAI';
  const maxAttempts = 3;
  let lastStatus = 0;
  let lastErrorText = '';
  let data: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: requestPayload,
      });

      if (response.ok) {
        data = await response.json();
        break;
      }

      lastStatus = response.status;
      lastErrorText = await response.text();
      console.warn(`${providerLabel} attempt ${attempt}/${maxAttempts} failed (${lastStatus}):`, lastErrorText);

      const isRetryable = [429, 500, 502, 503, 504, 529].includes(lastStatus);
      if (!isRetryable || attempt === maxAttempts) {
        break;
      }
    } catch (fetchErr: any) {
      lastStatus = 0;
      lastErrorText = fetchErr?.message || 'Network error';
      console.warn(`${providerLabel} network error on attempt ${attempt}/${maxAttempts}:`, lastErrorText);
      if (attempt === maxAttempts) {
        break;
      }
    }

    // Wait 1.5s on attempt 1, 3s on attempt 2 before retrying
    await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
  }

  if (!data) {
    let parsedErrMsg = '';
    try {
      const errJson = JSON.parse(lastErrorText);
      parsedErrMsg = errJson?.error?.message || errJson?.error?.code || '';
    } catch {
      parsedErrMsg = lastErrorText.slice(0, 200);
    }

    if (lastStatus >= 500) {
      throw new Error(
        isEn
          ? `${providerLabel} servers are temporarily overloaded (HTTP ${lastStatus}${parsedErrMsg ? `: ${parsedErrMsg}` : ''}). Auto-retried ${maxAttempts} times. Please try scoring this call again in a few seconds.`
          : `Серверы ${providerLabel} временно перегружены (ошибка ${lastStatus}${parsedErrMsg ? `: ${parsedErrMsg}` : ''}). Выполнено ${maxAttempts} автоматических попытки. Пожалуйста, попробуйте повторить оценку через несколько секунд.`
      );
    }

    if (lastStatus === 429) {
      throw new Error(
        isEn
          ? `${providerLabel} rate limit reached (HTTP 429${parsedErrMsg ? `: ${parsedErrMsg}` : ''}). Please wait 10–20 seconds before scoring more calls.`
          : `Превышен лимит запросов к ${providerLabel} (HTTP 429${parsedErrMsg ? `: ${parsedErrMsg}` : ''}). Подождите 10–20 секунд и попробуйте снова.`
      );
    }

    throw new Error(
      isEn
        ? `${providerLabel} API error${lastStatus ? ` (${lastStatus})` : ''}: ${parsedErrMsg || 'Failed to complete analysis.'}`
        : `Ошибка обращения к ${providerLabel} API${lastStatus ? ` (${lastStatus})` : ''}: ${parsedErrMsg || 'Не удалось выполнить анализ звонка.'}`
    );
  }

  const rawContent: string = isClaude
    ? data.content?.find((b: any) => b.type === 'text')?.text || ''
    : data.choices[0].message.content;

  const cleanedJson = rawContent
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  const parsed = JSON.parse(cleanedJson);

  if (parsed.isVoicemailOrUnconnected) {
    const reasonRu =
      parsed.summary ||
      'Звонок попал на автоответчик (Voicemail) или живой диалог с клиентом не состоялся — оценка по матрице продаж не применяется.';
    const reasonEn =
      parsed.summaryEn ||
      parsed.summary ||
      'Call reached Voicemail or no live conversation with the prospect took place — sales rubric scoring is N/A.';
    return buildNonEvaluableAnalysis({
      callId: params.callId,
      transcript: params.transcript,
      reason: isEn ? reasonEn : reasonRu,
      reasonRu,
      reasonEn,
      callType: explicitCallType,
      lang,
    });
  }

  const resolvedCallType: InsurvoiceCallType =
    explicitCallType || parsed.callType || 'Discovery + Demo';

  const ruText = {
    summary: parsed.summary || 'Разговор проанализирован по матрице Insurvoice v1.0',
    keyPoints: parsed.keyPoints || [],
    agreements: parsed.agreements || [],
    managerStrengths: parsed.managerStrengths || [],
    managerMistakes: parsed.managerMistakes || [],
    actionItems: parsed.actionItems || [],
  };

  const enText = {
    summary: parsed.summaryEn || parsed.summary || 'Call analyzed using the Insurvoice v1.0 rubric',
    keyPoints: parsed.keyPointsEn || parsed.keyPoints || [],
    agreements: parsed.agreementsEn || parsed.agreements || [],
    managerStrengths: parsed.managerStrengthsEn || parsed.managerStrengths || [],
    managerMistakes: parsed.managerMistakesEn || parsed.managerMistakes || [],
    actionItems: parsed.actionItemsEn || parsed.actionItems || [],
  };

  const { totalScore, scorecard } = calculateInsurvoiceScorecard({
    callType: resolvedCallType,
    rawCheckpoints: parsed.checkpoints,
    rawSectionRatings: parsed.sectionRatings,
    i18n: {
      ru: ruText,
      en: enText,
    },
  });

  const activeText = isEn ? enText : ruText;

  return {
    callId: params.callId,
    score: totalScore,
    sentiment: parsed.sentiment || 'neutral',
    summary: activeText.summary,
    keyPoints: activeText.keyPoints,
    agreements: activeText.agreements,
    managerStrengths: activeText.managerStrengths,
    managerMistakes: activeText.managerMistakes,
    actionItems: activeText.actionItems,
    scorecard,
    transcript: params.transcript,
    model,
  };
}
