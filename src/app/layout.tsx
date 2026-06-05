import type { Metadata, Viewport } from "next";
import type React from "react";
import "@/styles/global.css";
import {
  Inter,
  Playfair_Display,
  JetBrains_Mono,
  Space_Grotesk,
  Instrument_Serif,
} from "next/font/google";
// 나머지 25개 옵션 폰트는 ThemeProvider의 loadGoogleFont()으로 동적 로드

import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import ClientOverlays from "@/components/layout/ClientOverlays";

import { LenisProvider } from "@/providers/LenisProvider";
import RecaptchaProvider from "@/providers/RecaptchaProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import FaviconSync from "@/components/layout/FaviconSync";
import { LanguageProvider } from "@/providers/LanguageProvider";
import { SiteConfigProvider } from "@/providers/SiteConfigProvider";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { getPublicKeys } from "@/lib/getSecret";

import ScrollRestoration from "@/components/common/ScrollRestoration";
import { PageTransitionProvider } from "@/providers/PageTransitionProvider";

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getSiteConfig();
  const siteName = cfg.metadata.title || "Hyeoniverse";
  return {
    title: {
      default: siteName,
      template: `${siteName} | %s`,
    },
    description: cfg.metadata.description,
    keywords: cfg.metadata.keywords,
    authors: [{ name: cfg.metadata.author }],
    creator: cfg.metadata.author,
    openGraph: {
      title: siteName,
      description: cfg.metadata.description,
      type: "website",
      locale: cfg.metadata.locale,
      siteName,
    },
    twitter: {
      card: "summary_large_image",
      title: siteName,
      description: cfg.metadata.description,
    },
    robots: {
      index: true,
      follow: true,
    },
    // icons 는 FaviconSync (client) 가 site theme 에 맞춰 동적으로 교체 — metadata 에선 미설정
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f6f0" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1a15" },
  ],
};

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-inter",
  display: "optional",
  preload: false,
});
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-playfair",
  display: "optional",
  preload: false,
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  /* swap — web font 가 로드되면 항상 적용 (optional 이면 늦게 로드 시 fallback 영구 표시 → 폰트 크기 일관성 깨짐).
     fallback 으로 size-adjusted 시스템 mono 지정해 swap 직전·직후 메트릭 차이 최소화 */
  display: "swap",
  fallback: ["SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"],
  adjustFontFallback: true,
  preload: false,
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-space-grotesk",
  // menu drawer / nav / posts 등 노출 빈도 높은 핵심 폰트 — fallback (system sans-serif)
  // 영구 표시 안 되도록 swap + preload (LCP 영향 < UI 일관성 손실 비용)
  display: "swap",
  preload: true,
});
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-instrument",
  display: "swap",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [config, publicKeys] = await Promise.all([getSiteConfig(), getPublicKeys()]);

  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${inter.variable} ${playfair.variable} ${jetbrains.variable} ${spaceGrotesk.variable} ${instrumentSerif.variable}`}
    >
      {/* favicon — src/app/icon.tsx 가 siteConfig 기반 다이내믹 생성 (Next 자동 주입) */}

      <body>
        <SiteConfigProvider initialConfig={config} publicKeys={publicKeys}>
          <ThemeProvider>
            <FaviconSync />
            <LanguageProvider>
              <RecaptchaProvider>
                <LenisProvider>
                <PageTransitionProvider>
                <Navigation />
                <main suppressHydrationWarning>{children}</main>
                <Footer />
                </PageTransitionProvider>

                <ScrollRestoration />
                <ClientOverlays />
                </LenisProvider>
              </RecaptchaProvider>
            </LanguageProvider>
          </ThemeProvider>
        </SiteConfigProvider>
      </body>
    </html>
  );
}
