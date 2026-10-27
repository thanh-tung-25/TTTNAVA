import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query } from '../src/config/db.js';
import { normalizeUsername, usernameToEmail } from '../src/utils/normalize.js';

function readArgument(name) {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

function randomPassword() {
  return `BeHocVui-${Math.random().toString(36).slice(2, 10)}`;
}

async function main() {
  const username = normalizeUsername(readArgument('username') ?? 'admin');
  const password = readArgument('password') ?? process.env.ADMIN_PASSWORD ?? randomPassword();
  const displayName = readArgument('name') ?? 'Cô giáo';
  const avatarKey = readArgument('avatar') ?? 'cu';

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    throw new Error('Tên đăng nhập phải 3–20 ký tự, chỉ gồm chữ thường, số và dấu gạch dưới.');
  }
  if (password.length < 6 || password.length > 72) {
    throw new Error('Mật khẩu phải từ 6 đến 72 ký tự.');
  }

  const existing = await query('SELECT id, role FROM profiles WHERE username = ? LIMIT 1', [username]);
  if (existing[0]) {
    console.log(`Tài khoản "${username}" đã tồn tại (vai trò ${existing[0].role}). Không thay đổi gì.`);
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  await query(
    `INSERT INTO profiles (id, username, email, password_hash, role, display_name, avatar_key, grade)
     VALUES (?, ?, ?, ?, 'admin', ?, ?, NULL)`,
    [randomUUID(), username, usernameToEmail(username), hash, displayName, avatarKey],
  );

  console.log(`Đã tạo quản trị viên "${username}" (${displayName}).`);
  if (!readArgument('password') && !process.env.ADMIN_PASSWORD) {
    console.log(`Mật khẩu tạm: ${password}`);
  }
  console.log('Hãy đổi mật khẩu sau lần đăng nhập đầu tiên.');
}

main()
  .catch((error) => {
    console.error('Tạo quản trị viên thất bại:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { closePool } = await import('../src/config/db.js');
    await closePool();
  });
