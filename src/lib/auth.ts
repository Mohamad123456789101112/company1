import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { and, asc, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import {
  deviceLabelFromUA,
  generateToken,
  hashToken,
  ipFromHeaders,
  isSecureContext,
} from "./security";
import { platformConfig } from "./config";

export const SESSION_COOKIE = "aj_session";
const SESSION_DAYS = 30;
const BCRYPT_ROUNDS = 12;

/* ───────────── Passwords ───────────── */

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

let dummyHashCache: string | null = null;
/** Used to equalize timing when the account does not exist (anti-enumeration). */
export async function burnPasswordTiming(password: string) {
  if (!dummyHashCache) dummyHashCache = await bcrypt.hash("timing-equalizer-password", BCRYPT_ROUNDS);
  await bcrypt.compare(password, dummyHashCache);
}

/* ───────────── Sessions ───────────── */

export async function createSession(userId: string, maxDevices = 2) {
  const h = await headers();
  const token = generateToken(32);
  const tokenHash = hashToken(token);
  const ua = h.get("user-agent")?.slice(0, 300) ?? null;
  const ip = ipFromHeaders(h);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  // Enforce device limit: drop the oldest sessions beyond the limit.
  const active = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())))
    .orderBy(asc(sessions.lastSeenAt));

  const limit = Math.max(1, maxDevices);
  if (active.length >= limit) {
    const toRemove = active.slice(0, active.length - limit + 1).map((s) => s.id);
    if (toRemove.length) await db.delete(sessions).where(inArray(sessions.id, toRemove));
  }

  await db.insert(sessions).values({
    userId,
    tokenHash,
    userAgent: ua,
    ip,
    deviceLabel: deviceLabelFromUA(ua),
    expiresAt,
  });

  const cookieOptions = {
    httpOnly: true,
    secure: isSecureContext(h),
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
  try {
    const c = await cookies();
    c.set(SESSION_COOKIE, token, cookieOptions);
  } catch {
    // Route handlers that build their own response set the cookie explicitly.
  }
  return { token, expiresAt, cookieOptions };
}

export async function destroySession() {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  c.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function destroyAllSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function currentSessionId(): Promise<string | null> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.tokenHash, hashToken(token)))
    .limit(1);
  return row[0]?.id ?? null;
}

/* ───────────── Current user (request-cached) ───────────── */

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (!token || token.length < 20 || token.length > 128) return null;

  const rows = await db
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.tokenHash, hashToken(token)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  if (row.session.expiresAt.getTime() < Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, row.session.id));
    return null;
  }
  if (!row.user.isActive || row.user.isBanned) return null;

  // Touch "last seen" at most every 10 minutes.
  if (Date.now() - row.session.lastSeenAt.getTime() > 10 * 60_000) {
    void db
      .update(sessions)
      .set({ lastSeenAt: new Date() })
      .where(eq(sessions.id, row.session.id))
      .then(
        () => undefined,
        () => undefined,
      );
  }

  return row.user;
});

export async function requireUser(nextPath?: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`);
  }
  return user;
}

export function isStaff(user: User | null | undefined) {
  return !!user && (user.role === "admin" || user.role === "assistant");
}

export function isAdmin(user: User | null | undefined) {
  return !!user && user.role === "admin";
}

export async function requireStaff(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fadmin");
  if (!isStaff(user)) redirect("/dashboard");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fadmin");
  if (!isAdmin(user)) redirect("/admin");
  return user;
}

/** Emails listed in ADMIN_EMAILS env var are auto-promoted to admin. */
export function isBootstrapAdminEmail(email: string) {
  return platformConfig.security.adminEmails.includes(email.toLowerCase());
}
