/**
 * Fetch-based API client for the Tasmania Aerial Photo Explorer.
 * All API calls go through this module for consistent error handling.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = await response.text();
    }
    const message =
      typeof errorData === 'object' && errorData !== null && 'error' in errorData
        ? String((errorData as { error: unknown }).error)
        : `API error: ${response.status}`;
    throw new ApiError(response.status, message, errorData);
  }
  return response.json() as Promise<T>;
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(path, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export const api = {
  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const url = buildUrl(path, params);
    const response = await fetch(url);
    return handleResponse<T>(response);
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(buildUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async put<T>(path: string, body?: ArrayBuffer | unknown): Promise<T> {
    const isArrayBuffer = body instanceof ArrayBuffer;
    const response = await fetch(buildUrl(path), {
      method: 'PUT',
      headers: isArrayBuffer
        ? { 'Content-Type': 'application/octet-stream' }
        : { 'Content-Type': 'application/json' },
      body: isArrayBuffer ? body : body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async delete<T>(path: string): Promise<T> {
    const response = await fetch(buildUrl(path), { method: 'DELETE' });
    return handleResponse<T>(response);
  },

  async postFormData<T>(path: string, formData: FormData): Promise<T> {
    const response = await fetch(buildUrl(path), {
      method: 'POST',
      body: formData,
    });
    return handleResponse<T>(response);
  },
};
