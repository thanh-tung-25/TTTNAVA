import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import env from '../src/config/env.js';

async function main() {
  const migrationsDir = path.join(env.backendRoot, 'sql', 'migrations');
  const files = (await fs.readdir(migrationsDir))
    .filter((name) => name.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, 'en'));

  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    charset: 'utf8mb4',
    timezone: 'Z',
    multipleStatements: true,
  });

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(160) NOT NULL,
        applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (name)
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
    `);

    const [appliedRows] = await connection.query('SELECT name FROM schema_migrations');
    const applied = new Set(appliedRows.map((row) => row.name));
    let count = 0;

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      process.stdout.write(`-> ${file} ... `);
      await connection.query(sql);
      await connection.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
      process.stdout.write('OK\n');
      count += 1;
    }

    console.log(`Migrate hoàn tất: ${count} file mới, ${applied.size + count} tổng cộng.`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Migrate thất bại:', error.message);
  process.exitCode = 1;
});
