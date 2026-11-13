export const TRACKING_DOMAINS = ['pay.insurvoice.ai'] as const;

export type TrackingDomain = (typeof TRACKING_DOMAINS)[number];

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateShortCode(length = 5): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * CODE_ALPHABET.length);
    result += CODE_ALPHABET[idx];
  }
  return result;
}

export function normalizeHost(rawHost: string | null): string {
  if (!rawHost) return '';
  return rawHost.split(':')[0].trim().toLowerCase();
}

export function isTrackingDomain(host: string | null): boolean {
  const normalized = normalizeHost(host);
  return (TRACKING_DOMAINS as readonly string[]).includes(normalized);
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function sanitizeSlug(raw: string): string {
  return raw.trim().replace(/^\/+|\/+$/g, '');
}
