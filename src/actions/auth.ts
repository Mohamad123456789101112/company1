"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import {
  burnPasswordTiming,
  createSession,
  currentSessionId,
  destroySession,
  hashPassword,
  isBootstrapAdminEmail,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { clearRateLimit, humanRetry, rateLimit } from "@/lib/rate-limit";
import { getClientIp, safeRedirectPath } from "@/lib/security";
import {
  changePasswordSchema,
  completeProfileSchema,
  fieldErrors,
  loginSchema,
  registerSchema,
  updateProfileSchema,
  uuidSchema,
} from "@/lib/validators";
import { audit } from "@/lib/audit";
import { getSettings, settingBool } from "@/lib/settings";

export type ActionState = {
  ok?: boolean;
  error?: string;
  errors?: Record<string, string>;
  message?: string;
} | null;

const GENERIC_LOGIN_ERROR = "البريد الإلكتروني أو كلمة المرور غير صحيحة";

function databaseErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 3; depth += 1) {
    if (!current || typeof current !== "object") return undefined;
    const shaped = current as { code?: unknown; cause?: unknown };
    if (typeof shaped.code === "string") return shaped.code;
    current = shaped.cause;
  }
  return undefined;
}

function logAuthFailure(flow: "login" | "register", error: unknown) {
  const name = error instanceof Error ? error.name : "UnknownError";
  console.error(`[auth:${flow}] operation failed`, { name, code: databaseErrorCode(error) });
}

function isUniqueViolation(error: unknown) {
  return databaseErrorCode(error) === "23505";
}

/* ───────────────────────── Login ───────────────────────── */

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return { error: "أدخل البريد الإلكتروني وكلمة المرور بشكل صحيح" };

  const { email, password } = parsed.data;
  let destination = "/dashboard";

  try {
    const ip = await getClientIp();

    // Layer 1: per-IP throttle (slows down distributed guessing from one source)
    const ipLimit = await rateLimit({ key: `login:ip:${ip}`, limit: 20, windowSec: 900, blockSec: 900 });
    if (!ipLimit.ok) {
      return { error: `محاولات دخول كثيرة جدًا من هذا الجهاز. حاول مرة أخرى بعد ${humanRetry(ipLimit.retryAfterSec)}.` };
    }
    // Layer 2: per-account throttle (stops brute force on a single account)
    const idLimit = await rateLimit({ key: `login:id:${email}`, limit: 5, windowSec: 900, blockSec: 900 });
    if (!idLimit.ok) {
      await audit("login.rate_limited", { meta: { email } });
      return { error: `تم تجاوز عدد المحاولات المسموح بها لهذا الحساب. حاول بعد ${humanRetry(idLimit.retryAfterSec)}.` };
    }

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user || !user.passwordHash) {
      await burnPasswordTiming(password); // keep response time constant
      return { error: GENERIC_LOGIN_ERROR };
    }

    // Layer 3: account lockout after repeated failures
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      return { error: `تم قفل الحساب مؤقتًا بسبب محاولات فاشلة متكررة. حاول بعد ${mins} دقيقة.` };
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      const attempts = user.failedLoginAttempts + 1;
      const lockMinutes = attempts >= 10 ? 60 : attempts >= 5 ? 15 : 0;
      await db
        .update(users)
        .set({
          failedLoginAttempts: attempts,
          lockedUntil: lockMinutes ? new Date(Date.now() + lockMinutes * 60_000) : null,
        })
        .where(eq(users.id, user.id));
      await audit("login.failed", { userId: user.id, meta: { attempts } });
      return { error: GENERIC_LOGIN_ERROR };
    }

    if (user.isBanned) return { error: "تم حظر هذا الحساب. تواصل مع الدعم الفني." };
    if (!user.isActive) return { error: "هذا الحساب موقوف مؤقتًا. تواصل مع الدعم الفني." };

    const settings = await getSettings();
    const promote = isBootstrapAdminEmail(email) && user.role !== "admin";

    await db
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ip,
        updatedAt: new Date(),
        ...(promote ? { role: "admin" as const } : {}),
      })
      .where(eq(users.id, user.id));

    await clearRateLimit(`login:id:${email}`);
    await createSession(user.id, Number(settings.max_devices) || 2);
    await audit("login.success", { userId: user.id });

    const staff = promote || user.role === "admin" || user.role === "assistant";
    destination = safeRedirectPath(parsed.data.next, staff ? "/admin" : "/dashboard");
  } catch (error) {
    logAuthFailure("login", error);
    return { error: "تعذر إتمام تسجيل الدخول حاليًا. حاول مرة أخرى بعد قليل." };
  }

  redirect(destination);
}

/* ───────────────────────── Register ───────────────────────── */

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const settings = await getSettings();
  if (!settingBool(settings.allow_registration)) {
    return { error: "التسجيل مغلق حاليًا. تواصل مع الإدارة." };
  }

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    parentPhone: formData.get("parentPhone"),
    grade: formData.get("grade"),
    governorate: formData.get("governorate") ?? "",
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    website: formData.get("website") ?? "",
  });
  if (!parsed.success) {
    return { error: "راجع البيانات المدخلة", errors: fieldErrors(parsed.error) };
  }
  if (parsed.data.website) {
    // Honeypot filled by a bot – pretend failure without details.
    return { error: "حدث خطأ غير متوقع. حاول مرة أخرى لاحقًا." };
  }

  const { name, email, phone, parentPhone, grade, governorate, password } = parsed.data;
  let destination = "/dashboard?welcome=1";
  let userCreated = false;

  try {
    const ip = await getClientIp();
    const rl = await rateLimit({ key: `register:ip:${ip}`, limit: 5, windowSec: 3600, blockSec: 3600 });
    if (!rl.ok) {
      return { error: `تم إنشاء حسابات كثيرة من هذا الجهاز. حاول بعد ${humanRetry(rl.retryAfterSec)}.` };
    }

    const existing = await db
      .select({ email: users.email, phone: users.phone })
      .from(users)
      .where(or(eq(users.email, email), eq(users.phone, phone)))
      .limit(1);
    if (existing[0]) {
      const errors: Record<string, string> = {};
      if (existing[0].email === email) errors.email = "هذا البريد مسجل بالفعل";
      if (existing[0].phone === phone) errors.phone = "رقم الهاتف مسجل بالفعل";
      return { error: "البريد الإلكتروني أو رقم الهاتف مسجل بالفعل", errors };
    }

    const passwordHash = await hashPassword(password);
    const role = isBootstrapAdminEmail(email) ? "admin" : "student";

    let created: { id: string } | undefined;
    try {
      [created] = await db
        .insert(users)
        .values({
          name,
          email,
          phone,
          parentPhone,
          grade,
          governorate: governorate || null,
          passwordHash,
          role,
          lastLoginAt: new Date(),
          lastLoginIp: ip,
        })
        .returning({ id: users.id });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return { error: "البريد الإلكتروني أو رقم الهاتف مسجل بالفعل" };
      }
      throw error;
    }

    if (!created) throw new Error("Registration insert returned no user id");
    userCreated = true;
    await audit("user.registered", { userId: created.id, meta: { grade } });
    await createSession(created.id, Number(settings.max_devices) || 2);
    if (role === "admin") destination = "/admin";
  } catch (error) {
    logAuthFailure("register", error);
    return {
      error: userCreated
        ? "تم إنشاء الحساب، لكن تعذر تسجيل الدخول تلقائيًا. جرّب تسجيل الدخول الآن."
        : "تعذر إنشاء الحساب حاليًا. حاول مرة أخرى بعد قليل.",
    };
  }

  redirect(destination);
}

/* ───────────────────────── Logout ───────────────────────── */

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

/* ───────────────────────── Profile ───────────────────────── */

export async function completeProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/complete-profile");
  const parsed = completeProfileSchema.safeParse({
    phone: formData.get("phone"),
    parentPhone: formData.get("parentPhone"),
    grade: formData.get("grade"),
    governorate: formData.get("governorate") ?? "",
  });
  if (!parsed.success) return { error: "راجع البيانات المدخلة", errors: fieldErrors(parsed.error) };

  const taken = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.phone, parsed.data.phone), ne(users.id, user.id)))
    .limit(1);
  if (taken[0]) return { error: "رقم الهاتف مسجل بالفعل", errors: { phone: "رقم الهاتف مسجل بالفعل" } };

  await db
    .update(users)
    .set({
      phone: parsed.data.phone,
      parentPhone: parsed.data.parentPhone,
      grade: parsed.data.grade,
      governorate: parsed.data.governorate || null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  await audit("user.profile_completed", { userId: user.id });
  redirect("/dashboard?welcome=1");
}

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/dashboard/profile");
  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    parentPhone: formData.get("parentPhone"),
    grade: formData.get("grade"),
    governorate: formData.get("governorate") ?? "",
  });
  if (!parsed.success) return { error: "راجع البيانات المدخلة", errors: fieldErrors(parsed.error) };

  const taken = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.phone, parsed.data.phone), ne(users.id, user.id)))
    .limit(1);
  if (taken[0]) return { error: "رقم الهاتف مستخدم بواسطة حساب آخر", errors: { phone: "رقم الهاتف مستخدم" } };

  await db
    .update(users)
    .set({
      name: parsed.data.name,
      phone: parsed.data.phone,
      parentPhone: parsed.data.parentPhone,
      grade: parsed.data.grade,
      governorate: parsed.data.governorate || null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  revalidatePath("/dashboard/profile");
  return { ok: true, message: "تم حفظ البيانات بنجاح" };
}

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/dashboard/profile");
  const rl = await rateLimit({ key: `pwchange:${user.id}`, limit: 5, windowSec: 900, blockSec: 900 });
  if (!rl.ok) return { error: `محاولات كثيرة. حاول بعد ${humanRetry(rl.retryAfterSec)}.` };

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword") ?? "",
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: "راجع البيانات المدخلة", errors: fieldErrors(parsed.error) };

  if (user.passwordHash) {
    const ok = parsed.data.currentPassword
      ? await verifyPassword(parsed.data.currentPassword, user.passwordHash)
      : false;
    if (!ok) return { error: "كلمة المرور الحالية غير صحيحة", errors: { currentPassword: "غير صحيحة" } };
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await db
    .update(users)
    .set({ passwordHash: newHash, mustChangePassword: false, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  // Kill every other session for safety; keep the current one.
  const current = await currentSessionId();
  if (current) {
    await db.delete(sessions).where(and(eq(sessions.userId, user.id), ne(sessions.id, current)));
  }
  await audit("user.password_changed", { userId: user.id });
  revalidatePath("/dashboard/profile");
  return { ok: true, message: "تم تغيير كلمة المرور وتسجيل الخروج من الأجهزة الأخرى" };
}

export async function revokeSessionAction(formData: FormData) {
  const user = await requireUser("/dashboard/profile");
  const id = uuidSchema.safeParse(formData.get("sessionId"));
  if (!id.success) return;
  await db.delete(sessions).where(and(eq(sessions.id, id.data), eq(sessions.userId, user.id)));
  revalidatePath("/dashboard/profile");
}

export async function revokeOtherSessionsAction() {
  const user = await requireUser("/dashboard/profile");
  const current = await currentSessionId();
  if (current) {
    await db.delete(sessions).where(and(eq(sessions.userId, user.id), ne(sessions.id, current)));
  }
  await audit("user.sessions_revoked", { userId: user.id });
  revalidatePath("/dashboard/profile");
}
