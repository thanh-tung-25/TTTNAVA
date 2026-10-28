import { createServer } from 'node:http';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { io as createClient } from 'socket.io-client';
import { query } from '../src/config/db.js';
import { createRealtimeServer } from '../src/realtime/socket.js';
import {
  app,
  createTestUser,
  loginAs,
} from './helpers/index.js';

describe('Realtime Socket.IO', () => {
  let httpServer;
  let ioServer;
  let baseUrl;
  let student;
  let cookie;

  beforeAll(async () => {
    student = await createTestUser({ username: 'test_socket_student' });
    const login = await loginAs(student.username);
    expect(login.response.status).toBe(200);
    cookie = login.response.headers['set-cookie'][0].split(';')[0];

    httpServer = createServer(app);
    ioServer = createRealtimeServer(httpServer);
    await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    const { port } = httpServer.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => ioServer.close(resolve));
    await new Promise((resolve) => httpServer.close(resolve));
  });

  function connect(extraHeaders = {}) {
    return createClient(baseUrl, {
      transports: ['websocket'],
      reconnection: false,
      extraHeaders,
    });
  }

  test('test_socket_missing_cookie_rejected', async () => {
    const client = connect();
    const message = await new Promise((resolve) => {
      client.on('connect_error', (error) => resolve(error.message));
      client.on('connect', () => resolve('CONNECTED'));
    });
    client.close();
    expect(message).toBe('UNAUTHENTICATED');
  });

  test('test_socket_invalid_token_rejected', async () => {
    const client = connect({ Cookie: 'kids_token=khong-hop-le' });
    const message = await new Promise((resolve) => {
      client.on('connect_error', (error) => resolve(error.message));
      client.on('connect', () => resolve('CONNECTED'));
    });
    client.close();
    expect(message).toBe('UNAUTHENTICATED');
  });

  test('test_socket_valid_cookie_emits_ready', async () => {
    const client = connect({ Cookie: cookie });
    const ready = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Hết thời gian chờ realtime:ready')), 5000);
      client.on('realtime:ready', (payload) => {
        clearTimeout(timer);
        resolve(payload);
      });
      client.on('connect_error', reject);
    });
    expect(ready.profileId).toBe(student.id);
    client.close();
  });

  test('test_socket_ping_client_acknowledges', async () => {
    const client = connect({ Cookie: cookie });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Hết thời gian chờ kết nối')), 5000);
      client.on('connect', () => {
        clearTimeout(timer);
        resolve();
      });
      client.on('connect_error', reject);
    });
    const ack = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Hết thời gian chờ phản hồi ping')), 5000);
      client.emit('ping:client', { hello: 'con' }, (payload) => {
        clearTimeout(timer);
        resolve(payload);
      });
    });
    expect(ack.echo).toEqual({ hello: 'con' });
    expect(typeof ack.at).toBe('number');
    client.close();
  });

  test('test_socket_locked_account_rejected', async () => {
    const locked = await createTestUser({ username: 'test_socket_locked', locked: true });
    const login = await loginAs(locked.username);
    expect(login.response.status).toBe(403);
    await query('UPDATE profiles SET banned_until = NULL WHERE id = ?', [locked.id]);
    const validLogin = await loginAs(locked.username);
    expect(validLogin.response.status).toBe(200);
    const lockedCookie = validLogin.response.headers['set-cookie'][0].split(';')[0];
    await query("UPDATE profiles SET banned_until = '2999-01-01 00:00:00' WHERE id = ?", [locked.id]);
    const client = connect({ Cookie: lockedCookie });
    const message = await new Promise((resolve) => {
      client.on('connect_error', (error) => resolve(error.message));
      client.on('connect', () => resolve('CONNECTED'));
    });
    client.close();
    expect(message).toBe('UNAUTHENTICATED');
  });
});
