import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  TRACKING_DOMAINS,
  generateShortCode,
  isValidHttpUrl,
  sanitizeSlug,
} from '@/lib/shortLinks';

function isAuthenticated(req: NextRequest): boolean {
  return Boolean(req.cookies.get('sb-access-token')?.value);
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('short_links')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ links: data || [] });
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    domain?: string;
    target_url?: string;
    code?: string;
    title?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const domain = (body.domain || TRACKING_DOMAINS[0]).trim().toLowerCase();
  const targetUrl = (body.target_url || '').trim();
  const title = body.title?.trim() || null;

  if (!(TRACKING_DOMAINS as readonly string[]).includes(domain)) {
    return NextResponse.json({ error: 'Unsupported domain' }, { status: 400 });
  }

  if (!isValidHttpUrl(targetUrl)) {
    return NextResponse.json(
      { error: 'Некорректный целевой URL (должен начинаться с http:// или https://)' },
      { status: 400 }
    );
  }

  let code = body.code ? sanitizeSlug(body.code) : '';
  if (code) {
    if (!/^[a-zA-Z0-9_-]+$/.test(code)) {
      return NextResponse.json(
        { error: 'Код может содержать только латинские буквы, цифры, - и _' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('short_links')
      .insert({ domain, code, target_url: targetUrl, title })
      .select()
      .single();

    if (error) {
      const isDuplicate = error.code === '23505';
      return NextResponse.json(
        { error: isDuplicate ? 'Такой код уже используется для этого домена' : error.message },
        { status: isDuplicate ? 409 : 500 }
      );
    }

    return NextResponse.json({ link: data }, { status: 201 });
  }

  // Auto-generate unique code with retries
  for (let attempt = 0; attempt < 5; attempt++) {
    code = generateShortCode(5);
    const { data, error } = await supabase
      .from('short_links')
      .insert({ domain, code, target_url: targetUrl, title })
      .select()
      .single();

    if (!error) {
      return NextResponse.json({ link: data }, { status: 201 });
    }

    if (error.code !== '23505') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: 'Не удалось сгенерировать уникальный код, попробуйте ещё раз' },
    { status: 500 }
  );
}
