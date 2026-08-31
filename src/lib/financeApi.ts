/**
 * Finance API utility functions with JWT auth support
 */

function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    try {
      const auth = localStorage.getItem('auth')
      if (auth) {
        const parsed = JSON.parse(auth)
        if (parsed.token) return parsed.token
      }
    } catch { /* ignore */ }
  }
  return null
}

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

export async function financeApiFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const token = getAuthToken()
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

export async function financeApiGet(url: string): Promise<Response> {
  return financeApiFetch(url, {
    method: 'GET',
  });
}

export async function financeApiPost(
  url: string,
  body?: any,
  headers?: Record<string, string>
): Promise<Response> {
  return financeApiFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function financeApiPut(
  url: string,
  body?: any,
  headers?: Record<string, string>
): Promise<Response> {
  return financeApiFetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function financeApiDelete(url: string): Promise<Response> {
  return financeApiFetch(url, {
    method: 'DELETE',
  });
}
