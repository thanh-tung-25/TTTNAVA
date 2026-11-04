import fs from 'node:fs';
import { AsyncLocalStorage } from 'node:async_hooks';
import mysql from 'mysql2/promise';
import env from './env.js';
import { createPostgresDatabase } from './postgres.js';
import { postgresParameters, mysqlResultShape } from './postgres-parameters.js';

let pool;
let postgres;
const postgresScope = new AsyncLocalStorage();
let savepointSequence = 0;

export const isPostgres = env.db.driver === 'postgres';
export const dialectSql = (mysqlSql, postgresSql) => isPostgres ? postgresSql : mysqlSql;
function sqlIdentifier(value) {
  if (!/^[a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?$/.test(value)) throw new Error('Invalid SQL identifier');
  return value;
}
export const jsonArrayLength = column => dialectSql(`JSON_LENGTH(${sqlIdentifier(column)})`, `jsonb_array_length(${sqlIdentifier(column)})`);
export const jsonText = (column, key) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(key)) throw new Error('Invalid JSON key');
  return dialectSql(`JSON_UNQUOTE(JSON_EXTRACT(${sqlIdentifier(column)},'$.${key}'))`, `(${sqlIdentifier(column)}->>'${key}')`);
};

function postgresConnection(client) {
  const run = async (sql, params = []) => {
    const statement = postgresParameters(sql, params);
    return [mysqlResultShape(await client.query(statement.text, statement.values))];
  };
  return { query: run, execute: run };
}

function getPostgres() {
  postgres ??= createPostgresDatabase(process.env, env.backendRoot);
  return postgres;
}

export function getPool() {
  if (isPostgres) return {
    ...postgresConnection(postgresScope.getStore() || getPostgres()),
    end: () => closePool(),
    // Transaction callers must use withTransaction so the same connection
    // is held for BEGIN, all work and COMMIT/ROLLBACK.
  };
  if (!pool) {
    pool = mysql.createPool({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
      ssl: env.db.ssl ? {
        ca: fs.readFileSync(env.db.caPath, 'utf8'),
        rejectUnauthorized: true,
      } : undefined,
      waitForConnections: true,
      connectionLimit: env.db.poolSize,
      queueLimit: 0,
      charset: 'utf8mb4',
      timezone: 'Z',
      decimalNumbers: true,
      dateStrings: false,
    });
    // Mọi mốc thời gian trong ứng dụng dùng UTC; đồng bộ cả CURRENT_TIMESTAMP của MySQL.
    pool.on('connection', (connection) => {
      connection.query("SET time_zone = '+00:00'");
    });
  }
  return pool;
}

export async function query(sql, params = []) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}

export async function execute(sql, params = []) {
  const [result] = await getPool().execute(sql, params);
  return result;
}

export async function withTransaction(callback) {
  if (isPostgres) {
    const active = postgresScope.getStore();
    if (active) {
      const name = 'nested_' + (++savepointSequence);
      await active.query('SAVEPOINT ' + name);
      try {
        const result = await callback(postgresConnection(active));
        await active.query('RELEASE SAVEPOINT ' + name);
        return result;
      } catch (error) {
        await active.query('ROLLBACK TO SAVEPOINT ' + name);
        await active.query('RELEASE SAVEPOINT ' + name);
        throw error;
      }
    }
    return getPostgres().transaction(client => postgresScope.run(client, () => callback(postgresConnection(client))));
  }
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // giữ lỗi gốc
    }
    throw error;
  } finally {
    connection.release();
  }
}

export async function closePool() {
  if (postgres) {
    await postgres.close();
    postgres = undefined;
  }
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

export default getPool;
