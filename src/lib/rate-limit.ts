import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

type Options = {
  /** Unique key e.g. `login:ip:1.2.3.4` */
  key: string;
  /** Max allowed hits inside the window */
  limit: number;
  /** Window length in seconds */
  windowSec: number;
  /** Block duration after the limit is exceeded (defaults to windowSec) */
  blockSec?: number;
};

/**
 * Database-backed sliding-window rate limiter. Works across all Vercel
 * serverless instances (unlike in-memory counters). Atomic via UPSERT.
 */
export async function rateLimit(opts: Options): Promise<RateLimitResult> {
  const blockSec = opts.blockSec ?? opts.windowSec;
  const key = opts.key.slice(0, 200);

  const result = await db.execute<{
    count: number | string;
    blocked_until: Date | string | null;
  }>(sql`
    INSERT INTO rate_limits (key, count, window_start, blocked_until)
    VALUES (${key}, 1, now(), NULL)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limits.blocked_until IS NOT NULL AND rate_limits.blocked_until > now() THEN rate_limits.count
        WHEN rate_limits.window_start < now() - (${opts.windowSec}::int * interval '1 second') THEN 1
        ELSE rate_limits.count + 1
      END,
      window_start = CASE
        WHEN rate_limits.blocked_until IS NOT NULL AND rate_limits.blocked_until > now() THEN rate_limits.window_start
        WHEN rate_limits.window_start < now() - (${opts.windowSec}::int * interval '1 second') THEN now()
        ELSE rate_limits.window_start
      END,
      blocked_until = CASE
        WHEN rate_limits.blocked_until IS NOT NULL AND rate_limits.blocked_until > now() THEN rate_limits.blocked_until
        ELSE NULL
      END
    RETURNING count, blocked_until
  `);

  const row = result.rows[0];
  const now = Date.now();
  const blockedUntil = row?.blocked_until ? new Date(row.blocked_until).getTime() : null;

  if (blockedUntil && blockedUntil > now) {
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((blockedUntil - now) / 1000) };
  }

  const count = Number(row?.count ?? 1);
  if (count > opts.limit) {
    await db.execute(sql`
      UPDATE rate_limits
      SET blocked_until = now() + (${blockSec}::int * interval '1 second')
      WHERE key = ${key}
    `);
    return { ok: false, remaining: 0, retryAfterSec: blockSec };
  }

  // Opportunistic cleanup of stale rows (cheap, ~2% of calls).
  if (Math.random() < 0.02) {
    void db
      .execute(
        sql`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day' AND (blocked_until IS NULL OR blocked_until < now())`,
      )
      .then(
        () => undefined,
        () => undefined,
      );
  }

  return { ok: true, remaining: Math.max(0, opts.limit - count), retryAfterSec: 0 };
}

export async function clearRateLimit(key: string) {
  await db.execute(sql`DELETE FROM rate_limits WHERE key = ${key.slice(0, 200)}`);
}

export function humanRetry(sec: number) {
  if (sec < 60) return `${sec} ثانية`;
  const m = Math.ceil(sec / 60);
  if (m < 60) return `${m} دقيقة`;
  return `${Math.ceil(m / 60)} ساعة`;
}
