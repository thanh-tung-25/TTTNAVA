import http from 'node:http';
import env from './config/env.js';
import { closePool } from './config/db.js';
import { createApp } from './app.js';
import { createRealtimeServer } from './realtime/socket.js';

const app = createApp();
const server = http.createServer(app);
const io = createRealtimeServer(server);

server.listen(env.port, () => {
  console.log(`Bé Học Vui đang chạy tại ${env.appOrigin} (cổng ${env.port})`);
});

function shutdown(signal) {
  console.log(`Nhận ${signal}, đang đóng máy chủ...`);
  io.close();
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export { app, server, io };
