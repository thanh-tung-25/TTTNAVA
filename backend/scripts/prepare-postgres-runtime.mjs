import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { runtimeParityPlan } from './lib/postgres-runtime-parity.mjs';
import { platformTables } from './lib/postgres-platform-tables.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const directory = process.argv[2];
if (!directory) throw Error('Provide the verified snapshot directory');
const manifest = JSON.parse(await fs.readFile(path.resolve(directory, 'manifest.json'), 'utf8'));
dotenv.config({ path: path.join(root, '.env.supabase'), quiet: true });
if (process.env.PGSCHEMA && process.env.PGSCHEMA !== 'ttnava_stage') throw Error('Staging schema required');
process.env.DB_DRIVER = 'postgres';
process.env.PGSCHEMA = 'ttnava_stage';
const { query, withTransaction, closePool } = await import('../src/config/db.js');
const plan = runtimeParityPlan(manifest);
const validateOnly = !process.argv.includes('--apply');
const rollback = Error('VALIDATION_ROLLBACK');
try {
  try {
    await withTransaction(async () => {
      await query("SET LOCAL lock_timeout='5s'");
      for (const sql of plan.sql) await query(sql);
      for (const sql of platformTables()) await query(sql);
      if (validateOnly) throw rollback;
    });
  } catch (error) { if (error !== rollback) throw error; }
  console.log(JSON.stringify({ ok: true, applied: !validateOnly, timestampTables: plan.timestampTables.length, accountCasefoldIndexes: 2 }));
} catch (error) {
  console.error(JSON.stringify({ ok: false, code: error.code || 'PARITY_PREPARATION_FAILED' }));
  process.exitCode = 1;
} finally { await closePool(); }
