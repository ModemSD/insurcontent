'use server';

import { QuoClient } from '@/lib/quo/client';
import { analyzeCallWithGPT, readCallScorerSkill, writeCallScorerSkill } from '@/lib/ai/callAnalyzer';
import { MOCK_MANAGERS, MOCK_CALLS, MOCK_ANALYSES } from '@/lib/telephony/mockData';
import { QuoCall, QuoUser, CallAnalysisResult, ManagerPerformance, TranscriptUtterance, InsurvoiceCallType } from '@/types/telephony';

import { supabase } from '@/lib/supabase';

export async function fetchTelephonyDataAction(options?: { forceRefresh?: boolean }): Promise<{
  success: boolean;
  isLive: boolean;
  managers: QuoUser[];
  calls: QuoCall[];
  analyses: Record<string, CallAnalysisResult>;
  performance: ManagerPerformance[];
  skillContent: string;
  error?: string;
}> {
  const quoApiKey = process.env.QUO_API_KEY;
  const forceRefresh = options?.forceRefresh ?? false;

  let managers: QuoUser[] = [];
  let calls: QuoCall[] = [];
  let analyses: Record<string, CallAnalysisResult> = {};
  let isLive = false;

  // First check if we already have analyses saved in Supabase
  try {
    const { data: dbAnalyses } = await supabase.from('quo_call_analyses').select('*');
    if (dbAnalyses && dbAnalyses.length > 0) {
      const fakeCallIdsToDelete: string[] = [];
      dbAnalyses.forEach((row: any) => {
        const summaryText = String(row.summary || '');
        // Clean up any previously saved simulated fallback records ("3 тягача в Техасе" / old simulation)
        if (
          summaryText.includes('3 тягача') ||
          summaryText.includes('успешно проконсультировал клиента, ответил на базовые вопросы по услугам')
        ) {
          fakeCallIdsToDelete.push(row.call_id);
          return;
        }

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

      if (fakeCallIdsToDelete.length > 0) {
        supabase.from('quo_call_analyses').delete().in('call_id', fakeCallIdsToDelete).then(() => {});
      }
    }
  } catch (e) {
    // Supabase table might not be created yet, fallback gracefully
  }

  // 1. Load existing saved calls and managers from Supabase first
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

  // 2. If forceRefresh is requested OR no calls in Supabase yet, fetch fresh data from Quo and merge
  if (quoApiKey && (forceRefresh || calls.length === 0)) {
    try {
      const client = new QuoClient(quoApiKey);
      const fetchedUsers = await client.getUsers();
      const fetchedCalls = await client.getCalls({ maxResults: 100 });

      if (fetchedUsers && fetchedUsers.length > 0) {
        const managerMap = new Map<string, QuoUser>();
        managers.forEach((m) => managerMap.set(m.id, m));
        fetchedUsers.forEach((m) => managerMap.set(m.id, m));
        managers = Array.from(managerMap.values());

        try {
          await supabase.from('quo_managers').upsert(
            fetchedUsers.map((m) => ({
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

        try {
          await supabase.from('quo_calls').upsert(
            enrichedCalls.map((c) => ({
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
        } catch (dbErr) {
          console.warn('Failed to upsert calls into Supabase:', dbErr);
        }

        // Merge existing Supabase calls with freshly synced Quo calls by ID
        const callMap = new Map<string, QuoCall>();
        calls.forEach((c) => callMap.set(c.id, c));
        enrichedCalls.forEach((c) => callMap.set(c.id, c));
        calls = Array.from(callMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      isLive = true;
    } catch (err: any) {
      console.warn('Quo sync error:', err?.message);
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

        // Определяем, ответил ли реальный человек или включился автоответчик / IVR / сброс
        const duration = c.duration || 0;
        const analysis = analyses[c.id];
        
        let isHuman = false;
        if (c.status === 'completed' && duration > 10) {
          if (analysis?.transcript && analysis.transcript.length > 0) {
            // Проверяем текст транскрипта
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
            isHuman = !isVoicemail && hasCustomerReply;
          } else {
            // Если транскрипт еще не анализировался через GPT:
            // Звонки от 25 секунд без сброса с высокой вероятностью содержат диалог
            isHuman = duration >= 25;
          }
        }

        if (isHuman) {
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
    // CTR по исходящим звонкам: реально отвеченные человеком / всего набранных * 100%
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
    skillContent: readCallScorerSkill(),
  };
}

export async function saveCallScorerSkillAction(content: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!content || !content.trim()) {
      return { success: false, error: 'Текст скилла не может быть пустым' };
    }
    writeCallScorerSkill(content);
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Не удалось сохранить файл скилла SKILL.md',
    };
  }
}

export async function runGptAnalysisForCallAction(
  callId: string, 
  managerName?: string,
  customCriteria?: string,
  model?: string,
  callType?: InsurvoiceCallType,
  durationSeconds?: number,
  lang?: 'ru' | 'en'
): Promise<{
  success: boolean;
  analysis?: CallAnalysisResult;
  error?: string;
}> {
  try {
    const quoApiKey = process.env.QUO_API_KEY;
    let transcript = MOCK_ANALYSES[callId]?.transcript || [];

    if (quoApiKey) {
      const client = new QuoClient(quoApiKey);
      const liveTranscript = await client.getCallTranscript(callId);
      if (liveTranscript && liveTranscript.length > 0) {
        transcript = liveTranscript;
      }
    }

    const analysis = await analyzeCallWithGPT({
      callId,
      transcript,
      managerName,
      durationSeconds,
      customCriteria,
      model,
      callType,
      lang,
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

export async function getCallTranscriptAction(callId: string): Promise<{
  success: boolean;
  transcript: TranscriptUtterance[];
  recordingUrl?: string | null;
}> {
  try {
    const quoApiKey = process.env.QUO_API_KEY;
    const client = quoApiKey ? new QuoClient(quoApiKey) : null;

    // 1. Check if transcript or recording_url already exist in Supabase
    const [dbAnalysisRes, dbCallRes] = await Promise.all([
      supabase.from('quo_call_analyses').select('transcript').eq('call_id', callId).maybeSingle(),
      supabase.from('quo_calls').select('recording_url').eq('id', callId).maybeSingle(),
    ]);

    let transcript: TranscriptUtterance[] = dbAnalysisRes.data?.transcript || [];
    let recordingUrl: string | null = dbCallRes.data?.recording_url || null;

    // 2. Fetch missing recordingUrl or transcript from Quo API
    if (client) {
      const [liveTranscript, liveRecordingUrl] = await Promise.all([
        transcript.length === 0 ? client.getCallTranscript(callId) : Promise.resolve(transcript),
        !recordingUrl ? client.getCallRecordingUrl(callId) : Promise.resolve(recordingUrl),
      ]);

      if (liveTranscript && liveTranscript.length > 0) {
        transcript = liveTranscript;
      }
      if (liveRecordingUrl) {
        recordingUrl = liveRecordingUrl;
        // Cache recording_url in quo_calls for next time
        supabase
          .from('quo_calls')
          .update({ recording_url: liveRecordingUrl, has_recording: true })
          .eq('id', callId)
          .then(() => {});
      }
    }

    // 3. Fallback to mock if available
    if (transcript.length === 0) {
      transcript = MOCK_ANALYSES[callId]?.transcript || [];
    }

    return { success: true, transcript, recordingUrl };
  } catch (err) {
    return { success: false, transcript: [] };
  }
}

export async function deleteCallAnalysisAction(callId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase
      .from('quo_call_analyses')
      .delete()
      .eq('call_id', callId);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Ошибка удаления оценки звонка' };
  }
}
