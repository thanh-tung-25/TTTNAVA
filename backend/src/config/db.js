import fs from 'node:fs';
import mysql from 'mysql2/promise';
import env from './env.js';

let pool;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
      ssl: {
        ca: fs.readFileSync(env.db.caPath, 'utf8'),
        rejectUnauthorized: true,
      },
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
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

export default getPool;
