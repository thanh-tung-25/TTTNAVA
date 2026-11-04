import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const output = path.join(root, 'public');
await fs.mkdir(output, { recursive: true });
const unexpected = (await fs.readdir(output)).filter(name => name !== 'assets');
if (unexpected.length) throw Error('Public output must contain assets only; protected pages must stay behind Express.');
await fs.cp(path.join(root, 'frontend/assets'), path.join(output, 'assets'), { recursive: true });
for (const role of ['student', 'admin']) {
  const source = path.join(root, 'frontend/pages', role, 'chinese');
  const destination = path.join(output, 'assets/page-local', role, 'chinese');
  await fs.mkdir(destination, { recursive: true });
  for (const name of await fs.readdir(source)) {
    if (!['.js', '.css'].includes(path.extname(name))) continue;
    await fs.copyFile(path.join(source, name), path.join(destination, name));
  }
}
await fs.mkdir(path.join(output, 'assets/vendor'), { recursive: true });
await fs.copyFile(path.join(root, 'backend/node_modules/socket.io/client-dist/socket.io.min.js'), path.join(output, 'assets/vendor/socket.io.min.js'));
console.log('Vercel assets prepared. Protected HTML, credentials and database backups are excluded.');
