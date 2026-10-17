-- =====================================================================
--  منصة البشمهندس محمد فوزي للفيزياء – مخطط قاعدة البيانات الكامل (Supabase / PostgreSQL)
--  الصق هذا الملف كاملًا في Supabase → SQL Editor → Run
--  آمن لإعادة التشغيل (idempotent): لن يكسر قاعدة بيانات موجودة.
-- =====================================================================

create extension if not exists "pgcrypto";

DO $$ BEGIN
  CREATE TYPE "public"."attempt_status" AS ENUM('in_progress', 'submitted', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "public"."code_scope" AS ENUM('course', 'unit', 'lesson');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "public"."code_type" AS ENUM('wallet', 'course');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "public"."enrollment_source" AS ENUM('wallet', 'code', 'admin', 'free', 'purchase');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "public"."grade" AS ENUM('first_secondary', 'second_secondary', 'third_secondary');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "public"."lesson_type" AS ENUM('video', 'pdf', 'quiz');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "public"."notification_type" AS ENUM('info', 'success', 'warning', 'payment', 'exam', 'course');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "public"."payment_method" AS ENUM('vodafone_cash', 'instapay', 'fawry', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "public"."payment_status" AS ENUM('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "public"."quiz_scope" AS ENUM('course', 'unit', 'lesson');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "public"."user_role" AS ENUM('student', 'assistant', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "public"."transaction_type" AS ENUM('code_recharge', 'payment_recharge', 'course_purchase', 'admin_adjustment', 'refund');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "public"."upload_kind" AS ENUM('receipt', 'pdf', 'image');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "public"."video_provider" AS ENUM('youtube', 'vimeo', 'bunny', 'drive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS "activation_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"type" "code_type" DEFAULT 'course' NOT NULL,
	"scope" "code_scope" DEFAULT 'course' NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"course_id" uuid,
	"unit_id" uuid,
	"lesson_id" uuid,
	"batch" text,
	"is_used" boolean DEFAULT false NOT NULL,
	"used_by" uuid,
	"used_at" timestamp with time zone,
	"created_by" uuid,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"grade" "grade",
	"is_pinned" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"meta" jsonb,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "course_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"grade" "grade" NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"discount_price" integer,
	"cover_image" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"access_days" integer,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"source" "enrollment_source" DEFAULT 'purchase' NOT NULL,
	"price_paid" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "lesson_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"source" text DEFAULT 'code' NOT NULL,
	"code_id" uuid,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "lesson_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "lesson_type" DEFAULT 'video' NOT NULL,
	"video_provider" "video_provider",
	"video_url" text,
	"pdf_url" text,
	"duration_minutes" integer DEFAULT 0 NOT NULL,
	"is_free_preview" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" DEFAULT 'info' NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"href" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "payment_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid,
	"method" "payment_method" NOT NULL,
	"amount" integer NOT NULL,
	"expected_amount" integer DEFAULT 0 NOT NULL,
	"sender_phone" text NOT NULL,
	"reference" text,
	"receipt_url" text,
	"receipt_file_id" uuid,
	"ai_verdict" jsonb,
	"ai_score" integer,
	"ai_checked_at" timestamp with time zone,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"admin_note" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"text" text NOT NULL,
	"image_url" text,
	"options" jsonb NOT NULL,
	"correct_index" integer NOT NULL,
	"explanation" text,
	"points" integer DEFAULT 1 NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL
);
CREATE TABLE IF NOT EXISTS "quiz_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"percent" integer DEFAULT 0 NOT NULL,
	"passed" boolean DEFAULT false NOT NULL,
	"status" "attempt_status" DEFAULT 'in_progress' NOT NULL,
	"violations" integer DEFAULT 0 NOT NULL,
	"cancel_reason" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "quizzes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"lesson_id" uuid,
	"unit_id" uuid,
	"scope" "quiz_scope" DEFAULT 'course' NOT NULL,
	"require_lesson_complete" boolean DEFAULT false NOT NULL,
	"unlock_lesson_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"duration_minutes" integer DEFAULT 20 NOT NULL,
	"pass_percent" integer DEFAULT 50 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"shuffle_questions" boolean DEFAULT true NOT NULL,
	"show_answers" boolean DEFAULT true NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"available_from" timestamp with time zone,
	"available_until" timestamp with time zone,
	"require_fullscreen" boolean DEFAULT true NOT NULL,
	"anti_cheat" boolean DEFAULT true NOT NULL,
	"max_violations" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"blocked_until" timestamp with time zone
);
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"user_agent" text,
	"ip" text,
	"device_label" text,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "testimonials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"grade" "grade",
	"role" text,
	"text" text NOT NULL,
	"stars" integer DEFAULT 5 NOT NULL,
	"avatar_url" text,
	"is_published" boolean DEFAULT true NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "upload_kind" NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"owner_id" uuid,
	"ref_type" text,
	"ref_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"parent_phone" text,
	"grade" "grade",
	"governorate" text,
	"password_hash" text,
	"google_id" text,
	"avatar_url" text,
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"wallet_balance" integer DEFAULT 0 NOT NULL,
	"email_verified_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"last_login_ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"type" "transaction_type" NOT NULL,
	"reference" text,
	"note" text,
	"balance_after" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
DO $$ BEGIN
  ALTER TABLE "activation_codes" ADD CONSTRAINT "activation_codes_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "activation_codes" ADD CONSTRAINT "activation_codes_unit_id_course_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."course_units"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "activation_codes" ADD CONSTRAINT "activation_codes_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "activation_codes" ADD CONSTRAINT "activation_codes_used_by_users_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "activation_codes" ADD CONSTRAINT "activation_codes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "course_units" ADD CONSTRAINT "course_units_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "lesson_access" ADD CONSTRAINT "lesson_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "lesson_access" ADD CONSTRAINT "lesson_access_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "lesson_access" ADD CONSTRAINT "lesson_access_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "lesson_access" ADD CONSTRAINT "lesson_access_code_id_activation_codes_id_fk" FOREIGN KEY ("code_id") REFERENCES "public"."activation_codes"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "lessons" ADD CONSTRAINT "lessons_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "lessons" ADD CONSTRAINT "lessons_unit_id_course_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."course_units"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_receipt_file_id_uploads_id_fk" FOREIGN KEY ("receipt_file_id") REFERENCES "public"."uploads"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "questions" ADD CONSTRAINT "questions_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_unit_id_course_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."course_units"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_unlock_lesson_id_lessons_id_fk" FOREIGN KEY ("unlock_lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "uploads" ADD CONSTRAINT "uploads_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "activation_codes_code_unique" ON "activation_codes" USING btree ("code");
CREATE INDEX IF NOT EXISTS "activation_codes_batch_idx" ON "activation_codes" USING btree ("batch");
CREATE INDEX IF NOT EXISTS "activation_codes_is_used_idx" ON "activation_codes" USING btree ("is_used");
CREATE INDEX IF NOT EXISTS "announcements_created_at_idx" ON "announcements" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "contact_messages_created_at_idx" ON "contact_messages" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "course_units_course_id_idx" ON "course_units" USING btree ("course_id");
CREATE UNIQUE INDEX IF NOT EXISTS "courses_slug_unique" ON "courses" USING btree ("slug");
CREATE INDEX IF NOT EXISTS "courses_grade_idx" ON "courses" USING btree ("grade");
CREATE INDEX IF NOT EXISTS "courses_published_idx" ON "courses" USING btree ("is_published");
CREATE UNIQUE INDEX IF NOT EXISTS "enrollments_user_course_unique" ON "enrollments" USING btree ("user_id","course_id");
CREATE INDEX IF NOT EXISTS "enrollments_course_id_idx" ON "enrollments" USING btree ("course_id");
CREATE UNIQUE INDEX IF NOT EXISTS "lesson_access_user_lesson_unique" ON "lesson_access" USING btree ("user_id","lesson_id");
CREATE INDEX IF NOT EXISTS "lesson_access_user_course_idx" ON "lesson_access" USING btree ("user_id","course_id");
CREATE UNIQUE INDEX IF NOT EXISTS "lesson_progress_user_lesson_unique" ON "lesson_progress" USING btree ("user_id","lesson_id");
CREATE INDEX IF NOT EXISTS "lesson_progress_user_course_idx" ON "lesson_progress" USING btree ("user_id","course_id");
CREATE INDEX IF NOT EXISTS "lessons_course_id_idx" ON "lessons" USING btree ("course_id");
CREATE INDEX IF NOT EXISTS "lessons_unit_id_idx" ON "lessons" USING btree ("unit_id");
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" USING btree ("user_id","is_read");
CREATE INDEX IF NOT EXISTS "notifications_created_idx" ON "notifications" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "payment_requests_user_id_idx" ON "payment_requests" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "payment_requests_status_idx" ON "payment_requests" USING btree ("status");
CREATE INDEX IF NOT EXISTS "payment_requests_course_idx" ON "payment_requests" USING btree ("course_id");
CREATE INDEX IF NOT EXISTS "questions_quiz_id_idx" ON "questions" USING btree ("quiz_id");
CREATE INDEX IF NOT EXISTS "quiz_attempts_user_id_idx" ON "quiz_attempts" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "quiz_attempts_quiz_id_idx" ON "quiz_attempts" USING btree ("quiz_id");
CREATE INDEX IF NOT EXISTS "quizzes_course_id_idx" ON "quizzes" USING btree ("course_id");
CREATE INDEX IF NOT EXISTS "quizzes_lesson_id_idx" ON "quizzes" USING btree ("lesson_id");
CREATE INDEX IF NOT EXISTS "quizzes_unit_id_idx" ON "quizzes" USING btree ("unit_id");
CREATE INDEX IF NOT EXISTS "rate_limits_window_start_idx" ON "rate_limits" USING btree ("window_start");
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_token_hash_unique" ON "sessions" USING btree ("token_hash");
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");
CREATE INDEX IF NOT EXISTS "testimonials_published_idx" ON "testimonials" USING btree ("is_published");
CREATE INDEX IF NOT EXISTS "uploads_owner_idx" ON "uploads" USING btree ("owner_id");
CREATE INDEX IF NOT EXISTS "uploads_ref_idx" ON "uploads" USING btree ("ref_type","ref_id");
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" USING btree ("email");
CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_unique" ON "users" USING btree ("phone");
CREATE UNIQUE INDEX IF NOT EXISTS "users_google_id_unique" ON "users" USING btree ("google_id");
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" USING btree ("role");
CREATE INDEX IF NOT EXISTS "users_grade_idx" ON "users" USING btree ("grade");
CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "wallet_transactions_user_id_idx" ON "wallet_transactions" USING btree ("user_id");

-- ترقية التثبيتات القديمة (لا تؤثر على التثبيت الجديد)
DO $$ BEGIN ALTER TYPE "public"."enrollment_source" ADD VALUE IF NOT EXISTS 'purchase'; EXCEPTION WHEN others THEN NULL; END $$;
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "available_from" timestamptz, ADD COLUMN IF NOT EXISTS "available_until" timestamptz, ADD COLUMN IF NOT EXISTS "require_fullscreen" boolean DEFAULT true NOT NULL, ADD COLUMN IF NOT EXISTS "anti_cheat" boolean DEFAULT true NOT NULL, ADD COLUMN IF NOT EXISTS "max_violations" integer DEFAULT 3 NOT NULL;
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "unit_id" uuid, ADD COLUMN IF NOT EXISTS "scope" "quiz_scope" DEFAULT 'course' NOT NULL, ADD COLUMN IF NOT EXISTS "require_lesson_complete" boolean DEFAULT false NOT NULL, ADD COLUMN IF NOT EXISTS "unlock_lesson_id" uuid;
UPDATE "quizzes" SET "scope"='lesson' WHERE "lesson_id" IS NOT NULL AND "scope"='course';
DROP INDEX IF EXISTS "quizzes_lesson_id_unique";
ALTER TABLE "quiz_attempts" ADD COLUMN IF NOT EXISTS "status" "attempt_status" DEFAULT 'in_progress' NOT NULL, ADD COLUMN IF NOT EXISTS "violations" integer DEFAULT 0 NOT NULL, ADD COLUMN IF NOT EXISTS "cancel_reason" text;
UPDATE "quiz_attempts" SET "status"='submitted' WHERE "submitted_at" IS NOT NULL AND "status"='in_progress';
ALTER TABLE "activation_codes" ADD COLUMN IF NOT EXISTS "scope" "code_scope" DEFAULT 'course' NOT NULL, ADD COLUMN IF NOT EXISTS "unit_id" uuid, ADD COLUMN IF NOT EXISTS "lesson_id" uuid;
ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "course_id" uuid, ADD COLUMN IF NOT EXISTS "expected_amount" integer DEFAULT 0 NOT NULL, ADD COLUMN IF NOT EXISTS "receipt_file_id" uuid, ADD COLUMN IF NOT EXISTS "ai_verdict" jsonb, ADD COLUMN IF NOT EXISTS "ai_score" integer, ADD COLUMN IF NOT EXISTS "ai_checked_at" timestamptz;

-- =====================================================================
--  حماية Supabase: تفعيل Row Level Security على كل الجداول
--  التطبيق يتصل عبر DATABASE_URL (دور postgres المالك) فيتجاوز RLS،
--  بينما مفاتيح anon/authenticated الخاصة بـ Supabase REST لا ترى أي بيانات.
-- =====================================================================
ALTER TABLE "activation_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "announcements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contact_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "course_units" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "courses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "enrollments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lesson_access" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lesson_progress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lessons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quiz_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quizzes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "testimonials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "uploads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "wallet_transactions" ENABLE ROW LEVEL SECURITY;

-- =====================================================================
--  الإعدادات الافتراضية للمنصة (تُعدَّل لاحقًا من لوحة الإدارة – لا بيانات وهمية)
-- =====================================================================
INSERT INTO "settings" ("key", "value") VALUES
  ('site_name', 'منصة البشمهندس محمد فوزي للفيزياء'),
  ('teacher_name', 'م/ محمد فوزي'),
  ('tagline', 'الفيزياء لعبتنا مش عقدتنا – شرح مبسط، رسومات توضيحية، وامتحانات مستمرة'),
  ('hero_badge', 'البشمهندس محمد فوزي – الفيزياء لعبتنا مش عقدتنا ⚡'),
  ('hero_title', 'منصتك الأولى لتعلم..وفهم الفيزياء مع البشمهندس..محمد فوزي'),
  ('hero_welcome', 'يا مساء جمال الكريستال يا بشمهندسين ودكاترة – أهلاً بيك في بيتك التاني!'),
  ('hero_subtitle', 'سواء كنت في أولى أو تانية أو تالتة ثانوي، هنا هتلاقي شرح الفيزياء كامل بأسلوب البشمهندس محمد فوزي اللي عرفته على يوتيوب – كورسات مقسّمة لوحدات صغيرة، فيديوهات برسومات توضيحية، واختبارات وتقييم مستمر.'),
  ('about_bio', 'البشمهندس محمد فوزي – مدرس الفيزياء للمرحلة الثانوية، صاحب قناة Eng:mohamed fawzi على يوتيوب (+15.4 ألف متابع و+173 محاضرة بأكثر من 1.2 مليون مشاهدة). أسلوبه يبدأ من الفكرة والأساس العلمي قبل القانون، مع رسومات توضيحية للدوائر الكهربية وحل تفصيلي لكتاب الامتحان وأفكار النظام الجديد حتى تبقى الفيزياء لعبتنا مش عقدتنا.'),
  ('academic_year', '2027'),
  ('img_hero', '/images/teacher.jpg'),
  ('img_about', '/images/teacher-about.jpg'),
  ('img_feature_1', '/images/feature-1.jpg'),
  ('img_feature_2', '/images/feature-2.jpg'),
  ('img_feature_3', '/images/feature-3.jpg'),
  ('img_auth', '/images/teacher-about.jpg'),
  ('auth_quote', 'الفيزياء لعبتنا مش عقدتنا… افهم الفكرة من الأساس، وحل معانا خطوة بخطوة لحد ما تقفّل الامتحان بثقة.'),
  ('auth_quote_author', 'م/ محمد فوزي'),
  ('youtube_followers', '15400'),
  ('facebook_followers', '25000'),
  ('students_count', '3500'),
  ('videos_count', '173'),
  ('exams_count', '85'),
  ('success_rate', '98'),
  ('whatsapp', ''),
  ('phone', ''),
  ('facebook', 'https://www.facebook.com/share/1EEz5pCHow/'),
  ('instagram', ''),
  ('youtube', 'https://www.youtube.com/@mohamed.fawzi7645'),
  ('telegram', ''),
  ('tiktok', 'https://tiktok.com'),
  ('vodafone_cash_number', ''),
  ('instapay_address', ''),
  ('payment_instructions', 'حوّل المبلغ على رقم فودافون كاش أو عنوان إنستاباي الموضح، ثم سجّل طلب الشحن برقم الهاتف المحوّل منه وسيتم تأكيده خلال ساعات.'),
  ('plan_basic_name', 'الباقة الأساسية'),
  ('plan_basic_price', '150'),
  ('plan_basic_old_price', '200'),
  ('plan_premium_name', 'باقة بريميوم'),
  ('plan_premium_price', '350'),
  ('plan_premium_old_price', '500'),
  ('plan_vip_name', 'باقة VIP'),
  ('plan_vip_price', '750'),
  ('plan_vip_old_price', '1000'),
  ('plan_period', 'شهريًا'),
  ('pricing_enabled', 'true'),
  ('pricing_title', 'اختار الباقة اللي تناسبك'),
  ('pricing_subtitle', 'ابدأ بالباقة الأساسية أو خد الباقة الكاملة بمتابعة شخصية… وكلها بتتفعّل فورًا بعد تأكيد الدفع.'),
  ('plan_basic_tagline', 'للبداية الصح'),
  ('plan_basic_cta', 'ابدأ بالأساسية'),
  ('plan_basic_features', E'كورس واحد من اختيارك\nمشاهدة الحصص بلا حدود\nامتحانات إلكترونية بتصحيح فوري\nملخصات PDF للكورس\n-مجموعة تليجرام للمتابعة\n-جلسات مراجعة لايف\n-متابعة شخصية مع المستر'),
  ('plan_premium_tagline', 'الأفضل قيمة'),
  ('plan_premium_cta', 'اشترك في بريميوم'),
  ('plan_premium_features', E'كل كورسات صفك الدراسي\nمشاهدة الحصص بلا حدود\nامتحانات + بنك أسئلة شامل\nملخصات ومذكرات PDF كاملة\nمجموعة تليجرام للمتابعة\nجلسات مراجعة لايف شهرية\n-متابعة شخصية مع المستر'),
  ('plan_vip_tagline', 'تجربة كاملة'),
  ('plan_vip_cta', 'انضم لـ VIP'),
  ('plan_vip_features', E'كل كورسات صفك + المراجعات النهائية\nمشاهدة الحصص بلا حدود\nامتحانات + تحليل نقاط الضعف\nملخصات ومذكرات PDF كاملة\nمجموعة واتساب خاصة مع المستر\nجلسات مراجعة لايف أسبوعية\nمتابعة شخصية وتقرير لولي الأمر'),
  ('plan_popular', 'premium'),
  ('bunny_library_id', ''),
  ('bunny_api_key', ''),
  ('bunny_cdn_hostname', ''),
  ('ai_provider', 'none'),
  ('ai_model', ''),
  ('ai_api_key', ''),
  ('ai_auto_approve', 'false'),
  ('ai_min_confidence', '85'),
  ('checkout_instructions', 'حوّل قيمة الكورس بالضبط على رقم فودافون كاش الموضح، ثم أدخل رقم العملية (المرجع) وارفع صورة واضحة لإيصال التحويل. تتم مراجعة الطلب وتفعيل الكورس خلال ساعات، أو فورًا عند نجاح التحقق الآلي.'),
  ('max_devices', '2'),
  ('allow_registration', 'true'),
  ('announcement_bar', ''),
  ('developer_name', 'محمد النواوي'),
  ('developer_url', ''),
  ('footer_text', 'المنصة الرسمية للبشمهندس محمد فوزي لتدريس الفيزياء للثانوية العامة – شرح، امتحانات إلكترونية، ومتابعة مستمرة.')
ON CONFLICT ("key") DO NOTHING;

-- =====================================================================
--  حساب المدير الافتراضي
--  البريد: admin@mohamedfawzi.com   |   كلمة المرور: Admin@12345
--  ⚠️ غيّر كلمة المرور فور أول تسجيل دخول (سيُطلب منك ذلك تلقائيًا).
-- =====================================================================
INSERT INTO "users" ("name", "email", "password_hash", "role", "must_change_password", "email_verified_at")
VALUES ('م/ محمد فوزي', 'admin@mohamedfawzi.com', '$2b$12$abU2lUjt4/JOZcC.3d6Um.grsIY.OXEjDPyA48aqRFIXQdeaaBkHO', 'admin', true, now())
ON CONFLICT DO NOTHING;


-- آراء افتراضية قابلة للتعديل/الحذف من لوحة الإدارة (تُضاف فقط إذا كان الجدول فارغًا)
INSERT INTO "testimonials" ("name", "grade", "role", "text", "stars", "avatar_url", "order_index")
SELECT * FROM (VALUES
  ('محمد أحمد', 'third_secondary'::grade, 'طالب – 3 ثانوي', 'الشرح بسيط ومنظم، والامتحانات الإلكترونية بعد كل حصة خلتني أعرف مستواي أول بأول. الفيزياء بقت أسهل بجد.', 5, '/images/avatars/student-1.jpg', 0),
  ('سارة محمود', 'second_secondary'::grade, 'طالبة – 2 ثانوي', 'الملخصات والمذكرات وفرت عليا وقت كبير، وممكن أعيد الحصة أكتر من مرة من الموبايل في أي وقت.', 5, '/images/avatars/student-2.jpg', 1),
  ('يوسف خالد', 'third_secondary'::grade, 'طالب – 3 ثانوي', 'نظام الامتحانات الآمن والتصحيح الفوري خلاني أتدرب زي الامتحان الحقيقي بالظبط، ودرجاتي اتحسنت واضح.', 5, '/images/avatars/student-3.jpg', 2),
  ('د/ هالة سمير', NULL, 'ولية أمر', 'بتوصلني إشعارات بنتائج الامتحانات ومتابعة المذاكرة، وده خلاني مطمنة إن ابني ماشي صح.', 5, '/images/avatars/student-4.jpg', 3),
  ('عبدالرحمن علي', 'first_secondary'::grade, 'طالب – 1 ثانوي', 'أول مرة أفهم المتجهات والحركة من غير حفظ – كل قانون بيتربط بمثال من الحياة.', 5, '/images/avatars/student-5.jpg', 4),
  ('كريم مصطفى', 'third_secondary'::grade, 'طالب – 3 ثانوي', 'المراجعات النهائية والأسئلة على نظام الامتحان الجديد كانت أكتر حاجة فرقت معايا قبل الامتحان.', 5, '/images/avatars/student-6.jpg', 5)
) AS v("name","grade","role","text","stars","avatar_url","order_index")
WHERE NOT EXISTS (SELECT 1 FROM "testimonials");

-- تم ✅  المنصة فارغة وجاهزة: سجّل دخول المدير، اضبط الإعدادات (أرقام التواصل، فودافون كاش، الباقات)، ثم أضف الكورسات من لوحة الإدارة.
