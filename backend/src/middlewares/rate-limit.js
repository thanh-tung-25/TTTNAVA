const buckets = new Map();

export function rateLimit({ windowMs = 60_000, max = 30, keyPrefix = 'default' } = {}) {
  return function limiter(request, response, next) {
    const identity = request.user?.id ?? request.ip ?? 'unknown';
    const key = `${keyPrefix}:${identity}`;
    const now = Date.now();
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
