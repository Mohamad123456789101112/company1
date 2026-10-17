import type { NextRequest } from "next/server";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { adminSnapshot, studentSnapshot } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Server-Sent Events stream.
 * Pushes `change` events (with the latest notification) whenever the user's
 * snapshot fingerprint changes – approvals, new exams, unlocked content,
 * notifications. The client refreshes the current route on each change.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const scope = req.nextUrl.searchParams.get("scope") === "admin" && isStaff(user) ? "admin" : "student";
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      let last = "";
      try {
        const snap = scope === "admin" ? await adminSnapshot() : await studentSnapshot(user.id);
        last = snap.fingerprint;
        send("ready", { scope, ts: Date.now() });
      } catch {
        send("ready", { scope, ts: Date.now() });
      }

      const started = Date.now();
      const MAX_MS = 55_000; // stay under serverless limits; the client reconnects automatically
      const tick = async () => {
        if (closed) return;
        if (Date.now() - started > MAX_MS) {
          send("reconnect", {});
          closed = true;
          try {
            controller.close();
          } catch {
            /* already closed */
          }
          return;
        }
        try {
          const snap = scope === "admin" ? await adminSnapshot() : await studentSnapshot(user.id);
          if (snap.fingerprint !== last) {
            last = snap.fingerprint;
            send("change", scope === "admin" ? { pending: (snap as Awaited<ReturnType<typeof adminSnapshot>>).pending, latest: (snap as Awaited<ReturnType<typeof adminSnapshot>>).latest } : { unread: (snap as Awaited<ReturnType<typeof studentSnapshot>>).unread, latest: (snap as Awaited<ReturnType<typeof studentSnapshot>>).latest });
          } else {
            send("ping", { ts: Date.now() });
          }
        } catch {
          send("ping", { ts: Date.now() });
        }
        if (!closed) setTimeout(tick, 4000);
      };
      setTimeout(tick, 4000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      });
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
