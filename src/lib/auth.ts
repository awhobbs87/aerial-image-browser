/**
 * Cloudflare Access JWT identity extraction.
 * Extracts user identity from CF_Authorization cookie.
 */

export interface AccessIdentity {
  email: string;
  sub: string;
}

export function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const [name, ...valueParts] = pair.split('=');
    if (name) {
      const trimmedName = name.trim();
      const value = valueParts.join('=').trim();
      if (trimmedName) {
        cookies[trimmedName] = value;
      }
    }
  }
  return cookies;
}

function decodeBase64Url(base64url: string): string {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }
  return atob(base64);
}

export function getAccessIdentity(request: Request): AccessIdentity | null {
  try {
    const cookieHeader = request.headers.get('Cookie');
    if (!cookieHeader) return null;

    const cookies = parseCookies(cookieHeader);
    const token = cookies['CF_Authorization'];
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payloadJson = decodeBase64Url(parts[1]);
    const payload = JSON.parse(payloadJson) as Record<string, unknown>;

    const email = payload.email;
    const sub = payload.sub;

    if (typeof email !== 'string' || typeof sub !== 'string') return null;

    return { email, sub };
  } catch {
    return null;
  }
}
