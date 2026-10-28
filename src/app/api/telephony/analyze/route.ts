import { NextResponse } from 'next/server';
import { runGptAnalysisForCallAction } from '@/app/telephony/actions';
import { InsurvoiceCallType } from '@/types/telephony';

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

    const result = await runGptAnalysisForCallAction(
      callId,
      managerName,
      customCriteria,
      model,
      callType || 'Auto',
      durationSeconds,
      lang || 'ru'
    );

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Ошибка параллельного анализа звонка' },
      { status: 500 }
    );
  }
}

