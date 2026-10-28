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
  PhoneForwarded,
  Trash2,
  BarChart3
} from 'lucide-react';
import { 
  fetchTelephonyDataAction, 
  runGptAnalysisForCallAction,
  getCallTranscriptAction,
  deleteCallAnalysisAction,
  saveCallScorerSkillAction
} from './actions';
import { QuoCall, QuoUser, CallAnalysisResult, ManagerPerformance, TranscriptUtterance, InsurvoiceCallType } from '@/types/telephony';

export default function TelephonyPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyzingCallIds, setAnalyzingCallIds] = useState<Record<string, boolean>>({});
  const [deletingCallIds, setDeletingCallIds] = useState<Record<string, boolean>>({});
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

  // Skill (SKILL.md), Model & Language
  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  const isEn = lang === 'en';
  const [selectedModel, setSelectedModel] = useState<string>('gpt-6.1-terra');
  const [selectedCallType, setSelectedCallType] = useState<InsurvoiceCallType>('Auto');
  const [showCheckpointsList, setShowCheckpointsList] = useState<boolean>(true);
  const [customCriteria, setCustomCriteria] = useState<string>('');
  const [savingSkill, setSavingSkill] = useState<boolean>(false);
  const [skillSavedStatus, setSkillSavedStatus] = useState<string | null>(null);
  const [showCriteriaDrawer, setShowCriteriaDrawer] = useState(false);
  const [showChangelogModal, setShowChangelogModal] = useState(false);
  const [activeChartMetric, setActiveChartMetric] = useState<'calls' | 'ctr' | 'duration' | 'score' | 'managers' | null>(null);

  useEffect(() => {
    try {
      const savedLang = window.localStorage.getItem('telephony_lang');
      if (savedLang === 'en' || savedLang === 'ru') {
        setLang(savedLang);
      }
    } catch {}
  }, []);

  const handleToggleLang = (nextLang: 'ru' | 'en') => {
    setLang(nextLang);
    try {
      window.localStorage.setItem('telephony_lang', nextLang);
    } catch {}
  };

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
        if (res.skillContent && !isRefresh) {
          setCustomCriteria(res.skillContent);
        }
      }
    } catch (err) {
      console.error('Failed to load telephony data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSaveSkill = async () => {
    setSavingSkill(true);
    setSkillSavedStatus(null);
    try {
      const res = await saveCallScorerSkillAction(customCriteria);
      if (res.success) {
        setSkillSavedStatus(
          isEn
            ? 'Skill saved to .agent/skills/insurvoice-call-scorer/SKILL.md'
            : 'Скилл сохранён в .agent/skills/insurvoice-call-scorer/SKILL.md'
        );
        setTimeout(() => setSkillSavedStatus(null), 4000);
      } else if (res.error) {
        alert(res.error);
      }
    } catch (err) {
      console.error('Failed to save skill', err);
    } finally {
      setSavingSkill(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCallModal = async (call: QuoCall) => {
    setActiveCallModal(call);
    setActiveAudioUrl(call.recordingUrl || null);

    const existingTranscript = analyses[call.id]?.transcript || [];
    if (existingTranscript.length > 0) {
      setActiveTranscript(existingTranscript);
      // If recordingUrl is already known on the call object, no further fetch needed
      if (call.recordingUrl) {
        return;
      }
    } else {
      setLoadingTranscript(true);
      setActiveTranscript([]);
    }

    // Load transcript and/or recordingUrl dynamically from Quo API
    try {
      const res = await getCallTranscriptAction(call.id);
      if (res.success) {
        if (res.transcript && res.transcript.length > 0 && existingTranscript.length === 0) {
          setActiveTranscript(res.transcript);
        }
        if (res.recordingUrl) {
          setActiveAudioUrl(res.recordingUrl);
          setCalls((prev) =>
            prev.map((c) => (c.id === call.id ? { ...c, recordingUrl: res.recordingUrl!, hasRecording: true } : c))
          );
        }
      }
    } catch (err) {
      console.error('Failed to load transcript or recording:', err);
    } finally {
      setLoadingTranscript(false);
    }
  };

  const handleRunAnalysis = async (call: QuoCall) => {
    setAnalyzingCallIds((prev) => ({ ...prev, [call.id]: true }));
    try {
      const response = await fetch('/api/telephony/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: call.id,
          managerName: call.userName,
          customCriteria,
          model: selectedModel,
          callType: 'Auto',
          durationSeconds: call.duration,
          lang,
        }),
      });
      const res = await response.json();
      if (res.success && res.analysis) {
        setAnalyses((prev) => ({
          ...prev,
          [call.id]: res.analysis!,
        }));
      } else if (res.error) {
        alert(res.error);
      }
    } catch (err) {
      console.error('Failed to analyze call', err);
    } finally {
      setAnalyzingCallIds((prev) => {
        const next = { ...prev };
        delete next[call.id];
        return next;
      });
    }
  };

  const handleRemoveAnalysis = async (callId: string) => {
    setDeletingCallIds((prev) => ({ ...prev, [callId]: true }));
    try {
      const existingTranscript = analyses[callId]?.transcript;
      if (existingTranscript && existingTranscript.length > 0 && activeTranscript.length === 0) {
        setActiveTranscript(existingTranscript);
      }

      const res = await deleteCallAnalysisAction(callId);
      if (res.success) {
        setAnalyses((prev) => {
          const next = { ...prev };
          delete next[callId];
          return next;
        });
      } else if (res.error) {
        alert(res.error);
      }
    } catch (err) {
      console.error('Failed to remove analysis', err);
    } finally {
      setDeletingCallIds((prev) => {
        const next = { ...prev };
        delete next[callId];
        return next;
      });
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
      const isVoicemail = analysis.score === 0 ||
                         text.includes('record your name and reason') ||
                         text.includes('see if this person is available') ||
                         text.includes('person is not available') ||
                         text.includes('leave an additional message') ||
                         text.includes('leave your message') ||
                         text.includes('voice mail') || 
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

  // Daily aggregation for charts (sorted chronologically by day)
  const dailyStats = React.useMemo(() => {
    const map = new Map<
      string,
      {
        dateKey: string;
        label: string;
        totalCalls: number;
        completedCalls: number;
        outboundCalls: number;
        answeredOutbound: number;
        totalDurationSec: number;
        scores: number[];
        managerIds: Set<string>;
      }
    >();

    calls.forEach((c) => {
      if (!c.createdAt) return;
      const d = new Date(c.createdAt);
      if (isNaN(d.getTime())) return;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;
      const label = `${dd}.${mm}`;

      if (!map.has(dateKey)) {
        map.set(dateKey, {
          dateKey,
          label,
          totalCalls: 0,
          completedCalls: 0,
          outboundCalls: 0,
          answeredOutbound: 0,
          totalDurationSec: 0,
          scores: [],
          managerIds: new Set<string>(),
        });
      }

      const entry = map.get(dateKey)!;
      entry.totalCalls += 1;
      if (c.status === 'completed') {
        entry.completedCalls += 1;
        entry.totalDurationSec += c.duration || 0;
      }
      if (c.userId) {
        entry.managerIds.add(c.userId);
      }

      const analysis = analyses[c.id];
      if (analysis?.score && analysis.score > 0) {
        entry.scores.push(analysis.score);
      }

      if (c.direction === 'outbound') {
        entry.outboundCalls += 1;
        let isHuman = false;
        if (c.status === 'completed' && (c.duration || 0) > 10) {
          if (analysis?.transcript && analysis.transcript.length > 0) {
            const text = analysis.transcript.map((t) => t.text).join(' ').toLowerCase();
            const isVm =
              analysis.score === 0 ||
              text.includes('record your name and reason') ||
              text.includes('see if this person is available') ||
              text.includes('person is not available') ||
              text.includes('leave an additional message') ||
              text.includes('leave your message') ||
              text.includes('voice mail') ||
              text.includes('voicemail') ||
              text.includes('not available') ||
              text.includes('leave a message') ||
              text.includes('record your message') ||
              text.includes('mailbox') ||
              text.includes('after the tone');
            const hasCustomerReply = analysis.transcript.some(
              (t) => t.speaker === 'customer' && t.text.trim().length > 3
            );
            isHuman = !isVm && hasCustomerReply;
          } else {
            isHuman = (c.duration || 0) >= 25;
          }
        }
        if (isHuman) {
          entry.answeredOutbound += 1;
        }
      }
    });

    return Array.from(map.values())
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .map((item) => ({
        dateKey: item.dateKey,
        label: item.label,
        calls: item.totalCalls,
        completedCalls: item.completedCalls,
        ctr:
          item.outboundCalls > 0
            ? Math.round((item.answeredOutbound / item.outboundCalls) * 1000) / 10
            : 0,
        duration:
          item.completedCalls > 0
            ? Math.round(item.totalDurationSec / item.completedCalls)
            : 0,
        totalMinutes: Math.round(item.totalDurationSec / 60),
        score:
          item.scores.length > 0
            ? Math.round(item.scores.reduce((a, b) => a + b, 0) / item.scores.length)
            : 0,
        scoredCount: item.scores.length,
        managers: item.managerIds.size,
      }));
  }, [calls, analyses]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return isEn ? `${mins}m ${secs < 10 ? '0' : ''}${secs}s` : `${mins}м ${secs < 10 ? '0' : ''}${secs}с`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 70) return 'text-teal-700 bg-teal-50 border-teal-200';
    if (score >= 55) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  const getBandInfo = (score: number, band?: string) => {
    if (score === 0) {
      return {
        label: isEn ? 'Voicemail / AI Screener' : 'Автоответчик / ИИ-ассистент',
        className: 'bg-zinc-100 text-zinc-600 border-zinc-300',
      };
    }
    const resolvedBand =
      band || (score >= 85 ? 'Strong' : score >= 70 ? 'Solid' : score >= 55 ? 'Needs Coaching' : 'Priority Focus');
    if (resolvedBand === 'Strong') {
      return {
        label: isEn ? 'Strong (85–100)' : 'Strong (Сильный)',
        className: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      };
    }
    if (resolvedBand === 'Solid') {
      return {
        label: isEn ? 'Solid (70–84)' : 'Solid (Хороший)',
        className: 'bg-teal-100 text-teal-800 border-teal-300',
      };
    }
    if (resolvedBand === 'Needs Coaching') {
      return {
        label: isEn ? 'Needs Coaching (55–69)' : 'Needs Coaching (Коучинг)',
        className: 'bg-amber-100 text-amber-800 border-amber-300',
      };
    }
    return {
      label: isEn ? 'Priority Focus (<55)' : 'Priority Focus (В разбор)',
      className: 'bg-rose-100 text-rose-800 border-rose-300',
    };
  };

  const getSectionDisplayTitle = (sec: { id: string; title: string; shortTitle?: string }) => {
    if (!isEn) return sec.title;
    const enTitles: Record<string, string> = {
      opening: '1. Opening & Rapport',
      discovery: '2. Qualification & Discovery',
      pain: '3. Pain & Impact Quantification',
      demo: '4. Solution Fit / Demo',
      objections: '5. Objection Handling',
      close: '6. Close & Next Steps',
      presence: '7. Call Presence & Pacing',
    };
    return enTitles[sec.id] || sec.shortTitle || sec.title;
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
                  {isEn
                    ? 'Quo telephony sync, AE leaderboard analytics & GPT call rubric scoring'
                    : 'Синхронизация телефонии Quo, статистика по менеджерам и скоринг расшифровок через GPT'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* RU / EN Language Switcher */}
            <div className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-100 p-0.5">
              <button
                type="button"
                onClick={() => handleToggleLang('ru')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  !isEn ? 'bg-zinc-900 text-white shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                RU
              </button>
              <button
                type="button"
                onClick={() => handleToggleLang('en')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  isEn ? 'bg-zinc-900 text-white shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                EN
              </button>
            </div>

            <button
              onClick={() => setShowChangelogModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
            >
              <FileText className="h-3.5 w-3.5 text-zinc-500" />
              {isEn ? 'Changelog' : 'Лог изменений'}
              <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                {isEn ? 'Oct 27' : '27 окт'}
              </span>
            </button>

            <button
              onClick={() => setShowCriteriaDrawer(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50/70 px-3 py-2 text-xs font-semibold text-purple-700 shadow-sm hover:bg-purple-100 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isEn ? `GPT Skill & Rubric (${selectedModel})` : `Сценарий и критерии GPT (${selectedModel})`}
            </button>

            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 hover:text-zinc-900 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-purple-600' : ''}`} />
              {refreshing
                ? isEn
                  ? 'Syncing from Quo...'
                  : 'Синхронизация из Quo...'
                : isEn
                ? 'Sync Calls'
                : 'Синхронизировать звонки'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div
            className={`rounded-xl border bg-white p-5 shadow-xs flex flex-col justify-between transition-all ${
              activeChartMetric === 'calls' ? 'border-blue-500 ring-2 ring-blue-500/15' : 'border-zinc-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  {isEn ? 'Total Calls' : 'Всего звонков'}
                </span>
                <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <PhoneCall className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-zinc-900">{totalCallsCount}</span>
                <span className="text-xs text-emerald-600 font-medium">
                  ({completedCallsCount} {isEn ? 'completed' : 'отвечено'})
                </span>
              </div>
              <div className="mt-1 text-[11px] text-zinc-400">
                {missedCallsCount} {isEn ? 'missed calls' : 'пропущенных вызовов'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveChartMetric((prev) => (prev === 'calls' ? null : 'calls'))}
              className={`mt-3 pt-2.5 border-t border-zinc-100 w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold transition-colors ${
                activeChartMetric === 'calls'
                  ? 'text-blue-600'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              {activeChartMetric === 'calls'
                ? isEn
                  ? 'Hide Chart'
                  : 'Скрыть график'
                : isEn
                ? 'Show Chart'
                : 'Показать график'}
            </button>
          </div>

          <div
            className={`rounded-xl border bg-white p-5 shadow-xs flex flex-col justify-between transition-all ${
              activeChartMetric === 'ctr' ? 'border-teal-500 ring-2 ring-teal-500/15' : 'border-zinc-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  {isEn ? 'Connect Rate' : 'Дозваниваемость'}
                </span>
                <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <PhoneForwarded className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-zinc-900">{outboundCallThroughRate}%</span>
                <span className="text-xs text-zinc-400 font-medium">CTR</span>
              </div>
              <div className="mt-1 text-[11px] text-zinc-400">
                {isEn
                  ? `${answeredOutboundCount} of ${totalOutboundCount} outbound answered`
                  : `${answeredOutboundCount} из ${totalOutboundCount} набранных отвечено`}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveChartMetric((prev) => (prev === 'ctr' ? null : 'ctr'))}
              className={`mt-3 pt-2.5 border-t border-zinc-100 w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold transition-colors ${
                activeChartMetric === 'ctr'
                  ? 'text-teal-600'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              {activeChartMetric === 'ctr'
                ? isEn
                  ? 'Hide Chart'
                  : 'Скрыть график'
                : isEn
                ? 'Show Chart'
                : 'Показать график'}
            </button>
          </div>

          <div
            className={`rounded-xl border bg-white p-5 shadow-xs flex flex-col justify-between transition-all ${
              activeChartMetric === 'duration' ? 'border-amber-500 ring-2 ring-amber-500/15' : 'border-zinc-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  {isEn ? 'Avg Duration' : 'Среднее время'}
                </span>
                <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-zinc-900">{formatDuration(avgDuration)}</span>
              </div>
              <div className="mt-1 text-[11px] text-zinc-400">
                {isEn
                  ? `Total talk time: ${Math.round(totalDuration / 60)} min`
                  : `Общий хронометраж: ${Math.round(totalDuration / 60)} мин`}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveChartMetric((prev) => (prev === 'duration' ? null : 'duration'))}
              className={`mt-3 pt-2.5 border-t border-zinc-100 w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold transition-colors ${
                activeChartMetric === 'duration'
                  ? 'text-amber-600'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              {activeChartMetric === 'duration'
                ? isEn
                  ? 'Hide Chart'
                  : 'Скрыть график'
                : isEn
                ? 'Show Chart'
                : 'Показать график'}
            </button>
          </div>

          <div
            className={`rounded-xl border bg-white p-5 shadow-xs flex flex-col justify-between transition-all ${
              activeChartMetric === 'score' ? 'border-purple-500 ring-2 ring-purple-500/15' : 'border-zinc-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  {isEn ? 'Call Quality (AI)' : 'Качество звонков (AI)'}
                </span>
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
                {isEn ? 'Scored by ' : 'На основе оценки '}
                {selectedModel === 'gpt-6-luna' ? 'GPT-6 Luna' : 'GPT-6.1 Terra'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveChartMetric((prev) => (prev === 'score' ? null : 'score'))}
              className={`mt-3 pt-2.5 border-t border-zinc-100 w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold transition-colors ${
                activeChartMetric === 'score'
                  ? 'text-purple-600'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              {activeChartMetric === 'score'
                ? isEn
                  ? 'Hide Chart'
                  : 'Скрыть график'
                : isEn
                ? 'Show Chart'
                : 'Показать график'}
            </button>
          </div>

          <div
            className={`rounded-xl border bg-white p-5 shadow-xs flex flex-col justify-between transition-all ${
              activeChartMetric === 'managers' ? 'border-emerald-500 ring-2 ring-emerald-500/15' : 'border-zinc-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  {isEn ? 'Active AEs' : 'Активные менеджеры'}
                </span>
                <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-zinc-900">{managers.length}</span>
                <span className="text-xs text-zinc-400">{isEn ? 'in Quo' : 'в Quo'}</span>
              </div>
              <div className="mt-1 text-[11px] text-zinc-400">
                {isEn ? 'All team members connected' : 'Все сотрудники подключены'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveChartMetric((prev) => (prev === 'managers' ? null : 'managers'))}
              className={`mt-3 pt-2.5 border-t border-zinc-100 w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold transition-colors ${
                activeChartMetric === 'managers'
                  ? 'text-emerald-600'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              {activeChartMetric === 'managers'
                ? isEn
                  ? 'Hide Chart'
                  : 'Скрыть график'
                : isEn
                ? 'Show Chart'
                : 'Показать график'}
            </button>
          </div>
        </div>

        {/* Daily Metric Chart Panel */}
        {activeChartMetric && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs animate-in fade-in duration-200">
            {(() => {
              const metricConfig = {
                calls: {
                  title: isEn ? 'Daily Call Volume' : 'Динамика количества звонков по дням',
                  subtitle: isEn ? 'Total calls per day' : 'Общее число звонков за каждый день',
                  color: '#2563eb',
                  bgLight: 'bg-blue-50 text-blue-700 border-blue-200',
                  format: (v: number) => (isEn ? `${v}` : `${v} зв.`),
                },
                ctr: {
                  title: isEn ? 'Daily Connect Rate (CTR %)' : 'Динамика дозваниваемости (CTR %) по дням',
                  subtitle: isEn
                    ? 'Percentage of outbound calls answered by a live person'
                    : 'Процент исходящих звонков с ответом живого человека',
                  color: '#0d9488',
                  bgLight: 'bg-teal-50 text-teal-700 border-teal-200',
                  format: (v: number) => `${v}%`,
                },
                duration: {
                  title: isEn ? 'Average Call Duration by Day' : 'Средняя длительность звонка по дням',
                  subtitle: isEn
                    ? 'Average talk time across completed calls'
                    : 'Среднее время разговора по завершённым звонкам',
                  color: '#d97706',
                  bgLight: 'bg-amber-50 text-amber-700 border-amber-200',
                  format: (v: number) => formatDuration(v),
                },
                score: {
                  title: isEn ? 'Average AI Quality Score by Day' : 'Средний скор качества (AI) по дням',
                  subtitle: isEn
                    ? 'Mean score across evaluated calls (Insurvoice Scorecard v1.0)'
                    : 'Средний балл по оцененным звонкам (Insurvoice Scorecard v1.0)',
                  color: '#9333ea',
                  bgLight: 'bg-purple-50 text-purple-700 border-purple-200',
                  format: (v: number) => (v > 0 ? `${v} / 100` : '—'),
                },
                managers: {
                  title: isEn ? 'Active AEs by Day' : 'Активные менеджеры по дням',
                  subtitle: isEn
                    ? 'Number of reps who made or received calls on that day'
                    : 'Количество менеджеров, совершавших звонки в этот день',
                  color: '#059669',
                  bgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  format: (v: number) => (isEn ? `${v} AEs` : `${v} чел.`),
                },
              }[activeChartMetric];

              const values = dailyStats.map((d) => d[activeChartMetric]);
              const maxVal = Math.max(...values, 1);

              return (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-zinc-700" />
                        <h3 className="text-sm font-bold text-zinc-900">{metricConfig.title}</h3>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">{metricConfig.subtitle}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {(
                        [
                          { id: 'calls', label: isEn ? 'Total Calls' : 'Всего звонков' },
                          { id: 'ctr', label: isEn ? 'Connect Rate' : 'Дозваниваемость' },
                          { id: 'duration', label: isEn ? 'Avg Duration' : 'Среднее время' },
                          { id: 'score', label: isEn ? 'Quality (AI)' : 'Качество (AI)' },
                          { id: 'managers', label: isEn ? 'Active AEs' : 'Менеджеры' },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveChartMetric(tab.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                            activeChartMetric === tab.id
                              ? 'bg-zinc-900 text-white border-zinc-900'
                              : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setActiveChartMetric(null)}
                        className="ml-1 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                        title={isEn ? 'Close chart' : 'Закрыть график'}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {dailyStats.length === 0 ? (
                    <div className="py-10 text-center text-xs text-zinc-400">
                      {isEn ? 'No call data available to plot chart' : 'Нет данных по звонкам для построения графика'}
                    </div>
                  ) : (
                    <div className="pt-2">
                      {/* Bar + Trend visual by day */}
                      <div className="grid grid-flow-col auto-cols-fr gap-3 items-end h-52 pt-6 pb-2 px-2 border-b border-zinc-200 overflow-x-auto">
                        {dailyStats.map((day) => {
                          const val = day[activeChartMetric];
                          const heightPct = Math.max(Math.round((val / maxVal) * 100), val > 0 ? 8 : 2);
                          return (
                            <div
                              key={day.dateKey}
                              className="flex flex-col items-center justify-end h-full min-w-[48px] group"
                            >
                              <span className="text-[11px] font-bold text-zinc-800 mb-1.5 whitespace-nowrap">
                                {metricConfig.format(val)}
                              </span>
                              <div className="w-full max-w-[44px] h-36 flex items-end justify-center bg-zinc-50 rounded-t-lg overflow-hidden p-0.5">
                                <div
                                  className="w-full rounded-t-md transition-all duration-300 group-hover:opacity-85"
                                  style={{
                                    height: `${heightPct}%`,
                                    backgroundColor: val > 0 ? metricConfig.color : '#e4e4e7',
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* X-Axis Day Labels */}
                      <div className="grid grid-flow-col auto-cols-fr gap-3 pt-2 px-2 overflow-x-auto">
                        {dailyStats.map((day) => (
                          <div key={day.dateKey} className="text-center min-w-[48px]">
                            <div className="text-xs font-bold text-zinc-700">{day.label}</div>
                            <div className="text-[10px] text-zinc-400">
                              {day.calls} {isEn ? 'calls' : 'зв.'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Managers Leaderboard */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
                {isEn ? 'AE Performance Leaderboard' : 'Аналитика по менеджерам (Leaderboard)'}
              </h2>
            </div>
            <span className="text-xs text-zinc-400">
              {isEn ? 'Sorted by average call quality score' : 'Сортировка по средней оценке диалогов'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-600">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3">{isEn ? 'Account Executive' : 'Менеджер'}</th>
                  <th className="px-6 py-3">{isEn ? 'Total Calls' : 'Всего звонков'}</th>
                  <th className="px-6 py-3">{isEn ? 'Inbound / Outbound' : 'Входящие / Исходящие'}</th>
                  <th className="px-6 py-3">{isEn ? 'Connect Rate (CTR)' : 'Дозваниваемость (CTR)'}</th>
                  <th className="px-6 py-3">{isEn ? 'Talk Time' : 'Время в звонках'}</th>
                  <th className="px-6 py-3">{isEn ? 'Avg Length' : 'Ср. длина'}</th>
                  <th className="px-6 py-3">{isEn ? 'Quality Score (GPT)' : 'Скор качества (GPT)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {performance.map((mgr) => {
                  const mgrScoredCalls = calls
                    .filter((c) => (c.userId || managers[0]?.id) === mgr.userId)
                    .map((c) => analyses[c.id]?.score)
                    .filter((s): s is number => typeof s === 'number' && s > 0);
                  const liveScoresCount = mgrScoredCalls.length;
                  const liveAvgScore =
                    liveScoresCount > 0
                      ? Math.round(mgrScoredCalls.reduce((a, b) => a + b, 0) / liveScoresCount)
                      : 0;

                  return (
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
                    <td className="px-6 py-4 font-bold text-zinc-900 whitespace-nowrap">{mgr.totalCalls}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-blue-600 font-medium">
                        {mgr.inboundCalls} {isEn ? 'in' : 'вх'}
                      </span>
                      {' / '}
                      <span className="text-indigo-600 font-medium">
                        {mgr.outboundCalls} {isEn ? 'out' : 'исх'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {mgr.outboundCalls > 0 ? (
                        <div className="inline-flex items-center gap-2 whitespace-nowrap">
                          <span className={`shrink-0 whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-bold border ${
                            mgr.outboundCallThroughRate >= 50
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : mgr.outboundCallThroughRate >= 25
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                          }`}>
                            {mgr.outboundCallThroughRate}%
                          </span>
                          <span className="shrink-0 whitespace-nowrap text-[11px] text-zinc-400">
                            ({mgr.answeredOutboundCalls}/{mgr.outboundCalls})
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {mgr.totalDurationMinutes} {isEn ? 'min' : 'мин'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {mgr.averageDurationMinutes} {isEn ? 'min' : 'мин'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {liveAvgScore > 0 ? (
                        <div className="inline-flex items-center gap-2 whitespace-nowrap">
                          <span className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-bold border ${getScoreColor(liveAvgScore)}`}>
                            {liveAvgScore} / 100
                          </span>
                          <span className="shrink-0 whitespace-nowrap text-[10px] text-zinc-400">
                            ({liveScoresCount} {isEn ? 'calls' : 'звонков'})
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-400 italic whitespace-nowrap">
                          {isEn ? 'No scores yet' : 'Нет оценок'}
                        </span>
                      )}
                    </td>
                  </tr>
                  );
                })}
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
                {isEn ? 'Call Log & Transcripts' : 'Лента звонков и расшифровок'}
              </h2>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-3">
              {Object.keys(analyzingCallIds).length > 0 && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200 px-2.5 py-1 text-[11px] font-bold text-purple-700">
                  <Sparkles className="h-3 w-3 animate-spin" />
                  {isEn
                    ? `Scoring in parallel: ${Object.keys(analyzingCallIds).length}`
                    : `В параллельной оценке: ${Object.keys(analyzingCallIds).length} зв.`}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Filter className="h-3.5 w-3.5" />
                {isEn ? 'AE:' : 'Менеджер:'}
                <select 
                  value={selectedManagerId} 
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-800 font-medium focus:outline-none focus:ring-1 focus:ring-zinc-950"
                >
                  <option value="all">{isEn ? 'All team members' : 'Все сотрудники'}</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                {isEn ? 'Status:' : 'Статус:'}
                <select 
                  value={selectedStatus} 
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-800 font-medium focus:outline-none focus:ring-1 focus:ring-zinc-950"
                >
                  <option value="all">{isEn ? 'All' : 'Все'}</option>
                  <option value="completed">{isEn ? 'Completed' : 'Отвеченные'}</option>
                  <option value="missed">{isEn ? 'Missed' : 'Пропущенные'}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-600">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3">{isEn ? 'Type' : 'Тип'}</th>
                  <th className="px-6 py-3">{isEn ? 'AE' : 'Менеджер'}</th>
                  <th className="px-6 py-3">{isEn ? 'Prospect' : 'Клиент'}</th>
                  <th className="px-6 py-3">{isEn ? 'Duration' : 'Длительность'}</th>
                  <th className="px-6 py-3">{isEn ? 'Date & Time' : 'Дата и время'}</th>
                  <th className="px-6 py-3">{isEn ? 'AI Score & Summary' : 'AI Оценка и Саммари'}</th>
                  <th className="px-6 py-3 text-right">{isEn ? 'Actions' : 'Действия'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredCalls.map((call) => {
                  const analysis = analyses[call.id];
                  const isAnalyzing = !!analyzingCallIds[call.id];

                  return (
                    <tr key={call.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {call.direction === 'inbound' ? (
                            <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[11px] font-semibold">
                              <PhoneIncoming className="h-3 w-3" /> {isEn ? 'In' : 'Вход'}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[11px] font-semibold">
                              <PhoneOutgoing className="h-3 w-3" /> {isEn ? 'Out' : 'Исх'}
                            </span>
                          )}
                          {call.status === 'missed' && (
                            <span className="flex items-center gap-1 text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {isEn ? 'Missed' : 'Пропущен'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-zinc-900">
                        {call.userName || managers.find(m => m.id === call.userId)?.name || (isEn ? 'Unassigned' : 'Не назначен')}
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
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                  analysis.score === 0
                                    ? 'bg-zinc-100 text-zinc-600 border-zinc-200'
                                    : getScoreColor(analysis.score)
                                }`}
                              >
                                {analysis.score === 0
                                  ? isEn
                                    ? 'Voicemail / N/A'
                                    : 'Автоответчик / N/A'
                                  : `${analysis.score} / 100`}
                              </span>
                              {analysis.score > 0 && (
                                <span className="text-[10px] uppercase font-bold text-zinc-400">
                                  {analysis.sentiment}
                                </span>
                              )}
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
                            {isAnalyzing
                              ? isEn
                                ? 'Scoring with GPT...'
                                : 'GPT анализирует...'
                              : isEn
                              ? 'Score with GPT'
                              : 'Оценить через GPT'}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenCallModal(call)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-900 hover:text-zinc-600 border border-zinc-200 px-3 py-1.5 rounded-lg bg-white shadow-2xs hover:bg-zinc-50 transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {isEn ? 'Details' : 'Детали'}
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
                    {isEn ? 'Call:' : 'Звонок:'} {activeCallModal.userName} ↔ {activeCallModal.direction === 'inbound' ? activeCallModal.from : activeCallModal.to}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {isEn ? 'Duration:' : 'Длительность:'} {formatDuration(activeCallModal.duration)} • {new Date(activeCallModal.createdAt).toLocaleString()}
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
                    {isEn ? 'Quo Call Recording' : 'Запись разговора Quo'}
                  </div>
                  <audio controls className="w-full h-9">
                    <source src={activeAudioUrl} type="audio/mpeg" />
                    {isEn ? 'Your browser does not support the audio element.' : 'Ваш браузер не поддерживает аудиоэлемент.'}
                  </audio>
                </div>
              )}

              {/* AI Verdict Section */}
              {analyses[activeCallModal.id] ? (
                <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <h4 className="text-sm font-bold text-zinc-900">
                        Insurvoice Scorecard {analyses[activeCallModal.id].scorecard?.rubricVersion || 'v1.0'}
                      </h4>
                      {analyses[activeCallModal.id].scorecard?.callType && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                          {analyses[activeCallModal.id].scorecard.callType}
                        </span>
                      )}
                      {(() => {
                        const bandInfo = getBandInfo(
                          analyses[activeCallModal.id].score,
                          analyses[activeCallModal.id].scorecard?.band
                        );
                        return (
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${bandInfo.className}`}>
                            {bandInfo.label}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRunAnalysis(activeCallModal)}
                        disabled={!!analyzingCallIds[activeCallModal.id] || !!deletingCallIds[activeCallModal.id]}
                        className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-purple-700 hover:bg-purple-50 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3 w-3 ${analyzingCallIds[activeCallModal.id] ? 'animate-spin' : ''}`} />
                        {analyzingCallIds[activeCallModal.id]
                          ? isEn
                            ? 'Re-scoring...'
                            : 'Пересчёт...'
                          : isEn
                          ? 'Re-score'
                          : 'Переоценить'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveAnalysis(activeCallModal.id)}
                        disabled={!!deletingCallIds[activeCallModal.id] || !!analyzingCallIds[activeCallModal.id]}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" />
                        {deletingCallIds[activeCallModal.id]
                          ? isEn
                            ? 'Removing...'
                            : 'Удаление...'
                          : isEn
                          ? 'Remove Score'
                          : 'Убрать оценку'}
                      </button>
                      <span
                        className={`shrink-0 whitespace-nowrap px-3 py-1 rounded-full text-sm font-black border ${
                          analyses[activeCallModal.id].score === 0
                            ? 'bg-zinc-100 text-zinc-500 border-zinc-200'
                            : getScoreColor(analyses[activeCallModal.id].score)
                        }`}
                      >
                        {analyses[activeCallModal.id].score === 0
                          ? 'N/A'
                          : `${analyses[activeCallModal.id].score} / 100`}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-700 leading-relaxed font-medium">
                    {analyses[activeCallModal.id].summary}
                  </p>

                  {analyses[activeCallModal.id].score === 0 ? (
                    <div className="rounded-lg bg-white border border-zinc-200 p-3 text-xs text-zinc-600 flex items-start gap-2.5">
                      <AlertCircle className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-zinc-800 block">
                          {isEn
                            ? 'Sales Rubric Scoring Not Applicable (N/A)'
                            : 'Оценка по скрипту продаж не применяется (N/A)'}
                        </span>
                        {isEn
                          ? 'This call reached Voicemail or an AI Call Screener, so the 7 sections and 26 checkpoints are N/A and do not penalize the AE’s average score.'
                          : 'Этот вызов попал на автоответчик или ИИ-фильтр звонков клиента (Call Screening), поэтому 7 секций и 26 чекпоинтов не рассчитываются, а звонок не занижает средний балл менеджера.'}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* 7 Insurvoice Sections (or fallback to 5 legacy cards if old record) */}
                      {analyses[activeCallModal.id].scorecard?.sections &&
                      analyses[activeCallModal.id].scorecard.sections!.length > 0 ? (
                        <div className="space-y-2 pt-2 border-t border-purple-100/60">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            <span>
                              {isEn
                                ? '7 Rubric Sections (Formula: 60% Checkpoints + 40% Quality Rating 1–5)'
                                : '7 секций матрицы (Формула: 60% Чекпоинты + 40% Рейтинг 1–5)'}
                            </span>
                            <span>{isEn ? 'Weight / Score' : 'Вес / Балл'}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {analyses[activeCallModal.id].scorecard.sections!.map((sec) => {
                              const secTitle = getSectionDisplayTitle(sec);
                              return (
                                <div
                                  key={sec.id}
                                  className="rounded-lg bg-white p-2.5 border border-purple-100 flex flex-col justify-between gap-1"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-zinc-900 truncate" title={secTitle}>
                                      {secTitle}
                                    </span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="text-[10px] font-semibold text-zinc-400">
                                        {isEn ? `wt ${sec.weight}%` : `вес ${sec.weight}%`}
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded-md text-xs font-black border ${
                                          sec.sectionScore === null
                                            ? 'bg-zinc-100 text-zinc-400 border-zinc-200'
                                            : getScoreColor(sec.sectionScore)
                                        }`}
                                      >
                                        {sec.sectionScore === null ? 'N/A' : `${sec.sectionScore}%`}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                                    <span>
                                      {isEn ? 'Checkpoints:' : 'Чекпоинты:'}{' '}
                                      <b className="text-zinc-800">{sec.checkpointsHit}/{sec.checkpointsApplicable}</b>
                                    </span>
                                    <span>
                                      {isEn ? 'Rating:' : 'Рейтинг:'}{' '}
                                      <b className="text-zinc-800">
                                        {sec.sectionScore === null || sec.qualityRating === 0 ? 'N/A' : `${sec.qualityRating}/5`}
                                      </b>
                                    </span>
                                  </div>
                                  {sec.rationale && (
                                    <p className="text-[11px] text-zinc-500 leading-snug border-t border-zinc-100 pt-1 mt-0.5">
                                      {sec.rationale}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-purple-100/60">
                          <div className="rounded-lg bg-white p-2.5 border border-purple-100 text-center">
                            <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                              {isEn ? 'Opening' : 'Приветствие'}
                            </span>
                            <span className="text-sm font-black text-zinc-900">{analyses[activeCallModal.id].scorecard.greeting}/10</span>
                          </div>
                          <div className="rounded-lg bg-white p-2.5 border border-purple-100 text-center">
                            <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                              {isEn ? 'Discovery' : 'Потребности'}
                            </span>
                            <span className="text-sm font-black text-zinc-900">{analyses[activeCallModal.id].scorecard.needsDiscovery}/10</span>
                          </div>
                          <div className="rounded-lg bg-white p-2.5 border border-purple-100 text-center">
                            <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                              {isEn ? 'Objections' : 'Возражения'}
                            </span>
                            <span className="text-sm font-black text-zinc-900">{analyses[activeCallModal.id].scorecard.objectionHandling}/10</span>
                          </div>
                          <div className="rounded-lg bg-white p-2.5 border border-purple-100 text-center">
                            <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                              {isEn ? 'Close' : 'Закрытие'}
                            </span>
                            <span className="text-sm font-black text-zinc-900">{analyses[activeCallModal.id].scorecard.closingAndNextStep}/10</span>
                          </div>
                          <div className="rounded-lg bg-white p-2.5 border border-purple-100 text-center">
                            <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                              {isEn ? 'Presence' : 'Вежливость'}
                            </span>
                            <span className="text-sm font-black text-zinc-900">{analyses[activeCallModal.id].scorecard.politeness}/10</span>
                          </div>
                        </div>
                      )}

                      {/* 26 Checkpoints Detail with Evidence */}
                      {analyses[activeCallModal.id].scorecard?.checkpoints &&
                        analyses[activeCallModal.id].scorecard.checkpoints!.length > 0 && (
                          <div className="rounded-xl bg-white border border-purple-100 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setShowCheckpointsList((prev) => !prev)}
                              className="w-full px-3.5 py-2.5 bg-purple-50/60 hover:bg-purple-100/50 flex items-center justify-between text-xs font-bold text-purple-950 transition-colors"
                            >
                              <span className="flex items-center gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-purple-600" />
                                {isEn
                                  ? '26 Insurvoice Checkpoints Breakdown (Y / N / N/A + Evidence)'
                                  : 'Детализация по 26 чекпоинтам Insurvoice (Y / N / N/A + доказательства)'}
                              </span>
                              <span className="text-[11px] font-semibold text-purple-700">
                                {showCheckpointsList
                                  ? isEn
                                    ? 'Hide'
                                    : 'Скрыть'
                                  : isEn
                                  ? 'Show all 26'
                                  : 'Показать все 26'}
                              </span>
                            </button>
                            {showCheckpointsList && (
                              <div className="divide-y divide-zinc-100 max-h-72 overflow-y-auto">
                                {analyses[activeCallModal.id].scorecard.checkpoints!.map((cp) => (
                                  <div key={cp.id} className="px-3.5 py-2 flex items-start justify-between gap-3 text-xs hover:bg-zinc-50/70">
                                    <div className="space-y-0.5">
                                      <div className="font-semibold text-zinc-800">
                                        <span className="font-mono text-[11px] text-purple-700 mr-1.5">{cp.id}</span>
                                        {isEn ? cp.titleEn || cp.title : cp.title}
                                      </div>
                                      <p className="text-[11px] text-zinc-500">
                                        {cp.evidence}
                                      </p>
                                    </div>
                                    <span
                                      className={`shrink-0 px-2 py-0.5 rounded font-mono text-[11px] font-bold border ${
                                        cp.result === 'Y'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : cp.result === 'N'
                                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                                          : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                                      }`}
                                    >
                                      {cp.result}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                      {/* Strengths and Mistakes */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div className="rounded-lg bg-emerald-50/70 border border-emerald-200/70 p-3">
                          <h5 className="text-[11px] font-bold text-emerald-800 uppercase flex items-center gap-1.5 mb-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            {isEn ? 'AE Strengths' : 'Сильные стороны менеджера'}
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
                            {isEn ? 'Mistakes & Coaching Areas' : 'Ошибки и точки роста'}
                          </h5>
                          <ul className="space-y-1.5 text-xs text-rose-950">
                            {analyses[activeCallModal.id].managerMistakes.length > 0 ? (
                              analyses[activeCallModal.id].managerMistakes.map((m, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="text-rose-500 font-bold">•</span> {m}
                                </li>
                              ))
                            ) : (
                              <li className="text-zinc-500 italic">
                                {isEn ? 'No rubric violations detected' : 'Ошибок в регламенте не обнаружено'}
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>

                      {/* Agreements */}
                      {analyses[activeCallModal.id].agreements.length > 0 && (
                        <div className="rounded-lg bg-white border border-purple-100 p-3">
                          <h5 className="text-[11px] font-bold text-zinc-700 uppercase mb-2 flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-amber-500" />
                            {isEn ? 'Confirmed Next Steps & Agreements' : 'Зафиксированные договоренности'}
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
                    </>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-center space-y-2">
                  <p className="text-xs text-zinc-600">
                    {isEn ? 'This call has not been scored with GPT yet.' : 'Этот звонок еще не оценивался через GPT.'}
                  </p>
                  <button
                    onClick={() => handleRunAnalysis(activeCallModal)}
                    disabled={!!analyzingCallIds[activeCallModal.id]}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 text-white px-4 py-2 text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {analyzingCallIds[activeCallModal.id]
                      ? isEn
                        ? 'Scoring...'
                        : 'Анализирую...'
                      : isEn
                      ? 'Run AI Call Evaluation'
                      : 'Запустить AI-оценку звонка'}
                  </button>
                </div>
              )}

              {/* Dialog Transcript */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-zinc-400" />
                    {isEn ? 'Full Call Transcript' : 'Полная стенограмма разговора'}
                  </h4>
                  {loadingTranscript && (
                    <span className="text-[11px] text-zinc-400 animate-pulse">
                      {isEn ? 'Loading transcript...' : 'Загрузка расшифровки...'}
                    </span>
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
                            {msg.speaker === 'agent'
                              ? msg.speakerName || (isEn ? 'AE (Agent)' : 'Менеджер')
                              : isEn
                              ? 'Prospect'
                              : 'Клиент'}
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
                          ? isEn
                            ? 'Loading transcript from Quo...'
                            : 'Загружаем стенограмму из Quo...'
                          : isEn
                          ? 'No transcript available in Quo for this call.'
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

      {/* Criteria & Skill Settings Modal */}
      {showCriteriaDrawer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">
                    {isEn ? 'Call Scoring Skill (Insurvoice Call Scorer)' : 'Скилл оценки звонков (Insurvoice Call Scorer)'}
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    {isEn ? (
                      <>
                        Single source of truth <code className="text-purple-700 font-mono">.agent/skills/insurvoice-call-scorer/SKILL.md</code> passed directly to GPT
                      </>
                    ) : (
                      <>
                        Единый файл скилла <code className="text-purple-700 font-mono">.agent/skills/insurvoice-call-scorer/SKILL.md</code>, который напрямую передаётся в GPT при оценке
                      </>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCriteriaDrawer(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-1.5">
                  {isEn ? 'OpenAI Model' : 'Модель OpenAI'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      id: 'gpt-6.1-terra',
                      name: 'GPT-6.1 Terra',
                      badge: isEn ? 'Recommended' : 'Рекомендуется',
                      desc: isEn
                        ? 'Deep rubric & objection analysis ($1 / $5 per 1M)'
                        : 'Глубокий разбор скрипта и возражений ($1 / $5 за 1М)',
                    },
                    {
                      id: 'gpt-6-luna',
                      name: 'GPT-6 Luna',
                      badge: isEn ? 'Economy' : 'Эконом',
                      desc: isEn
                        ? 'Fast evaluation for high call volume ($0.10 / $0.50 per 1M)'
                        : 'Быстрая оценка для больших объёмов ($0.10 / $0.50 за 1М)',
                    },
                  ].map((m) => {
                    const isSelected = selectedModel === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedModel(m.id)}
                        className={`text-left p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-purple-600 bg-purple-50/60 text-purple-950 ring-1 ring-purple-600'
                            : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className={`h-3.5 w-3.5 ${isSelected ? 'text-purple-600' : 'text-zinc-400'}`} />
                            {m.name}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              isSelected
                                ? 'text-purple-700 bg-purple-100/80'
                                : 'text-zinc-500 bg-zinc-100'
                            }`}
                          >
                            {isSelected ? (isEn ? 'Active' : 'Активна') : m.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1 leading-snug">{m.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider">
                    {isEn
                      ? 'Call Type Reference (AI detects Call Type automatically from transcript)'
                      : 'Справочник типов звонков (ИИ выбирает тип автоматически по диалогу)'}
                  </label>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    {isEn ? 'Auto-Detection On' : 'Автоопределение включено'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'Auto', label: isEn ? 'Auto (from dialogue)' : 'Авто (по диалогу)' },
                      { id: 'Confirmation / Pre-Call', label: 'Confirmation / Pre-Call' },
                      { id: 'Discovery + Demo', label: 'Discovery + Demo' },
                      { id: 'Discovery', label: 'Discovery' },
                      { id: 'Demo', label: 'Demo' },
                      { id: 'Follow-up / Close', label: 'Follow-up / Close' },
                    ] as { id: InsurvoiceCallType; label: string }[]
                  ).map((ct) => {
                    const active = selectedCallType === ct.id;
                    return (
                      <button
                        key={ct.id}
                        type="button"
                        onClick={() => setSelectedCallType(ct.id)}
                        className={`px-2.5 py-2 rounded-lg border text-xs font-bold transition-all ${
                          active
                            ? 'border-purple-600 bg-purple-50 text-purple-900 ring-1 ring-purple-600'
                            : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        {ct.label}
                      </button>
                    );
                  })}
                </div>

                {/* Live Weight & Behavior Preview for Selected Call Type */}
                {(() => {
                  const typeMeta: Record<
                    InsurvoiceCallType,
                    {
                      desc: string;
                      weights?: { name: string; weight: number }[];
                    }
                  > = {
                    Auto: {
                      desc: isEn
                        ? 'Recommended: GPT analyzes the transcript and automatically selects the appropriate Call Type ("Confirmation / Pre-Call" for short Google Meet confirmations, "Discovery + Demo" for full calls, etc.) and applies the corresponding section weights.'
                        : 'Рекомендуемый режим: GPT сам анализирует диалог и автоматически выбирает подходящий тип звонка (например, ставит «Confirmation / Pre-Call» для 2-минутного подтверждения встречи в Google Meet или «Discovery + Demo» для полного звонка) и применяет нужные веса.',
                    },
                    'Confirmation / Pre-Call': {
                      desc: isEn
                        ? 'Short appointment confirmation & pre-qualification call (1–4 min) prior to a Google Meet. Deep Pain Quantification, Demo, and Pilot Close have 0% weight (N/A) so the AE is not penalized.'
                        : 'Короткий звонок-подтверждение встречи (1–4 мин) и быстрая пред-квалификация перед Google Meet. Глубокие боли, демо и закрытие в оплату получают вес 0% (N/A) и не штрафуют менеджера.',
                      weights: [
                        { name: '1. Opening', weight: 25 },
                        { name: '2. Discovery', weight: 35 },
                        { name: '3. Pain & Impact', weight: 0 },
                        { name: '4. Demo', weight: 0 },
                        { name: '5. Objections', weight: 10 },
                        { name: '6. Close (Meet)', weight: 20 },
                        { name: '7. Presence', weight: 10 },
                      ],
                    },
                    'Discovery + Demo': {
                      desc: isEn
                        ? 'Full standard sales call (Discovery + Pain Quantification + Product Demo + Close). Uses the default weights from the Insurvoice v1.2 workbook:'
                        : 'Полный стандартный звонок (квалификация + расчёт болей + презентация продукта + закрытие). Применяются базовые веса из Excel-таблицы Insurvoice v1.2:',
                      weights: [
                        { name: '1. Opening', weight: 10 },
                        { name: '2. Discovery', weight: 25 },
                        { name: '3. Pain & Impact', weight: 20 },
                        { name: '4. Demo', weight: 15 },
                        { name: '5. Objections', weight: 10 },
                        { name: '6. Close', weight: 15 },
                        { name: '7. Presence', weight: 5 },
                      ],
                    },
                    Discovery: {
                      desc: isEn
                        ? 'Initial qualification & discovery call without a product demo. Demo weight (0%) is redistributed to Discovery and Pain & Impact:'
                        : 'Звонок-знакомство и глубокая квалификация без проведения демо. Вес секции Demo (0%) перераспределён в пользу Discovery и Pain & Impact:',
                      weights: [
                        { name: '1. Opening', weight: 15 },
                        { name: '2. Discovery', weight: 35 },
                        { name: '3. Pain & Impact', weight: 25 },
                        { name: '4. Demo', weight: 0 },
                        { name: '5. Objections', weight: 10 },
                        { name: '6. Close', weight: 10 },
                        { name: '7. Presence', weight: 5 },
                      ],
                    },
                    Demo: {
                      desc: isEn
                        ? 'Product demonstration tailored to previously uncovered pain points. Weight is focused on Demo (30%) and Close (20%):'
                        : 'Демонстрация продукта по уже выявленным болям клиента. Основной вес смещён на секцию Demo (30%) и Close (20%):',
                      weights: [
                        { name: '1. Opening', weight: 5 },
                        { name: '2. Discovery', weight: 15 },
                        { name: '3. Pain & Impact', weight: 15 },
                        { name: '4. Demo', weight: 30 },
                        { name: '5. Objections', weight: 10 },
                        { name: '6. Close', weight: 20 },
                        { name: '7. Presence', weight: 5 },
                      ],
                    },
                    'Follow-up / Close': {
                      desc: isEn
                        ? 'Follow-up call focused on objection handling and closing the 90-day pilot. Highest weights on Objections (25%) and Close (35%):'
                        : 'Повторный звонок для дожима, разбора возражений и закрытия сделки в оплату (90-day pilot). Максимальный вес у Objections (25%) и Close (35%):',
                      weights: [
                        { name: '1. Opening', weight: 5 },
                        { name: '2. Discovery', weight: 10 },
                        { name: '3. Pain & Impact', weight: 10 },
                        { name: '4. Demo', weight: 10 },
                        { name: '5. Objections', weight: 25 },
                        { name: '6. Close', weight: 35 },
                        { name: '7. Presence', weight: 5 },
                      ],
                    },
                  };

                  const current = typeMeta[selectedCallType];
                  return (
                    <div className="mt-2.5 rounded-xl border border-purple-100 bg-purple-50/40 p-3 space-y-2">
                      <p className="text-[11px] text-zinc-700 leading-relaxed">{current.desc}</p>
                      {current.weights && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {current.weights.map((w) => (
                            <span
                              key={w.name}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                w.weight === 0
                                  ? 'bg-zinc-100 text-zinc-400 border-zinc-200 line-through'
                                  : 'bg-white text-purple-800 border-purple-200'
                              }`}
                            >
                              {w.name}: {w.weight}%
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider">
                    {isEn
                      ? 'Call Scoring Skill (SKILL.md — Single Source of Truth for GPT)'
                      : 'Скилл оценки звонков (SKILL.md — единый источник правил для GPT)'}
                  </label>
                  <span className="text-[10px] font-mono text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                    .agent/skills/insurvoice-call-scorer/SKILL.md
                  </span>
                </div>
                <textarea
                  rows={16}
                  value={customCriteria}
                  onChange={(e) => setCustomCriteria(e.target.value)}
                  placeholder={isEn ? 'Full call scoring skill markdown...' : 'Полный текст скилла оценки звонков...'}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all font-mono leading-relaxed"
                />
                <p className="text-[11px] text-zinc-500 mt-1.5">
                  {isEn ? (
                    <>
                      Any edits you save here overwrite <code className="font-mono text-zinc-700">SKILL.md</code> on the server and are immediately used whenever a call is scored or re-scored.
                    </>
                  ) : (
                    <>
                      Любые изменения, которые вы внесёте и сохраните здесь, напрямую перезаписывают файл скилла <code className="font-mono text-zinc-700">SKILL.md</code> и сразу используются при оценке и переоценке каждого звонка.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50/80 flex items-center justify-between gap-3 shrink-0">
              <div className="text-xs">
                {skillSavedStatus && (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {skillSavedStatus}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCriteriaDrawer(false)}
                  className="rounded-xl border border-zinc-200 bg-white text-zinc-700 px-4 py-2.5 text-xs font-semibold hover:bg-zinc-50 transition-colors"
                >
                  {isEn ? 'Close' : 'Закрыть'}
                </button>
                <button
                  type="button"
                  disabled={savingSkill}
                  onClick={handleSaveSkill}
                  className="rounded-xl bg-purple-600 text-white px-5 py-2.5 text-xs font-semibold hover:bg-purple-700 transition-colors shadow-xs disabled:opacity-50"
                >
                  {savingSkill
                    ? isEn
                      ? 'Saving to SKILL.md...'
                      : 'Сохранение в SKILL.md...'
                    : isEn
                    ? 'Save Skill to SKILL.md'
                    : 'Сохранить скилл в SKILL.md'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Changelog Modal (от 27 октября) */}
      {showChangelogModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">
                    {isEn ? 'Telephony Module Changelog' : 'Лог изменений модуля телефонии'}
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    {isEn
                      ? 'What’s new in Quo call sync & Insurvoice AI call scoring'
                      : 'Что нового добавлено в синхронизацию Quo и AI-скоринг звонков Insurvoice'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowChangelogModal(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs text-zinc-700">
              {/* Release Header */}
              <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-4 flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
                    {isEn ? 'Release • October 27' : 'Релиз • 27 октября'}
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900 mt-0.5">
                    {isEn
                      ? 'Insurvoice AE Sales Call Scorecard v1.0 & Quo Sync Stabilization'
                      : 'Insurvoice AE Sales Call Scorecard v1.0 & Стабилизация Quo'}
                  </h4>
                  <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                    {isEn
                      ? 'Full rollout of the official Insurvoice AE Sales Call Scorecard (7 sections, 26 evidence-backed checkpoints, 60/40 weighted formula) and Quo sync reliability improvements.'
                      : 'Полный переход на официальную матрицу оценки звонков отдела продаж Insurvoice (7 секций, 26 чекпоинтов с доказательствами, формула 60/40) и устранение расхождений при синхронизации.'}
                  </p>
                </div>
              </div>

              {/* Changelog Items */}
              <div className="space-y-3">
                {(isEn
                  ? [
                      {
                        badge: 'AI Scoring',
                        badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
                        title: 'Official Insurvoice Scorecard v1.0 (26 Checkpoints)',
                        points: [
                          'Exact 60/40 scoring math from the official workbook: 60% applicable checkpoints hit (Y/N/N/A) + 40% section quality rating on a 1–5 scale.',
                          'Mandatory Evidence Rule: every checkpoint includes a direct quote or timestamp from the transcript (no evidence = N).',
                          'Added score bands: Strong (85–100), Solid (70–84), Needs Coaching (55–69), Priority Focus (<55).',
                        ],
                      },
                      {
                        badge: 'Auto Call Type',
                        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                        title: 'Automatic Call Type Detection & Dynamic Section Weights',
                        points: [
                          'AI automatically classifies each call from the transcript: Confirmation / Pre-Call (short Google Meet confirmation), Discovery, Demo, Discovery + Demo, or Follow-up / Close.',
                          'On short Confirmation / Pre-Call calls and calls with brand-new agents without an existing book (precedent C-002), deferred stages (Demo, 12-month Pain Quantification) are marked N/A so they do not penalize the AE.',
                        ],
                      },
                      {
                        badge: 'Voicemail Filter',
                        badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
                        title: 'Voicemail, AI Call Screener & Short Drop Protection',
                        points: [
                          'Calls under 20s, Voicemails, and iOS/Android AI Call Screeners ("Record your name and reason for calling...") are automatically marked N/A ("Voicemail / AI Screener").',
                          'Even if the AE leaves a long voice message after the beep, the call is excluded from sales script scoring and does not lower the AE’s leaderboard average.',
                        ],
                      },
                      {
                        badge: 'Unified Skill',
                        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        title: 'In-App SKILL.md Editor, RU/EN Localization & GPT-6.1 Terra',
                        points: [
                          'Upgraded call evaluation to OpenAI’s GPT-6.1 Terra (recommended) and GPT-6 Luna (economy).',
                          'Made .agent/skills/insurvoice-call-scorer/SKILL.md the single source of truth editable directly in the admin panel, plus added a full RU / EN switcher.',
                        ],
                      },
                      {
                        badge: 'Quo & Analytics',
                        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
                        title: 'Stable Quo Sync, Parallel Multi-Call Scoring & Daily Charts',
                        points: [
                          'Parallel multi-call scoring (/api/telephony/analyze): score multiple calls simultaneously without cancelling in-progress evaluations.',
                          'Fixed fluctuating call counts on sync: added automatic retry on HTTP 429 Too Many Requests and merged fresh Quo calls with the Supabase cache.',
                          'Added "Show Chart" daily trend visualizations under all 5 KPI cards, a "Remove Score" button, and automatic audio player loading.',
                        ],
                      },
                    ]
                  : [
                      {
                        badge: 'AI-Скоринг',
                        badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
                        title: 'Внедрена официальная матрица Insurvoice Scorecard v1.0 (26 чекпоинтов)',
                        points: [
                          'Расчёт оценки строго по формуле из оригинального файла: 60% выполненные применимые чекпоинты (Y/N/N/A) + 40% оценка качества секции по шкале 1–5.',
                          'Для каждого из 26 чекпоинтов ИИ приводит конкретную цитату или факт из стенограммы разговора (правило Evidence Rule: нет доказательства в тексте — ставится N).',
                          'Добавлены грейды звонков: Strong (85–100), Solid (70–84), Needs Coaching (55–69), Priority Focus (<55).',
                        ],
                      },
                      {
                        badge: 'Авто-типизация',
                        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                        title: 'Автоматическое определение типа звонка и динамических весов секций',
                        points: [
                          'ИИ сам распознаёт тип звонка по диалогу: Confirmation / Pre-Call (короткое подтверждение встречи в Google Meet), Discovery, Demo, Discovery + Demo или Follow-up / Close.',
                          'На коротких звонках-подтверждениях (Confirmation / Pre-Call) и звонках с новыми агентами без базы (кейс C-002) неприменимые этапы (демо, расчёт 12-месячных потерь) автоматически помечаются как N/A и не занижают балл менеджера.',
                        ],
                      },
                      {
                        badge: 'Фильтр Voicemail',
                        badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
                        title: 'Защита от оценки автоответчиков, ИИ-секретарей и коротких сбросов',
                        points: [
                          'Звонки короче 20 секунд, попадания на голосовую почту (Voicemail) и ИИ-фильтры вызовов («Record your name and reason for calling...») автоматически получают статус N/A («Автоответчик / ИИ-ассистент»).',
                          'Даже если менеджер оставил длинное голосовое сообщение после сигнала автоответчика, звонок не оценивается по скрипту продаж и не портит средний скор в таблице.',
                        ],
                      },
                      {
                        badge: 'Единый скилл',
                        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        title: 'Редактор скилла SKILL.md в админке, перевод RU/EN и переход на GPT-6.1 Terra',
                        points: [
                          'Оценка переведена на актуальное семейство моделей GPT-6.1 Terra (рекомендуемая) и GPT-6 Luna (эконом).',
                          'Файл скилла .agent/skills/insurvoice-call-scorer/SKILL.md стал единым источником правил для ИИ и доступен для редактирования прямо в админке, а интерфейс и оценка поддерживают переключение RU / EN.',
                        ],
                      },
                      {
                        badge: 'Quo & Аналитика',
                        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
                        title: 'Стабильная синхронизация звонков Quo, мультизадачность оценки и графики по дням',
                        points: [
                          'Добавлена параллельная оценка нескольких звонков одновременно (/api/telephony/analyze): можно подряд нажимать «Оценить через GPT» у любого числа звонков без сброса уже запущенных оценок.',
                          'Устранена проблема «прыгающих цифр» при нажатии «Синхронизировать звонки»: добавлен автоматический retry при лимите 429 Too Many Requests и объединение (merge) звонков с кэшем Supabase.',
                          'Под всеми 5 карточками верхних метрик добавлена кнопка «Показать график» с динамикой показателей по дням.',
                          'В карточке звонка добавлена кнопка «Убрать оценку» рядом с «Переоценить», а также восстановлена автоматическая подгрузка аудиоплеера записи разговора.',
                        ],
                      },
                    ]
                ).map((section, idx) => (
                  <div key={idx} className="rounded-xl border border-zinc-200 bg-white p-4 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${section.badgeColor}`}>
                        {section.badge}
                      </span>
                      <h5 className="text-xs font-bold text-zinc-900">{section.title}</h5>
                    </div>
                    <ul className="space-y-1.5 pl-4 list-disc text-zinc-600 leading-relaxed">
                      {section.points.map((pt, i) => (
                        <li key={i}>{pt}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-zinc-200 bg-zinc-50/80 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowChangelogModal(false)}
                className="rounded-xl bg-zinc-900 text-white px-5 py-2 text-xs font-semibold hover:bg-zinc-800 transition-colors"
              >
                {isEn ? 'Got it' : 'Понятно'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
