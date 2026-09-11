/**
 * Ambient type declarations for @vercel/node.
 * The package ships an ESM entry without bundled TypeScript declarations,
 * so we declare the VercelRequest / VercelResponse shapes used by the
 * serverless handlers in this repo.
 */
declare module '@vercel/node' {
  import type { IncomingMessage, ServerResponse } from 'http'

  export interface VercelRequest extends IncomingMessage {
    body: any
    query: Record<string, string | string[] | undefined>
    cookies: Record<string, string>
  }

  export interface VercelResponse extends ServerResponse {
    status(code: number): VercelResponse
    json(body: unknown): VercelResponse
    send(body?: unknown): VercelResponse
    redirect(statusOrUrl: number | string, url?: string): VercelResponse
  }
}