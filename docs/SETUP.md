# 🚀 دليل التشغيل الكامل (خارج لوحة الإدارة)

> هذا الملف يعيش في المستودع فقط. **لا توجد أي صفحة داخل لوحة تحكم الأدمن تعرض
> ملف SQL أو مفاتيح الربط** — تم حذف صفحة «دليل التشغيل و SQL» نهائيًا، وملف
> الإعدادات معزول في `config/platform.config.ts` مع حجب مسارات `/config` و
> `/supabase` و `/.env` من الـ proxy.

## 1) قاعدة البيانات — Supabase

1. أنشئ مشروعًا على [supabase.com](https://supabase.com).
2. من **Project Settings → Database → Connection string (URI)** انسخ رابط
   *Session pooler* (port 5432) وضعه في `DATABASE_URL`.
3. شغّل السكيما من طرفية جهازك (وليس من المتصفح):

```bash
cp .env.example .env.local     # ثم ضع DATABASE_URL الحقيقي
npm install
npm run db:setup               # ينفّذ supabase/schema.sql
npm run db:check               # يتأكد أن الاتصال يعمل
```

حساب المدير الافتراضي الذي ينشئه الـ SQL:
`admin@mohamedfawzi.com` / `Admin@12345` — **غيّر كلمة المرور فور أول دخول**
(ستظهر لك صفحة إجبارية لذلك). أو ضع بريدك في `ADMIN_EMAILS` ليُرقّى حسابك تلقائيًا.

## 2) الرفع على Vercel

1. ارفع المشروع على GitHub ثم **vercel.com → New Project** واستورد المستودع.
2. أضف متغيرات البيئة (Settings → Environment Variables):
   `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `ADMIN_EMAILS`,
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MEDIA_SIGNING_SECRET`.
3. اضغط **Deploy**.

## 3) تسجيل الدخول عبر Google

1. [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials → Create OAuth client ID** (Web application).
2. **Authorized redirect URIs**:
   `https://your-domain.vercel.app/api/auth/google/callback`
3. ضع Client ID / Secret في Vercel ثم أعد النشر.

## 4) فحص الحالة من لوحة الإدارة

بدلًا من عرض الأسرار، صفحة **الإدارة → النظام → حالة الحماية والربط** تعرض فقط
«جاهز / ناقص» لكل إعداد، بدون أي قيمة سرية.

## 5) أين يعيش كل شيء؟

| الملف | الوظيفة | الظهور في الويب |
| --- | --- | --- |
| `config/platform.config.ts` | كل إعدادات الربط (Supabase/Google/الأسرار) | ❌ محجوب + server-only |
| `.env.local` | القيم الحقيقية على جهازك | ❌ محجوب + مستبعد من Git |
| `supabase/schema.sql` | سكيما قاعدة البيانات | ❌ محجوب |
| `scripts/db-setup.mjs` | تنفيذ السكيما من سطر الأوامر | ❌ محجوب |
| `docs/SETUP.md` | هذا الدليل | ❌ غير مُخدَّم |
