import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const limitBytes = Number(process.env.CHUNK_SIZE_LIMIT ?? 900 * 1024)
const assetsDir = path.resolve(process.cwd(), 'dist', 'assets')

async function checkChunks() {
  try {
    const entries = await readdir(assetsDir)
    const oversized = []

    for (const entry of entries) {
      const filePath = path.join(assetsDir, entry)
      const info = await stat(filePath)
      if (!info.isFile()) continue
      if (entry.startsWith('vendor-') || entry.includes('students-list') || entry.startsWith('Chunks')) {
        continue
      }
      if (info.size > limitBytes) {
        oversized.push({ name: entry, size: info.size })
      }
    }

    if (oversized.length === 0) {
      console.log(`chunk size check passed (limit: ${limitBytes} bytes)`) 
      return
    }

    console.error('chunk size check failed: the following files exceed the size limit:')
    for (const chunk of oversized) {
      const sizeKb = (chunk.size / 1024).toFixed(2)
      console.error(`  • ${chunk.name} — ${sizeKb} KB`)
    }
    process.exitCode = 1
  } catch (error) {
    console.error('failed to run chunk size check:', error)
    process.exitCode = 1
  }
}

checkChunks()
