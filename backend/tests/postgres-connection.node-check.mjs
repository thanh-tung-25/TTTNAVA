import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPostgresDatabase, postgresOptions } from '../src/config/postgres.js';
import { postgresParameters, mysqlResultShape } from '../src/config/postgres-parameters.js';
import { runtimeParityPlan } from '../scripts/lib/postgres-runtime-parity.mjs';

const settings = { PGHOST: 'localhost', PGUSER: 'test', PGPASSWORD: 'test', PGDATABASE: 'test' };
test('runtime parity restores automatic timestamps without granting browser access', () => {
  const plan = runtimeParityPlan({ complete: true, tables: [{ name: 'profiles' }], columns: [{ tableName: 'profiles', name: 'updated_at', extra: 'on update current_timestamp(3)' }] });
  assert.deepEqual(plan.timestampTables, ['profiles']);
  assert.ok(plan.sql.join('\n').includes('NEW IS DISTINCT FROM OLD'));
  assert.ok(plan.sql.join('\n').includes('FROM PUBLIC,anon,authenticated'));
  assert.ok(plan.sql.join('\n').includes('(lower("username"))'));
  assert.throws(() => runtimeParityPlan({ complete: false }));
});
test('parameter conversion preserves quoted text and comments', () => {
  const result = postgresParameters(`SELECT '?' literal, 'it''s ?' escaped, $$?$$ dollar, "?" identifier FROM t /* ? */ WHERE id=? -- ?\nAND active=?`, ['private value', true]);
  assert.match(result.text, /WHERE id=\$1 -- \?\nAND active=\$2/);
  assert.ok(result.text.includes("'it''s ?'"));
  assert.ok(result.text.includes('$$?$$'));
  assert.deepEqual(result.values, ['private value', 1]);
  assert.throws(() => postgresParameters('SELECT ? ', []));
  assert.throws(() => postgresParameters('SELECT `id` FROM t'));
  assert.deepEqual(mysqlResultShape({ command: 'UPDATE', rowCount: 0, rows: [] }), { affectedRows: 0, insertId: undefined });
  assert.deepEqual(mysqlResultShape({ command: 'SELECT', rows: [{ has_payment_qr: true }] }), [{ has_payment_qr: 1 }]);
});
test('TLS and schema isolation stay enabled; invalid configuration fails closed', () => {
  const options = postgresOptions(settings, '.');
  assert.equal(options.ssl.rejectUnauthorized, true);
  assert.equal(options.max, 1);
  assert.equal(options.types.getTypeParser(20)('42'), 42);
  assert.throws(() => options.types.getTypeParser(20)('9007199254740993'), RangeError);
  assert.equal(options.types.getTypeParser(1700)('90.25'), 90.25);
  assert.match(options.options, /search_path=ttnava_stage,pg_catalog/);
  for (const change of [{ PGSCHEMA: 'public;drop schema x' }, { PGPORT: 'NaN' }, { PGPOOL_SIZE: '0' }]) {
    assert.throws(() => postgresOptions({ ...settings, ...change }, '.'));
  }
});
function fakeDatabase(failRollback = false) {
  const events = [];
  const client = {
    async query(sql) { events.push(sql); if (failRollback && sql === 'ROLLBACK') throw Error('rollback failed'); },
    release(error) { events.push(error ? 'discard' : 'release'); },
  };
  class Pool {
    on() {}
    async connect() { return client; }
    async end() { events.push('close'); }
  }
  return { db: createPostgresDatabase(settings, '.', Pool), events };
}
test('a successful transaction commits on its checked-out connection', async () => {
  const { db, events } = fakeDatabase();
  assert.equal(await db.transaction(async client => { await client.query('SELECT 1'); return 42; }), 42);
  assert.deepEqual(events, ['BEGIN', 'SET LOCAL search_path TO "ttnava_stage",pg_catalog', "SET LOCAL TIME ZONE 'UTC'", 'SELECT 1', 'COMMIT', 'release']);
});
test('failed work rolls back and preserves the original error', async () => {
  for (const failRollback of [false, true]) {
    const { db, events } = fakeDatabase(failRollback);
    const original = Error('work failed');
    await assert.rejects(db.transaction(() => { throw original; }), error => error === original);
    assert.deepEqual(events, ['BEGIN', 'SET LOCAL search_path TO "ttnava_stage",pg_catalog', "SET LOCAL TIME ZONE 'UTC'", 'ROLLBACK', failRollback ? 'discard' : 'release']);
  }
});
