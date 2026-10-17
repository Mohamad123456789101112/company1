import { getSettings } from "@/lib/settings";
import { getSupportSettings, supportLinks } from "@/lib/support";
import { TelegramIcon, WhatsAppIcon } from "@/components/icons";

/**
 * Floating support button(s) (bottom-left in RTL), with a soft pulse ring
 * and hover tooltips. Respects mobile safe-area insets.
 *
 * Fully managed from the dashboard (teacher_admin + super_admin):
 * show/hide, WhatsApp / Telegram / both, numbers and welcome message.
 * Falls back to the legacy platform whatsapp number when unset.
 */
export async function WhatsAppButton() {
  const [s, support] = await Promise.all([getSettings(), getSupportSettings()]);
  if (!support.enabled) return null;

  const effective = {
    ...support,
    // getSettings() already merges support numbers, so the platform values
    // below are the teacher's numbers when set, else the legacy defaults.
    whatsapp: support.whatsapp || s.whatsapp.replace(/\D/g, ""),
    telegram: support.telegram,
  };
  const links = supportLinks(effective);
  // Legacy fallback: platform whatsapp number with the default greeting.
  if (!links.whatsapp && !links.telegram && s.whatsapp.replace(/\D/g, "").length >= 10) {
    links.whatsapp = `https://wa.me/${s.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("السلام عليكم، عندي استفسار بخصوص المنصة")}`;
  }
  if (!links.whatsapp && !links.telegram) return null;

  const base =
    "group pointer-events-auto z-40 grid size-14 place-items-center rounded-full text-white transition hover:scale-110 focus:outline-none focus-visible:ring-4 active:scale-95";
  const pos = { left: "max(1rem, env(safe-area-inset-left))" } as const;

  // Single channel → one circular button (identical placement to before).
  if ((links.whatsapp && !links.telegram) || (links.telegram && !links.whatsapp)) {
    const isWa = Boolean(links.whatsapp);
    return (
      <a
        href={links.whatsapp ?? links.telegram}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={isWa ? "تواصل معنا عبر واتساب" : "تواصل معنا عبر تيليجرام"}
        className={`fixed ${base} ${isWa ? "bg-[#25D366] shadow-[0_12px_30px_-8px_rgba(37,211,102,0.75)] hover:bg-[#1fb857] focus-visible:ring-[#25D366]/40" : "bg-[#229ED9] shadow-[0_12px_30px_-8px_rgba(34,158,217,0.75)] hover:bg-[#1b8bc0] focus-visible:ring-[#229ED9]/40"}`}
        style={{ ...pos, bottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <span aria-hidden="true" className={`absolute inset-0 -z-10 animate-ping rounded-full [animation-duration:2.2s] ${isWa ? "bg-[#25D366]/50" : "bg-[#229ED9]/50"}`} />
        {isWa ? <WhatsAppIcon className="size-7" /> : <TelegramIcon className="size-7" />}
        <span className="pointer-events-none absolute left-full top-1/2 ms-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white opacity-0 shadow-xl transition group-hover:opacity-100 dark:bg-white dark:text-slate-900">
          {isWa ? "تواصل معنا واتساب" : "تواصل معنا تيليجرام"}
        </span>
      </a>
    );
  }

  // Both channels → stacked pair.
  return (
    <div className="pointer-events-none fixed z-40 flex flex-col gap-3" style={{ ...pos, bottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
      {links.telegram && (
        <a
          href={links.telegram}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="تواصل معنا عبر تيليجرام"
          className={`${base} bg-[#229ED9] shadow-[0_12px_30px_-8px_rgba(34,158,217,0.75)] hover:bg-[#1b8bc0] focus-visible:ring-[#229ED9]/40`}
        >
          <TelegramIcon className="size-7" />
          <span className="pointer-events-none absolute left-full top-1/2 ms-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white opacity-0 shadow-xl transition group-hover:opacity-100 dark:bg-white dark:text-slate-900">
            تواصل معنا تيليجرام
          </span>
        </a>
      )}
      {links.whatsapp && (
        <a
          href={links.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="تواصل معنا عبر واتساب"
          className={`${base} bg-[#25D366] shadow-[0_12px_30px_-8px_rgba(37,211,102,0.75)] hover:bg-[#1fb857] focus-visible:ring-[#25D366]/40`}
        >
          <span aria-hidden="true" className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366]/50 [animation-duration:2.2s]" />
          <WhatsAppIcon className="size-7" />
          <span className="pointer-events-none absolute left-full top-1/2 ms-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white opacity-0 shadow-xl transition group-hover:opacity-100 dark:bg-white dark:text-slate-900">
            تواصل معنا واتساب
          </span>
        </a>
      )}
    </div>
  );
}
