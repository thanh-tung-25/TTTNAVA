import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
const root = fileURLToPath(new URL('../', import.meta.url));
const local = dotenv.parse(await fs.readFile(path.join(root, '.env')));
const remote = dotenv.parse(await fs.readFile(path.join(root, '.env.supabase')));
const values = {
  NODE_ENV: 'production', DB_DRIVER: 'postgres', COOKIE_SECURE: 'true',
  JWT_SECRET: local.JWT_SECRET || '',
  PGHOST: remote.PGHOST || '', PGPORT: '6543', PGDATABASE: remote.PGDATABASE || 'postgres',
  PGUSER: remote.PGUSER || '', PGPASSWORD: remote.PGPASSWORD || '', PGSCHEMA: 'ttnava_stage', PGPOOL_SIZE: '1',
  PGSSLROOTCERT: remote.PGSSLROOTCERT || 'certs/supabase-ca.crt',
  STORAGE_PROVIDER: 'supabase', SUPABASE_URL: remote.SUPABASE_URL || '',
  SUPABASE_SECRET_KEY: remote.SUPABASE_SECRET_KEY || '', SUPABASE_STORAGE_BUCKET: 'ttnava-private',
};
if (local.AI_QUESTION_ENABLED === 'true') {
  for (const key of ['AI_QUESTION_ENABLED', 'AI_QUESTION_API_URL', 'AI_QUESTION_API_KEY', 'AI_QUESTION_MODEL']) values[key] = local[key] || '';
}
const missing = Object.entries(values).filter(([, value]) => !value).map(([key]) => key);
if (!values.PGHOST.endsWith('.pooler.supabase.com')) missing.push('PGHOST_MUST_BE_POOLER');
if (values.JWT_SECRET.length < 32) missing.push('JWT_SECRET_TOO_SHORT');
if (!values.SUPABASE_SECRET_KEY.startsWith('sb_secret_')) missing.push('SUPABASE_SECRET_KEY_FORMAT');
function line(key, value) {
  for (const quote of ['"', "'", '`']) {
    if (!value.includes(quote)) {
      const text = key + '=' + quote + value + quote;
      if (dotenv.parse(text)[key] === value) return text;
    }
  }
  throw Error('Environment value cannot be safely serialized: ' + key);
}
if (process.argv.includes('--write')) {
  const output = '# PRIVATE: import into Vercel Environment Variables. Do not share or commit.\n'
    + Object.entries(values).map(([key, value]) => line(key, value)).join('\n') + '\n';
  await fs.writeFile(path.join(root, '.env.vercel'), output, { mode: 0o600 });
}
console.log(JSON.stringify({ ready: missing.length === 0, missing: [...new Set(missing)], fileWritten: process.argv.includes('--write'), secretsPrinted: false }));
if (missing.length) process.exitCode = 1;
