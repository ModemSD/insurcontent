import { NextRequest, NextResponse } from 'next/server';
import { exportAndAnalyzeImplementationCalls } from '@/lib/hubspot/implementationCalls';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      stageName?: string;
      stageIds?: string[];
      claudeModel?: string;
    };

    const result = await exportAndAnalyzeImplementationCalls({
      stageName: body.stageName,
      stageIds: body.stageIds,
      claudeModel: body.claudeModel,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
