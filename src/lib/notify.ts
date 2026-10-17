import "server-only";
import { db } from "@/db";
import { notifications } from "@/db/schema";

type NotifyType = "info" | "success" | "warning" | "payment" | "exam" | "course";

export async function notify(userId: string, opts: { title: string; body?: string; type?: NotifyType; href?: string | null }) {
  try {
    await db.insert(notifications).values({
      userId,
      title: opts.title.slice(0, 160),
      body: (opts.body ?? "").slice(0, 600),
      type: opts.type ?? "info",
      href: opts.href ?? null,
    });
  } catch {
    /* notifications must never break the main flow */
  }
}
