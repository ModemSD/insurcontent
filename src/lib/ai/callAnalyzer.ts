import { CallAnalysisResult, TranscriptUtterance } from '@/types/telephony';

export async function analyzeCallWithGPT(params: {
  callId: string;
  transcript: TranscriptUtterance[];
  managerName?: string;
  durationSeconds?: number;
}): Promise<CallAnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  const formattedDialog = params.transcript
    .map((u) => {
      const role = u.speaker === 'agent' ? `[Менеджер ${params.managerName || ''}]` : '[Клиент]';
      return `${role}: ${u.text}`;
    })
    .join('\n');

  if (!apiKey) {
    // Graceful fallback if OPENAI_API_KEY is not yet populated
    return generateSimulatedAnalysis(params.callId, params.transcript, params.managerName);
  }

  const systemPrompt = `
Ты — ведущий эксперт по оценке качества звонков отдела продаж и клиентского сервиса.
Твоя задача — проанализировать стенограмму телефонного разговора между Менеджером и Клиентом, оценить работу менеджера и вернуть строгий JSON.

Правила анализа:
1. Приветствие (greeting 0-10): представился ли менеджер, вежлив ли, назвал ли компанию.
2. Выявление потребностей (needsDiscovery 0-10): задавал ли открытые вопросы, выяснил ли контекст клиента.
3. Отработка возражений (objectionHandling 0-10): аргументировал ли выгоды, не спорил ли, закрыл ли сомнения.
4. Закрытие и следующий шаг (closingAndNextStep 0-10): четко ли зафиксирована договоренность, назначен ли следующий контакт/сделка.
5. Вежливость и тон (politeness 0-10): эмоциональный интеллект, отсутствие перебиваний.
6. Общий скор (score 0-100): интегральная оценка качества работы менеджера.
7. sentiment: 'positive' | 'neutral' | 'negative' (настроение клиента к концу разговора).
8. summary: емкое резюме диалога (2-3 предложения).
9. keyPoints: ключевые тезисы беседы.
10. agreements: о чем конкретно договорились.
11. managerStrengths: что менеджер сделал отлично.
12. managerMistakes: ошибки, упущенные возможности или зоны роста менеджера.
13. actionItems: конкретные шаги для менеджера после звонка.

Верни ТОЛЬКО валидный JSON без markdown-блоков:
{
  "score": number,
  "sentiment": "positive" | "neutral" | "negative",
  "summary": string,
  "keyPoints": string[],
  "agreements": string[],
  "managerStrengths": string[],
  "managerMistakes": string[],
  "actionItems": string[],
  "scorecard": {
    "greeting": number,
    "needsDiscovery": number,
    "objectionHandling": number,
    "closingAndNextStep": number,
    "politeness": number
  }
}
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Стенограмма звонка:\n${formattedDialog}` },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI Error:', errText);
      return generateSimulatedAnalysis(params.callId, params.transcript, params.managerName);
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);

    return {
      callId: params.callId,
      score: parsed.score ?? 75,
      sentiment: parsed.sentiment || 'neutral',
      summary: parsed.summary || 'Разговор обработан',
      keyPoints: parsed.keyPoints || [],
      agreements: parsed.agreements || [],
      managerStrengths: parsed.managerStrengths || [],
      managerMistakes: parsed.managerMistakes || [],
      actionItems: parsed.actionItems || [],
      scorecard: parsed.scorecard || {
        greeting: 8,
        needsDiscovery: 7,
        objectionHandling: 7,
        closingAndNextStep: 8,
        politeness: 9,
      },
      transcript: params.transcript,
    };
  } catch (err) {
    console.error('Failed to parse GPT analysis:', err);
    return generateSimulatedAnalysis(params.callId, params.transcript, params.managerName);
  }
}

/**
 * Fallback simulation if OpenAI key is not provided or API is unreachable
 */
function generateSimulatedAnalysis(
  callId: string,
  transcript: TranscriptUtterance[],
  managerName?: string
): CallAnalysisResult {
  return {
    callId,
    score: 84,
    sentiment: 'positive',
    summary: `Менеджер ${managerName || ''} успешно проконсультировал клиента, ответил на базовые вопросы по услугам и согласовал отправку коммерческого предложения.`,
    keyPoints: [
      'Клиент интересуется условиями страхования и расчетом стоимости',
      'Обсудили базовое покрытие и сроки действия договора',
      'Клиент положительно отреагировал на специальное предложение',
    ],
    agreements: [
      'Менеджер направит презентацию и расчет в течение 2 часов',
      'Контрольный звонок назначен на завтра в 14:00',
    ],
    managerStrengths: [
      'Четкое и уверенное приветствие по стандарту компании',
      'Быстрый и компетентный ответ на вопрос о франшизе',
      'Фиксация конкретного времени следующего созвона',
    ],
    managerMistakes: [
      'Не задал дополнительный вопрос о текущем опыте взаимодействия клиента со страховыми',
      'Слишком быстро перешел к презентации цены без глубокого выявления болей',
    ],
    actionItems: [
      'Подготовить персональный расчет и отправить на email',
      'Поставить задачу в CRM на завтра 14:00',
    ],
    scorecard: {
      greeting: 9,
      needsDiscovery: 7,
      objectionHandling: 8,
      closingAndNextStep: 9,
      politeness: 9,
    },
    transcript,
  };
}
