import { query } from '../../cbt/_lib/db.js'

export interface SqlResult<T = any> {
  rows: T[]
}

export function sql<T = any>(strings: TemplateStringsArray, ...values: any[]): Promise<SqlResult<T>> {
  let text = ''
  const params: any[] = []
  let p = 1
  for (let i = 0; i < strings.length; i++) {
    text += strings[i]
    if (i < values.length) {
      text += `$${p++}`
      params.push(values[i])
    }
  }
  return query(text, params) as unknown as Promise<SqlResult<T>>
}
