/**
 * Ambient type declarations for @vercel/postgres.
 * The package ships an ESM entry without bundled TypeScript declarations,
 * so we provide minimal, accurate type surfaces for the usage patterns in
 * this codebase: the `sql` tagged-template helper (which also exposes
 * `.query()` / `.unsafe()`).
 */
declare module '@vercel/postgres' {
  export interface QueryResult<T = any> {
    rows: T[]
    rowCount: number | null
    command?: string
    fields?: unknown[]
  }

  export interface VercelSql {
    <T = any>(
      strings: TemplateStringsArray,
      ...values: unknown[]
    ): Promise<QueryResult<T>>
    query<T = any>(
      queryTextOrConfig: string,
      values?: unknown[]
    ): Promise<QueryResult<T>>
    unsafe<T = any>(query: string, values?: unknown[]): Promise<QueryResult<T>>
  }

  export const sql: VercelSql
}
