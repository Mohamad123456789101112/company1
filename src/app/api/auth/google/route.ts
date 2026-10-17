import { NextResponse, type NextRequest } from "next/server";
import { buildGoogleAuthUrl, createPkcePair, isGoogleConfigured } from "@/lib/google";
import { generateToken, ipFromHeaders, isSecureContext, resolveAppUrl, safeRedirectPath } from "@/lib/security";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const appUrl = resolveAppUrl(request.headers);
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(`${appUrl}/login?error=google_not_configured`);
  }

  const rl = await rateLimit({ key: `oauth:start:${ipFromHeaders(request.headers)}`, limit: 20, windowSec: 600 });
  if (!rl.ok) return NextResponse.redirect(`${appUrl}/login?error=rate_limited`);

  const state = generateToken(24);
  const { verifier, challenge } = createPkcePair();
  const next = safeRedirectPath(request.nextUrl.searchParams.get("next"), "/dashboard");

  const res = NextResponse.redirect(buildGoogleAuthUrl({ appUrl, state, challenge }));
  res.cookies.set("aj_oauth", JSON.stringify({ state, verifier, next }), {
    httpOnly: true,
    secure: isSecureContext(request.headers),
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
