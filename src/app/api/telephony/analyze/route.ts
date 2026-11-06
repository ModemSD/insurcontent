import { NextResponse } from 'next/server';
import { runGptAnalysisForCallAction } from '@/app/telephony/actions';
import { InsurvoiceCallType } from '@/types/telephony';

// Deduplicate in-flight GPT requests by callId so page reloads attach to the running analysis
const inFlightAnalyses = new Map<string, Promise<any>>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      callId,
      managerName,
      customCriteria,
      model,
      callType,
      durationSeconds,
      lang,
    }: {
      callId: string;
      managerName?: string;
      customCriteria?: string;
      model?: string;
      callType?: InsurvoiceCallType;
      durationSeconds?: number;
      lang?: 'ru' | 'en';
    } = body;

    if (!callId) {
      return NextResponse.json({ success: false, error: 'Не передан callId' }, { status: 400 });
    }

    let jobPromise = inFlightAnalyses.get(callId);
    if (!jobPromise) {
      jobPromise = runGptAnalysisForCallAction(
        callId,
        managerName,
        customCriteria,
        model,
        callType || 'Auto',
        durationSeconds,
        lang || 'ru'
      ).finally(() => {
        inFlightAnalyses.delete(callId);
      });
      inFlightAnalyses.set(callId, jobPromise);
    }

    const result = await jobPromise;

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Ошибка параллельного анализа звонка' },
      { status: 500 }
    );
  }
}

