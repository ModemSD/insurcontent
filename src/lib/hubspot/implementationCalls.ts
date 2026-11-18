export interface HubSpotCall {
  id: string;
  dealId: string;
  dealName?: string;
  dealAmount?: string;
  title?: string;
  body?: string;
  durationMs?: number;
  status?: string;
  direction?: string;
  timestamp?: string;
  disposition?: string;
  recordingUrl?: string;
}

export interface ClaudePatternAnalysis {
  summary: string;
  stepByStepSequence: Array<{
    step: number;
    stageTitle: string;
    whatHappened: string;
    whyItWorked: string;
  }>;
  winningPatterns: Array<{
    pattern: string;
    description: string;
    frequency: string;
    examples: string[];
  }>;
  commonObjectionsAndSolutions: Array<{
    objection: string;
    winningResponse: string;
  }>;
  keyTurningPoints: string[];
  recommendations: string[];
  rawText: string;
}

export interface ImplementationCallsResult {
  stageIds: string[];
  dealsCount: number;
  callsCount: number;
  calls: HubSpotCall[];
  analysis: ClaudePatternAnalysis;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

const HUBSPOT_BASE_URL = 'https://api.hubapi.com';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

async function hubspotFetch<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${HUBSPOT_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot API error (${res.status} ${path}): ${text}`);
  }

  return res.json() as Promise<T>;
}

export interface HubSpotPipeline {
  id: string;
  label: string;
  stages: Array<{ id: string; label: string; displayOrder: number }>;
}

/**
 * Возвращает список всех пайплайнов сделок и их стадий из HubSpot.
 */
export async function fetchDealPipelines(
  hubspotToken?: string
): Promise<HubSpotPipeline[]> {
  const token = hubspotToken ?? process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      'HUBSPOT_ACCESS_TOKEN is not set. Pass it in options or environment variables.'
    );
  }

  interface PipelineResponse {
    results: Array<{
      id: string;
      label: string;
      stages: Array<{ id: string; label: string; displayOrder: number }>;
    }>;
  }

  const data = await hubspotFetch<PipelineResponse>(
    '/crm/v3/pipelines/deals',
    token
  );

  return data.results.map((p) => ({
    id: p.id,
    label: p.label,
    stages: [...p.stages].sort((a, b) => a.displayOrder - b.displayOrder),
  }));
}

/**
 * Находит ID всех стадий сделок, название которых совпадает с `stageName` (по умолчанию "Implementation").
 */
async function findDealStageIds(
  token: string,
  stageName = 'Implementation'
): Promise<string[]> {
  interface PipelineResponse {
    results: Array<{
      id: string;
      label: string;
      stages: Array<{ id: string; label: string }>;
    }>;
  }

  const data = await hubspotFetch<PipelineResponse>(
    '/crm/v3/pipelines/deals',
    token
  );

  const normalizedTarget = stageName.trim().toLowerCase();
  const stageIds: string[] = [];

  for (const pipeline of data.results) {
    for (const stage of pipeline.stages) {
      if (stage.label.trim().toLowerCase() === normalizedTarget) {
        stageIds.push(stage.id);
      }
    }
  }

  return stageIds;
}

interface HubSpotDeal {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
  };
}

/**
 * Выгружает все сделки, которые прошли указанные стадии (`mode = 'passed'`)
 * или сейчас находятся на них (`mode = 'current'`).
 */
async function fetchDealsByStages(
  token: string,
  stageIds: string[],
  mode: 'passed' | 'current' = 'passed'
): Promise<HubSpotDeal[]> {
  interface SearchDealsResponse {
    results: HubSpotDeal[];
    paging?: { next?: { after?: string } };
  }

  const deals: HubSpotDeal[] = [];
  let after: string | undefined;

  const filterGroups = [
    {
      filters: [
        {
          propertyName: 'dealstage',
          operator: 'IN',
          values: stageIds,
        },
      ],
    },
  ];

  do {
    const body = {
      filterGroups,
      properties: ['dealname', 'amount', 'dealstage'],
      limit: 100,
      ...(after ? { after } : {}),
    };

    const res = await hubspotFetch<SearchDealsResponse>(
      '/crm/v3/objects/deals/search',
      token,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );

    deals.push(...res.results);
    after = res.paging?.next?.after;
  } while (after);

  return deals;
}

/**
 * Получает все звонки, привязанные к указанным сделкам.
 */
async function fetchCallsForDeals(
  token: string,
  deals: HubSpotDeal[]
): Promise<HubSpotCall[]> {
  if (deals.length === 0) return [];

  const dealMap = new Map(deals.map((d) => [d.id, d]));
  const dealToCallIds = new Map<string, string[]>();
  const allCallIds = new Set<string>();

  // Batch-запрос ассоциаций deals -> calls (по 100 сделок за раз)
  for (let i = 0; i < deals.length; i += 100) {
    const batch = deals.slice(i, i + 100);
    interface AssocResponse {
      results: Array<{
        from: { id: string };
        to: Array<{ toObjectId: number | string }>;
      }>;
    }

    const assocRes = await hubspotFetch<AssocResponse>(
      '/crm/v4/associations/deals/calls/batch/read',
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          inputs: batch.map((d) => ({ id: d.id })),
        }),
      }
    );

    for (const item of assocRes.results) {
      const callIds = item.to.map((t) => String(t.toObjectId));
      dealToCallIds.set(item.from.id, callIds);
      for (const cid of callIds) {
        allCallIds.add(cid);
      }
    }
  }

  if (allCallIds.size === 0) return [];

  const callDetailsMap = new Map<
    string,
    { id: string; properties: Record<string, string | null | undefined> }
  >();

  const callIdList = Array.from(allCallIds);
  const callProperties = [
    'hs_call_title',
    'hs_call_body',
    'hs_call_duration',
    'hs_call_status',
    'hs_call_direction',
    'hs_timestamp',
    'hs_call_disposition',
    'hs_call_recording_url',
  ];

  // Batch-чтение объектов calls (по 100 звонков за раз)
  for (let i = 0; i < callIdList.length; i += 100) {
    const batch = callIdList.slice(i, i + 100);
    interface BatchCallsResponse {
      results: Array<{
        id: string;
        properties: Record<string, string | null | undefined>;
      }>;
    }

    const callsRes = await hubspotFetch<BatchCallsResponse>(
      '/crm/v3/objects/calls/batch/read',
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          properties: callProperties,
          inputs: batch.map((id) => ({ id })),
        }),
      }
    );

    for (const call of callsRes.results) {
      callDetailsMap.set(call.id, call);
    }
  }

  const result: HubSpotCall[] = [];
  for (const [dealId, callIds] of Array.from(dealToCallIds.entries())) {
    const deal = dealMap.get(dealId);
    for (const callId of callIds) {
      const details = callDetailsMap.get(callId);
      if (!details) continue;
      const p = details.properties;
      result.push({
        id: callId,
        dealId,
        dealName: deal?.properties.dealname ?? undefined,
        dealAmount: deal?.properties.amount ?? undefined,
        title: p.hs_call_title ?? undefined,
        body: p.hs_call_body ? stripHtml(p.hs_call_body) : undefined,
        durationMs: p.hs_call_duration ? Number(p.hs_call_duration) : undefined,
        status: p.hs_call_status ?? undefined,
        direction: p.hs_call_direction ?? undefined,
        timestamp: p.hs_timestamp ?? undefined,
        disposition: p.hs_call_disposition ?? undefined,
        recordingUrl: p.hs_call_recording_url ?? undefined,
      });
    }
  }

  return result;
}

/**
 * Выгружает все звонки из HubSpot со стадии Implementation.
 */
export async function fetchImplementationCalls(options?: {
  hubspotToken?: string;
  stageName?: string;
  stageIds?: string[];
  mode?: 'passed' | 'current';
}): Promise<{ stageIds: string[]; dealsCount: number; calls: HubSpotCall[] }> {
  const token = options?.hubspotToken ?? process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      'HUBSPOT_ACCESS_TOKEN is not set. Pass it in options or environment variables.'
    );
  }

  let stageIds =
    options?.stageIds && options.stageIds.length > 0
      ? options.stageIds
      : await findDealStageIds(token, options?.stageName ?? 'Implementation');

  if (stageIds.length === 0) {
    throw new Error(
      `No deal stages found matching "${options?.stageName ?? 'Implementation'}"`
    );
  }

  const mode = options?.mode ?? 'passed';
  if (mode === 'passed') {
    const pipelines = await fetchDealPipelines(token);
    const expanded = new Set<string>(stageIds);
    for (const pipeline of pipelines) {
      for (const id of stageIds) {
        const match = pipeline.stages.find((s) => s.id === id);
        if (match) {
          for (const s of pipeline.stages) {
            const labelLower = s.label.toLowerCase();
            const idLower = s.id.toLowerCase();
            const isLost =
              labelLower.includes('lost') || idLower.includes('lost');
            if (s.displayOrder >= match.displayOrder && !isLost) {
              expanded.add(s.id);
            }
          }
        }
      }
    }
    stageIds = Array.from(expanded);
  }

  const deals = await fetchDealsByStages(token, stageIds, mode);
  const calls = await fetchCallsForDeals(token, deals);

  return {
    stageIds,
    dealsCount: deals.length,
    calls,
  };
}

/**
 * Разбирает выгруженные звонки через Claude (Anthropic API) и выявляет общие паттерны,
 * которые привели к закрытию сделки.
 */
export async function analyzeWinningPatternsWithClaude(
  calls: HubSpotCall[],
  options?: {
    anthropicApiKey?: string;
    model?: string;
  }
): Promise<ClaudePatternAnalysis> {
  const apiKey =
    options?.anthropicApiKey ??
    process.env.ANTHROPIC_API_KEY ??
    process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY (or CLAUDE_API_KEY) is not set. Pass it in options or environment variables.'
    );
  }

  if (calls.length === 0) {
    return {
      summary: 'Нет звонков для анализа.',
      stepByStepSequence: [],
      winningPatterns: [],
      commonObjectionsAndSolutions: [],
      keyTurningPoints: [],
      recommendations: [],
      rawText: '',
    };
  }

  // Группируем звонки по сделкам для компактного и структурированного промпта
  const byDeal = new Map<string, HubSpotCall[]>();
  for (const call of calls) {
    const list = byDeal.get(call.dealId) ?? [];
    list.push(call);
    byDeal.set(call.dealId, list);
  }

  const formattedDealsFull = Array.from(byDeal.entries())
    .map(([dealId, dealCalls], idx) => {
      const first = dealCalls[0];
      const callsText = dealCalls
        .map((c, cIdx) => {
          const durationSec = c.durationMs
            ? Math.round(c.durationMs / 1000)
            : 'N/A';
          return [
            `  Звонок #${cIdx + 1} (${c.timestamp ?? 'без даты'}, длительность: ${durationSec}с, направление: ${c.direction ?? 'N/A'})`,
            c.title ? `  Заголовок: ${c.title}` : null,
            c.body ? `  Заметки/Транскрипт:\n  ${c.body}` : '  Заметки: отсутствуют',
          ]
            .filter(Boolean)
            .join('\n');
        })
        .join('\n\n');

      return `=== Сделка #${idx + 1} (ID: ${dealId}, Название: ${first.dealName ?? 'N/A'}, Сумма: ${first.dealAmount ?? 'N/A'}) ===\n${callsText}`;
    })
    .join('\n\n');

  const MAX_PROMPT_CHARS = 120_000;
  const formattedDeals =
    formattedDealsFull.length > MAX_PROMPT_CHARS
      ? formattedDealsFull.slice(0, MAX_PROMPT_CHARS) +
        '\n\n[...часть звонков усечена из-за лимита длины...]'
      : formattedDealsFull;

  const systemPrompt = `Ты — опытный Sales Ops аналитик и руководитель отдела продаж.
Твоя задача — проанализировать звонки по сделкам, которые дошли до стадии Implementation (успешно закрыты / внедряются), и выявить общие повторяющиеся паттерны, которые привели к закрытию сделки.

Отвечай строго в формате JSON без markdown-обёртки, со следующей структурой:
{
  "summary": "Краткое резюме главных факторов успеха",
  "stepByStepSequence": [
    {
      "step": 1,
      "stageTitle": "Название этапа (например: Квалификация боли)",
      "whatHappened": "Что именно делал менеджер и что отвечал клиент",
      "whyItWorked": "Почему этот шаг двигал сделку к покупке"
    }
  ],
  "winningPatterns": [
    {
      "pattern": "Название паттерна",
      "description": "Подробное описание, как это работает",
      "frequency": "Насколько часто встречается (например, 8 из 10 сделок)",
      "examples": ["Конкретная цитата или пример из звонка"]
    }
  ],
  "commonObjectionsAndSolutions": [
    {
      "objection": "Частое возражение клиента",
      "winningResponse": "Как менеджеры успешно его отрабатывали"
    }
  ],
  "keyTurningPoints": ["Ключевые поворотные моменты в звонках, после которых клиент соглашался"],
  "recommendations": ["Практические рекомендации для команды продаж"]
}`;

  const userPrompt = `Ниже выгрузка ${calls.length} звонков по ${byDeal.size} сделкам со стадии Implementation из HubSpot.
Проанализируй их и выяви общие паттерны, которые привели к закрытию сделки:\n\n${formattedDeals}`;

  const modelsToTry = options?.model
    ? [options.model]
    : ['claude-fable-5-2', 'claude-sonnet-4-5', 'claude-3-7-sonnet-latest', 'claude-3-5-sonnet-latest'];

  let data: { content: Array<{ type: string; text?: string }> } | null = null;
  let lastError = '';

  for (const model of modelsToTry) {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (res.ok) {
      data = (await res.json()) as {
        content: Array<{ type: string; text?: string }>;
      };
      break;
    }

    const errText = await res.text();
    lastError = `Anthropic API error (${res.status}): ${errText}`;
    if (res.status !== 404) {
      throw new Error(lastError);
    }
  }

  if (!data) {
    throw new Error(lastError || 'Anthropic API request failed');
  }

  const rawText = data.content
    .filter((c) => c.type === 'text' && c.text)
    .map((c) => c.text)
    .join('\n');

  try {
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    const parsed = JSON.parse(cleaned) as Omit<ClaudePatternAnalysis, 'rawText'>;
    return {
      ...parsed,
      rawText,
    };
  } catch {
    return {
      summary: rawText,
      stepByStepSequence: [],
      winningPatterns: [],
      commonObjectionsAndSolutions: [],
      keyTurningPoints: [],
      recommendations: [],
      rawText,
    };
  }
}

/**
 * Полный цикл: выгрузка звонков со стадии Implementation из HubSpot + анализ паттернов через Claude.
 */
export async function exportAndAnalyzeImplementationCalls(options?: {
  hubspotToken?: string;
  anthropicApiKey?: string;
  stageName?: string;
  stageIds?: string[];
  mode?: 'passed' | 'current';
  claudeModel?: string;
}): Promise<ImplementationCallsResult> {
  const { stageIds, dealsCount, calls } = await fetchImplementationCalls({
    hubspotToken: options?.hubspotToken,
    stageName: options?.stageName,
    stageIds: options?.stageIds,
    mode: options?.mode,
  });

  const analysis = await analyzeWinningPatternsWithClaude(calls, {
    anthropicApiKey: options?.anthropicApiKey,
    model: options?.claudeModel,
  });

  return {
    stageIds,
    dealsCount,
    callsCount: calls.length,
    calls,
    analysis,
  };
}
