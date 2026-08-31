declare module 'express' {
  export interface Request {
    body: any;
    query: any;
    params: any;
    headers: any;
    method: string;
  }
  export interface Response {
    status(code: number): Response;
    json(data: any): Response;
    send(data: any): Response;
    setHeader(name: string, value: string): Response;
  }
  export interface Router {
    get(path: string, handler: (req: Request, res: Response) => any): void;
    post(path: string, handler: (req: Request, res: Response) => any): void;
    put(path: string, handler: (req: Request, res: Response) => any): void;
    delete(path: string, handler: (req: Request, res: Response) => any): void;
  }
  export function Router(): Router;
}

// Legacy db module stubs — these files use a better-sqlite3 style API
// that doesn't exist in the Vercel/postgres architecture. They are unused
// legacy code; these stubs just satisfy the type checker.
declare module '*/_lib/db' {
  export const db: {
    prepare(sql: string): {
      all(...params: any[]): any[];
      get(...params: any[]): any;
      run(...params: any[]): void;
    };
  };
}

// Legacy decoded token stub — referenced by old Express router files
declare const decoded: { tenantId?: string; userId?: string; role?: string };

declare module 'next' {
  export interface NextApiRequest {
    body: any;
    query: any;
    params: any;
    headers: any;
    method: string;
  }
  export interface NextApiResponse<T = any> {
    status(code: number): NextApiResponse<T>;
    json(data: T): NextApiResponse<T>;
    send(data: any): NextApiResponse<T>;
    setHeader(name: string, value: string): NextApiResponse<T>;
  }
}
