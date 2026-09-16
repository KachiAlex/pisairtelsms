/**
 * Local HTTP type definitions for API request/response handlers.
 *
 * These extend Node.js's IncomingMessage/ServerResponse and add the
 * query/body/cookies properties that handlers expect.
 * Structurally compatible with Express's Request/Response.
 */

import type { IncomingMessage, ServerResponse, OutgoingHttpHeaders } from 'http';

export interface ApiRequest extends IncomingMessage {
  query: Record<string, any>;
  body: any;
  cookies: Record<string, string>;
  [key: string]: any;
}

export interface ApiResponse extends ServerResponse {
  status(code: number): this;
  json(body: any): void;
  send(body: any): void;
  redirect(url: string): void;
  redirect(status: number, url: string): void;
  cookie(name: string, value: string, options?: Record<string, any>): this;
  clearCookie(name: string, options?: Record<string, any>): this;
  [key: string]: any;
}
