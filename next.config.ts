import type { NextConfig } from "next";

/**
 * Hardened security headers.
 * - CSP restricts scripts/styles/frames to trusted origins only (video providers).
 * - HSTS forces HTTPS for 2 years (Vercel serves HTTPS by default).
 * - frame-ancestors 'none' prevents click-jacking.
 */
/**
 * PREVIEW_EMBED=1 is used only inside the hosted sandbox preview, which shows
 * the site inside an iframe. Production (Vercel) keeps the hardened defaults.
 */
const previewEmbed = process.env.PREVIEW_EMBED === "1";

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://www.googleapis.com",
  "media-src 'self' blob: https:",
  "frame-src 'self' blob: https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com https://drive.google.com https://iframe.mediadelivery.net https://docs.google.com",
  "object-src 'self'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  previewEmbed ? "frame-ancestors *" : "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  ...(previewEmbed ? [] : [{ key: "X-Frame-Options", value: "DENY" }]),
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
  experimental: {
    // AI quiz JSON can be pasted or uploaded (server action default is 1MB).
    serverActions: { bodySizeLimit: "4mb" },
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
