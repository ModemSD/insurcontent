import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isValidHttpUrl, sanitizeSlug } from '@/lib/shortLinks';

function isAuthenticated(req: NextRequest): boolean {
  return Boolean(req.cookies.get('sb-access-token')?.value);
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const { data: clicks, error } = await supabase
    .from('short_link_clicks')
    .select('id, clicked_at, user_agent, referer, ip')
    .eq('link_id', id)
    .order('clicked_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ clicks: clicks || [] });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  let body: {
    target_url?: string;
    title?: string | null;
    is_active?: boolean;
    code?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.target_url !== undefined) {
    const targetUrl = body.target_url.trim();
    if (!isValidHttpUrl(targetUrl)) {
      return NextResponse.json(
        { error: 'Некорректный целевой URL (должен начинаться с http:// или https://)' },
        { status: 400 }
      );
    }
    updates.target_url = targetUrl;
  }

  if (body.title !== undefined) {
    updates.title = body.title?.trim() || null;
  }

  if (body.is_active !== undefined) {
    updates.is_active = Boolean(body.is_active);
  }

  if (body.code !== undefined) {
    const code = sanitizeSlug(body.code);
    if (!code || !/^[a-zA-Z0-9_-]+$/.test(code)) {
      return NextResponse.json(
        { error: 'Код может содержать только латинские буквы, цифры, - и _' },
        { status: 400 }
      );
    }
    updates.code = code;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('short_links')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    const isDuplicate = error.code === '23505';
    return NextResponse.json(
      { error: isDuplicate ? 'Такой код уже используется для этого домена' : error.message },
      { status: isDuplicate ? 409 : 500 }
    );
  }

  return NextResponse.json({ link: data });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const { error } = await supabase.from('short_links').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
