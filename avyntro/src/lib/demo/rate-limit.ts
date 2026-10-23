/**
 * Fixed-window in-memory rate limiter.
 * Limitation: state is per server instance. On serverless or multi-instance
 * hosting, put a shared limiter (e.g. a KV store or the platform firewall) in
 * front for strict guarantees. Documented in docs/SECURITY.md.
 */
export interface RateLimiter {
  check(key: string, now?: number): { allowed: boolean; retryAfterSeconds: number };
}

export function createRateLimiter(max: number, windowMs: number, maxKeys = 10_000): RateLimiter {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return {
    check(key, now = Date.now()) {
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        if (hits.size >= maxKeys) {
          for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
          if (hits.size >= maxKeys) hits.delete(hits.keys().next().value as string);
        }
        hits.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
      }
      entry.count += 1;
      if (entry.count > max) return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}
