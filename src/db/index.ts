import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;

// Vercel's Supabase integration exposes POSTGRES_URL; self-hosted/local setups may use DATABASE_URL.
const databaseUrl = process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim();

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaPglite?: { client: PGlite; db: Db; ready: Promise<void> };
};

const isLocal =
  !!databaseUrl &&
  (databaseUrl.includes("127.0.0.1") || databaseUrl.includes("localhost"));

/**
 * Supabase / managed Postgres requires TLS. Local Postgres does not.
 * You can force the behaviour with DATABASE_SSL=true|false.
 */
const sslSetting =
  process.env.DATABASE_SSL === "false"
    ? undefined
    : process.env.DATABASE_SSL === "true" || !isLocal
      ? { rejectUnauthorized: false }
      : undefined;

function createDb(): { db: Db; ready: Promise<void>; pool?: Pool } {
  /* ── Production / real database: Supabase or any Postgres ── */
  if (databaseUrl) {
    const pool =
      globalForDb.__arenaNextJsPostgresqlPool ??
      new Pool({
        connectionString: databaseUrl,
        ssl: sslSetting,
        // Serverless friendly limits (Vercel + Supabase pooler)
        max: Number(process.env.DATABASE_POOL_MAX ?? 5),
        idleTimeoutMillis: 20_000,
        connectionTimeoutMillis: 10_000,
      });

    if (process.env.NODE_ENV !== "production") {
      globalForDb.__arenaNextJsPostgresqlPool = pool;
    }
    return { db: drizzlePg(pool, { schema }), ready: Promise.resolve(), pool };
  }

  /* ── Demo / preview mode: embedded Postgres (PGlite) – no external DB needed ──
     Set DATABASE_URL or POSTGRES_URL in .env / Vercel to switch to the real
     database. Vercel's Supabase integration provides POSTGRES_URL.            */
  if (!globalForDb.__arenaPglite) {
    const client = new PGlite();
    const db = drizzlePglite(client, { schema }) as unknown as Db;
    const ready = (async () => {
      // Same schema file used with Supabase SQL Editor (minus extension line).
      const sqlPath = path.join(process.cwd(), "supabase", "schema.sql");
      let sqlText = readFileSync(sqlPath, "utf8");
      sqlText = sqlText.replace(/create\s+extension\s+if\s+not\s+exists\s+"pgcrypto"\s*;/gi, "");
      await client.exec(sqlText);
    })().catch((e) => {
      console.error("[demo-db] bootstrap failed:", e);
    });
    globalForDb.__arenaPglite = { client, db, ready };
  }
  const g = globalForDb.__arenaPglite;
  return { db: g.db, ready: g.ready };
}

const { db: _db, ready: _dbReady, pool: _pool } = createDb();

export const db = _db;
/** Resolves once the embedded demo database has finished bootstrapping (no-op with a configured Postgres URL). */
export const dbReady = _dbReady;
export const pool = _pool;
