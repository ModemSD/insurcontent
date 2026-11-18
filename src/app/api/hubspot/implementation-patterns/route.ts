import { NextRequest, NextResponse } from 'next/server';
import {
  exportAndAnalyzeImplementationCalls,
  fetchDealPipelines,
} from '@/lib/hubspot/implementationCalls';

export async function GET() {
  try {
    const pipelines = await fetchDealPipelines();
    return NextResponse.json({ pipelines });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      stageName?: string;
      stageIds?: string[];
      mode?: 'passed' | 'current';
      claudeModel?: string;
    };

    const result = await exportAndAnalyzeImplementationCalls({
      stageName: body.stageName,
      stageIds: body.stageIds,
      mode: body.mode ?? 'passed',
      claudeModel: body.claudeModel,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
