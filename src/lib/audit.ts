import "server-only";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { getClientIp } from "./security";

export async function audit(
  action: string,
  opts: {
    userId?: string | null;
    targetType?: string;
    targetId?: string;
    meta?: Record<string, unknown>;
  } = {},
) {
  try {
    const ip = await getClientIp();
    await db.insert(auditLogs).values({
      action,
      userId: opts.userId ?? null,
      targetType: opts.targetType,
      targetId: opts.targetId,
      meta: opts.meta ?? null,
      ip,
    });
  } catch {
    // Never let auditing break the main flow.
  }
}
