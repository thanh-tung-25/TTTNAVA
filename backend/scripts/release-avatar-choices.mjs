import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { parseEnv } from 'node:util';

const migration = '052_avatar_choices.sql';
const config = parseEnv(await fs.readFile(new URL('../.env.vercel', import.meta.url), 'utf8'));
assert.equal(config.DB_DRIVER, 'postgres');
assert.equal(config.PGSCHEMA, 'ttnava_stage');
assert.equal(new URL(config.SUPABASE_URL).hostname, 'njaasgcfgjismpmzoncb.supabase.co');
Object.assign(process.env, config);
process.env.PGPOOL_SIZE = '1';

const db = await import('../src/config/db.js');
const allowed = ['meo','cho','tho','gau','cao','cu','ech','ga','voi','khi','gau-truc','ho','ky-lan','khung-long','canh-cut','gau-koala','vet','ca-voi','cong-chua','hoang-tu'];
try {
  const result = await db.withTransaction(async connection => {
    const run = async (statement, parameters = []) => (await connection.query(statement, parameters))[0];
    await run('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await run("SET LOCAL lock_timeout='5s'");
    const [migrationRow] = await run('SELECT name FROM ttnava_stage.schema_migrations WHERE name=?', [migration]);
    if (!migrationRow) {
      const sql = await fs.readFile(new URL('../sql/postgres/' + migration, import.meta.url), 'utf8');
      await run(sql);
      await run('INSERT INTO ttnava_stage.schema_migrations(name) VALUES (?) ON CONFLICT(name) DO NOTHING', [migration]);
    }
    const [constraint] = await run("SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='ttnava_stage.profiles'::regclass AND conname='profiles_avatar_key_check'");
    assert(constraint, 'profiles_avatar_key_check was not created');
    for (const key of allowed) assert(constraint.definition.includes(`'${key}'`), `Avatar key missing from production constraint: ${key}`);
    return { migration, applied: !migrationRow, allowedAvatarCount: allowed.length, constraintVerified: true };
  });
  console.log(JSON.stringify(result));
} finally {
  await db.closePool();
}
