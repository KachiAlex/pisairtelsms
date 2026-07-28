/**
 * Tenant API utility functions with JWT auth support
 * Used for all tenant-scoped API calls
 * Tenant ID is sourced from the JWT token on the server side.
 */

function getAuthHeaders(): Record<string, string> {
  try {
    const stored = localStorage.getItem('auth');
    if (stored) {
      const auth = JSON.parse(stored);
      if (auth.token) {
        return { Authorization: `Bearer ${auth.token}` };
      }
    }
  } catch {
    // fall through
  }
  return {};
}

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

export async function tenantApiFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

export async function tenantApiGet(url: string): Promise<Response> {
  return tenantApiFetch(url, {
    method: 'GET',
  });
}

export async function tenantApiPost(
  url: string,
  body?: any,
  headers?: Record<string, string>
): Promise<Response> {
  return tenantApiFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function tenantApiPut(
  url: string,
  body?: any,
  headers?: Record<string, string>
): Promise<Response> {
  return tenantApiFetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function tenantApiDelete(url: string): Promise<Response> {
  return tenantApiFetch(url, {
    method: 'DELETE',
  });
}
