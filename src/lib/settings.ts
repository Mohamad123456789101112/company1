import "server-only";
import { cache } from "react";
import { db } from "@/db";
import { settings } from "@/db/schema";

export const DEFAULT_SETTINGS = {
  site_name: "منصة البشمهندس محمد فوزي للفيزياء",
  teacher_name: "م/ محمد فوزي",
  tagline: "فيزياء الثانوية العامة – بأسلوب بسيط وممتع",
  hero_badge: "البشمهندس محمد فوزي – فيزياء 3 ثانوي 2027",
  hero_title: "منصتك الأولى لتعلم..وفهم الفيزياء مع البشمهندس..محمد فوزي",
  hero_welcome: "اهلاً بيك في بيتك التاني!",
  hero_subtitle:
    "سواء كنت في أولى أو تانية أو تالتة ثانوي، هنا هتلاقي شرح الفيزياء كامل بأسلوب البشمهندس محمد فوزي اللي عرفته على يوتيوب – بس أعمق، وبامتحانات إلكترونية، ومتابعة حقيقية.",
  about_bio:
    "البشمهندس محمد فوزي – مدرس فيزياء للمرحلة الثانوية، صاحب قناة Eng:mohamed fawzi على يوتيوب (+15 ألف متابع و+170 فيديو شرح بأكثر من مليون مشاهدة). أسلوبه يبدأ من الفكرة قبل القانون، ويركّز على التطبيق وحل أسئلة النظام الجديد حتى تبقى الفيزياء لعبة في إيدك.",
  academic_year: "2027",
  img_hero: "/images/teacher.jpg",
  img_about: "/images/teacher-cut.webp",
  img_feature_1: "/images/teacher.jpg",
  img_feature_2: "/images/teacher.jpg",
  img_feature_3: "/images/teacher.jpg",
  img_auth: "/images/teacher-cut.webp",
  auth_quote: "النجاح مش صدفة… هو مذاكرة يومية، وثقة في نفسك، ومُعلّم يمشي معاك الطريق خطوة بخطوة.",
  auth_quote_author: "م/ محمد فوزي",
  youtube_followers: "15400",
  facebook_followers: "0",
  students_count: "0",
  videos_count: "173",
  exams_count: "0",
  success_rate: "",
  whatsapp: "",
  phone: "",
  facebook: "",
  instagram: "",
  youtube: "https://www.youtube.com/@mohamed.fawzi7645",
  telegram: "",
  tiktok: "https://tiktok.com",
  vodafone_cash_number: "",
  instapay_address: "",
  payment_instructions:
    "حوّل المبلغ على رقم فودافون كاش أو عنوان إنستاباي الموضح، ثم سجّل طلب الشحن برقم الهاتف المحوّل منه وسيتم تأكيده خلال ساعات.",
  plan_basic_name: "الباقة الأساسية",
  plan_basic_price: "150",
  plan_basic_old_price: "200",
  plan_premium_name: "باقة بريميوم",
  plan_premium_price: "350",
  plan_premium_old_price: "500",
  plan_vip_name: "باقة VIP",
  plan_vip_price: "750",
  plan_vip_old_price: "1000",
  plan_period: "شهريًا",
  pricing_enabled: "true",
  pricing_title: "اختار الباقة اللي تناسبك",
  pricing_subtitle: "ابدأ بالباقة الأساسية أو خد الباقة الكاملة بمتابعة شخصية… وكلها بتتفعّل فورًا بعد تأكيد الدفع.",
  plan_basic_tagline: "للبداية الصح",
  plan_basic_cta: "ابدأ بالأساسية",
  plan_basic_features: "كورس واحد من اختيارك\nمشاهدة الحصص بلا حدود\nامتحانات إلكترونية بتصحيح فوري\nملخصات PDF للكورس\n-مجموعة تليجرام للمتابعة\n-جلسات مراجعة لايف\n-متابعة شخصية مع المستر",
  plan_premium_tagline: "الأفضل قيمة",
  plan_premium_cta: "اشترك في بريميوم",
  plan_premium_features: "كل كورسات صفك الدراسي\nمشاهدة الحصص بلا حدود\nامتحانات + بنك أسئلة شامل\nملخصات ومذكرات PDF كاملة\nمجموعة تليجرام للمتابعة\nجلسات مراجعة لايف شهرية\n-متابعة شخصية مع المستر",
  plan_vip_tagline: "تجربة كاملة",
  plan_vip_cta: "انضم لـ VIP",
  plan_vip_features: "كل كورسات صفك + المراجعات النهائية\nمشاهدة الحصص بلا حدود\nامتحانات + تحليل نقاط الضعف\nملخصات ومذكرات PDF كاملة\nمجموعة واتساب خاصة مع المستر\nجلسات مراجعة لايف أسبوعية\nمتابعة شخصية وتقرير لولي الأمر",
  plan_popular: "premium",
  bunny_library_id: "",
  bunny_api_key: "",
  bunny_cdn_hostname: "",
  ai_provider: "none",
  ai_model: "",
  ai_api_key: "",
  ai_auto_approve: "false",
  ai_min_confidence: "85",
  checkout_instructions:
    "حوّل قيمة الكورس بالضبط على رقم فودافون كاش الموضح، ثم أدخل رقم العملية (المرجع) وارفع صورة واضحة لإيصال التحويل. تتم مراجعة الطلب وتفعيل الكورس خلال ساعات، أو فورًا عند نجاح التحقق الآلي.",
  max_devices: "2",
  allow_registration: "true",
  announcement_bar: "",
  developer_name: "محمد النواوي",
  developer_url: "",
  footer_text: "المنصة الرسمية للبشمهندس محمد فوزي لتدريس الفيزياء للثانوية العامة – شرح، امتحانات إلكترونية، ومتابعة مستمرة.",
} as const;

export type SettingsKey = keyof typeof DEFAULT_SETTINGS;
export type SiteSettings = Record<SettingsKey, string>;

export const getSettings = cache(async (): Promise<SiteSettings> => {
  const merged: Record<string, string> = { ...DEFAULT_SETTINGS };
  try {
    const rows = await db.select().from(settings);
    for (const row of rows) {
      if (row.key in DEFAULT_SETTINGS) merged[row.key] = row.value;
    }
  } catch {
    // Database not ready yet – fall back to defaults so the site still renders.
  }
  return merged as SiteSettings;
});

/** Strips secrets before sending settings to client components. */
export function publicSettings(s: SiteSettings): SiteSettings {
  return {
    ...s,
    ai_api_key: s.ai_api_key ? "••••••••" + s.ai_api_key.slice(-4) : "",
    bunny_api_key: s.bunny_api_key ? "••••••••" + s.bunny_api_key.slice(-4) : "",
  };
}

export function bunnyConfigured(s: SiteSettings) {
  return Boolean(s.bunny_library_id && s.bunny_api_key);
}

export function settingBool(value: string | undefined, fallback = true) {
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}
