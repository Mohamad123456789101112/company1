import { db, databaseMode } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Lightweight deployment probe. Besides the connection itself, verify the core
 * tables used by registration and persistent sessions. No credentials or user
 * data are returned.
 */
export async function GET() {
  try {
    await db.execute(sql`select id from public.users limit 0`);
    await db.execute(sql`select id from public.sessions limit 0`);
    await db.execute(sql`select key from public.rate_limits limit 0`);
    return Response.json(
      { ok: true, database: databaseMode, schema: "ready" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { ok: false, database: databaseMode },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
