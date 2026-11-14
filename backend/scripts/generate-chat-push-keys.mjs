import {writeFile} from 'node:fs/promises';
import {generateVAPIDKeys} from 'web-push';
const target=new URL('../.env.chat-push',import.meta.url),keys=generateVAPIDKeys();
await writeFile(target,`# Private local configuration. Copy into the server environment; never commit.\nWEB_PUSH_PUBLIC_KEY=${keys.publicKey}\nWEB_PUSH_PRIVATE_KEY=${keys.privateKey}\nWEB_PUSH_SUBJECT=${process.env.WEB_PUSH_SUBJECT||'https://tttnava-backend.vercel.app'}\n`,{flag:'wx',mode:0o600});
console.log('Đã tạo backend/.env.chat-push. Khóa không được in ra màn hình. Giữ nguyên cặp khóa khi triển khai lại.');
