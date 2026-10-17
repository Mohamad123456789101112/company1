import type { Grade } from "@/db/schema";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const GRADES: Record<Grade, { label: string; short: string; color: string; emoji: string }> = {
  first_secondary: { label: "الصف الأول الثانوي", short: "1 ثانوي", color: "from-tomato-500 to-tomato-700", emoji: "1️⃣" },
  second_secondary: { label: "الصف الثاني الثانوي", short: "2 ثانوي", color: "from-sakr-500 to-sakr-700", emoji: "2️⃣" },
  third_secondary: { label: "الصف الثالث الثانوي", short: "3 ثانوي", color: "from-gray-800 to-black", emoji: "3️⃣" },
};

export const GRADE_KEYS = Object.keys(GRADES) as Grade[];

export function isGrade(value: unknown): value is Grade {
  return typeof value === "string" && value in GRADES;
}

export function gradeLabel(grade: Grade | null | undefined) {
  return grade ? GRADES[grade].label : "غير محدد";
}

export function formatPrice(egp: number) {
  if (egp === 0) return "مجاني";
  return `${egp.toLocaleString("ar-EG")} جنيه`;
}

/** Money amounts (wallet, payments) – never rendered as "مجاني". */
export function formatMoney(egp: number) {
  return `${egp.toLocaleString("ar-EG")} جنيه`;
}

export function formatNumber(n: number) {
  return n.toLocaleString("ar-EG");
}

export const APP_TZ = "Africa/Cairo";

export function formatDate(d: Date | string | null | undefined, withTime = false) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: APP_TZ,
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
/** Arabic-Indic / Persian digits → Latin digits. */
export function normalizeDigits(s: string) {
  return s.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d))).replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));
}

/** Offset (minutes east of UTC) of a time zone at a given instant. */
export function tzOffsetMinutes(date: Date, tz = APP_TZ): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" }).formatToParts(date).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = name.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!m) return 0;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/** Parses a `datetime-local` value ("YYYY-MM-DDTHH:mm") as Cairo wall-clock time → UTC Date. */
export function parseLocalDateTime(value: string | null | undefined, tz = APP_TZ): Date | null {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let result = guess - tzOffsetMinutes(new Date(guess), tz) * 60_000;
  const off2 = tzOffsetMinutes(new Date(result), tz);
  if (guess - off2 * 60_000 !== result) result = guess - off2 * 60_000;
  return new Date(result);
}

/** Formats a Date as a `datetime-local` input value in Cairo time. */
export function toLocalInputValue(d: Date | null | undefined, tz = APP_TZ): string {
  if (!d) return "";
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hh = g("hour") === "24" ? "00" : g("hour");
  return `${g("year")}-${g("month")}-${g("day")}T${hh}:${g("minute")}`;
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} د`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} س ${m} د` : `${h} س`;
}

export function timeAgo(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "الآن";
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  if (diff < 86400 * 30) return `منذ ${Math.floor(diff / 86400)} يوم`;
  return formatDate(date);
}

export function slugify(input: string) {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const latinOnly = base.replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 7);
  return latinOnly.length >= 3 ? `${latinOnly}-${suffix}` : `course-${suffix}`;
}

export function maskPhone(phone: string | null | undefined) {
  if (!phone) return "—";
  return phone.replace(/^(\d{3})\d{5}(\d{3})$/, "$1•••••$2");
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
}

/* ───────── Video helpers (server side only derives embed URLs) ───────── */

export type VideoProvider = "youtube" | "vimeo" | "bunny" | "drive";

export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([A-Za-z0-9_-]{11})/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube-nocookie\.com\/embed\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  if (/^[A-Za-z0-9_-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

export function buildEmbedUrl(provider: VideoProvider | null, url: string | null): string | null {
  if (!provider || !url) return null;
  const trimmed = url.trim();
  switch (provider) {
    case "youtube": {
      const id = extractYouTubeId(trimmed);
      return id
        ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&disablekb=1&fs=1&cc_load_policy=0&color=white`
        : null;
    }
    case "vimeo": {
      const m = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/) ?? trimmed.match(/^(\d+)$/);
      return m ? `https://player.vimeo.com/video/${m[1]}?dnt=1&title=0&byline=0&portrait=0` : null;
    }
    case "drive": {
      const m = trimmed.match(/\/d\/([A-Za-z0-9_-]+)/) ?? trimmed.match(/[?&]id=([A-Za-z0-9_-]+)/);
      return m ? `https://drive.google.com/file/d/${m[1]}/preview` : null;
    }
    case "bunny": {
      // Accept full embed URL: https://iframe.mediadelivery.net/embed/{library}/{videoId}
      const m = trimmed.match(/iframe\.mediadelivery\.net\/(?:embed|play)\/(\d+)\/([A-Za-z0-9-]+)/);
      return m ? `https://iframe.mediadelivery.net/embed/${m[1]}/${m[2]}?autoplay=false&preload=true` : null;
    }
    default:
      return null;
  }
}

export function isSafeHttpUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
