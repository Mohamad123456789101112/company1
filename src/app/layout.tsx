import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { getSettings } from "@/lib/settings";
import { buildThemeCss } from "@/lib/theme";
import { normalizePreset } from "@/lib/animation";
import { AnimationProvider } from "@/components/animation";
import { ZoomControl } from "@/components/zoom-control";
import { BackToTop } from "@/components/back-to-top";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
    title: {
      default: `${s.site_name} | ${s.tagline}`,
      template: `%s | ${s.site_name}`,
    },
    description: `منصة ${s.teacher_name} لتدريس منهج الفيزياء للصفوف الثانوية`,
    keywords: [s.teacher_name, "فيزياء", "الصف الثالث الثانوي", "ثانوية عامة", "فيزياء ثانوية عامة"],
    applicationName: s.site_name,
    robots: { index: true, follow: true },
    openGraph: {
      title: s.site_name,
      description: s.hero_subtitle,
      type: "website",
      locale: "ar_EG",
      images: ["/images/og.jpg"],
    },
    icons: { icon: s.site_favicon || "/favicon.svg" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1020" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const s = await getSettings();
  const themeCss = buildThemeCss(s);
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning data-anim={normalizePreset(s.animation_preset)}>
      <head>
        {/* Arabic fonts are self-hosted in /public/fonts and declared in globals.css
            (@font-face) — no external request, works offline, CSP-tight. */}
        {/* Applies the saved theme before first paint to avoid a light→dark flash – instant (<10ms) via localStorage + <html class="dark">. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=document.documentElement;var t=localStorage.getItem("aj-theme");if(t==="dark"){r.classList.add("dark");r.style.colorScheme="dark";}var z=Number(localStorage.getItem("aj-zoom"));if(!(z>=70&&z<=150))z=100;if(z!==100&&window.matchMedia("(min-width: 768px)").matches){if(window.CSS&&CSS.supports&&CSS.supports("zoom","1")){r.style.setProperty("zoom",String(z/100));}else{r.style.fontSize=z+"%";}}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen font-sans">
        {themeCss && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}
        <AnimationProvider preset={s.animation_preset}>{children}</AnimationProvider>
        <ZoomControl />
        <BackToTop />
      </body>
    </html>
  );
}
