import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { normalizeHost } from '@/lib/shortLinks';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await context.params;
  const code = decodeURIComponent(rawCode || '').trim();
  const domain = normalizeHost(
    req.nextUrl.searchParams.get('domain') || req.headers.get('host')
  );

  if (!code || !domain) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const { data: link, error } = await supabase
    .from('short_links')
    .select('id, target_url, is_active')
    .eq('domain', domain)
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !link) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const userAgent = req.headers.get('user-agent') || null;
  const referer = req.headers.get('referer') || null;
  const forwardedFor = req.headers.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : null;

  // Record click and increment counter (best-effort, do not block redirect on analytics error)
  await Promise.allSettled([
    supabase.rpc('increment_short_link_clicks', { p_link_id: link.id }),
    supabase.from('short_link_clicks').insert({
      link_id: link.id,
      user_agent: userAgent,
      referer,
      ip,
    }),
  ]);

  const response = NextResponse.redirect(link.target_url, { status: 307 });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}
