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
  display: "optional",
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
