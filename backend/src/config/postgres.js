import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

// Native PostgreSQL connection. Kept separate from db.js until all callers
// have been ported; importing this module never changes the running MySQL app.
export function postgresOptions(settings, backendRoot) {
  for (const name of ['PGHOST', 'PGUSER', 'PGPASSWORD', 'PGDATABASE']) {
    if (!settings[name]) throw new Error(`Missing PostgreSQL setting: ${name}`);
  }
  const port = Number(settings.PGPORT || 6543);
  const max = Number(settings.PGPOOL_SIZE || 1);
  const schema = settings.PGSCHEMA || 'ttnava_stage';
  if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error('Invalid PostgreSQL schema');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PostgreSQL port');
  if (!Number.isInteger(max) || max < 1 || max > 10) throw new Error('Invalid PostgreSQL pool size');
  const ssl = { rejectUnauthorized: true };
  if (settings.PGSSLROOTCERT) {
    ssl.ca = fs.readFileSync(path.resolve(backendRoot, settings.PGSSLROOTCERT), 'utf8');
  }
  const types = new pg.TypeOverrides();
  types.setTypeParser(20, value => {
    const number = Number(value);
    if (!Number.isSafeInteger(number)) throw new RangeError('PostgreSQL integer exceeds the application safe range');
    return number;
  });
  types.setTypeParser(1700, value => {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new RangeError('Invalid PostgreSQL numeric value');
    return number;
  });
  return {
    host: settings.PGHOST, port, user: settings.PGUSER,
    password: settings.PGPASSWORD, database: settings.PGDATABASE,
    ssl, types, max, connectionTimeoutMillis: 15000, idleTimeoutMillis: 10000,
    statement_timeout: 30000,
    options: `-c search_path=${schema},pg_catalog -c timezone=UTC`,
    application_name: 'ttnava-postgres',
  };
}

export function createPostgresDatabase(settings, backendRoot, Pool = pg.Pool) {
  const pool = new Pool(postgresOptions(settings, backendRoot));
  const schema = settings.PGSCHEMA || 'ttnava_stage';
  // pg emits background connection errors; don't let an idle network failure
  // crash Node or print driver details containing private connection data.
  pool.on('error', error => {
    console.error(JSON.stringify({ event: 'postgres_idle_connection_error', code: error.code || 'UNKNOWN' }));
  });
  const database = {
    query: (sql, params = []) => database.transaction(client => client.query(sql, params)),
    async transaction(callback) {
      const client = await pool.connect();
      let begun = false;
      let discard;
      try {
        await client.query(settings.PG_READ_ONLY === 'true' ? 'BEGIN READ ONLY' : 'BEGIN');
        begun = true;
        // Transaction poolers can assign a different server connection next
        // time. Never rely on session state from a previous request.
        await client.query(`SET LOCAL search_path TO "${schema}",pg_catalog`);
        await client.query("SET LOCAL TIME ZONE 'UTC'");
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        if (begun) {
          try { await client.query('ROLLBACK'); }
          catch (rollbackError) { discard = rollbackError; }
        } else discard = error;
        throw error;
      } finally {
        client.release(discard);
      }
    },
    close: () => pool.end(),
  };
  return database;
}
