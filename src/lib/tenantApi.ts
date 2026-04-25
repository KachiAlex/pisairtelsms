/**
 * Tenant API utility functions with tenant header support
 * Used for all tenant-scoped API calls
 */

const TENANT_ID = 'default-tenant';

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

export async function tenantApiFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const headers = {
    'x-tenant-id': TENANT_ID,
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
