# قالب SaaS الموحد – تشغيل مدرس جديد في 5 دقائق

كل إعدادات الديزاين والثيمات والصور والأنيميشن تعيش في جدول واحد:
`platform_settings` (مع `support_settings` لزر التواصل العائم).

## 1) قاعدة بيانات جديدة (مرة واحدة لكل مدرس)

1. أنشئ مشروع Supabase جديد.
2. الصق ملف `supabase/schema.sql` كاملًا في SQL Editor ثم Run.
3. انسخ Connection String (Session pooler).

## 2) ربط المشروع

```bash
DATABASE_URL=postgresql://...          # أو فعّل تكامل Supabase في Vercel
NEXT_PUBLIC_APP_URL=https://xxx.vercel.app
ADMIN_EMAILS=owner@gmail.com           # يُرقّى تلقائيًا إلى super_admin
MEDIA_SIGNING_SECRET=<32+ حرف عشوائي>
```

## 3) الإعداد من لوحة الـ Super Admin (5 دقائق)

| القسم | المسار | الصلاحية |
|---|---|---|
| الهوية والثيم والألوان ونمط الحركة | `/admin/settings` | super_admin فقط |
| صور الهيدر والأقسام والدخول واللوجو والفافيكون | `/admin/images` | super_admin فقط |
| زر الدعم العائم (واتساب/تيليجرام + رسالة الترحيب) | `/admin/support` | teacher_admin و super_admin |
| الحصص والفيديوهات والامتحانات والطلاب والأكواد | `/admin/courses` `/admin/exams` `/admin/students` `/admin/codes` | teacher_admin و super_admin |

## 4) الأدوار

- `super_admin`: مالك المحرك – الهوية والثيم والصور والأنيميشن والأمان.
- `teacher_admin`: المدرس/السكرتارية – المحتوى والطلاب والأكواد وزر الدعم.
- `admin` و `assistant` أسماء قديمة: تُعامل كـ super_admin و teacher_admin تلقائيًا.

## 5) الأمان

- RLS مفعّلة على كل الجداول مع سياسات رفض صريح لأي وصول REST خارجي.
- كل Server Action و API Route يتحقق من الـ session والدور.
- حساب الطالب: جهاز واحد (الجديد يطرد القديم، قابل للضبط من `max_devices`).
- علامة مائية متحركة (الاسم + الهاتف + IP) فوق كل فيديو و PDF.
