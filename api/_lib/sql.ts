/**
 * Local SQL tagged template helper backed by the PostgreSQL pool.
 *
 * Uses the existing pg.Pool from api/_lib/pg-pool.ts for connection management.
 * The `sql` tag converts template literals into parameterized queries:
 *
 *   const result = await sql`SELECT * FROM users WHERE id = ${userId}`
 *   // → text: "SELECT * FROM users WHERE id = $1", values: [userId]
 */

import { getPool, poolQuery } from './pg-pool.js'
import { scopedQuery, applyRlsScope } from './rls-context.js'

export interface SqlResult<T = any> {
  rows: T[]
  rowCount: number
  command: string
  oid: number
  fields: any[]
}

/**
 * Tagged template function that produces parameterized SQL queries.
 * Returns a Promise that resolves to the query result.
 * Generic type parameter T specifies the row shape.
 */
export function sql<T = any>(strings: TemplateStringsArray, ...values: any[]): Promise<SqlResult<T>> {
  let text = ''
  for (let i = 0; i < strings.length; i++) {
    text += strings[i]
    if (i < values.length) {
      text += `$${i + 1}`
    }
  }
  return scopedQuery<T>(getPool(), text, values) as Promise<SqlResult<T>>
}

/**
 * sql.query — raw query with explicit text and params.
 * Generic type parameter T specifies the row shape.
 */
sql.query = function <T = any>(text: string, params?: any[]): Promise<SqlResult<T>> {
  return scopedQuery<T>(getPool(), text, params) as Promise<SqlResult<T>>
}

/**
 * db — transaction-safe client helper for multi-query transactions.
 */
export const db = {
  async transaction<T>(callback: (tx: { query: <R = any>(text: string, params?: any[]) => Promise<SqlResult<R>> }) => Promise<T>): Promise<T> {
    const client = await getPool().connect()
    try {
      await client.query('BEGIN')
      await applyRlsScope(client)
      const tx = {
        query: <R = any>(text: string, params?: any[]) => client.query(text, params) as Promise<SqlResult<R>>,
      }
      const result = await callback(tx)
      await client.query('COMMIT')
      return result
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },
}

export { poolQuery }
export default sql
