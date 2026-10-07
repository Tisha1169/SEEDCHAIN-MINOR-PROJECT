const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

/**
 * Accepts our own trace URLs (this origin or the configured public base) or a
 * bare token. Anything else (other websites, JSON blobs, random text) is
 * rejected, so the scanner never navigates to or trusts arbitrary QR content.
 */
export function extractToken(payload: string, allowedOrigins: string[] = defaultOrigins()): string | null {
  const text = payload.trim();
  if (TOKEN_RE.test(text)) return text;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (!allowedOrigins.includes(url.origin)) return null;
  const m = url.pathname.match(/^\/trace\/([A-Za-z0-9_-]{43})\/?$/);
  return m ? m[1] : null;
}

export function defaultOrigins(): string[] {
  const origins = [window.location.origin];
  const configured = import.meta.env.VITE_PUBLIC_TRACE_BASE_URL as string | undefined;
  if (configured) {
    try {
      origins.push(new URL(configured).origin);
    } catch {
      /* ignore malformed config */
    }
  }
  return origins;
}
