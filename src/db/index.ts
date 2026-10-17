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

/**
 * pg parses SSL query parameters in connectionString after merging Pool options.
 * On current pg versions, sslmode=require becomes strict certificate validation,
 * which overrides our explicit SSL policy and rejects Supabase's self-signed chain.
 * The connection's TLS policy is set below, so remove URL-level SSL options first.
 */
function withoutUrlSslOptions(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    const sslParameters = new Set([
      "ssl",
      "sslmode",
      "sslcert",
      "sslkey",
      "sslrootcert",
      "sslnegotiation",
      "uselibpqcompat",
    ]);
    for (const key of [...url.searchParams.keys()]) {
      if (sslParameters.has(key.toLowerCase())) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    // Let pg report malformed/non-URL connection strings through the normal path.
    return connectionString;
  }
}

// Vercel functions are ephemeral: an in-memory PGlite database loses users and
// sessions between invocations, which breaks registration and dashboard auth.
// Fail the build/runtime clearly instead of silently shipping a non-persistent DB.
if (process.env.VERCEL && !databaseUrl) {
  throw new Error(
    "Missing persistent database configuration: set DATABASE_URL or connect the Supabase integration so POSTGRES_URL is available. PGlite is local-demo only.",
  );
}

export const databaseMode = databaseUrl ? "postgres" : "pglite";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaPglite?: { client: PGlite; db: Db; ready: Promise<void> };
};

const isLocal =
  !!databaseUrl &&
  (databaseUrl.includes("127.0.0.1") || databaseUrl.includes("localhost"));

/**
 * Managed Postgres uses TLS. Without a CA, retain the existing provider-compatible
 * encrypted connection behavior; setting DATABASE_SSL_CA enables certificate
 * chain validation. DATABASE_SSL=true|false can force TLS on/off.
 */
const sslCa = process.env.DATABASE_SSL_CA?.replace(/\\n/g, "\n").trim();
const sslSetting =
  process.env.DATABASE_SSL === "false"
    ? false
    : process.env.DATABASE_SSL === "true" || !isLocal
      ? sslCa
        ? { ca: sslCa, rejectUnauthorized: true }
        : { rejectUnauthorized: false }
      : false;

function createDb(): { db: Db; ready: Promise<void>; pool?: Pool } {
  /* ── Production / real database: Supabase or any Postgres ── */
  if (databaseUrl) {
    const pool =
      globalForDb.__arenaNextJsPostgresqlPool ??
      new Pool({
        connectionString: withoutUrlSslOptions(databaseUrl),
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

  /* ── Local demo mode only: embedded Postgres (PGlite) ──
     Vercel is rejected above when no persistent Postgres URL is configured. */
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
/** Resolves once the local embedded demo database has bootstrapped (no-op with Postgres). */
export const dbReady = _dbReady;
export const pool = _pool;
