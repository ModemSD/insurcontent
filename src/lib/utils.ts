/**
 * Formats a URL string to ensure it is a valid absolute URL.
 * Handles cases where Google News links are stored as raw base64 IDs (e.g. starting with CBMi...)
 * or when a protocol is missing.
 */
export function formatUrl(url: string, source?: string): string {
  if (!url) return '';

  const trimmedUrl = url.trim();

  // If it already has http/https protocol, return as is
  if (/^https?:\/\//i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  const cleanSource = source?.toLowerCase() || '';

  // If the source is google or the URL looks like a Google News ID (starting with CBMi)
  if (cleanSource === 'google' || trimmedUrl.startsWith('CBMi')) {
    // Strip leading slash if any
    const cleanId = trimmedUrl.startsWith('/') ? trimmedUrl.slice(1) : trimmedUrl;
    return `https://news.google.com/rss/articles/${cleanId}`;
  }

  // If the URL starts with www. or looks like a domain, prepending https://
  if (/^(www\.)|[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/i.test(trimmedUrl)) {
    return `https://${trimmedUrl}`;
  }

  return trimmedUrl;
}
