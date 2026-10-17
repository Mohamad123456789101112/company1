import { db, databaseMode } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

type ErrorDetails = {
  name: string;
  code?: string;
  message: string;
};

function errorDetails(error: unknown): ErrorDetails {
  const queue: unknown[] = [error];
  const visited = new Set<object>();
  let name = "UnknownError";
  let code: string | undefined;
  let message = "";

  while (queue.length > 0 && visited.size < 12) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);

    const shaped = current as {
      name?: unknown;
      code?: unknown;
      message?: unknown;
      cause?: unknown;
      errors?: unknown;
    };
    if (visited.size === 1 && typeof shaped.name === "string") name = shaped.name;
    if (!code && typeof shaped.code === "string") code = shaped.code;
    if (!message && typeof shaped.message === "string") message = shaped.message;
    if (shaped.cause) queue.push(shaped.cause);
    if (Array.isArray(shaped.errors)) queue.push(...shaped.errors);
  }

  return { name, code, message };
}

function safeIssue({ code, message, name }: ErrorDetails) {
  if (
    code &&
    /^(SELF_SIGNED_CERT_IN_CHAIN|DEPTH_ZERO_SELF_SIGNED_CERT|UNABLE_TO_VERIFY_LEAF_SIGNATURE|ERR_TLS_CERT_ALTNAME_INVALID|CERT_HAS_EXPIRED)$/.test(code)
  ) return "tls";
  if (code === "28P01" || code === "28000") return "credentials";
  if (code === "3D000") return "database";
  if (code === "42P01" || code === "42703") return "schema";
  if (code === "42501") return "permissions";
  if (code && /^(ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENETUNREACH|EHOSTUNREACH)$/.test(code)) {
    return "network";
  }

  const text = message.toLowerCase();
  if (/password|sasl|authentication|28p01/.test(text)) return "credentials";
  if (/enotfound|eai_again|econn|timed? ?out|network|no route to host|could not connect/.test(text)) return "network";
  if (/ssl|tls|certificate/.test(text)) return "tls";
  if (/invalid url|connection string|uri malformed/.test(text) || name === "TypeError") return "configuration";
  return name === "AggregateError" ? "network" : "query";
}

function unavailable(stage: "connection" | "schema", error: unknown) {
  const details = errorDetails(error);
  const issue = safeIssue(details);
  const publicCode = details.code && /^[A-Za-z0-9_]{2,32}$/.test(details.code) ? details.code : undefined;
  console.error("[health] database probe failed", { stage, issue, name: details.name, code: publicCode });
  return Response.json(
    {
      ok: false,
      database: databaseMode,
      stage,
      issue,
      errorName: details.name,
      ...(publicCode ? { errorCode: publicCode } : {}),
    },
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
