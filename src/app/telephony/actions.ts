'use server';

import { QuoClient } from '@/lib/quo/client';
import { analyzeCallWithGPT } from '@/lib/ai/callAnalyzer';
import { MOCK_MANAGERS, MOCK_CALLS, MOCK_ANALYSES } from '@/lib/telephony/mockData';
import { QuoCall, QuoUser, CallAnalysisResult, ManagerPerformance } from '@/types/telephony';

import { supabase } from '@/lib/supabase';

export async function fetchTelephonyDataAction(): Promise<{
  success: boolean;
  isLive: boolean;
  managers: QuoUser[];
  calls: QuoCall[];
  analyses: Record<string, CallAnalysisResult>;
  performance: ManagerPerformance[];
  error?: string;
}> {
  const quoApiKey = process.env.QUO_API_KEY;

  let managers: QuoUser[] = [];
  let calls: QuoCall[] = [];
  let analyses: Record<string, CallAnalysisResult> = {};
  let isLive = false;

  // First check if we already have analyses saved in Supabase
  try {
    const { data: dbAnalyses } = await supabase.from('quo_call_analyses').select('*');
    if (dbAnalyses && dbAnalyses.length > 0) {
      dbAnalyses.forEach((row: any) => {
        analyses[row.call_id] = {
          callId: row.call_id,
          score: row.score,
          sentiment: row.sentiment,
          summary: row.summary,
          keyPoints: row.key_points || [],
          agreements: row.agreements || [],
          managerStrengths: row.manager_strengths || [],
          managerMistakes: row.manager_mistakes || [],
          actionItems: row.action_items || [],
          scorecard: row.scorecard || {
            greeting: 8,
            needsDiscovery: 8,
            objectionHandling: 8,
            closingAndNextStep: 8,
            politeness: 9,
          },
          transcript: row.transcript || [],
        };
      });
    }
  } catch (e) {
    // Supabase table might not be created yet, fallback gracefully
  }

  // 1. First, load existing saved calls and managers from Supabase
  try {
    const [dbManagersRes, dbCallsRes] = await Promise.all([
      supabase.from('quo_managers').select('*'),
      supabase.from('quo_calls').select('*').order('call_created_at', { ascending: false }).limit(200),
    ]);

    if (dbManagersRes.data && dbManagersRes.data.length > 0) {
      managers = dbManagersRes.data.map((m: any) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        phoneNumbers: m.phone_numbers || [],
      }));
    }

    if (dbCallsRes.data && dbCallsRes.data.length > 0) {
      calls = dbCallsRes.data.map((c: any) => ({
        id: c.id,
        direction: c.direction,
        status: c.status,
        duration: c.duration,
        from: c.from_number,
        to: c.to_number,
        userId: c.manager_id,
        userName: c.manager_name || 'Сотрудник',
        recordingUrl: c.recording_url,
        hasRecording: c.has_recording,
        createdAt: c.call_created_at || c.created_at,
      }));
    }
  } catch (e) {
    console.warn('Could not read from Supabase cache:', e);
  }

  // 2. If no calls in Supabase yet and API key exists, do initial fetch from Quo
  if (quoApiKey && calls.length === 0) {
    try {
      const client = new QuoClient(quoApiKey);
      const [fetchedUsers, fetchedCalls] = await Promise.all([
        client.getUsers(),
        client.getCalls({ maxResults: 40 }),
      ]);

      if (fetchedUsers && fetchedUsers.length > 0) {
        managers = fetchedUsers;
        try {
          await supabase.from('quo_managers').upsert(
            managers.map((m) => ({
              id: m.id,
              name: m.name || m.firstName || 'Manager',
              email: m.email,
              role: m.role,
              phone_numbers: m.phoneNumbers || [],
              updated_at: new Date().toISOString(),
            }))
          );
        } catch {}
      }

      if (fetchedCalls?.calls && fetchedCalls.calls.length > 0) {
        const enrichedCalls = fetchedCalls.calls.map((c) => {
          const matchedManager = managers.find((m) => m.id === c.userId);
          return {
            ...c,
            userName: matchedManager?.name || c.userName || 'Сотрудник',
          };
        });
        calls = enrichedCalls;

        try {
          await supabase.from('quo_calls').upsert(
            calls.map((c) => ({
              id: c.id,
              direction: c.direction,
              status: c.status,
              duration: c.duration,
              from_number: c.from,
              to_number: c.to,
              manager_id: c.userId,
              manager_name: c.userName,
              recording_url: c.recordingUrl,
              has_recording: c.hasRecording,
              call_created_at: c.createdAt,
            }))
          );
        } catch {}
      }
      isLive = true;
    } catch (err: any) {
      console.warn('Quo initial sync error:', err?.message);
    }
  } else if (quoApiKey) {
    isLive = true;
  }

  // Only fallback to mock data if QUO_API_KEY is completely missing
  if (!quoApiKey) {
    if (managers.length === 0) managers = MOCK_MANAGERS;
    if (calls.length === 0) calls = MOCK_CALLS;
    analyses = MOCK_ANALYSES;
  }

  // Calculate manager performance
  const performanceMap: Record<string, ManagerPerformance> = {};

  managers.forEach((m) => {
    performanceMap[m.id] = {
      userId: m.id,
      name: m.name || m.firstName || 'Unknown',
      email: m.email,
      totalCalls: 0,
      completedCalls: 0,
      missedCalls: 0,
      inboundCalls: 0,
      outboundCalls: 0,
      answeredOutboundCalls: 0,
      outboundCallThroughRate: 0,
      overallCallThroughRate: 0,
      totalDurationMinutes: 0,
      averageDurationMinutes: 0,
      averageScore: 0,
      scoresCount: 0,
    };
  });

  calls.forEach((c) => {
    const mgrId = c.userId || managers[0]?.id;
    if (mgrId && !performanceMap[mgrId]) {
      performanceMap[mgrId] = {
        userId: mgrId,
        name: c.userName || 'Менеджер',
        totalCalls: 0,
        completedCalls: 0,
        missedCalls: 0,
        inboundCalls: 0,
        outboundCalls: 0,
        answeredOutboundCalls: 0,
        outboundCallThroughRate: 0,
        overallCallThroughRate: 0,
        totalDurationMinutes: 0,
        averageDurationMinutes: 0,
        averageScore: 0,
        scoresCount: 0,
      };
    }

    if (mgrId && performanceMap[mgrId]) {
      const p = performanceMap[mgrId];
      p.totalCalls += 1;
      if (c.status === 'completed') p.completedCalls += 1;
      if (c.status === 'missed') p.missedCalls += 1;
      if (c.direction === 'inbound') p.inboundCalls += 1;
      if (c.direction === 'outbound') {
        p.outboundCalls += 1;
        // Исходящий вызов считается отвеченным человеком (дозвон), если статус completed и длительность > 0
        if (c.status === 'completed' && (c.duration || 0) > 0) {
          p.answeredOutboundCalls += 1;
        }
      }
      p.totalDurationMinutes += Math.round((c.duration || 0) / 60);

      // Check if call has analysis
      const analysis = analyses[c.id];
      if (analysis?.score) {
        p.averageScore += analysis.score;
        p.scoresCount += 1;
      }
    }
  });

  const performance = Object.values(performanceMap).map((p) => {
    // CTR по исходящим звонкам: отвеченные / всего набранных * 100%
    const outboundCtr = p.outboundCalls > 0 
      ? Math.round((p.answeredOutboundCalls / p.outboundCalls) * 1000) / 10 
      : 0;

    // Общий CTR по всем звонкам
    const overallCtr = p.totalCalls > 0 
      ? Math.round((p.completedCalls / p.totalCalls) * 1000) / 10 
      : 0;

    return {
      ...p,
      outboundCallThroughRate: outboundCtr,
      overallCallThroughRate: overallCtr,
      averageDurationMinutes: p.completedCalls > 0 ? Math.round((p.totalDurationMinutes / p.completedCalls) * 10) / 10 : 0,
      averageScore: p.scoresCount > 0 ? Math.round(p.averageScore / p.scoresCount) : 0,
    };
  });

  return {
    success: true,
    isLive,
    managers,
    calls,
    analyses,
    performance,
  };
}

export async function runGptAnalysisForCallAction(
  callId: string, 
  managerName?: string,
  customCriteria?: string,
  model?: string
): Promise<{
  success: boolean;
  analysis?: CallAnalysisResult;
  error?: string;
}> {
  try {
    const quoApiKey = process.env.QUO_API_KEY;
    let transcript = MOCK_ANALYSES[callId]?.transcript;

    if (quoApiKey) {
      const client = new QuoClient(quoApiKey);
      const liveTranscript = await client.getCallTranscript(callId);
      if (liveTranscript && liveTranscript.length > 0) {
        transcript = liveTranscript;
      }
    }

    if (!transcript || transcript.length === 0) {
      // Default transcript for demonstration if neither Quo nor Mock has it
      transcript = [
        { speaker: 'agent', speakerName: managerName || 'Менеджер', text: 'Здравствуйте! Компания InsurQuote, меня зовут ' + (managerName || 'консультант') + '. Слушаю вас!' },
        { speaker: 'customer', text: 'Добрый день, хотел узнать условия по страхованию автомобиля и спецтехники.' },
        { speaker: 'agent', speakerName: managerName || 'Менеджер', text: 'С удовольствием проконсультирую. Сколько единиц техники и какой регион эксплуатации?' },
        { speaker: 'customer', text: '3 тягача, работают по Техасу и соседним штатам.' },
        { speaker: 'agent', speakerName: managerName || 'Менеджер', text: 'Отлично, подготовим расчет с учетом безаварийного коэффициента и пришлем вам сегодня на почту. Договорились?' },
        { speaker: 'customer', text: 'Да, отлично, спасибо!' }
      ];
    }

    const analysis = await analyzeCallWithGPT({
      callId,
      transcript,
      managerName,
      customCriteria,
      model,
    });

    // Save analysis to Supabase
    try {
      await supabase.from('quo_call_analyses').upsert({
        call_id: callId,
        score: analysis.score,
        sentiment: analysis.sentiment,
        summary: analysis.summary,
        key_points: analysis.keyPoints,
        agreements: analysis.agreements,
        manager_strengths: analysis.managerStrengths,
        manager_mistakes: analysis.managerMistakes,
        action_items: analysis.actionItems,
        scorecard: analysis.scorecard,
        transcript: analysis.transcript,
      });
    } catch (e) {
      console.warn('Could not save analysis to Supabase:', e);
    }

    return { success: true, analysis };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Ошибка запуска анализа звонка' };
  }
}
