import { parseCookies, getAccessIdentity } from '@/lib/auth';

/**
 * Create a mock JWT token with the given payload.
 * Uses base64url encoding for the payload segment.
 */
function createMockJWT(payload: Record<string, unknown>): string {
  const headerB64 = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${headerB64}.${body}.fake-signature`;
}

describe('parseCookies', () => {
  it('returns empty object for empty string', () => {
    expect(parseCookies('')).toEqual({});
  });

  it('parses a single cookie', () => {
    const result = parseCookies('session=abc123');
    expect(result).toEqual({ session: 'abc123' });
  });

  it('parses multiple cookies', () => {
    const result = parseCookies('session=abc123; theme=dark; lang=en');
    expect(result).toEqual({
      session: 'abc123',
      theme: 'dark',
      lang: 'en',
    });
  });

  it('handles cookies with = in the value', () => {
    const result = parseCookies('CF_Authorization=eyJhbGc=.eyJlbWFpbCI=.sig');
    expect(result).toEqual({
      CF_Authorization: 'eyJhbGc=.eyJlbWFpbCI=.sig',
    });
  });

  it('trims whitespace from cookie names and values', () => {
    const result = parseCookies('  session = abc123 ;  theme = dark ');
    expect(result).toEqual({
      session: 'abc123',
      theme: 'dark',
    });
  });

  it('skips entries with empty names after trimming', () => {
    const result = parseCookies(';; session=abc; ;;');
    expect(result).toEqual({ session: 'abc' });
  });
});

describe('getAccessIdentity', () => {
  it('extracts identity from a valid JWT in CF_Authorization cookie', () => {
    const token = createMockJWT({
      email: 'user@example.com',
      sub: 'user-123-abc',
    });
    const request = new Request('https://example.com', {
      headers: { Cookie: `CF_Authorization=${token}` },
    });

    const result = getAccessIdentity(request);
    expect(result).toEqual({
      email: 'user@example.com',
      sub: 'user-123-abc',
    });
  });

  it('returns null when there is no Cookie header', () => {
    const request = new Request('https://example.com');
    expect(getAccessIdentity(request)).toBeNull();
  });

  it('returns null when CF_Authorization cookie is missing', () => {
    const request = new Request('https://example.com', {
      headers: { Cookie: 'session=abc; theme=dark' },
    });
    expect(getAccessIdentity(request)).toBeNull();
  });

  it('returns null for invalid JWT format (not 3 parts)', () => {
    const request = new Request('https://example.com', {
      headers: { Cookie: 'CF_Authorization=not-a-jwt' },
    });
    expect(getAccessIdentity(request)).toBeNull();
  });

  it('returns null for malformed payload (not valid JSON)', () => {
    const request = new Request('https://example.com', {
      headers: { Cookie: 'CF_Authorization=header.not-valid-base64!.sig' },
    });
    expect(getAccessIdentity(request)).toBeNull();
  });

  it('returns null when payload is missing email field', () => {
    const token = createMockJWT({ sub: 'user-123' });
    const request = new Request('https://example.com', {
      headers: { Cookie: `CF_Authorization=${token}` },
    });
    expect(getAccessIdentity(request)).toBeNull();
  });

  it('returns null when payload is missing sub field', () => {
    const token = createMockJWT({ email: 'user@example.com' });
    const request = new Request('https://example.com', {
      headers: { Cookie: `CF_Authorization=${token}` },
    });
    expect(getAccessIdentity(request)).toBeNull();
  });

  it('returns null when email is not a string', () => {
    const token = createMockJWT({ email: 123, sub: 'user-123' });
    const request = new Request('https://example.com', {
      headers: { Cookie: `CF_Authorization=${token}` },
    });
    expect(getAccessIdentity(request)).toBeNull();
  });

  it('works with other cookies present alongside CF_Authorization', () => {
    const token = createMockJWT({
      email: 'admin@example.com',
      sub: 'admin-456',
    });
    const request = new Request('https://example.com', {
      headers: { Cookie: `session=xyz; CF_Authorization=${token}; theme=light` },
    });

    const result = getAccessIdentity(request);
    expect(result).toEqual({
      email: 'admin@example.com',
      sub: 'admin-456',
    });
  });
});
