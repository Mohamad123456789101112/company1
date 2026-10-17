import "server-only";
import { createHash } from "node:crypto";
import { generateToken } from "./security";
import { secureGoogleAuth } from "./secure-config";

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export function isGoogleConfigured() {
  return secureGoogleAuth.configured;
}

export function googleRedirectUri(appUrl: string) {
  return `${appUrl}/api/auth/google/callback`;
}

export function createPkcePair() {
  const verifier = generateToken(48);
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function buildGoogleAuthUrl(opts: { appUrl: string; state: string; challenge: string }) {
  const params = new URLSearchParams({
    client_id: secureGoogleAuth.clientId,
    redirect_uri: googleRedirectUri(opts.appUrl),
    response_type: "code",
    scope: "openid email profile",
    state: opts.state,
    code_challenge: opts.challenge,
    code_challenge_method: "S256",
    access_type: "online",
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export type GoogleProfile = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
};

export async function exchangeGoogleCode(opts: {
  code: string;
  verifier: string;
  appUrl: string;
}): Promise<GoogleProfile | null> {
  const body = new URLSearchParams({
    code: opts.code,
    client_id: secureGoogleAuth.clientId,
    client_secret: secureGoogleAuth.clientSecret,
    redirect_uri: googleRedirectUri(opts.appUrl),
    grant_type: "authorization_code",
    code_verifier: opts.verifier,
  });

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!tokenRes.ok) return null;
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) return null;

  const infoRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    cache: "no-store",
  });
  if (!infoRes.ok) return null;
  const profile = (await infoRes.json()) as GoogleProfile;
  if (!profile.sub || !profile.email) return null;
  return profile;
}
