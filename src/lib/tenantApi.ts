/**
 * Tenant API utility functions with tenant header support
 * Used for all tenant-scoped API calls
 */

const TENANT_ID = 'default-tenant';

function getAuthHeaders(): Record<string, string> {
  try {
    const stored = localStorage.getItem('auth');
    if (stored) {
      const auth = JSON.parse(stored);
      const headers: Record<string, string> = {
        'x-tenant-id': auth.tenantId || TENANT_ID,
      };
      if (auth.userId) {
        headers['x-user-id'] = auth.userId;
      }
      return headers;
    }
  } catch {
    // fall through
  }
  return { 'x-tenant-id': TENANT_ID };
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
