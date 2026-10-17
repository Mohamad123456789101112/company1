# 🚀 دليل التشغيل الكامل

> هذا الملف داخل المستودع فقط. **لا توجد صفحة في لوحة تحكم الأدمن تعرض
> ملف SQL أو مفاتيح الربط.** الإعدادات السرية في `src/lib/secure-config.ts`
> (server-only) وتُقرأ من متغيرات البيئة، وصفحة «الحماية والتشغيل» تعرض
> حالة «جاهز/ناقص» فقط.

## 1) قاعدة البيانات — Supabase

1. أنشئ مشروعًا على [supabase.com](https://supabase.com).
2. من **Project Settings → Database → Connection string (URI)** انسخ رابط
   *Session pooler* (المنفذ 5432) وضعه في `DATABASE_URL`.
3. نفّذ السكيما من طرفية جهازك:

```bash
cp .env.example .env.local     # ثم ضع DATABASE_URL الحقيقي
npm install
npm run db:setup               # ينفّذ supabase/schema.sql
npm run db:check               # يتأكد من الاتصال
```

بديل: الصق `supabase/schema.sql` مرة واحدة في **Supabase → SQL Editor → Run**.

حساب المدير الافتراضي: `admin@mohamedfawzi.com` / `Admin@12345`
**غيّر كلمة المرور فور أول دخول** (سيُطلب منك ذلك تلقائيًا).

## 2) الرفع على Vercel

1. ارفع المشروع على GitHub ثم **vercel.com → New Project** واستورده.
2. أضف متغيرات البيئة:
   `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `ADMIN_EMAILS`,
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MEDIA_SIGNING_SECRET`.
3. اضغط **Deploy**.

> ⚠️ إذا لم تضبط `DATABASE_URL` يعمل الموقع في **وضع تجربة مؤقت (PGlite)**
> بالبيانات الافتراضية للعرض فقط — البيانات تُفقد مع كل إعادة تشغيل.
> للإنتاج الحقيقي يجب ضبط `DATABASE_URL`.

## 3) تسجيل الدخول عبر Google

1. [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials → Create OAuth client ID** (Web application).
2. **Authorized redirect URIs**:
   `https://your-domain.vercel.app/api/auth/google/callback`
3. ضع Client ID / Secret في Vercel ثم أعد النشر.

## 4) أين يعيش كل شيء؟

| الملف | الوظيفة | الظهور في الويب |
| --- | --- | --- |
| `src/lib/secure-config.ts` | تجميع إعدادات Google/Supabase/الأسرار (server-only) | ❌ لا يُعرض في أي صفحة |
| `.env.local` | القيم الحقيقية محليًا | ❌ محجوب + مستبعد من Git |
| `supabase/schema.sql` | سكيما قاعدة البيانات | ❌ محجوب في `proxy.ts` |
| `scripts/db-setup.mjs` | تنفيذ السكيما من سطر الأوامر | ❌ محجوب |
| `docs/SETUP.md` | هذا الدليل | ❌ غير مُخدَّم |
| `src/app/admin/setup` | صفحة حالة الحماية والتشغيل (بدون أسرار) | ✅ للمدير فقط |

## 5) التحقق السريع بعد النشر

- `/api/health` يجب أن يعيد `{"ok":true}`.
- جرّب تسجيل الدخول بحساب المدير وغيّر كلمة المرور.
- من **الإدارة → صور الموقع** ارفع صور المدرس الحقيقية.
- من **الإدارة → الكورسات** تأكد من ظهور الفصول والدروس وجرّب السحب والإسقاط.
- من **الإدارة → الامتحانات** جرّب لصق JSON من ChatGPT لإنشاء امتحان كامل.
