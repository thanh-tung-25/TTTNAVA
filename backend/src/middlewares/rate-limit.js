import { createHash } from 'node:crypto';
import { query, isPostgres } from '../config/db.js';
const buckets = new Map();

export function rateLimit({ windowMs = 60_000, max = 30, keyPrefix = 'default' } = {}) {
  return async function limiter(request, response, next) {
    const identity = request.user?.id ?? request.ip ?? 'unknown';
    const key = `${keyPrefix}:${identity}`;
    const now = Date.now();
    if (isPostgres && process.env.VERCEL) {
      try {
        const hash = createHash('sha256').update(key).digest('hex');
        const result = await query(`INSERT INTO request_limits(key_hash,hits,reset_at) VALUES (?,1,statement_timestamp() + ? * INTERVAL '1 millisecond')
          ON CONFLICT(key_hash) DO UPDATE SET
          hits=CASE WHEN request_limits.reset_at<=statement_timestamp() THEN 1 ELSE request_limits.hits+1 END,
          reset_at=CASE WHEN request_limits.reset_at<=statement_timestamp() THEN EXCLUDED.reset_at ELSE request_limits.reset_at END
          RETURNING hits,reset_at`, [hash, windowMs]);
        const limit = result.rows[0];
        if (limit.hits > max) {
          response.set('Retry-After', String(Math.max(1, Math.ceil((new Date(limit.reset_at).getTime() - now) / 1000))));
          response.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Con thao tác hơi nhanh, chờ một chút nhé' } });
          return;
        }
        next();
      } catch (error) { next(error); }
      return;
    }
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > max) {
      response.set('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      response.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Con thao tác hơi nhanh, chờ một chút nhé' } });
      return;
    }
    next();
  };
}

export function resetRateLimits() {
  buckets.clear();
}
