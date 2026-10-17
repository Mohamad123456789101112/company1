import type { NextConfig } from "next";

/**
 * Hardened security headers.
 * - CSP restricts scripts/styles/frames to trusted origins only (video providers).
 * - HSTS forces HTTPS for 2 years (Vercel serves HTTPS by default).
 * - frame-ancestors 'none' prevents click-jacking.
 */
const isDev = process.env.NODE_ENV !== "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://www.googleapis.com ws: wss:",
  "media-src 'self' blob: https:",
  "frame-src 'self' blob: https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com https://drive.google.com https://iframe.mediadelivery.net https://docs.google.com",
  "object-src 'self'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "frame-ancestors 'self' https://*.e2b.app https://*.arena.ai https://arena.ai",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  allowedDevOrigins: ["*.e2b.app", "*.arena.ai", "localhost", "127.0.0.1"],
  experimental: {
    // AI quiz JSON is pasted or uploaded through a server action (default 1MB).
    serverActions: { bodySizeLimit: "4mb" },
  },
  // Keep the embedded demo database (WASM Postgres) out of the server bundle.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Always ship the SQL bootstrap file with the server bundle — the embedded
  // demo database reads it at runtime (and it is NOT auto-traced on Vercel).
  outputFileTracingIncludes: {
    "/**": ["./supabase/schema.sql"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
