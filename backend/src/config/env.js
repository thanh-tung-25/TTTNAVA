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
const dbDriver = process.env.DB_DRIVER ?? 'mysql';
if (!['mysql', 'postgres'].includes(dbDriver)) throw new Error('DB_DRIVER must be mysql or postgres');
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET phải có ít nhất 32 ký tự. Kiểm tra backend/.env');
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: readNumber('PORT', 3000),
  appOrigin: process.env.APP_ORIGIN || (process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
    ? 'https://' + (process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL) : 'http://localhost:3000'),
  storage: {
    enabled: process.env.STORAGE_PROVIDER === 'supabase',
    url: process.env.SUPABASE_URL || '',
    key: process.env.SUPABASE_SECRET_KEY || '',
    bucket: process.env.SUPABASE_STORAGE_BUCKET || 'ttnava-private',
  },
  db: {
    driver: dbDriver,
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: readNumber('DB_PORT', 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASS ?? '',
    database: process.env.DB_NAME ?? 'kids_learning',
    poolSize: readNumber('DB_POOL_SIZE', 10),
    ssl: process.env.DB_SSL === 'true'
      || (process.env.DB_SSL !== 'false' && (process.env.DB_HOST ?? '').endsWith('.aivencloud.com')),
    caPath: process.env.DB_CA_PATH
      ? path.resolve(backendRoot, process.env.DB_CA_PATH)
      : path.join(backendRoot, 'certs', 'aiven-ca.pem'),
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
  speakingAi: {
    enabled: process.env.CHINESE_SPEAKING_AI_ENABLED === 'true',
    key: process.env.GROQ_API_KEY ?? '',
    zeroRetentionConfirmed: process.env.GROQ_ZERO_DATA_RETENTION_CONFIRMED === 'true',
    dailyLimit: readNumber('CHINESE_SPEAKING_DAILY_LIMIT', 5),
  },
  backendRoot,
};

export default env;
