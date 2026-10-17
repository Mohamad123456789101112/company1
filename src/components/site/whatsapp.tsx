import { getSettings } from "@/lib/settings";
import { WhatsAppIcon } from "@/components/icons";

/**
 * Floating circular WhatsApp button (bottom-left in RTL), with a soft pulse ring
 * and a hover tooltip. Respects mobile safe-area insets.
 */
export async function WhatsAppButton() {
  const s = await getSettings();
  if (!s.whatsapp) return null;
  return (
    <a
      href={`https://wa.me/${s.whatsapp}?text=${encodeURIComponent("السلام عليكم، عندي استفسار بخصوص المنصة")}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل معنا عبر واتساب"
      className="group fixed z-40 grid size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_12px_30px_-8px_rgba(37,211,102,0.75)] transition hover:scale-110 hover:bg-[#1fb857] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/40 active:scale-95"
      style={{ left: "max(1rem, env(safe-area-inset-left))", bottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
    >
      <span aria-hidden="true" className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366]/50 [animation-duration:2.2s]" />
      <WhatsAppIcon className="size-7" />
      <span className="pointer-events-none absolute left-full top-1/2 ms-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white opacity-0 shadow-xl transition group-hover:opacity-100 dark:bg-white dark:text-slate-900">
        تواصل معنا واتساب
      </span>
    </a>
  );
}
