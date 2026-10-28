import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

dotenv.config({ path: path.join(backendRoot, '.env'), quiet: true });

function readNumber(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value)) {
    throw new Error(`Biến môi trường ${name} không hợp lệ`);
  }
  return value;
}

const jwtSecret = process.env.JWT_SECRET ?? '';
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET phải có ít nhất 32 ký tự. Kiểm tra backend/.env');
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: readNumber('PORT', 3000),
  appOrigin: process.env.APP_ORIGIN ?? 'http://localhost:3000',
  db: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: readNumber('DB_PORT', 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASS ?? '',
    database: process.env.DB_NAME ?? 'kids_learning',
    poolSize: readNumber('DB_POOL_SIZE', 10),
  },
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  cookie: {
    name: 'tttnava_token',
    secure: process.env.COOKIE_SECURE === 'true',
  },
  ai: {
    enabled: process.env.AI_QUESTION_ENABLED === 'true',
    url: process.env.AI_QUESTION_API_URL ?? '',
    key: process.env.AI_QUESTION_API_KEY ?? '',
    model: process.env.AI_QUESTION_MODEL ?? '',
  },
  backendRoot,
};

export default env;
