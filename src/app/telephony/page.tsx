'use client';

import React, { useEffect, useState } from 'react';
import { 
  Headphones, 
  PhoneCall, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  User, 
  TrendingUp, 
  RefreshCw, 
  Play, 
  FileText, 
  X,
  ChevronRight,
  ShieldAlert,
  Award,
  Filter,
  Check,
  Zap,
  PhoneForwarded
} from 'lucide-react';
import { 
  fetchTelephonyDataAction, 
  runGptAnalysisForCallAction,
  getCallTranscriptAction
} from './actions';
import { QuoCall, QuoUser, CallAnalysisResult, ManagerPerformance, TranscriptUtterance } from '@/types/telephony';

export default function TelephonyPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyzingCallId, setAnalyzingCallId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [managers, setManagers] = useState<QuoUser[]>([]);
  const [calls, setCalls] = useState<QuoCall[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, CallAnalysisResult>>({});
  const [performance, setPerformance] = useState<ManagerPerformance[]>([]);

  // Filters
  const [selectedManagerId, setSelectedManagerId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeCallModal, setActiveCallModal] = useState<QuoCall | null>(null);
  const [activeTranscript, setActiveTranscript] = useState<TranscriptUtterance[]>([]);
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  // Custom Criteria & Model
  const [selectedModel, setSelectedModel] = useState<string>('gpt-5.4-mini');
  const [customCriteria, setCustomCriteria] = useState<string>(
    '1. Проверь, выяснил ли менеджер компанию и отрасль клиента.\n2. Была ли озвучена вилка цен.\n3. Назначен ли четкий день и время следующего контакта (Next Step).'
  );
  const [showCriteriaDrawer, setShowCriteriaDrawer] = useState(false);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetchTelephonyDataAction({ forceRefresh: isRefresh });
      if (res.success) {
        setIsLive(res.isLive);
        setManagers(res.managers);
        setCalls(res.calls);
        setAnalyses(res.analyses);
        setPerformance(res.performance);
      }
    } catch (err) {
      console.error('Failed to load telephony data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCallModal = async (call: QuoCall) => {
    setActiveCallModal(call);
    setActiveAudioUrl(call.recordingUrl || null);

    // If already analyzed and transcript exists
    if (analyses[call.id]?.transcript && analyses[call.id].transcript.length > 0) {
      setActiveTranscript(analyses[call.id].transcript);
      return;
    }

    // Otherwise load transcript dynamically from Quo API
    setLoadingTranscript(true);
    setActiveTranscript([]);
    try {
      const res = await getCallTranscriptAction(call.id);
      if (res.success && res.transcript) {
        setActiveTranscript(res.transcript);
        if (res.recordingUrl) setActiveAudioUrl(res.recordingUrl);
      }
    } catch (err) {
      console.error('Failed to load transcript:', err);
    } finally {
      setLoadingTranscript(false);
    }
  };

  const handleRunAnalysis = async (call: QuoCall) => {
    setAnalyzingCallId(call.id);
    try {
      const res = await runGptAnalysisForCallAction(
        call.id, 
        call.userName,
        customCriteria,
        selectedModel
      );
      if (res.success && res.analysis) {
        setAnalyses((prev) => ({
          ...prev,
          [call.id]: res.analysis!,
        }));
      }
    } catch (err) {
      console.error('Failed to analyze call', err);
    } finally {
      setAnalyzingCallId(null);
    }
  };

  // Filtered Calls
  const filteredCalls = calls.filter((call) => {
    if (selectedManagerId !== 'all' && call.userId !== selectedManagerId) return false;
    if (selectedStatus !== 'all' && call.status !== selectedStatus) return false;
    return true;
  });

  // Aggregated KPIs
  const totalCallsCount = calls.length;
  const completedCallsCount = calls.filter((c) => c.status === 'completed').length;
  const missedCallsCount = calls.filter((c) => c.status === 'missed').length;
  const totalDuration = calls.reduce((acc, c) => acc + (c.duration || 0), 0);
  const avgDuration = completedCallsCount > 0 ? Math.round(totalDuration / completedCallsCount) : 0;

  // Call Through Rate (Дозваниваемость живым человеком)
  const outboundCalls = calls.filter((c) => c.direction === 'outbound');
  const totalOutboundCount = outboundCalls.length;
  const answeredOutboundCount = outboundCalls.filter((c) => {
    if (c.status !== 'completed' || (c.duration || 0) <= 10) return false;
    const analysis = analyses[c.id];
    if (analysis?.transcript && analysis.transcript.length > 0) {
      const text = analysis.transcript.map(t => t.text).join(' ').toLowerCase();
      const isVoicemail = text.includes('voice mail') || 
                         text.includes('voicemail') || 
                         text.includes('not available') || 
                         text.includes('leave a message') ||
                         text.includes('record your message') ||
                         text.includes('mailbox') ||
                         text.includes('after the tone');
      const hasCustomerReply = analysis.transcript.some(t => t.speaker === 'customer' && t.text.trim().length > 3);
      return !isVoicemail && hasCustomerReply;
    }
    // Если звонок от 25 сек — высокая вероятность реального контакта
    return (c.duration || 0) >= 25;
  }).length;

  const outboundCallThroughRate = totalOutboundCount > 0 
    ? Math.round((answeredOutboundCount / totalOutboundCount) * 1000) / 10 
    : 0;
  
  const analyzedScores = Object.values(analyses).map((a) => a.score).filter(Boolean);
  const avgDepartmentScore = analyzedScores.length > 0 
    ? Math.round(analyzedScores.reduce((a, b) => a + b, 0) / analyzedScores.length)
    : 0;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}м ${secs < 10 ? '0' : ''}${secs}с`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-16">
      {/* Top Banner & Title */}
      <div className="border-b border-zinc-200 bg-white px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm">
                <Headphones className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
                  Telephony & Call Analytics
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                    isLive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                  }`}>
                    {isLive ? 'Quo Live API' : 'Demo & AI Connected'}
                  </span>
                </h1>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Синхронизация телефонии Quo, статистика по менеджерам и скоринг расшифровок через GPT
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCriteriaDrawer(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50/70 px-3 py-2 text-xs font-semibold text-purple-700 shadow-sm hover:bg-purple-100 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Сценарий и критерии GPT ({selectedModel})
            </button>

            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 hover:text-zinc-900 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-purple-600' : ''}`} />
              {refreshing ? 'Синхронизация из Quo...' : 'Синхронизировать звонки'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Всего звонков</span>
              <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <PhoneCall className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-zinc-900">{totalCallsCount}</span>
              <span className="text-xs text-emerald-600 font-medium">({completedCallsCount} отвечено)</span>
            </div>
            <div className="mt-1 text-[11px] text-zinc-400">
              {missedCallsCount} пропущенных вызовов
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Дозваниваемость</span>
              <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <PhoneForwarded className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-zinc-900">{outboundCallThroughRate}%</span>
              <span className="text-xs text-zinc-400 font-medium">CTR</span>
            </div>
            <div className="mt-1 text-[11px] text-zinc-400">
              {answeredOutboundCount} из {totalOutboundCount} набранных отвечено
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Среднее время</span>
              <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-zinc-900">{formatDuration(avgDuration)}</span>
            </div>
            <div className="mt-1 text-[11px] text-zinc-400">
              Общий хронометраж: {Math.round(totalDuration / 60)} мин
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Качество звонков (AI)</span>
              <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-zinc-900">{avgDepartmentScore}</span>
              <span className="text-xs text-zinc-400 font-medium">/ 100</span>
            </div>
            <div className="mt-1 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              На основе оценки GPT-5.4-mini
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Активные менеджеры</span>
              <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <User className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-zinc-900">{managers.length}</span>
              <span className="text-xs text-zinc-400">в Quo</span>
            </div>
            <div className="mt-1 text-[11px] text-zinc-400">
              Все сотрудники подключены
            </div>
          </div>
        </div>

        {/* Managers Leaderboard */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
                Аналитика по менеджерам (Leaderboard)
              </h2>
            </div>
            <span className="text-xs text-zinc-400">Сортировка по средней оценке диалогов</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-600">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3">Менеджер</th>
                  <th className="px-6 py-3">Всего звонков</th>
                  <th className="px-6 py-3">Входящие / Исходящие</th>
                  <th className="px-6 py-3">Дозваниваемость (CTR)</th>
                  <th className="px-6 py-3">Время в звонках</th>
                  <th className="px-6 py-3">Ср. длина</th>
                  <th className="px-6 py-3">Скор качества (GPT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {performance.map((mgr) => (
                  <tr key={mgr.userId} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
                          {mgr.name.slice(0, 1)}
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900">{mgr.name}</div>
                          <div className="text-[11px] text-zinc-400">{mgr.email || 'Quo Phone Line'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-zinc-900">{mgr.totalCalls}</td>
                    <td className="px-6 py-4">
                      <span className="text-blue-600 font-medium">{mgr.inboundCalls} вх</span>
                      {' / '}
                      <span className="text-indigo-600 font-medium">{mgr.outboundCalls} исх</span>
                    </td>
                    <td className="px-6 py-4">
                      {mgr.outboundCalls > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${
                            mgr.outboundCallThroughRate >= 50
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : mgr.outboundCallThroughRate >= 25
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                          }`}>
                            {mgr.outboundCallThroughRate}%
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            ({mgr.answeredOutboundCalls}/{mgr.outboundCalls})
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{mgr.totalDurationMinutes} мин</td>
                    <td className="px-6 py-4">{mgr.averageDurationMinutes} мин</td>
                    <td className="px-6 py-4">
                      {mgr.averageScore > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getScoreColor(mgr.averageScore)}`}>
                            {mgr.averageScore} / 100
                          </span>
                          <span className="text-[10px] text-zinc-400">({mgr.scoresCount} звонков)</span>
                        </div>
                      ) : (
                        <span className="text-zinc-400 italic">Нет оценок</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Calls Log & Analysis Table */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
                Лента звонков и расшифровок
              </h2>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Filter className="h-3.5 w-3.5" />
                Менеджер:
                <select 
                  value={selectedManagerId} 
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-800 font-medium focus:outline-none focus:ring-1 focus:ring-zinc-950"
                >
                  <option value="all">Все сотрудники</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                Статус:
                <select 
                  value={selectedStatus} 
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-800 font-medium focus:outline-none focus:ring-1 focus:ring-zinc-950"
                >
                  <option value="all">Все</option>
                  <option value="completed">Отвеченные</option>
                  <option value="missed">Пропущенные</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-600">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3">Тип</th>
                  <th className="px-6 py-3">Менеджер</th>
                  <th className="px-6 py-3">Клиент</th>
                  <th className="px-6 py-3">Длительность</th>
                  <th className="px-6 py-3">Дата и время</th>
                  <th className="px-6 py-3">AI Оценка и Саммари</th>
                  <th className="px-6 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredCalls.map((call) => {
                  const analysis = analyses[call.id];
                  const isAnalyzing = analyzingCallId === call.id;

                  return (
                    <tr key={call.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {call.direction === 'inbound' ? (
                            <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[11px] font-semibold">
                              <PhoneIncoming className="h-3 w-3" /> Вход
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[11px] font-semibold">
                              <PhoneOutgoing className="h-3 w-3" /> Исх
                            </span>
                          )}
                          {call.status === 'missed' && (
                            <span className="flex items-center gap-1 text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              Пропущен
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-zinc-900">
                        {call.userName || managers.find(m => m.id === call.userId)?.name || 'Не назначен'}
                      </td>
                      <td className="px-6 py-4 font-mono text-zinc-700">
                        {call.direction === 'inbound' ? call.from : call.to}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {call.duration > 0 ? formatDuration(call.duration) : '—'}
                      </td>
                      <td className="px-6 py-4 text-zinc-600 whitespace-nowrap">
                        <div className="font-medium text-zinc-800">
                          {new Date(call.createdAt).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-sm">
                        {analysis ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${getScoreColor(analysis.score)}`}>
                                {analysis.score} / 100
                              </span>
                              <span className="text-[10px] uppercase font-bold text-zinc-400">
                                {analysis.sentiment}
                              </span>
                            </div>
                            <p className="text-zinc-600 line-clamp-1 text-[11px]">
                              {analysis.summary}
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRunAnalysis(call)}
                            disabled={isAnalyzing}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
                          >
                            <Sparkles className={`h-3 w-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                            {isAnalyzing ? 'GPT анализирует...' : 'Оценить через GPT'}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenCallModal(call)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-900 hover:text-zinc-600 border border-zinc-200 px-3 py-1.5 rounded-lg bg-white shadow-2xs hover:bg-zinc-50 transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Детали
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Call Detail & Transcript Modal */}
      {activeCallModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/80">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-zinc-950 text-white flex items-center justify-center">
                  <Headphones className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">
                    Звонок: {activeCallModal.userName} ↔ {activeCallModal.direction === 'inbound' ? activeCallModal.from : activeCallModal.to}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Длительность: {formatDuration(activeCallModal.duration)} • {new Date(activeCallModal.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveCallModal(null);
                  setActiveTranscript([]);
                  setActiveAudioUrl(null);
                }}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Audio Recording Player */}
              {activeAudioUrl && (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
                    <Headphones className="h-3.5 w-3.5 text-zinc-500" />
                    Запись разговора Quo
                  </div>
                  <audio controls className="w-full h-9">
                    <source src={activeAudioUrl} type="audio/mpeg" />
                    Ваш браузер не поддерживает аудиоэлемент.
                  </audio>
                </div>
              )}

              {/* AI Verdict Section */}
              {analyses[activeCallModal.id] ? (
                <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <h4 className="text-sm font-bold text-zinc-900">AI Оценка качества разговора</h4>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-black border ${getScoreColor(analyses[activeCallModal.id].score)}`}>
                      {analyses[activeCallModal.id].score} / 100
                    </span>
                  </div>

                  <p className="text-xs text-zinc-700 leading-relaxed font-medium">
                    {analyses[activeCallModal.id].summary}
                  </p>

                  {/* Scorecard radar / indicators */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-purple-100/60">
                    <div className="rounded-lg bg-white p-2.5 border border-purple-100 text-center">
                      <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Приветствие</span>
                      <span className="text-sm font-black text-zinc-900">{analyses[activeCallModal.id].scorecard.greeting}/10</span>
                    </div>
                    <div className="rounded-lg bg-white p-2.5 border border-purple-100 text-center">
                      <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Потребности</span>
                      <span className="text-sm font-black text-zinc-900">{analyses[activeCallModal.id].scorecard.needsDiscovery}/10</span>
                    </div>
                    <div className="rounded-lg bg-white p-2.5 border border-purple-100 text-center">
                      <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Возражения</span>
                      <span className="text-sm font-black text-zinc-900">{analyses[activeCallModal.id].scorecard.objectionHandling}/10</span>
                    </div>
                    <div className="rounded-lg bg-white p-2.5 border border-purple-100 text-center">
                      <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Закрытие</span>
                      <span className="text-sm font-black text-zinc-900">{analyses[activeCallModal.id].scorecard.closingAndNextStep}/10</span>
                    </div>
                    <div className="rounded-lg bg-white p-2.5 border border-purple-100 text-center">
                      <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Вежливость</span>
                      <span className="text-sm font-black text-zinc-900">{analyses[activeCallModal.id].scorecard.politeness}/10</span>
                    </div>
                  </div>

                  {/* Strengths and Mistakes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="rounded-lg bg-emerald-50/70 border border-emerald-200/70 p-3">
                      <h5 className="text-[11px] font-bold text-emerald-800 uppercase flex items-center gap-1.5 mb-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Сильные стороны менеджера
                      </h5>
                      <ul className="space-y-1.5 text-xs text-emerald-950">
                        {analyses[activeCallModal.id].managerStrengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-500 font-bold">•</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-lg bg-rose-50/70 border border-rose-200/70 p-3">
                      <h5 className="text-[11px] font-bold text-rose-800 uppercase flex items-center gap-1.5 mb-2">
                        <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                        Ошибки и точки роста
                      </h5>
                      <ul className="space-y-1.5 text-xs text-rose-950">
                        {analyses[activeCallModal.id].managerMistakes.length > 0 ? (
                          analyses[activeCallModal.id].managerMistakes.map((m, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-rose-500 font-bold">•</span> {m}
                            </li>
                          ))
                        ) : (
                          <li className="text-zinc-500 italic">Ошибок в регламенте не обнаружено</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Agreements */}
                  {analyses[activeCallModal.id].agreements.length > 0 && (
                    <div className="rounded-lg bg-white border border-purple-100 p-3">
                      <h5 className="text-[11px] font-bold text-zinc-700 uppercase mb-2 flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        Зафиксированные договоренности
                      </h5>
                      <ul className="space-y-1 text-xs text-zinc-700">
                        {analyses[activeCallModal.id].agreements.map((a, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <Check className="h-3 w-3 text-emerald-600" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-center space-y-2">
                  <p className="text-xs text-zinc-600">Этот звонок еще не оценивался через GPT.</p>
                  <button
                    onClick={() => handleRunAnalysis(activeCallModal)}
                    disabled={analyzingCallId === activeCallModal.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 text-white px-4 py-2 text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {analyzingCallId === activeCallModal.id ? 'Анализирую...' : 'Запустить AI-оценку звонка'}
                  </button>
                </div>
              )}

              {/* Dialog Transcript */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-zinc-400" />
                    Полная стенограмма разговора
                  </h4>
                  {loadingTranscript && (
                    <span className="text-[11px] text-zinc-400 animate-pulse">Загрузка расшифровки...</span>
                  )}
                </div>

                <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 max-h-72 overflow-y-auto">
                  {(() => {
                    const transcriptList = (analyses[activeCallModal.id]?.transcript && analyses[activeCallModal.id].transcript.length > 0)
                      ? analyses[activeCallModal.id].transcript
                      : (activeTranscript || []);

                    if (transcriptList.length > 0) {
                      return transcriptList.map((msg, i) => (
                        <div
                          key={i}
                          className={`flex flex-col ${
                            msg.speaker === 'agent' ? 'items-end' : 'items-start'
                          }`}
                        >
                          <span className="text-[10px] font-bold text-zinc-400 mb-1 px-1">
                            {msg.speaker === 'agent' ? (msg.speakerName || 'Менеджер') : 'Клиент'}
                          </span>
                          <div
                            className={`rounded-2xl px-3.5 py-2 text-xs max-w-[85%] leading-relaxed ${
                              msg.speaker === 'agent'
                                ? 'bg-zinc-900 text-white rounded-tr-xs'
                                : 'bg-white border border-zinc-200 text-zinc-800 rounded-tl-xs shadow-2xs'
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      ));
                    }

                    return (
                      <div className="text-center py-6 text-xs text-zinc-400">
                        {loadingTranscript
                          ? 'Загружаем стенограмму из Quo...'
                          : 'Стенограмма для этого звонка отсутствует в Quo или разговор еще не расшифрован.'}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Criteria & Script Settings Modal */}
      {showCriteriaDrawer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-xl w-full flex flex-col overflow-hidden animate-in fade-in duration-200">
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/80">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Сценарий и критерии оценки звонков</h3>
                  <p className="text-[11px] text-zinc-500">Настройте модель и правила, по которым GPT оценивает менеджеров</p>
                </div>
              </div>
              <button
                onClick={() => setShowCriteriaDrawer(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-1.5">
                  Модель OpenAI
                </label>
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-purple-600 bg-purple-50/60 text-purple-950 ring-1 ring-purple-600 text-xs font-bold">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    GPT-5.4-MINI
                  </span>
                  <span className="text-[10px] font-semibold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full">
                    Активна
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-1.5">
                  Ваш сценарий и правила проверки менеджера
                </label>
                <textarea
                  rows={6}
                  value={customCriteria}
                  onChange={(e) => setCustomCriteria(e.target.value)}
                  placeholder="Напишите здесь обязательные пункты, скрипт или стоп-слова, которые должен проверить GPT..."
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all font-sans"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  GPT будет проверять диалог по этим пунктам, снижать балл за нарушения и выписывать замечания менеджеру.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCriteriaDrawer(false)}
                  className="rounded-xl bg-zinc-900 text-white px-5 py-2.5 text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs"
                >
                  Применить сценарий
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
