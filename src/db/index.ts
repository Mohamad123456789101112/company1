import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { platformConfig } from "@/lib/config";

const databaseUrl = platformConfig.database.url;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

const isLocal =
  databaseUrl.includes("127.0.0.1") || databaseUrl.includes("localhost");

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

export const pool =
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

export const db = drizzle(pool, { schema });
