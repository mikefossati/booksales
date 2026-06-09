/**
 * In-memory sliding-window rate limiter.
 *
 * Per-instance only: on serverless each warm instance keeps its own window,
 * so the effective global limit is (limit × instances). That is acceptable
 * here — the goal is stopping tight request loops against expensive
 * endpoints, not precise quota accounting.
 */

type Window = { timestamps: number[] };

const windows = new Map<string, Window>();

const MAX_KEYS = 10_000; // safety valve against unbounded growth

export function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const cutoff = now - windowMs;

  let win = windows.get(key);
  if (!win) {
    if (windows.size >= MAX_KEYS) windows.clear();
    win = { timestamps: [] };
    windows.set(key, win);
  }

  win.timestamps = win.timestamps.filter(t => t > cutoff);

  if (win.timestamps.length >= limit) {
    const oldest = win.timestamps[0];
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  win.timestamps.push(now);
  return { allowed: true, retryAfterSeconds: 0 };
}
