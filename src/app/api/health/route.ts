import { db, databaseMode } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

function errorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== "object") return undefined;
    const shaped = current as { code?: unknown; cause?: unknown };
    if (typeof shaped.code === "string") return shaped.code;
    current = shaped.cause;
  }
  return undefined;
}

function safeIssue(code: string | undefined) {
  if (code === "28P01" || code === "28000") return "credentials";
  if (code === "3D000") return "database";
  if (code === "42P01" || code === "42703") return "schema";
  if (code === "42501") return "permissions";
  if (code && /^(ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENETUNREACH|EHOSTUNREACH)$/.test(code)) {
    return "network";
  }
  return "query";
}

function unavailable(stage: "connection" | "schema", error: unknown) {
  const code = errorCode(error);
  console.error("[health] database probe failed", { stage, code });
  return Response.json(
    { ok: false, database: databaseMode, stage, issue: safeIssue(code) },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Lightweight deployment probe. It separately checks the live connection and
 * the core tables used by registration and persistent sessions. No credentials
 * or user data are returned.
 */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
  } catch (error) {
    return unavailable("connection", error);
  }

  try {
    await db.execute(sql`select id from public.users limit 0`);
    await db.execute(sql`select id from public.sessions limit 0`);
    await db.execute(sql`select key from public.rate_limits limit 0`);
    return Response.json(
      { ok: true, database: databaseMode, schema: "ready" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return unavailable("schema", error);
  }
}
