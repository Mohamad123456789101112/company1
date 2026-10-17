import "server-only";

/**
 * الواجهة الوحيدة للوصول إلى ملف الإعدادات المحمي.
 * المسار الحقيقي للملف: `config/platform.config.ts` (خارج مجلد الويب).
 * ❌ ممنوع استيراده داخل أي مكوّن عميل أو صفحة في لوحة الإدارة.
 */
export { platformConfig, configReport, missingProductionEnv } from "../../config/platform.config";
