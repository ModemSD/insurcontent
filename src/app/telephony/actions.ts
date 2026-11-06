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
  comments: Record<string, string>;
  performance: ManagerPerformance[];
  skillContent: string;
  error?: string;
}> {
  const quoApiKey = process.env.QUO_API_KEY;
  const forceRefresh = options?.forceRefresh ?? false;

  let managers: QuoUser[] = [];
  let calls: QuoCall[] = [];
  let analyses: Record<string, CallAnalysisResult> = {};
  const comments: Record<string, string> = {};
  let isLive = false;

  // First check if we already have analyses and comments saved in Supabase
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

        if (row.scorecard?.comment) {
          comments[row.call_id] = String(row.scorecard.comment);
        }

        // If this row was created solely to store a comment on an unscored call, do not treat it as a GPT score
        if (row.score === -1 || row.scorecard?.isCommentOnly || summaryText === '__COMMENT_ONLY__') {
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

  // 1. Load existing saved calls and managers from Supabase first (paginate in batches of 1000 so there is no 200-call cap)
  try {
    const dbManagersRes = await supabase.from('quo_managers').select('*');

    const allDbCallRows: any[] = [];
    const batchSize = 1000;
    let from = 0;

    while (true) {
      const { data: batchRows, error: batchErr } = await supabase
        .from('quo_calls')
        .select('*')
        .order('call_created_at', { ascending: false })
        .range(from, from + batchSize - 1);

      if (batchErr || !batchRows || batchRows.length === 0) break;
      allDbCallRows.push(...batchRows);
      if (batchRows.length < batchSize) break;
      from += batchSize;
    }

    if (dbManagersRes.data && dbManagersRes.data.length > 0) {
      managers = dbManagersRes.data.map((m: any) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        phoneNumbers: m.phone_numbers || [],
      }));
    }

    if (allDbCallRows.length > 0) {
      calls = allDbCallRows.map((c: any) => ({
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
      const fetchedCalls = await client.getCalls({ maxResults: 150 });

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
        const knownManagerIds = new Set(managers.map((m) => m.id));
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
              manager_id: c.userId && knownManagerIds.has(c.userId) ? c.userId : null,
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
    comments,
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

    // Preserve any existing comment on this call when saving/updating the GPT analysis
    let existingComment: string | undefined = undefined;
    let existingCommentUpdatedAt: string | undefined = undefined;
    try {
      const { data: existingRow } = await supabase
        .from('quo_call_analyses')
        .select('scorecard')
        .eq('call_id', callId)
        .maybeSingle();
      if (existingRow?.scorecard?.comment) {
        existingComment = existingRow.scorecard.comment;
        existingCommentUpdatedAt = existingRow.scorecard.commentUpdatedAt;
      }
    } catch {}

    analysis.scorecard = {
      ...analysis.scorecard,
      scoredAtMs: Date.now(),
      ...(existingComment ? { comment: existingComment, commentUpdatedAt: existingCommentUpdatedAt } : {}),
    };

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
    const { data: existingRow } = await supabase
      .from('quo_call_analyses')
      .select('scorecard, transcript')
      .eq('call_id', callId)
      .maybeSingle();

    const savedComment = existingRow?.scorecard?.comment;
    if (savedComment && String(savedComment).trim().length > 0) {
      // Keep the comment while clearing the GPT score
      const { error } = await supabase
        .from('quo_call_analyses')
        .update({
          score: -1,
          sentiment: 'neutral',
          summary: '__COMMENT_ONLY__',
          key_points: [],
          agreements: [],
          manager_strengths: [],
          manager_mistakes: [],
          action_items: [],
          scorecard: {
            isCommentOnly: true,
            comment: String(savedComment),
            commentUpdatedAt: existingRow?.scorecard?.commentUpdatedAt || new Date().toISOString(),
          },
        })
        .eq('call_id', callId);

      if (error) throw new Error(error.message);
      return { success: true };
    }

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

export async function deleteBulkCallAnalysesAction(callIds: string[]): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!callIds || callIds.length === 0) {
      return { success: true };
    }

    const { data: existingRows } = await supabase
      .from('quo_call_analyses')
      .select('call_id, scorecard')
      .in('call_id', callIds);

    const idsWithComments: { call_id: string; comment: string; commentUpdatedAt?: string }[] = [];
    const idsWithoutComments: string[] = [];

    const rowMap = new Map<string, any>();
    (existingRows || []).forEach((r: any) => rowMap.set(r.call_id, r));

    for (const id of callIds) {
      const r = rowMap.get(id);
      const savedComment = r?.scorecard?.comment;
      if (savedComment && String(savedComment).trim().length > 0) {
        idsWithComments.push({
          call_id: id,
          comment: String(savedComment),
          commentUpdatedAt: r?.scorecard?.commentUpdatedAt,
        });
      } else {
        idsWithoutComments.push(id);
      }
    }

    if (idsWithoutComments.length > 0) {
      const { error } = await supabase
        .from('quo_call_analyses')
        .delete()
        .in('call_id', idsWithoutComments);
      if (error) throw new Error(error.message);
    }

    for (const item of idsWithComments) {
      await supabase
        .from('quo_call_analyses')
        .update({
          score: -1,
          sentiment: 'neutral',
          summary: '__COMMENT_ONLY__',
          key_points: [],
          agreements: [],
          manager_strengths: [],
          manager_mistakes: [],
          action_items: [],
          scorecard: {
            isCommentOnly: true,
            comment: item.comment,
            commentUpdatedAt: item.commentUpdatedAt || new Date().toISOString(),
          },
        })
        .eq('call_id', item.call_id);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Ошибка массового удаления оценок' };
  }
}

export async function saveCallCommentAction(
  callId: string,
  comment: string
): Promise<{
  success: boolean;
  comment: string;
  error?: string;
}> {
  try {
    const trimmed = (comment || '').trim();
    const nowIso = new Date().toISOString();

    const { data: existingRow } = await supabase
      .from('quo_call_analyses')
      .select('*')
      .eq('call_id', callId)
      .maybeSingle();

    if (existingRow) {
      const isCommentOnly =
        existingRow.score === -1 ||
        existingRow.scorecard?.isCommentOnly ||
        existingRow.summary === '__COMMENT_ONLY__';

      if (isCommentOnly && !trimmed) {
        await supabase.from('quo_call_analyses').delete().eq('call_id', callId);
        return { success: true, comment: '' };
      }

      const nextScorecard = {
        ...(existingRow.scorecard || {}),
        comment: trimmed,
        commentUpdatedAt: nowIso,
      };
      if (!trimmed) {
        delete nextScorecard.comment;
        delete nextScorecard.commentUpdatedAt;
      }

      const { error } = await supabase
        .from('quo_call_analyses')
        .update({ scorecard: nextScorecard })
        .eq('call_id', callId);

      if (error) throw new Error(error.message);
      return { success: true, comment: trimmed };
    }

    if (!trimmed) {
      return { success: true, comment: '' };
    }

    const { error } = await supabase.from('quo_call_analyses').upsert({
      call_id: callId,
      score: -1,
      sentiment: 'neutral',
      summary: '__COMMENT_ONLY__',
      key_points: [],
      agreements: [],
      manager_strengths: [],
      manager_mistakes: [],
      action_items: [],
      scorecard: {
        isCommentOnly: true,
        comment: trimmed,
        commentUpdatedAt: nowIso,
      },
      transcript: [],
    });

    if (error) throw new Error(error.message);
    return { success: true, comment: trimmed };
  } catch (err: any) {
    return {
      success: false,
      comment: comment || '',
      error: err?.message || 'Не удалось сохранить комментарий к звонку',
    };
  }
}

export async function getAnalysesByCallIdsAction(callIds: string[]): Promise<{
  success: boolean;
  analyses: Record<string, CallAnalysisResult>;
}> {
  try {
    if (!callIds || callIds.length === 0) {
      return { success: true, analyses: {} };
    }
    const { data } = await supabase
      .from('quo_call_analyses')
      .select('*')
      .in('call_id', callIds);

    const analyses: Record<string, CallAnalysisResult> = {};
    if (data && data.length > 0) {
      data.forEach((row: any) => {
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

    return { success: true, analyses };
  } catch {
    return { success: false, analyses: {} };
  }
}
