'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  Loader2,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ArrowRight,
  MessageSquareWarning,
  Lightbulb,
} from 'lucide-react';
import type {
  ImplementationCallsResult,
  HubSpotCall,
  HubSpotPipeline,
} from '@/lib/hubspot/implementationCalls';

export default function HubSpotPatternsPage() {
  const [pipelines, setPipelines] = useState<HubSpotPipeline[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [mode, setMode] = useState<'passed' | 'current'>('passed');
  const [loadingPipelines, setLoadingPipelines] = useState(true);
  const [preview, setPreview] = useState<{ dealsCount: number; callsCount: number } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImplementationCallsResult | null>(null);
  const [expandedDeals, setExpandedDeals] = useState<Record<string, boolean>>({});
  const [expandedCalls, setExpandedCalls] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/hubspot/implementation-patterns');
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Не удалось загрузить стадии HubSpot');
        }
        const list = (data.pipelines ?? []) as HubSpotPipeline[];
        if (!active) return;
        setPipelines(list);

        // Автоматически выбираем стадию Implementation, если она есть
        let defaultId = '';
        for (const p of list) {
          const impl = p.stages.find(
            (s) => s.label.trim().toLowerCase() === 'implementation'
          );
          if (impl) {
            defaultId = impl.id;
            break;
          }
        }
        if (!defaultId && list[0]?.stages[0]) {
          defaultId = list[0].stages[0].id;
        }
        setSelectedStageId(defaultId);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'Ошибка загрузки стадий HubSpot'
          );
        }
      } finally {
        if (active) setLoadingPipelines(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!selectedStageId) return;
    let active = true;
    setLoadingPreview(true);
    setPreview(null);
    (async () => {
      try {
        const res = await fetch('/api/hubspot/implementation-patterns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stageIds: [selectedStageId],
            mode,
            previewOnly: true,
          }),
        });
        const data = await res.json();
        if (active && res.ok) {
          setPreview({
            dealsCount: data.dealsCount ?? 0,
            callsCount: data.callsCount ?? 0,
          });
        }
      } catch {
        // Игнорируем ошибку предпросмотра
      } finally {
        if (active) setLoadingPreview(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedStageId, mode]);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/hubspot/implementation-patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(selectedStageId ? { stageIds: [selectedStageId] } : { stageName: 'Implementation' }),
          mode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Ошибка сервера (${res.status})`);
      }

      setResult(data as ImplementationCallsResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const toggleDeal = (dealId: string) => {
    setExpandedDeals((prev) => ({ ...prev, [dealId]: !prev[dealId] }));
  };

  const toggleCall = (callId: string) => {
    setExpandedCalls((prev) => ({ ...prev, [callId]: !prev[callId] }));
  };

  // Группировка звонков по сделкам
  const callsByDeal = React.useMemo(() => {
    if (!result) return [];
    const map = new Map<
      string,
      { dealId: string; dealName: string; dealAmount?: string; calls: HubSpotCall[] }
    >();
    for (const call of result.calls) {
      const existing = map.get(call.dealId);
      if (existing) {
        existing.calls.push(call);
      } else {
        map.set(call.dealId, {
          dealId: call.dealId,
          dealName: call.dealName || `Сделка #${call.dealId}`,
          dealAmount: call.dealAmount,
          calls: [call],
        });
      }
    }
    return Array.from(map.values());
  }, [result]);

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h1 className="text-xl font-semibold text-zinc-900">
                  HubSpot: Анализ звонков до покупки
                </h1>
              </div>
              <p className="text-sm text-zinc-500 mt-1">
                Выгружает все звонки со стадии <span className="font-medium text-zinc-700">Implementation</span> и
                разбирает через Claude, что за чем шло и какие паттерны привели к закрытию сделки.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedStageId}
                onChange={(e) => setSelectedStageId(e.target.value)}
                disabled={loadingPipelines || pipelines.length === 0}
                className="px-3.5 py-2 text-sm border border-zinc-200 rounded-xl bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-50"
              >
                {loadingPipelines ? (
                  <option value="">Загрузка стадий...</option>
                ) : pipelines.length === 0 ? (
                  <option value="">Стадии не найдены</option>
                ) : (
                  pipelines.map((p) => (
                    <optgroup key={p.id} label={p.label}>
                      {p.stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </optgroup>
                  ))
                )}
              </select>

              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'passed' | 'current')}
                className="px-3.5 py-2 text-sm border border-zinc-200 rounded-xl bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="passed">Прошли этот этап</option>
                <option value="current">Сейчас на этом этапе</option>
              </select>

              <button
                onClick={handleAnalyze}
                disabled={loading || loadingPipelines}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Выгрузка и анализ...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Выгрузить и разобрать
                  </>
                )}
              </button>

              {loadingPreview ? (
                <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Подсчёт выборки...
                </span>
              ) : preview ? (
                <span className="text-xs px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 font-medium">
                  В выборке: {preview.dealsCount} сделок, {preview.callsCount} звонков
                </span>
              ) : null}
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-sm text-red-700">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Ошибка</p>
                <p className="mt-0.5 text-red-600 break-all">{error}</p>
              </div>
            </div>
          )}
        </div>

        {result && (
          <>
            {/* Статистика */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Сделок на стадии
                </p>
                <p className="text-2xl font-semibold text-zinc-900 mt-1">
                  {result.dealsCount}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Выгружено звонков
                </p>
                <p className="text-2xl font-semibold text-zinc-900 mt-1">
                  {result.callsCount}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Найдено паттернов
                </p>
                <p className="text-2xl font-semibold text-emerald-600 mt-1">
                  {result.analysis.winningPatterns.length}
                </p>
              </div>
            </div>

            {/* Резюме */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
              <h2 className="text-base font-semibold text-zinc-900 mb-2">
                Главный вывод Claude
              </h2>
              <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">
                {result.analysis.summary}
              </p>
            </div>

            {/* Пошаговая цепочка: что за чем шло */}
            {result.analysis.stepByStepSequence?.length > 0 && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
                <h2 className="text-base font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-emerald-600" />
                  Что за чем шло и привело к покупке
                </h2>
                <div className="space-y-3">
                  {result.analysis.stepByStepSequence.map((step) => (
                    <div
                      key={step.step}
                      className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 flex gap-4"
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-sm flex items-center justify-center shrink-0">
                        {step.step}
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-zinc-900">
                          {step.stageTitle}
                        </h3>
                        <p className="text-sm text-zinc-700">{step.whatHappened}</p>
                        <p className="text-xs text-emerald-700 font-medium">
                          Почему сработало: {step.whyItWorked}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Общие паттерны успеха */}
            {result.analysis.winningPatterns.length > 0 && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
                <h2 className="text-base font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Общие паттерны, которые привели к закрытию
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.analysis.winningPatterns.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-zinc-900">
                          {p.pattern}
                        </h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium shrink-0">
                          {p.frequency}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-600">{p.description}</p>
                      {p.examples?.length > 0 && (
                        <div className="pt-1 space-y-1">
                          {p.examples.map((ex, eIdx) => (
                            <p
                              key={eIdx}
                              className="text-xs text-zinc-500 italic border-l-2 border-zinc-300 pl-2"
                            >
                              «{ex}»
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Возражения и поворотные моменты */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {result.analysis.commonObjectionsAndSolutions.length > 0 && (
                <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
                  <h2 className="text-base font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                    <MessageSquareWarning className="w-4 h-4 text-amber-600" />
                    Возражения и успешные ответы
                  </h2>
                  <div className="space-y-3">
                    {result.analysis.commonObjectionsAndSolutions.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
                        <p className="text-xs font-semibold text-zinc-800">
                          Возражение: {item.objection}
                        </p>
                        <p className="text-xs text-zinc-600">
                          Ответ: {item.winningResponse}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.analysis.recommendations.length > 0 && (
                <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
                  <h2 className="text-base font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-blue-600" />
                    Рекомендации для команды
                  </h2>
                  <ul className="space-y-2 text-sm text-zinc-700 list-disc pl-5">
                    {result.analysis.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Разбор звонков по сделкам на кусочки */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
              <h2 className="text-base font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-zinc-700" />
                Звонки по сделкам ({callsByDeal.length})
              </h2>
              <div className="space-y-3">
                {callsByDeal.map((deal) => {
                  const isDealOpen = !!expandedDeals[deal.dealId];
                  return (
                    <div
                      key={deal.dealId}
                      className="border border-zinc-200 rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() => toggleDeal(deal.dealId)}
                        className="w-full px-4 py-3 bg-zinc-50 hover:bg-zinc-100 flex items-center justify-between text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          {isDealOpen ? (
                            <ChevronDown className="w-4 h-4 text-zinc-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-zinc-500" />
                          )}
                          <span className="text-sm font-medium text-zinc-900">
                            {deal.dealName}
                          </span>
                          {deal.dealAmount && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-700">
                              ${deal.dealAmount}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-zinc-500">
                          {deal.calls.length} зв.
                        </span>
                      </button>

                      {isDealOpen && (
                        <div className="divide-y divide-zinc-100 bg-white">
                          {deal.calls.map((call) => {
                            const isCallOpen = !!expandedCalls[call.id];
                            const durationSec = call.durationMs
                              ? Math.round(call.durationMs / 1000)
                              : null;
                            return (
                              <div key={call.id} className="px-4 py-3">
                                <button
                                  onClick={() => toggleCall(call.id)}
                                  className="w-full flex items-center justify-between text-left cursor-pointer"
                                >
                                  <div className="flex items-center gap-2">
                                    {isCallOpen ? (
                                      <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                                    )}
                                    <span className="text-sm text-zinc-800 font-medium">
                                      {call.title || `Звонок #${call.id}`}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                                    {durationSec !== null && (
                                      <span>{durationSec} сек</span>
                                    )}
                                    {call.timestamp && (
                                      <span>
                                        {new Date(call.timestamp).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </button>

                                {isCallOpen && (
                                  <div className="mt-2 pl-5 text-xs text-zinc-600 whitespace-pre-wrap bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                                    {call.body || 'Заметки/транскрипт отсутствуют.'}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
