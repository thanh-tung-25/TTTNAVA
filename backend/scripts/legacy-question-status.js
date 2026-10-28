import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import env from '../src/config/env.js';

function argument(name) {
  const args = process.argv.slice(2);
  const withValue = args.find((item) => item.startsWith(`${name}=`));
  if (withValue) return withValue.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function backupName() {
  return `legacy-question-status-${new Date().toISOString().replaceAll(':', '-')}.json`;
}

async function connect() {
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    charset: 'utf8mb4',
    timezone: 'Z',
  });
  await connection.query("SET time_zone = '+00:00'");
  return connection;
}

async function preview(connection) {
  const [rows] = await connection.query(
    `SELECT status, COUNT(*) AS total FROM questions
     WHERE status IN ('visible', 'hidden') GROUP BY status`,
  );
  const [samples] = await connection.query(
    `SELECT id, status, LEFT(prompt, 90) AS prompt FROM questions
     WHERE status = 'visible' ORDER BY id ASC LIMIT 20`,
  );
  console.log('Câu hỏi theo trạng thái cũ:');
  console.table(rows.map((row) => ({ status: row.status, total: Number(row.total) })));
  if (samples.length) {
    console.log('Mẫu câu hỏi cũ (không còn hiển thị cho học sinh):');
    console.table(samples);
  }
}

async function archive(connection) {
  const [rows] = await connection.query(
    "SELECT id, status, published_at FROM questions WHERE status = 'visible' ORDER BY id ASC",
  );
  if (!rows.length) {
    console.log('Không có câu hỏi trạng thái visible để chuyển sang nháp.');
    return;
  }
  const dir = path.join(env.backendRoot, 'backups');
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, backupName());
  await fs.writeFile(file, JSON.stringify({ createdAt: new Date().toISOString(), rows }, null, 2));
  let updated = 0;
  for (let index = 0; index < rows.length; index += 50) {
    const ids = rows.slice(index, index + 50).map((row) => row.id);
    const placeholders = ids.map(() => '?').join(',');
    const [result] = await connection.query(
      `UPDATE questions SET status = 'draft', published_at = NULL
       WHERE id IN (${placeholders}) AND status = 'visible'`,
      ids,
    );
    updated += result.affectedRows;
  }
  console.log(`Đã chuyển ${updated} câu hỏi cũ sang nháp. Không xoá dữ liệu.`);
  console.log(`Bản sao lưu: ${file}`);
  console.log(`Khôi phục: npm run questions:legacy -- --restore="${file}"`);
}

async function restore(connection, file) {
  if (!file) throw new Error('Thiếu đường dẫn tệp sao lưu sau --restore');
  const parsed = JSON.parse(await fs.readFile(path.resolve(file), 'utf8'));
  if (!Array.isArray(parsed.rows)) throw new Error('Tệp sao lưu không đúng định dạng');
  await connection.beginTransaction();
  try {
    for (const row of parsed.rows) {
      await connection.query(
        'UPDATE questions SET status = ?, published_at = ? WHERE id = ?',
        [row.status, row.published_at, row.id],
      );
    }
    await connection.commit();
    console.log(`Đã khôi phục trạng thái cho ${parsed.rows.length} câu hỏi.`);
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function main() {
  const connection = await connect();
  try {
    const restoreFile = argument('--restore');
    if (restoreFile) {
      await restore(connection, restoreFile);
    } else if (process.argv.includes('--archive')) {
      await archive(connection);
    } else {
      await preview(connection);
      console.log('Xem trước xong. Chưa thay đổi dữ liệu.');
      console.log('Chạy --archive để chuyển câu hỏi cũ sang nháp kèm bản sao lưu.');
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Xử lý câu hỏi cũ thất bại:', error.message);
  process.exitCode = 1;
});
