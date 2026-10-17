import { z } from "zod";

export const EGYPT_PHONE = /^01[0125][0-9]{8}$/;

const name = z
  .string()
  .trim()
  .min(3, "الاسم يجب أن يكون 3 أحرف على الأقل")
  .max(60, "الاسم طويل جدًا")
  .regex(/^[\u0600-\u06FFa-zA-Z\s.'-]+$/, "الاسم يحتوي على رموز غير مسموحة");

const email = z.string().trim().toLowerCase().email("بريد إلكتروني غير صالح").max(120);

const phone = z.string().trim().regex(EGYPT_PHONE, "رقم هاتف مصري غير صالح (مثال: 01012345678)");

const password = z
  .string()
  .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
  .max(72, "كلمة المرور طويلة جدًا")
  .regex(/[A-Za-z]/, "يجب أن تحتوي على حرف واحد على الأقل")
  .regex(/[0-9]/, "يجب أن تحتوي على رقم واحد على الأقل");

export const gradeSchema = z.enum(["first_secondary", "second_secondary", "third_secondary"], {
  message: "اختر الصف الدراسي",
});

export const registerSchema = z
  .object({
    name,
    email,
    phone,
    parentPhone: phone,
    grade: gradeSchema,
    governorate: z.string().trim().max(40).optional().or(z.literal("")),
    password,
    confirmPassword: z.string(),
    website: z.string().max(0, "spam").optional().or(z.literal("")), // honeypot
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "كلمتا المرور غير متطابقتين",
  })
  .refine((d) => d.phone !== d.parentPhone, {
    path: ["parentPhone"],
    message: "رقم ولي الأمر يجب أن يختلف عن رقم الطالب",
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "أدخل كلمة المرور").max(72),
  next: z.string().optional(),
});

export const completeProfileSchema = z
  .object({
    phone,
    parentPhone: phone,
    grade: gradeSchema,
    governorate: z.string().trim().max(40).optional().or(z.literal("")),
  })
  .refine((d) => d.phone !== d.parentPhone, {
    path: ["parentPhone"],
    message: "رقم ولي الأمر يجب أن يختلف عن رقم الطالب",
  });

export const updateProfileSchema = z.object({
  name,
  phone,
  parentPhone: phone,
  grade: gradeSchema,
  governorate: z.string().trim().max(40).optional().or(z.literal("")),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().max(72).optional().or(z.literal("")),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "كلمتا المرور غير متطابقتين",
  });

export const redeemCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(8, "الكود غير صالح")
    .max(32, "الكود غير صالح")
    .regex(/^[A-Za-z0-9-]+$/, "الكود غير صالح"),
});

export const checkoutSchema = z.object({
  courseId: z.string().uuid(),
  senderPhone: phone,
  reference: z
    .string()
    .trim()
    .min(4, "أدخل رقم العملية كما يظهر في رسالة التحويل")
    .max(40, "رقم العملية طويل جدًا")
    .regex(/^[A-Za-z0-9\u0660-\u0669\-]+$/, "رقم العملية يحتوي على رموز غير صالحة"),
  receiptFileId: z.string().uuid({ message: "ارفع صورة إيصال التحويل أولًا" }),
  agree: z.literal("on", { message: "يجب الموافقة على سياسة الاسترجاع" }),
});

export const centerCodeSchema = redeemCodeSchema;

export const contactSchema = z.object({
  name,
  phone,
  message: z.string().trim().min(10, "اكتب رسالة أوضح (10 أحرف على الأقل)").max(1000),
  website: z.string().max(0).optional().or(z.literal("")),
});

/* ───────────── Admin ───────────── */

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), "رابط غير صالح")
  .optional()
  .or(z.literal(""));

export const courseSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(3000).optional().or(z.literal("")),
  grade: gradeSchema,
  price: z.coerce.number().int().min(0).max(100000),
  discountPrice: z.coerce.number().int().min(0).max(100000).optional().or(z.literal("")),
  coverImage: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https?:\/\//i.test(v) || v.startsWith("/"), "رابط غير صالح")
    .optional()
    .or(z.literal("")),
  isPublished: z.coerce.boolean().optional(),
  isFree: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  accessDays: z.coerce.number().int().min(0).max(3650).optional().or(z.literal("")),
  orderIndex: z.coerce.number().int().min(0).max(10000).optional(),
});

export const unitSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  orderIndex: z.coerce.number().int().min(0).max(10000).optional(),
});

export const lessonSchema = z.object({
  courseId: z.string().uuid(),
  unitId: z.string().uuid(),
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  type: z.enum(["video", "pdf", "quiz"]),
  videoProvider: z.enum(["youtube", "vimeo", "bunny", "drive"]).optional().or(z.literal("")),
  videoUrl: z.string().trim().max(500).optional().or(z.literal("")),
  pdfUrl: optionalUrl,
  durationMinutes: z.coerce.number().int().min(0).max(600).optional(),
  isFreePreview: z.coerce.boolean().optional(),
  isPublished: z.coerce.boolean().optional(),
  orderIndex: z.coerce.number().int().min(0).max(10000).optional(),
});

export const quizSchema = z.object({
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().min(1).max(300),
  passPercent: z.coerce.number().int().min(0).max(100),
  maxAttempts: z.coerce.number().int().min(1).max(50),
  shuffleQuestions: z.coerce.boolean().optional(),
  showAnswers: z.coerce.boolean().optional(),
  isPublished: z.coerce.boolean().optional(),
  availableFrom: z.string().max(30).optional().or(z.literal("")),
  availableUntil: z.string().max(30).optional().or(z.literal("")),
  requireFullscreen: z.coerce.boolean().optional(),
  antiCheat: z.coerce.boolean().optional(),
  maxViolations: z.coerce.number().int().min(1).max(20).optional(),
  /* linkage */
  scope: z.enum(["course", "unit", "lesson"]).optional(),
  unitId: z.string().uuid().optional().or(z.literal("")),
  lessonId: z.string().uuid().optional().or(z.literal("")),
  requireLessonComplete: z.coerce.boolean().optional(),
  unlockLessonId: z.string().uuid().optional().or(z.literal("")),
});

export const standaloneQuizSchema = quizSchema
  .extend({ courseId: z.string().uuid(), scope: z.enum(["course", "unit", "lesson"]) })
  .refine((d) => d.scope !== "unit" || Boolean(d.unitId), { path: ["unitId"], message: "اختر الوحدة" })
  .refine((d) => d.scope !== "lesson" || Boolean(d.lessonId), { path: ["lessonId"], message: "اختر الدرس" });

export const aiSettingsSchema = z.object({
  ai_provider: z.enum(["none", "gemini", "openai"]),
  ai_model: z.string().trim().max(80).optional().or(z.literal("")),
  ai_api_key: z.string().trim().max(300).optional().or(z.literal("")),
  ai_auto_approve: z.coerce.boolean().optional(),
  ai_min_confidence: z.coerce.number().int().min(50).max(100),
});

export const questionSchema = z
  .object({
    quizId: z.string().uuid(),
    text: z.string().trim().min(2).max(2000),
    imageUrl: optionalUrl,
    options: z.array(z.string().trim().min(1).max(300)).min(2).max(6),
    correctIndex: z.coerce.number().int().min(0).max(5),
    explanation: z.string().trim().max(1500).optional().or(z.literal("")),
    points: z.coerce.number().int().min(1).max(20).optional(),
  })
  .refine((d) => d.correctIndex < d.options.length, {
    path: ["correctIndex"],
    message: "الإجابة الصحيحة خارج نطاق الاختيارات",
  });

export const bulkQuestionsSchema = z.object({
  quizId: z.string().uuid(),
  text: z.string().trim().min(10, "الصق الأسئلة أولًا").max(200_000),
  points: z.coerce.number().int().min(1).max(20).optional(),
});

export const generateCodesSchema = z
  .object({
    scope: z.enum(["course", "unit", "lesson"]),
    courseId: z.string().uuid({ message: "اختر الكورس" }),
    unitId: z.string().uuid().optional().or(z.literal("")),
    lessonId: z.string().uuid().optional().or(z.literal("")),
    quantity: z.coerce.number().int().min(1).max(500),
    batch: z.string().trim().max(60).optional().or(z.literal("")),
    expiresInDays: z.coerce.number().int().min(0).max(3650).optional(),
    accessDays: z.coerce.number().int().min(0).max(3650).optional(),
  })
  .refine((d) => d.scope !== "unit" || Boolean(d.unitId), { path: ["unitId"], message: "اختر الوحدة" })
  .refine((d) => d.scope !== "lesson" || Boolean(d.lessonId), { path: ["lessonId"], message: "اختر الدرس" });

export const announcementSchema = z.object({
  title: z.string().trim().min(2).max(150),
  body: z.string().trim().min(2).max(4000),
  grade: z.enum(["all", "first_secondary", "second_secondary", "third_secondary"]),
  isPinned: z.coerce.boolean().optional(),
  isPublished: z.coerce.boolean().optional(),
});

export const testimonialSchema = z.object({
  name: z.string().trim().min(2, "أدخل الاسم").max(60),
  role: z.string().trim().max(60).optional().or(z.literal("")),
  grade: z.enum(["none", "first_secondary", "second_secondary", "third_secondary"]),
  text: z.string().trim().min(10, "اكتب رأيًا أوضح (10 أحرف على الأقل)").max(600),
  stars: z.coerce.number().int().min(1).max(5),
  avatarUrl: optionalUrl,
  orderIndex: z.coerce.number().int().min(0).max(10000).optional(),
});

export const adjustBalanceSchema = z.object({
  userId: z.string().uuid(),
  amount: z.coerce.number().int().min(-100000).max(100000).refine((n) => n !== 0, "المبلغ لا يمكن أن يكون صفر"),
  note: z.string().trim().max(200).optional().or(z.literal("")),
});

export const adminResetPasswordSchema = z.object({
  userId: z.string().uuid(),
  newPassword: password,
});

export const enrollStudentSchema = z.object({
  userId: z.string().uuid(),
  courseId: z.string().uuid(),
});

export const uuidSchema = z.string().uuid();

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "بيانات غير صالحة";
}

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
