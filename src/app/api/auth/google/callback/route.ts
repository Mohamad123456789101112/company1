import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { exchangeGoogleCode, isGoogleConfigured } from "@/lib/google";
import { SESSION_COOKIE, createSession, isBootstrapAdminEmail } from "@/lib/auth";
import { ipFromHeaders, resolveAppUrl, safeEqual, safeRedirectPath } from "@/lib/security";
import { rateLimit } from "@/lib/rate-limit";
import { getSettings, settingBool } from "@/lib/settings";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const appUrl = resolveAppUrl(request.headers);
  const fail = (code: string) => {
    const res = NextResponse.redirect(`${appUrl}/login?error=${code}`);
    res.cookies.set("aj_oauth", "", { path: "/", maxAge: 0 });
    return res;
  };

  if (!isGoogleConfigured()) return fail("google_not_configured");

  try {
    const providerError = request.nextUrl.searchParams.get("error");
    if (providerError) {
      return fail(providerError === "access_denied" ? "google_cancelled" : "google_failed");
    }

    const ip = ipFromHeaders(request.headers);
    const rl = await rateLimit({ key: `oauth:cb:${ip}`, limit: 20, windowSec: 600 });
    if (!rl.ok) return fail("rate_limited");

    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const raw = request.cookies.get("aj_oauth")?.value;
    if (!code || !state || !raw) return fail("google_state");

    let stored: { state?: string; verifier?: string; next?: string };
    try {
      stored = JSON.parse(raw) as typeof stored;
    } catch {
      return fail("google_state");
    }
    if (
      typeof stored.state !== "string" ||
      typeof stored.verifier !== "string" ||
      !safeEqual(stored.state, state)
    ) {
      return fail("google_state");
    }

    const profile = await exchangeGoogleCode({ code, verifier: stored.verifier, appUrl });
    if (!profile) return fail("google_failed");
    if (!profile.email_verified) return fail("google_unverified");

    const email = profile.email.toLowerCase();
    const settings = await getSettings();

    // 1) Existing Google-linked account
    let [user] = await db.select().from(users).where(eq(users.googleId, profile.sub)).limit(1);

    // 2) Existing email account → link Google (email is verified by Google)
    if (!user) {
      const [byEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (byEmail) {
        await db
          .update(users)
          .set({
            googleId: profile.sub,
            avatarUrl: byEmail.avatarUrl ?? profile.picture ?? null,
            emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, byEmail.id));
        user = { ...byEmail, googleId: profile.sub };
      }
    }

    // 3) Brand-new account
    if (!user) {
      if (!settingBool(settings.allow_registration)) return fail("google_failed");
      const [created] = await db
        .insert(users)
        .values({
          name: (profile.name ?? email.split("@")[0]).slice(0, 60),
          email,
          googleId: profile.sub,
          avatarUrl: profile.picture ?? null,
          emailVerifiedAt: new Date(),
          role: isBootstrapAdminEmail(email) ? "admin" : "student",
        })
        .returning();
      if (!created) return fail("google_failed");
      user = created;
      await audit("user.registered_google", { userId: user.id });
    }

    if (user.isBanned || !user.isActive) return fail("banned");

    const promote = isBootstrapAdminEmail(email) && user.role !== "admin";
    await db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        lastLoginIp: ip,
        failedLoginAttempts: 0,
        lockedUntil: null,
        ...(promote ? { role: "admin" as const } : {}),
      })
      .where(eq(users.id, user.id));

    const session = await createSession(user.id, Number(settings.max_devices) || 2);
    await audit("login.google", { userId: user.id });

    const staff = promote || user.role === "admin" || user.role === "assistant";
    const incomplete = !user.phone || !user.parentPhone || !user.grade;
    const target = incomplete && !staff ? "/complete-profile" : safeRedirectPath(stored.next, staff ? "/admin" : "/dashboard");

    const res = NextResponse.redirect(`${appUrl}${target}`);
    res.cookies.set(SESSION_COOKIE, session.token, session.cookieOptions);
    res.cookies.set("aj_oauth", "", { path: "/", maxAge: 0 });
    return res;
  } catch (error) {
    const shaped = error as { name?: unknown; code?: unknown };
    console.error("[google-auth] callback failed", {
      name: typeof shaped?.name === "string" ? shaped.name : "UnknownError",
      ...(typeof shaped?.code === "string" && /^[A-Za-z0-9_]{2,32}$/.test(shaped.code)
        ? { code: shaped.code }
        : {}),
    });
    return fail("google_failed");
  }
}
