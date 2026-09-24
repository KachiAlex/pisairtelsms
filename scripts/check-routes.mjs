#!/usr/bin/env node
// Route coverage check: every literal /api/... path called by the frontend
// must match a rewrite source in routes.json (Vercel-style, [param] segments).
//
// Usage: node scripts/check-routes.mjs
// Exit 1 if any frontend-called API path has no matching route.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const SRC = join(ROOT, 'src')
const routesJson = JSON.parse(readFileSync(join(ROOT, 'routes.json'), 'utf8'))
const routes = Array.isArray(routesJson) ? routesJson : routesJson.rewrites

// Build regexes from route sources: both :param and [param] segments are wildcards
const routePatterns = routes
  .map((r) => r.source)
  .filter((s) => s.startsWith('/api/'))
  .map((source) => {
    const regex =
      '^' +
      source
        .replace(/[.*+?^${}()|\\]/g, '\\$&')
        .replace(/\[[^\]]+\]/g, '[^/]+')
        .replace(/:[^/]+/g, '[^/]+') +
      '$'
    return { source, regex: new RegExp(regex) }
  })

// Recursively collect frontend source files
function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) yield* walk(p)
    else if (/\.(ts|tsx|js|jsx)$/.test(entry)) yield p
  }
}

// Extract API paths from fetch/api calls. Captures the literal portion of
// template literals up to the first ${...} interpolation.
const CALL_RE =
  /(?:fetch|apiGet|apiPost|apiPut|apiDelete|apiFetch|tenantApiGet|tenantApiPost|tenantApiPut|tenantApiDelete|adminApiGet|adminApiPost|api\.(?:get|post|put|delete|patch))\s*\(\s*[`'"]([^`'"]*)[`'"]/g

const missing = new Map()

for (const file of walk(SRC)) {
  const text = readFileSync(file, 'utf8')
  let m
  while ((m = CALL_RE.exec(text))) {
    let path = m[1]
    if (!path.startsWith('/api/')) continue
    // Complete ${...} interpolations become wildcard segments
    path = path.replace(/\$\{[^}]*\}/g, '*')
    // Truncated captures (nested template literals) — keep the literal head
    path = path.split('${')[0]
    // Query strings are not part of route matching
    path = path.split('?')[0].replace(/\/+$/, '') || path.split('?')[0]
    if (!path) continue
    const matched = routePatterns.some(({ regex }) => {
      if (regex.test(path)) return true
      if (path.includes('*')) {
        const concrete = path.replace(/\*/g, 'x')
        if (regex.test(concrete)) return true
        const head = path.split('*')[0].replace(/\/+$/, '')
        if (head && regex.test(head)) return true
      }
      return false
    })
    if (!matched) {
      if (!missing.has(path)) missing.set(path, [])
      missing.get(path).push(relative(ROOT, file))
    }
  }
}

if (missing.size === 0) {
  console.log(`Route check passed: all frontend /api calls match routes.json (${routePatterns.length} routes).`)
  process.exit(0)
}

console.error(`Route check FAILED: ${missing.size} frontend API path(s) have no matching route:\n`)
for (const [path, files] of [...missing.entries()].sort()) {
  console.error(`  ${path}`)
  for (const f of files.slice(0, 3)) console.error(`      ${f}`)
}
process.exit(1)
