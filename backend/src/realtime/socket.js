import { Server } from 'socket.io';
import env from '../config/env.js';
import { query } from '../config/db.js';
import { verifyToken } from '../utils/jwt.js';
import { setIo } from './emit.js';

function readCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() !== name) continue;
    return decodeURIComponent(part.slice(index + 1).trim());
  }
  return null;
}

async function profileFromSocket(socket) {
  const token = readCookie(socket.handshake.headers.cookie, env.cookie.name);
  if (!token) return null;
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return null;
  }
  const rows = await query('SELECT * FROM profiles WHERE id = ? LIMIT 1', [payload.sub]);
  const profile = rows[0];
  if (!profile || profile.role === 'bot') return null;
  if (profile.banned_until && new Date(profile.banned_until) > new Date()) return null;
  return profile;
}

export function createRealtimeServer(httpServer) {
  const io = new Server(httpServer, {
    serveClient: true,
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  io.use(async (socket, next) => {
    try {
      const profile = await profileFromSocket(socket);
      if (!profile) {
        next(new Error('UNAUTHENTICATED'));
        return;
      }
      socket.data.profileId = profile.id;
      socket.data.role = profile.role;
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on('connection', (socket) => {
    const profileId = socket.data.profileId;
    socket.join(`user:${profileId}`);
    socket.emit('realtime:ready', { profileId });

    socket.on('ping:client', (payload, acknowledge) => {
      if (typeof acknowledge === 'function') acknowledge({ at: Date.now(), echo: payload ?? null });
    });
  });

  setIo(io);
  return io;
}

export default createRealtimeServer;
