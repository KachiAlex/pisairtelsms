import '@vercel/postgres'
import type { QueryResult, QueryResultRow } from '@vercel/postgres'

declare module '@vercel/postgres' {
  interface VercelPool {
    query: <O extends QueryResultRow = QueryResultRow>(
      text: string,
      values?: unknown[]
    ) => Promise<QueryResult<O>>
  }
}
