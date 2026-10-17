import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  customType,
} from "drizzle-orm/pg-core";
import type { AiVerdict } from "../lib/ai-types";

/** Binary column (receipts, PDFs). */
export const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType() {
    return "bytea";
  },
});

/* ───────────────────────────── Enums ───────────────────────────── */

export const gradeEnum = pgEnum("grade", ["first_secondary", "second_secondary", "third_secondary"]);
export const roleEnum = pgEnum("user_role", ["student", "assistant", "admin"]);
export const lessonTypeEnum = pgEnum("lesson_type", ["video", "pdf", "quiz"]);
export const videoProviderEnum = pgEnum("video_provider", ["youtube", "vimeo", "bunny", "drive"]);
export const codeTypeEnum = pgEnum("code_type", ["wallet", "course"]);
export const codeScopeEnum = pgEnum("code_scope", ["course", "unit", "lesson"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "approved", "rejected"]);
export const paymentMethodEnum = pgEnum("payment_method", ["vodafone_cash", "instapay", "fawry", "other"]);
export const txTypeEnum = pgEnum("transaction_type", ["code_recharge", "payment_recharge", "course_purchase", "admin_adjustment", "refund"]);
export const enrollmentSourceEnum = pgEnum("enrollment_source", ["wallet", "code", "admin", "free", "purchase"]);
export const attemptStatusEnum = pgEnum("attempt_status", ["in_progress", "submitted", "cancelled"]);
export const quizScopeEnum = pgEnum("quiz_scope", ["course", "unit", "lesson"]);
export const uploadKindEnum = pgEnum("upload_kind", ["receipt", "pdf", "image"]);
export const notificationTypeEnum = pgEnum("notification_type", ["info", "success", "warning", "payment", "exam", "course"]);

export type Grade = (typeof gradeEnum.enumValues)[number];
export type Role = (typeof roleEnum.enumValues)[number];

/* ───────────────────────────── Users & Auth ───────────────────────────── */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    parentPhone: text("parent_phone"),
    grade: gradeEnum("grade"),
    governorate: text("governorate"),
    passwordHash: text("password_hash"),
    googleId: text("google_id"),
    avatarUrl: text("avatar_url"),
    role: roleEnum("role").notNull().default("student"),
    isActive: boolean("is_active").notNull().default(true),
    isBanned: boolean("is_banned").notNull().default(false),
    banReason: text("ban_reason"),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    walletBalance: integer("wallet_balance").notNull().default(0),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    lastLoginIp: text("last_login_ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_unique").on(t.email),
    uniqueIndex("users_phone_unique").on(t.phone),
    uniqueIndex("users_google_id_unique").on(t.googleId),
    index("users_role_idx").on(t.role),
    index("users_grade_idx").on(t.grade),
    index("users_created_at_idx").on(t.createdAt),
  ],
).enableRLS();

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    userAgent: text("user_agent"),
    ip: text("ip"),
    deviceLabel: text("device_label"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sessions_token_hash_unique").on(t.tokenHash),
    index("sessions_user_id_idx").on(t.userId),
    index("sessions_expires_at_idx").on(t.expiresAt),
  ],
).enableRLS();

export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull().default(0),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
    blockedUntil: timestamp("blocked_until", { withTimezone: true }),
  },
  (t) => [index("rate_limits_window_start_idx").on(t.windowStart)],
).enableRLS();

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    meta: jsonb("meta"),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_logs_user_id_idx").on(t.userId), index("audit_logs_created_at_idx").on(t.createdAt)],
).enableRLS();

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull().default("info"),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    href: text("href"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.isRead), index("notifications_created_idx").on(t.createdAt)],
).enableRLS();

/* ───────────────────────────── Content ───────────────────────────── */

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    grade: gradeEnum("grade").notNull(),
    price: integer("price").notNull().default(0),
    discountPrice: integer("discount_price"),
    coverImage: text("cover_image"),
    isPublished: boolean("is_published").notNull().default(false),
    isFree: boolean("is_free").notNull().default(false),
    isFeatured: boolean("is_featured").notNull().default(false),
    accessDays: integer("access_days"),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("courses_slug_unique").on(t.slug), index("courses_grade_idx").on(t.grade), index("courses_published_idx").on(t.isPublished)],
).enableRLS();

export const courseUnits = pgTable(
  "course_units",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("course_units_course_id_idx").on(t.courseId)],
).enableRLS();

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    unitId: uuid("unit_id").notNull().references(() => courseUnits.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    type: lessonTypeEnum("type").notNull().default("video"),
    videoProvider: videoProviderEnum("video_provider"),
    videoUrl: text("video_url"),
    pdfUrl: text("pdf_url"),
    durationMinutes: integer("duration_minutes").notNull().default(0),
    isFreePreview: boolean("is_free_preview").notNull().default(false),
    isPublished: boolean("is_published").notNull().default(true),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("lessons_course_id_idx").on(t.courseId), index("lessons_unit_id_idx").on(t.unitId)],
).enableRLS();

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    source: enrollmentSourceEnum("source").notNull().default("purchase"),
    pricePaid: integer("price_paid").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("enrollments_user_course_unique").on(t.userId, t.courseId), index("enrollments_course_id_idx").on(t.courseId)],
).enableRLS();

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("lesson_progress_user_lesson_unique").on(t.userId, t.lessonId), index("lesson_progress_user_course_idx").on(t.userId, t.courseId)],
).enableRLS();

/* ───────────────────────────── Quizzes ───────────────────────────── */

export const quizzes = pgTable(
  "quizzes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    /** lesson exam: appears inside that lesson */
    lessonId: uuid("lesson_id").references(() => lessons.id, { onDelete: "cascade" }),
    /** unit exam: covers one unit/chapter */
    unitId: uuid("unit_id").references(() => courseUnits.id, { onDelete: "cascade" }),
    scope: quizScopeEnum("scope").notNull().default("course"),
    /** when true, students must finish the linked lesson/unit lessons before entering */
    requireLessonComplete: boolean("require_lesson_complete").notNull().default(false),
    /** optional: lesson that gets unlocked only after passing (gated progression) */
    unlockLessonId: uuid("unlock_lesson_id").references(() => lessons.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull().default(20),
    passPercent: integer("pass_percent").notNull().default(50),
    maxAttempts: integer("max_attempts").notNull().default(3),
    shuffleQuestions: boolean("shuffle_questions").notNull().default(true),
    showAnswers: boolean("show_answers").notNull().default(true),
    isPublished: boolean("is_published").notNull().default(true),
    /** Scheduling window (null = always available) */
    availableFrom: timestamp("available_from", { withTimezone: true }),
    availableUntil: timestamp("available_until", { withTimezone: true }),
    /** Anti-cheat */
    requireFullscreen: boolean("require_fullscreen").notNull().default(true),
    antiCheat: boolean("anti_cheat").notNull().default(true),
    maxViolations: integer("max_violations").notNull().default(3),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("quizzes_course_id_idx").on(t.courseId), index("quizzes_lesson_id_idx").on(t.lessonId), index("quizzes_unit_id_idx").on(t.unitId)],
).enableRLS();

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizId: uuid("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    imageUrl: text("image_url"),
    options: jsonb("options").$type<string[]>().notNull(),
    correctIndex: integer("correct_index").notNull(),
    explanation: text("explanation"),
    points: integer("points").notNull().default(1),
    orderIndex: integer("order_index").notNull().default(0),
  },
  (t) => [index("questions_quiz_id_idx").on(t.quizId)],
).enableRLS();

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizId: uuid("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    answers: jsonb("answers").$type<Record<string, number>>().notNull().default({}),
    score: integer("score").notNull().default(0),
    total: integer("total").notNull().default(0),
    percent: integer("percent").notNull().default(0),
    passed: boolean("passed").notNull().default(false),
    status: attemptStatusEnum("status").notNull().default("in_progress"),
    violations: integer("violations").notNull().default(0),
    cancelReason: text("cancel_reason"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
  },
  (t) => [index("quiz_attempts_user_id_idx").on(t.userId), index("quiz_attempts_quiz_id_idx").on(t.quizId)],
).enableRLS();

/* ───────────────────────────── Center codes & granular access ───────────────────────────── */

export const activationCodes = pgTable(
  "activation_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    type: codeTypeEnum("type").notNull().default("course"),
    scope: codeScopeEnum("scope").notNull().default("course"),
    amount: integer("amount").notNull().default(0),
    courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
    unitId: uuid("unit_id").references(() => courseUnits.id, { onDelete: "set null" }),
    lessonId: uuid("lesson_id").references(() => lessons.id, { onDelete: "set null" }),
    batch: text("batch"),
    isUsed: boolean("is_used").notNull().default(false),
    usedBy: uuid("used_by").references(() => users.id, { onDelete: "set null" }),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("activation_codes_code_unique").on(t.code), index("activation_codes_batch_idx").on(t.batch), index("activation_codes_is_used_idx").on(t.isUsed)],
).enableRLS();

export const lessonAccess = pgTable(
  "lesson_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    source: text("source").notNull().default("code"),
    codeId: uuid("code_id").references(() => activationCodes.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("lesson_access_user_lesson_unique").on(t.userId, t.lessonId), index("lesson_access_user_course_idx").on(t.userId, t.courseId)],
).enableRLS();

/* ───────────────────────────── Payments & files ───────────────────────────── */

export const walletTransactions = pgTable(
  "wallet_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    type: txTypeEnum("type").notNull(),
    reference: text("reference"),
    note: text("note"),
    balanceAfter: integer("balance_after").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("wallet_transactions_user_id_idx").on(t.userId)],
).enableRLS();

export const uploads = pgTable(
  "uploads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: uploadKindEnum("kind").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    data: bytea("data").notNull(),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    refType: text("ref_type"),
    refId: uuid("ref_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("uploads_owner_idx").on(t.ownerId), index("uploads_ref_idx").on(t.refType, t.refId)],
).enableRLS();

export const paymentRequests = pgTable(
  "payment_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
    method: paymentMethodEnum("method").notNull(),
    amount: integer("amount").notNull(),
    expectedAmount: integer("expected_amount").notNull().default(0),
    senderPhone: text("sender_phone").notNull(),
    reference: text("reference"),
    receiptUrl: text("receipt_url"),
    receiptFileId: uuid("receipt_file_id").references(() => uploads.id, { onDelete: "set null" }),
    aiVerdict: jsonb("ai_verdict").$type<AiVerdict>(),
    aiScore: integer("ai_score"),
    aiCheckedAt: timestamp("ai_checked_at", { withTimezone: true }),
    status: paymentStatusEnum("status").notNull().default("pending"),
    adminNote: text("admin_note"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payment_requests_user_id_idx").on(t.userId), index("payment_requests_status_idx").on(t.status), index("payment_requests_course_idx").on(t.courseId)],
).enableRLS();

/* ───────────────────────────── Misc ───────────────────────────── */

export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    grade: gradeEnum("grade"),
    isPinned: boolean("is_pinned").notNull().default(false),
    isPublished: boolean("is_published").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("announcements_created_at_idx").on(t.createdAt)],
).enableRLS();

export const contactMessages = pgTable(
  "contact_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    message: text("message").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("contact_messages_created_at_idx").on(t.createdAt)],
).enableRLS();

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

export const testimonials = pgTable(
  "testimonials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    grade: gradeEnum("grade"),
    role: text("role"),
    text: text("text").notNull(),
    stars: integer("stars").notNull().default(5),
    avatarUrl: text("avatar_url"),
    isPublished: boolean("is_published").notNull().default(true),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("testimonials_published_idx").on(t.isPublished)],
).enableRLS();

/* ───────────────────────────── Types ───────────────────────────── */

export type User = typeof users.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type CourseUnit = typeof courseUnits.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type Quiz = typeof quizzes.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type Enrollment = typeof enrollments.$inferSelect;
export type ActivationCode = typeof activationCodes.$inferSelect;
export type LessonAccess = typeof lessonAccess.$inferSelect;
export type PaymentRequest = typeof paymentRequests.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type Testimonial = typeof testimonials.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Upload = typeof uploads.$inferSelect;
