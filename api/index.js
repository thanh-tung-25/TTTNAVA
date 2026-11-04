import env from '../backend/src/config/env.js';
import { createApp } from '../backend/src/app.js';
import { storageClient } from '../backend/src/services/private-storage.js';

if (process.env.VERCEL && (env.db.driver !== 'postgres' || !env.storage.enabled)) {
  throw new Error('Configure DB_DRIVER=postgres and STORAGE_PROVIDER=supabase before deploying.');
}
if (process.env.VERCEL) storageClient();
export default createApp();
