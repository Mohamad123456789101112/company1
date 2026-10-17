import "server-only";

/**
 * ═══════════════════════════════════════════════════════════════════
 *  🔐 SECURE CONFIG – ملف الإعدادات الحساس المحمي
 * ═══════════════════════════════════════════════════════════════════
 *  يجمع كل إعدادات الربط الحساسة في مكان واحد معزول:
 *    • تسجيل الدخول عبر Google (Google Auth)
 *    • اتصال قاعدة بيانات Supabase وأكواد الـ SQL Editor
 *    • أسرار توقيع المحتوى والفيديو
 *
 *  قواعد الأمان (إلزامية):
 *    1. هذا الملف Server-Only – يُمنع استيراده من أي Client Component.
 *    2. ممنوع تمامًا ظهور أو فتح أي قيمة من هذا الملف داخل لوحة تحكم
 *       الأدمن أو أي صفحة ويب – القيم تُقرأ من البيئة (.env) فقط،
 *       والملف نفسه غير قابل للوصول من المتصفح.
 *    3. ملف .env غير مرفوع على Git (مُتجاهل في .gitignore) ويُوضع في
 *       Vercel → Settings → Environment Variables في الإنتاج.
 *    4. لا تُطبع هذه القيم في Logs أو Debug أو API Responses.
 * ═══════════════════════════════════════════════════════════════════
 */

/** Google Auth (OAuth 2.0 + PKCE). */
export const secureGoogleAuth = {
  get clientId(): string {
    return process.env.GOOGLE_CLIENT_ID ?? "";
  },
  get clientSecret(): string {
    return process.env.GOOGLE_CLIENT_SECRET ?? "";
  },
  get configured(): boolean {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  },
} as const;

/** Supabase / Postgres connection + SQL bootstrap file location. */
export const secureDatabase = {
  get url(): string {
    return process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim() || "";
  },
  /**
   * مسار ملف أكواد الـ SQL Editor الخاص بـ Supabase. يُقرأ من السيرفر فقط
   * (لإنشاء/ترحيل القاعدة) – لا يُعرض أبدًا في لوحة التحكم.
   */
  get sqlBootstrapFile(): string {
    return process.env.SUPABASE_SQL_FILE ?? "supabase/schema.sql";
  },
  get configured(): boolean {
    return Boolean(process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim());
  },
} as const;

/** Content-protection secrets (signed video/PDF links). */
export const secureMedia = {
  get signingSecret(): string {
    return process.env.MEDIA_SIGNING_SECRET ?? "";
  },
  get bunnyTokenAuthKey(): string {
    return process.env.BUNNY_TOKEN_AUTH_KEY ?? "";
  },
} as const;

/** Admin accounts promoted automatically by email. */
export function secureAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
