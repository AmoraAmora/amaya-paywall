// Applies server/db/migrations/*.sql in name order. Statements are idempotent (IF NOT EXISTS).
// Usage: npm run db:migrate   (reads DATABASE_URL from the environment or .env)
import { readdirSync, readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const sql = neon(url)
const dir = new URL('../server/db/migrations/', import.meta.url)
const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort()

for (const file of files) {
  const text = readFileSync(new URL(file, dir), 'utf8')
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
  // The HTTP driver runs one statement per request.
  for (const statement of text.split(';').map(s => s.trim()).filter(Boolean)) {
    await sql.query(statement)
  }
  console.log('applied', file)
}
