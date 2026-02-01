/**
 * Utilities for extracting user identity from Cloudflare Access JWT tokens.
 */

/**
 * Represents the identity extracted from a Cloudflare Access JWT.
 */
export interface AccessIdentity {
  /** User's email address */
  email: string;
  /** User's unique identifier (subject claim) */
  sub: string;
}

/**
 * Parses a cookie header string into a key-value record.
 *
 * @param cookieHeader - The raw Cookie header value
 * @returns A record mapping cookie names to their values
 */
export function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  if (!cookieHeader) {
    return cookies;
  }

  const pairs = cookieHeader.split(";");

  for (const pair of pairs) {
    const [name, ...valueParts] = pair.split("=");
    if (name) {
      const trimmedName = name.trim();
      const value = valueParts.join("=").trim();
      if (trimmedName) {
        cookies[trimmedName] = value;
      }
    }
  }

  return cookies;
}

/**
 * Decodes a base64url-encoded string to a regular string.
 *
 * @param base64url - The base64url-encoded string
 * @returns The decoded string
 */
function decodeBase64Url(base64url: string): string {
  // Replace base64url-specific characters with standard base64 characters
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");

  // Add padding if necessary
  const padding = base64.length % 4;
  if (padding) {
    base64 += "=".repeat(4 - padding);
  }

  return atob(base64);
}

/**
 * Extracts user identity from a Cloudflare Access JWT token in the request.
 *
 * The function looks for the `CF_Authorization` cookie, decodes the JWT payload,
 * and extracts the user's email and subject (user ID) claims.
 *
 * @param request - The incoming HTTP request
 * @returns The user's identity if successfully extracted, or null if extraction fails
 *
 * @example
 * ```ts
 * const identity = getAccessIdentity(request);
 * if (identity) {
 *   console.log(`User: ${identity.email}, ID: ${identity.sub}`);
 * }
 * ```
 */
export function getAccessIdentity(request: Request): AccessIdentity | null {
  try {
    // Get the Cookie header from the request
    const cookieHeader = request.headers.get("Cookie");
    if (!cookieHeader) {
      return null;
    }

    // Parse cookies and find CF_Authorization
    const cookies = parseCookies(cookieHeader);
    const token = cookies["CF_Authorization"];
    if (!token) {
      return null;
    }

    // Split the JWT into its parts (header.payload.signature)
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (middle part)
    const payloadJson = decodeBase64Url(parts[1]);
    const payload = JSON.parse(payloadJson) as Record<string, unknown>;

    // Extract email and sub from the payload
    const email = payload.email;
    const sub = payload.sub;

    if (typeof email !== "string" || typeof sub !== "string") {
      return null;
    }

    return { email, sub };
  } catch {
    // Return null for any parsing errors
    return null;
  }
}
