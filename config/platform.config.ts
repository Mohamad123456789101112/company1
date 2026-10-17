/**
 * 🔒 ملف الإعدادات الوحيد والمحمي للمنصة — v2
 * ------------------------------------------------------------------
 * هذا الملف هو المصدر الوحيد لكل بيانات الربط السرية:
 *   • رابط قاعدة البيانات (Supabase / PostgreSQL)  → DATABASE_URL
 *   • إعدادات تسجيل الدخول عبر Google (OAuth 2.0)  → GOOGLE_CLIENT_ID / SECRET
 *   • سر توقيع روابط الفيديو والـ PDF              → MEDIA_SIGNING_SECRET
 *   • بريد/بريد مدير المنصة                        → ADMIN_EMAILS
 *
 * ⚠️ قواعد صارمة:
 *   1) لا تكتب أي مفتاح حقيقي داخل هذا الملف أو داخل Git.
 *      القيم الحقيقية تُحفظ في `.env.local` على جهازك أو في
 *      Vercel → Settings → Environment Variables (وليست في المستودع).
 *   2) هذا الملف لا يظهر ولا يُفتح ولا يُقرأ من لوحة تحكم الأدمن إطلاقًا.
 *      صفحة «دليل التشغيل و SQL» تم حذفها بالكامل لهذا السبب.
 *   3) أي طلب ويب للمسارات /config أو /supabase أو /.env يُرفض من الـ proxy.
 *   4) الكود الذي يقرأ هذا الملف يعمل على الخادم فقط (server-only).
 */
import "server-only";

const env = (key: string): string => (process.env[key] ?? "").trim();
const bool = (key: string, fallback = false): boolean => {
  const v = env(key).toLowerCase();
  if (!v) return fallback;
  return v === "1" || v === "true" || v === "yes" || v === "on";
};

export const platformConfig = {
  appUrl: env("NEXT_PUBLIC_APP_URL").replace(/\/$/, ""),
  database: {
    url: env("DATABASE_URL"),
    ssl: env("DATABASE_SSL") === "" ? undefined : bool("DATABASE_SSL"),
    poolMax: Number(env("DATABASE_POOL_MAX") || 5),
  },
  google: {
    clientId: env("GOOGLE_CLIENT_ID"),
    clientSecret: env("GOOGLE_CLIENT_SECRET"),
    get enabled() {
      return Boolean(this.clientId && this.clientSecret);
    },
    get redirectUri() {
      return `${platformConfig.appUrl}/api/auth/google/callback`;
    },
  },
  security: {
    adminEmails: env("ADMIN_EMAILS")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
    mediaSigningSecret: env("MEDIA_SIGNING_SECRET"),
  },
  bunny: {
    tokenAuthKey: env("BUNNY_TOKEN_AUTH_KEY"),
  },
} as const;

/** فحص سريع عند بدء التشغيل — لا يطبع أي قيم سرية، فقط ما إذا كانت مضبوطة. */
export function configReport() {
  return {
    database: Boolean(platformConfig.database.url),
    appUrl: Boolean(platformConfig.appUrl),
    google: platformConfig.google.enabled,
    adminEmails: platformConfig.security.adminEmails.length > 0,
    mediaSecret: Boolean(platformConfig.security.mediaSigningSecret),
  };
}

/**
 * المتغيرات الإلزامية في الإنتاج. تُستخدم في README/CI فقط، وليست
 * مستدعاة من أي صفحة إدارة.
 */
export function missingProductionEnv(): string[] {
  if (process.env.NODE_ENV !== "production") return [];
  const required: Array<[string, boolean]> = [
    ["DATABASE_URL", Boolean(platformConfig.database.url)],
    ["NEXT_PUBLIC_APP_URL", Boolean(platformConfig.appUrl)],
    ["MEDIA_SIGNING_SECRET", Boolean(platformConfig.security.mediaSigningSecret)],
  ];
  return required.filter(([, ok]) => !ok).map(([k]) => k);
}
