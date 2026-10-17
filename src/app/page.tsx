import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  LayoutList,
  MonitorPlay,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { WhatsAppButton } from "@/components/site/whatsapp";
import { CourseCard } from "@/components/course-card";
import { CountUp } from "@/components/home/counter";
import { CourseSlider } from "@/components/home/course-slider";
import { PricingCard, type PricingPlan } from "@/components/home/pricing";
import { Reveal } from "@/components/reveal";
import { getSettings } from "@/lib/settings";
import { getPublishedCourses, getTestimonials, getUserCourses } from "@/lib/data";
import { DEFAULT_TESTIMONIALS, ensureDefaultTestimonials } from "@/lib/default-testimonials";
import { getCurrentUser } from "@/lib/auth";
import { cn, formatNumber } from "@/lib/utils";
import { TestimonialsMarquee } from "@/components/home/testimonials-marquee";

export const dynamic = "force-dynamic";

const WHY = [
  { index: 1, title: "شرح بسيط ومفهوم", tone: "from-brand-500 to-brand-700" },
  { index: 2, title: "فيديوهات برسومات توضيحية", tone: "from-peach-400 to-peach-600" },
  { index: 3, title: "تمارين تفاعلية على الدروس", tone: "from-brand-400 to-fuchsia-500" },
  { index: 4, title: "مرونة كاملة في المذاكرة", tone: "from-sky-400 to-brand-500" },
  { index: 5, title: "اختبارات مستمرة", tone: "from-peach-400 to-rose-400" },
  { index: 6, title: "محتوى متكامل ومنظم", tone: "from-brand-500 to-brand-700" },
  { index: 7, title: "تحديث مستمر حسب المنهج", tone: "from-sky-400 to-brand-500" },
  { index: 8, title: "مجتمع طلابي ضخم", tone: "from-brand-400 to-fuchsia-500" },
];

const FEATURES = [
  { tone: "from-brand-500 to-brand-700", icon: LayoutList, title: "تنظيم الدروس والوحدات", desc: "كورسات مُقسّمة لوحدات صغيرة علشان تذاكر بترتيب وتِفضّل مُتابع بسهولة." },
  { tone: "from-peach-400 to-peach-600", icon: MonitorPlay, title: "دروس بالفيديو والصور التوضيحية", desc: "شروحات مصوّرة مُفصّلة مع رسومات توضيحية وأسئلة شائعة مُجاب عنها." },
  { tone: "from-brand-700 to-brand-900", icon: ClipboardCheck, title: "اختبارات وتقييم مستمر", desc: "امتحانات إلكترونية بعد كل درس بتصحيح فوري وتحليل لنقاط ضعفك قبل الامتحان." },
];

/** Decorative atom orbits. */
function Orbits({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-10", className)} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="32" cy="32" rx="24" ry="9" />
      <ellipse cx="32" cy="32" rx="24" ry="9" transform="rotate(60 32 32)" />
      <ellipse cx="32" cy="32" rx="24" ry="9" transform="rotate(120 32 32)" />
      <circle cx="32" cy="32" r="4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SectionHeading({ eyebrow, title, highlight, subtitle, align = "center" }: { eyebrow: string; title: string; highlight?: string; subtitle?: string; align?: "center" | "right" }) {
  return (
    <div className={cn("mb-12", align === "center" ? "text-center" : "text-center md:text-right")}>
      <Reveal from="down">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-bold text-brand-700"><Sparkles className="size-3.5 text-peach-500" /> {eyebrow}</span>
      </Reveal>
      <Reveal from={align === "center" ? "up" : "right"} delay={80}>
        <h2 className="section-title mt-4">
          {title} {highlight && <span className="gradient-text">{highlight}</span>}
        </h2>
      </Reveal>
      {subtitle && (
        <Reveal from="up" delay={160}>
          <p className={cn("mt-3 max-w-xl font-taj text-sm leading-7 text-slate-500", align === "center" && "mx-auto")}>{subtitle}</p>
        </Reveal>
      )}
    </div>
  );
}

export default async function HomePage() {
  const [s, user] = await Promise.all([getSettings(), getCurrentUser()]);
  await ensureDefaultTestimonials();
  const [featured, mine, reviewsFromDb] = await Promise.all([
    getPublishedCourses({ limit: 10 }),
    user ? getUserCourses(user.id) : Promise.resolve([]),
    getTestimonials(9).catch(() => []),
  ]);
  // قسم آراء الطلاب لازم يفضل ظاهر دايمًا: لو الجدول فاضي أو الداتابيز مش متوصلة
  // نعرض نسخة افتراضية بنفس الصور (وكلها قابلة للتعديل من لوحة التحكم → آراء الطلاب).
  const reviews =
    reviewsFromDb.length > 0
      ? reviewsFromDb
      : DEFAULT_TESTIMONIALS.map((t, i) => ({
          id: `default-testimonial-${i + 1}`,
          name: t.name,
          grade: t.grade,
          role: t.role,
          text: t.text,
          stars: t.stars,
          avatarUrl: t.avatarUrl,
          isPublished: true,
          orderIndex: t.orderIndex,
          createdAt: new Date(),
        }));
  const enrolledIds = new Set(mine.map((c) => c.id));
  const courses = featured.map((c) => {
    const m = mine.find((x) => x.id === c.id);
    return enrolledIds.has(c.id) ? { ...c, enrolled: true, progress: m?.progress ?? 0 } : c;
  });
  const heroLines = s.hero_title.split("..").map((l) => l.trim()).filter(Boolean);
  const defaultFeatureImgs = ["/images/feature-1.jpg", "/images/feature-2.jpg", "/images/feature-3.jpg"];
  const featureImg = (i: number) => [s.img_feature_1, s.img_feature_2, s.img_feature_3][i] || defaultFeatureImgs[i];
  const teacherShort = s.teacher_name.replace(/^م\/\s*/, "");

  const num = (v: string, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  const old = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const parseFeatures = (raw: string) =>
    raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => (l.startsWith("-") || l.startsWith("✕") || l.startsWith("x ") ? { text: l.replace(/^(-|✕|x\s)\s*/, ""), included: false } : { text: l.replace(/^(\+|✓)\s*/, ""), included: true }));
  const planDefs = [
    { key: "basic" as const, name: s.plan_basic_name, tagline: s.plan_basic_tagline, price: num(s.plan_basic_price, 150), oldPrice: old(s.plan_basic_old_price), cta: s.plan_basic_cta, features: parseFeatures(s.plan_basic_features) },
    { key: "premium" as const, name: s.plan_premium_name, tagline: s.plan_premium_tagline, price: num(s.plan_premium_price, 350), oldPrice: old(s.plan_premium_old_price), cta: s.plan_premium_cta, features: parseFeatures(s.plan_premium_features) },
    { key: "vip" as const, name: s.plan_vip_name, tagline: s.plan_vip_tagline, price: num(s.plan_vip_price, 750), oldPrice: old(s.plan_vip_old_price), cta: s.plan_vip_cta, features: parseFeatures(s.plan_vip_features) },
  ];
  const plans: PricingPlan[] = planDefs
    .filter((p) => p.name.trim() && Number(p.price) > 0)
    .map((p) => ({ ...p, period: s.plan_period, popular: s.plan_popular === p.key }));
  const showPricing = s.pricing_enabled !== "false" && plans.length > 0;

  return (
    <>
      <Navbar />
      <main>
        {/* ───────── Hero ───────── */}
        <section className="relative -mt-20 flex w-full items-center overflow-hidden bg-gradient-to-b from-lav-100 via-white to-white md:min-h-screen">
          <div className="dots-bg pointer-events-none absolute inset-0 opacity-70" />
          <div className="pointer-events-none absolute -left-32 top-24 size-[30rem] animate-blob rounded-full bg-brand-200/50 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 bottom-0 size-[24rem] animate-blob rounded-full bg-peach-200/50 blur-3xl [animation-delay:3s]" />

          <div className="section-gutter relative flex h-full w-full flex-col-reverse items-center justify-between pt-24 md:flex-row md:pt-20">
            <div className="relative z-10 flex basis-full items-center font-amin text-slate-900 md:basis-1/2">
              <div className="flex w-full flex-col space-y-8 px-0 text-center md:px-8 md:text-right">
                <Reveal from="right">
                  <span className="mx-auto inline-flex w-fit items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-1.5 text-xs font-bold text-brand-700 shadow-sm md:mx-0">
                    <Sparkles className="size-3.5 text-peach-500" /> {s.hero_badge}
                  </span>
                </Reveal>
                <Reveal from="right" delay={100}>
                  <h1 className="break-anywhere px-2 text-[2rem] font-bold !leading-[1.2] sm:px-6 sm:text-4xl md:px-0 md:text-3xl lg:text-4xl xl:text-6xl">
                    {heroLines.map((line, i) => (
                      <span key={i} className={i === 1 ? "gradient-text" : undefined}>
                        {line}
                        {i < heroLines.length - 1 && <br />}
                      </span>
                    ))}
                  </h1>
                </Reveal>
                <Reveal from="right" delay={200}>
                  <div className="mx-auto flex justify-center md:justify-start">
                    <h2 className="max-w-md px-4 font-taj text-base !leading-none md:px-0">
                      <span>
                        <span className="font-bold text-slate-800">{s.hero_welcome}</span>
                        <br />
                        <span className="text-sm leading-7 text-slate-500">{s.hero_subtitle}</span>
                      </span>
                    </h2>
                  </div>
                </Reveal>
                <Reveal from="up" delay={300}>
                  <div className="flex flex-wrap justify-center gap-3 md:justify-start">
                    <Link href={user ? "/dashboard" : "/register"} className="btn btn-primary shine w-full rounded-xl py-3.5 font-amin text-lg sm:w-[260px] md:text-base">
                      {user ? "روح لمذاكرتك !" : "اشترك دلوقتي !"}
                    </Link>
                    <Link href="/courses" className="btn btn-outline w-full rounded-xl py-3.5 font-amin sm:w-auto">
                      تصفح الكورسات <ArrowLeft className="size-4" />
                    </Link>
                  </div>
                </Reveal>
                <Reveal from="up" delay={400}>
                  <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-taj text-xs text-slate-500 md:justify-start">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-brand-500" /> حصة أولى مجانية</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-brand-500" /> تصحيح فوري</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-brand-500" /> متابعة ولي الأمر</span>
                  </div>
                </Reveal>
                {(Number(s.youtube_followers) > 0 || Number(s.facebook_followers) > 0) && (
                  <Reveal from="up" delay={500}>
                    <div className="flex w-full justify-around gap-4 border-t border-lav-200 pb-10 pt-8 text-brand-700 sm:justify-between sm:gap-6 md:gap-12 md:pb-0">
                      {Number(s.youtube_followers) > 0 && <CountUp from={0} to={Number(s.youtube_followers)} prefix="+" label="متابعين على اليوتيوب" />}
                      {Number(s.facebook_followers) > 0 && <CountUp from={0} to={Number(s.facebook_followers)} prefix="+" label="متابعين على الفيسبوك" />}
                    </div>
                  </Reveal>
                )}
              </div>
            </div>

            <div className="inset-0 flex basis-full items-center justify-center px-0 md:basis-1/2 lg:px-16">
              <Reveal from="left" className="relative max-w-sm py-10 md:max-w-2xl md:py-0">
                <div className="pointer-events-none absolute inset-x-8 bottom-0 top-16 rounded-full bg-gradient-to-b from-brand-200 to-white blur-2xl" />
                <div className="relative z-10 overflow-hidden rounded-[2.5rem] border-4 border-white shadow-[0_30px_60px_-25px_rgba(124,92,255,0.45)]">
                  <Image src={s.img_hero || "/images/teacher.jpg"} alt={s.teacher_name} width={900} height={900} priority unoptimized={s.img_hero.startsWith("/api/")} className="aspect-square h-auto w-full object-cover" />
                </div>
                {s.success_rate && Number(s.success_rate) > 0 && (
                  <div className="card animate-float absolute -right-2 top-16 z-20 hidden items-center gap-3 px-4 py-3 md:flex">
                    <span className="grid size-10 place-items-center rounded-xl bg-peach-50 text-peach-500"><Star className="size-5 fill-peach-400 text-peach-400" /></span>
                    <span>
                      <span className="block font-amin text-lg font-bold text-slate-900">{s.success_rate}%</span>
                      <span className="block text-[11px] text-slate-500">نسبة النجاح</span>
                    </span>
                  </div>
                )}
                {Number(s.exams_count) > 0 && (
                  <div className="card animate-float-delayed absolute -left-4 bottom-20 z-20 hidden items-center gap-3 px-4 py-3 md:flex">
                    <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><ClipboardCheck className="size-5" /></span>
                    <span>
                      <span className="block font-amin text-lg font-bold text-slate-900">+{s.exams_count}</span>
                      <span className="block text-[11px] text-slate-500">امتحان إلكتروني</span>
                    </span>
                  </div>
                )}
              </Reveal>
            </div>
          </div>
        </section>

        {/* ───────── Why subscribe (8 cards) ───────── */}
        <section id="why" className="relative py-16 md:py-24">
          <div className="section-gutter flex flex-col items-center">
            <div className="mb-10 w-full text-center md:mb-14 md:text-right">
              <Reveal from="right">
                <p className="text-xs font-bold tracking-widest text-peach-500">مميزات المنصة</p>
                <h2 className="mt-2 font-amin text-3xl font-bold leading-none md:text-5xl">ليه تشترك معانا؟</h2>
              </Reveal>
            </div>
            <div className="flex w-full justify-center">
              <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">
                {WHY.map((w, i) => (
                  <Reveal key={w.index} from={i % 2 === 0 ? "right" : "left"} delay={(i % 4) * 90} className={cn(w.index > 4 && "hidden sm:block")}>
                    <div className="group relative min-h-[220px] overflow-hidden rounded-2xl border border-lav-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-glow">
                      <div className={cn("absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-l", w.tone)} />
                      <div className={cn("pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-gradient-to-br opacity-10 blur-xl transition duration-500 group-hover:scale-150 group-hover:opacity-20", w.tone)} />
                      <div className="relative isolate h-full min-h-[220px] overflow-hidden p-6 text-slate-900 sm:p-7 md:p-8">
                        <Orbits className="pointer-events-none absolute left-6 top-6 size-12 text-brand-200 transition duration-500 group-hover:rotate-45 group-hover:text-peach-400" />
                        <div className={cn("absolute right-6 top-5 bg-gradient-to-br bg-clip-text font-amin text-4xl font-bold leading-none text-transparent md:text-5xl", w.tone)} dir="ltr">{String(w.index).padStart(2, "0")}</div>
                        <div className="absolute bottom-8 right-6 w-2/3 text-right font-amin text-xl font-bold leading-tight sm:text-2xl">{w.title}</div>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ───────── Courses slider ───────── */}
        <section id="courses" className="bg-lav-50 py-10">
          <div className="section-gutter flex flex-wrap items-center justify-between gap-3 py-8 font-amin font-bold">
            <Reveal from="right">
              <p className="text-xs font-bold tracking-widest text-peach-500">أحدث الكورسات</p>
              <div className="mt-1 text-xl sm:text-2xl md:text-[2rem]">كورساتنا المتاحة للعام {s.academic_year}</div>
            </Reveal>
            <Reveal from="left">
              <Link href="/courses" className="btn btn-dark rounded-xl px-8 py-3 md:px-12 md:py-4">الكل</Link>
            </Reveal>
          </div>
          <Reveal from="up" className="relative">
            {courses.length > 0 ? (
              <CourseSlider count={courses.length}>
                {courses.map((c) => (
                  <div key={c.id} className="slide !h-auto">
                    <CourseCard course={c} />
                  </div>
                ))}
              </CourseSlider>
            ) : (
              <div className="mx-6 flex items-center justify-center gap-2 rounded-2xl bg-white p-10 font-amin text-xl text-slate-900 md:mx-20">سيتم إضافة الكورسات قريبًا – تابعنا!</div>
            )}
          </Reveal>
        </section>

        {/* ───────── Features (3 cards) ───────── */}
        <section className="py-16">
          <div className="section-gutter mb-10 text-center md:text-right">
            <Reveal from="right">
              <p className="text-xs font-bold tracking-widest text-peach-500">نظام المذاكرة على المنصة</p>
              <h2 className="mt-2 font-amin text-2xl font-bold text-slate-900 sm:text-3xl md:text-4xl">إزاي بنخلّي الفيزياء <span className="gradient-text">لعبتنا مش عقدتنا؟</span></h2>
            </Reveal>
          </div>
          <div className="section-gutter grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 lg:gap-8">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} from={i === 0 ? "right" : i === 2 ? "left" : "up"} delay={i * 120} className="flex h-full min-w-0 flex-col space-y-2 md:space-y-4">
                <div className={cn("group relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-gradient-to-br smooth sm:rounded-2xl", f.tone)}>
                  <div className="grid-bg absolute inset-0 opacity-50" />
                  <Orbits className="absolute -left-6 -top-6 size-28 text-white/15 transition duration-700 group-hover:rotate-90 md:size-40" />
                  <div className="absolute inset-x-0 bottom-0 flex justify-center px-2 sm:px-4">
                    <div className="relative w-[82%] overflow-hidden rounded-t-[1.25rem] border-2 border-b-0 border-white/70 shadow-2xl transition duration-500 group-hover:-translate-y-1 group-hover:scale-[1.03] sm:rounded-t-[2rem] sm:border-4">
                      <Image src={featureImg(i)} alt={s.teacher_name} width={900} height={1125} sizes="(min-width: 1024px) 30vw, 33vw" unoptimized={featureImg(i).startsWith("/api/")} className="aspect-[4/5] w-full object-cover object-top" />
                    </div>
                  </div>
                  <span className="absolute left-2 top-2 grid size-7 place-items-center rounded-lg bg-white/15 text-white backdrop-blur sm:left-3 sm:top-3 sm:size-10 sm:rounded-xl"><f.icon className="size-4 sm:size-5" /></span>
                  <span className="absolute bottom-2 right-2 rounded-md bg-black/40 px-1.5 py-0.5 font-amin text-[9px] font-bold text-white backdrop-blur sm:bottom-3 sm:right-3 sm:px-2.5 sm:py-1 sm:text-xs">{s.teacher_name}</span>
                </div>
                <div className="flex flex-1 flex-col space-y-1.5 rounded-xl border border-lav-200 bg-white px-2 py-3 text-slate-900 shadow-[0_10px_30px_-18px_rgba(59,39,134,0.3)] smooth hover:border-brand-300 sm:rounded-2xl sm:space-y-2 md:px-4 md:py-5">
                  <span className="hidden size-10 place-items-center rounded-xl bg-brand-50 text-brand-600 sm:grid"><f.icon className="size-5" /></span>
                  <div className="font-amin text-[11px] font-bold leading-snug sm:text-sm md:text-base xl:text-xl">{f.title}</div>
                  <p className="font-taj text-[10px] leading-relaxed text-slate-500 sm:text-xs lg:text-sm xl:text-base">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ───────── Featured YouTube Lecture (Kirchhoff's 2nd Law) ───────── */}
        <section id="lecture" className="relative overflow-hidden bg-gradient-to-b from-lav-50 via-white to-lav-50 py-16 md:py-24">
          <div className="container-x">
            <SectionHeading
              eyebrow="جرب الشرح بنفسك – محاضرة مجانية كاملة"
              title="شرح قانون كيرشوف الثاني"
              highlight="مع البشمهندس محمد فوزي"
              subtitle="شاهد محاضرة شرح قانون كيرشوف الثاني للصف الثالث الثانوي 2027 وتعلّم إزاي تطبق قاعدة الإشارات وفروق الجهد (∑V = 0) على أصعب الدوائر الكهربية من غير لخبطة."
            />
            <div className="grid items-center gap-8 lg:grid-cols-12">
              <Reveal from="right" className="lg:col-span-7">
                <div className="overflow-hidden rounded-3xl border-4 border-white bg-slate-950 shadow-[0_30px_60px_-25px_rgba(124,92,255,0.45)]">
                  <div className="relative aspect-video w-full">
                    <iframe
                      src="https://www.youtube-nocookie.com/embed/WVZnXjXW0gs?rel=0"
                      title="شرح قانون كيرشوف الثاني | فيزياء تالتة ثانوي 2027 | البشمهندس محمد فوزي"
                      className="absolute inset-0 size-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                    />
                  </div>
                </div>
              </Reveal>
              <Reveal from="left" className="space-y-5 lg:col-span-5">
                <div className="card p-6 sm:p-8">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
                    <MonitorPlay className="size-3.5" /> فيزياء تالتة ثانوي 2027 • الفصل الأول
                  </span>
                  <h3 className="mt-3 font-amin text-2xl font-bold text-slate-900">هتتعلم إيه في المحاضرة دي؟</h3>
                  <ul className="mt-4 space-y-3 font-taj text-sm text-slate-700">
                    {[
                      "شرح قانون كيرشوف الثاني (قانون بقاء الطاقة) من الأساس بطريقة مبسطة.",
                      "فهم قاعدة المجموع الجبري لفروق الجهد في المسار المغلق (∑V = 0 و ∑VB = ∑I·R).",
                      "تحديد اتجاه الدوران وإشارات القوى الدافعة الكهربية وفروق الجهد على المقاومات بثقة.",
                      "تطبيق القانون عمليًا وحل أهم أنماط المسائل اللي بتتكرر في الامتحان خطوة بخطوة.",
                    ].map((point) => (
                      <li key={point} className="flex items-start gap-2.5">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-500" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex flex-wrap gap-3 pt-2">
                    <Link href="/courses/physics-3sec-2027-ch1" className="btn btn-primary rounded-xl px-6 py-3 font-amin">
                      افتح الكورس والامتحان التفاعلي <ArrowLeft className="size-4" />
                    </Link>
                    {s.youtube && (
                      <a href={s.youtube} target="_blank" rel="noopener noreferrer" className="btn btn-outline rounded-xl px-5 py-3 font-amin">
                        قناة اليوتيوب الرسمية
                      </a>
                    )}
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ───────── Testimonials ─────────
            Cards glide right→left directly on the site's original background —
            no floating overlay box, no theme-over-theme. */}
        {reviews.length > 0 && (
          <section id="testimonials" className="relative overflow-hidden py-16 md:py-24">
            <div className="container-x">
              <SectionHeading eyebrow="آراء الطلاب وأولياء الأمور" title="طلابنا" highlight="بيقولوا إيه؟" subtitle="تجارب حقيقية من طلاب المنصة في الصفوف الثلاثة وأولياء أمورهم." />
            </div>
            <Reveal from="up">
              <TestimonialsMarquee items={reviews.map((t) => ({ id: t.id, name: t.name, role: t.role, text: t.text, stars: t.stars, avatarUrl: t.avatarUrl }))} />
            </Reveal>
            <Reveal from="up" delay={150}>
              <div className="container-x mt-8 flex flex-wrap items-center justify-center gap-6 font-taj text-sm text-slate-600">
                <span className="flex items-center gap-1.5"><Star className="size-4 fill-peach-400 text-peach-400" /> آراء حقيقية من طلاب المنصة</span>
                {Number(s.students_count) > 0 && <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-brand-500" /> +{formatNumber(Number(s.students_count))} طالب مشترك</span>}
              </div>
            </Reveal>
          </section>
        )}

        {/* ───────── Pricing plans ───────── */}
        {showPricing && (
        <section id="pricing" className="relative overflow-hidden py-16 md:py-24">
          <div className="dots-bg pointer-events-none absolute inset-0 opacity-50" />
          <div className="pointer-events-none absolute -left-40 top-20 size-[26rem] rounded-full bg-brand-100/80 blur-3xl" />
          <div className="pointer-events-none absolute -right-40 bottom-10 size-[26rem] rounded-full bg-peach-100/80 blur-3xl" />
          <div className="container-x relative">
            <SectionHeading eyebrow="خطط الاشتراك" title={s.pricing_title.split(" ").slice(0, -1).join(" ")} highlight={s.pricing_title.split(" ").slice(-1)[0]} subtitle={s.pricing_subtitle} />
            <div className={cn("grid gap-8 pt-4 lg:gap-6", plans.length === 1 ? "mx-auto max-w-md" : plans.length === 2 ? "mx-auto max-w-4xl md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3")}>
              {plans.map((p, i) => (
                <Reveal key={p.key} from={i === 0 ? "right" : i === 2 ? "left" : "zoom"} delay={i * 120} className="h-full">
                  <PricingCard plan={p} href={user ? "/dashboard/wallet" : "/register"} />
                </Reveal>
              ))}
            </div>
            <Reveal from="up" delay={200}>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-taj text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-brand-500" /> تفعيل فوري بعد تأكيد الدفع</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-brand-500" /> حصة أولى مجانية قبل الاشتراك</span>
                {s.whatsapp && <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-brand-500" /> دعم فني عبر واتساب</span>}
              </div>
            </Reveal>
          </div>
        </section>
        )}

        {/* ───────── About (text right • teacher photo left) ───────── */}
        <section id="about" className="relative overflow-hidden py-20 md:py-28">
          <div className="pointer-events-none absolute -left-40 top-10 size-[28rem] rounded-full bg-brand-100/60 blur-3xl" />

          <div className="container-x relative grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            {/* text column (right in RTL) */}
            <div>
              <Reveal from="right">
                <span className="inline-flex items-center gap-2 rounded-full border border-peach-200 bg-peach-50 px-4 py-1.5 text-xs font-bold text-peach-700"><GraduationCap className="size-3.5" /> تعرّف على مدرسك</span>
                <h2 className="mt-4 font-amin text-4xl font-bold text-slate-900 lg:text-5xl">عن م/<span className="gradient-text">{teacherShort}</span></h2>
              </Reveal>
              <Reveal from="right" delay={120}>
                <p className="mt-5 font-taj text-base leading-8 text-slate-600">{s.about_bio}</p>
              </Reveal>
              <Reveal from="right" delay={220}>
                <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                  {[
                    "قناة يوتيوب +15.4 ألف متابع و+173 محاضرة بأكثر من 1.2 مليون مشاهدة",
                    "شرح يبدأ من الفكرة والأساس العلمي قبل حفظ القانون",
                    "حل تفصيلي لكتاب الامتحان ونماذج النظام الجديد خطوة بخطوة",
                    "امتحانات إلكترونية مستمرة ومتابعة للطالب وولي الأمر",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2.5 font-taj text-sm text-slate-700">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600"><CheckCircle2 className="size-4" /></span>
                      {t}
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal from="up" delay={340}>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href={user ? "/courses" : "/register"} className="btn btn-primary rounded-xl px-7 py-3">ابدأ مع {teacherShort} <Zap className="size-4 text-peach-200" /></Link>
                  <Link href="/#lecture" className="btn btn-outline rounded-xl px-7 py-3">شاهد محاضرة مجانية</Link>
                  {s.facebook && (
                    <a href={s.facebook} target="_blank" rel="noopener noreferrer" className="btn btn-ghost rounded-xl px-5 py-3">
                      صفحة الفيسبوك
                    </a>
                  )}
                </div>
              </Reveal>
            </div>

            {/* photo column (left in RTL) */}
            <Reveal from="left" className="relative mx-auto w-full max-w-md lg:max-w-lg">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] border-4 border-white bg-gradient-to-b from-lav-100 via-brand-100 to-brand-200 shadow-[0_30px_60px_-30px_rgba(124,92,255,0.45)]">
                <Image src={s.img_about || "/images/teacher-about.jpg"} alt={s.teacher_name} width={928} height={1152} sizes="(min-width: 1024px) 40vw, 90vw" unoptimized={s.img_about.startsWith("/api/")} className="h-full w-full object-cover object-top" />
              </div>
              <div className="absolute -bottom-5 right-6 rounded-2xl border border-lav-200 bg-white px-5 py-3 font-amin shadow-[0_12px_30px_-14px_rgba(59,39,134,0.3)]">
                <p className="text-lg font-bold leading-none text-slate-900">{s.teacher_name}</p>
                <p className="mt-1 text-xs font-bold text-brand-600">مدرس الفيزياء للثانوية العامة • الفيزياء لعبتنا مش عقدتنا ⚡</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ───────── CTA ───────── */}
        <section className="container-x pb-12">
          <Reveal from="zoom">
            <div className="relative overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-l from-brand-50 via-white to-peach-50 px-8 py-12 text-center">
              <div className="dots-bg absolute inset-0 opacity-50" />
              <div className="relative">
                <h2 className="font-amin text-2xl font-bold text-slate-900 sm:text-3xl">جاهز تبدأ رحلتك مع الفيزياء؟</h2>
                <p className="mx-auto mt-3 max-w-xl font-taj text-sm leading-7 text-slate-500">أول حصة في كل كورس مجانية – جرّب أسلوب الشرح بنفسك قبل ما تشترك.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link href={user ? "/dashboard" : "/register"} className="btn btn-primary shine rounded-xl px-8 py-3">{user ? "روح لمذاكرتك" : "أنشئ حسابك الآن"}</Link>
                  {s.whatsapp && <a href={`https://wa.me/${s.whatsapp}`} target="_blank" rel="noopener noreferrer" className="btn btn-accent rounded-xl px-8 py-3">كلمنا واتساب</a>}
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
