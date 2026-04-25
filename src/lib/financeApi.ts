/**
 * Finance API utility functions with tenant header support
 */

const TENANT_ID = 'default-tenant';

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

export async function financeApiFetch(
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
