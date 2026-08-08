import { query } from '../../cbt/_lib/db.js'

export function sql(strings: TemplateStringsArray, ...values: any[]) {
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
  return query(text, params)
}
