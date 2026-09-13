import { createClient } from '@supabase/supabase-js'
import pg from 'pg'
const { Client } = pg

const SUPABASE_URL = 'https://mlshhbeirmpkqkbrjich.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sc2hoYmVpcm1wa3FrYnJqaWNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MDM2ODgsImV4cCI6MjA4OTE3OTY4OH0.KFHiH2L6ztr9BOYs8kAdcFzkgPE00SoJ38bQrEKOvAI'
const NEON_URL = 'postgresql://neondb_owner:npg_KL1jR3zFwlUQ@ep-muddy-salad-b2ib16i5-pooler.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

const TABLES = [
  'characters',
  'character_stats',
  'character_inventory',
  'character_actions',
  'character_spells',
  'character_cantrips',
]

// Infer a SQL type from a JS value
function inferType(value) {
  if (value === null || value === undefined) return 'text'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'numeric'
  if (typeof value === 'object') return 'jsonb'
  // UUID pattern
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return 'uuid'
  return 'text'
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const dest = new Client({ connectionString: NEON_URL })

async function migrate() {
  await dest.connect()
  console.log('Connected to Neon')

  for (const table of TABLES) {
    console.log(`\nMigrating: ${table}`)
    const { data, error } = await supabase.from(table).select('*')

    if (error) {
      console.error(`  Error reading ${table}:`, error.message)
      continue
    }

    console.log(`  Found ${data.length} rows`)

    // Collect all column names and infer types from all rows
    const colTypes = {}
    for (const row of data) {
      for (const [col, val] of Object.entries(row)) {
        if (!colTypes[col] || colTypes[col] === 'text') {
          colTypes[col] = inferType(val)
        }
      }
    }

    if (Object.keys(colTypes).length === 0) {
      console.log(`  No data to infer schema, skipping`)
      continue
    }

    // Build CREATE TABLE
    const colDefs = Object.entries(colTypes).map(([col, type]) => `"${col}" ${type}`).join(',\n  ')
    await dest.query(`DROP TABLE IF EXISTS "${table}" CASCADE`)
    await dest.query(`CREATE TABLE "${table}" (\n  ${colDefs}\n)`)
    console.log(`  Created table with columns: ${Object.keys(colTypes).join(', ')}`)

    // Insert rows
    if (data.length > 0) {
      const columns = Object.keys(colTypes)
      const colList = columns.map(c => `"${c}"`).join(', ')
      for (const row of data) {
        const values = columns.map(c => row[c] ?? null)
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ')
        await dest.query(
          `INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`,
          values
        )
      }
      console.log(`  Inserted ${data.length} rows`)
    }
  }

  await dest.end()
  console.log('\nMigration complete!')
}

migrate().catch(err => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
