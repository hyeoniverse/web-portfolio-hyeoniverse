import type { Metadata, Viewport } from "next";
import type React from "react";
import "@/styles/global.css";
/* 한글 본문·UI 폰트 — 라틴 웹폰트들엔 한글 글리프가 없어 OS 기본 글꼴(맥 애플고딕/윈도우 맑은고딕)로
   떨어지던 것을 Pretendard 로 통일한다(#1158). dynamic subset 이라 쓰는 글자 조각만 내려받는다 */
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import {
  Inter,
  Playfair_Display,
  JetBrains_Mono,
  Space_Grotesk,
  Instrument_Serif,
  Noto_Serif_KR,
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
import { toSiteWideConfig } from "@/config/siteWideConfig";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { getPublicKeys } from "@/lib/getSecret";

import ScrollRestoration from "@/components/common/ScrollRestoration";
import { PageTransitionProvider } from "@/providers/PageTransitionProvider";
import { SYMBOL_FONT_FAMILY, SYMBOL_FONT_UNICODE_RANGE } from "@/config/symbolFont.generated";
// Vercel Web Analytics(방문 수) · Speed Insights(체감 성능) — 배포 환경에서만 스크립트를 싣는다(로컬은 콘솔 로그만)
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
    // icons 는 FaviconSync (client) 가 브라우저 prefers-color-scheme 에 맞춰 동적 교체 — metadata 에선 미설정
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
/* -latin 접미사 변수들: next/font 값을 그대로 노출하지 않고 _typography.css 토큰에서
   한글 웹폰트를 뒤에 합성해 --font-playfair 등 원래 이름으로 다시 내보낸다(#1158).
   ThemeProvider 의 폰트 설정 override(inline setProperty/removeProperty)와도 안전하게 공존:
   override 는 토큰을 덮고, 기본값 복원은 토큰(한글 폴백 포함)으로 돌아온다. */
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-playfair-latin",
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
  variable: "--font-space-grotesk-latin",
  // menu drawer / nav / posts 등 노출 빈도 높은 핵심 폰트 — fallback (system sans-serif)
  // 영구 표시 안 되도록 swap + preload (LCP 영향 < UI 일관성 손실 비용)
  display: "swap",
  preload: true,
});
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-instrument-latin",
  display: "swap",
});
/* 세리프 컨텍스트(포스트 카드·시리즈·태그 제목 등)의 한글 — Playfair·Instrument 뒤 폴백.
   한글 폰트는 슬라이스가 많아 preload 하지 않는다(unicode-range 로 필요한 조각만 요청됨) */
const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-noto-serif-kr",
  display: "swap",
  preload: false,
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
      className={`${inter.variable} ${playfair.variable} ${jetbrains.variable} ${spaceGrotesk.variable} ${instrumentSerif.variable} ${notoSerifKr.variable}`}
    >
      {/* favicon — FaviconSync(client) 가 브라우저 prefers-color-scheme 에 맞춰 /api/favicon 을 건다 */}

      {/* 로고 기호 글꼴 — 브랜드 글꼴에 ✦ 같은 기호가 없어 탭 아이콘과 로고가 서로 다른 모양이던 것을
          같은 글꼴로 맞춘다(#1048). unicode-range 에 걸리는 기호를 실제로 쓸 때만 내려받는다 */}
      {/* href·precedence 를 줘야 React 가 이 style 을 문서 head 로 올린다. 없으면 "Cannot render a
          <style> outside the main document…" 로 콘솔에 에러가 난다(React 19 의 style 호이스팅 규칙) */}
      <style href="brand-symbol-font" precedence="default">{`@font-face{font-family:'${SYMBOL_FONT_FAMILY}';src:url(/api/brand-symbol-font) format('opentype');font-display:swap;unicode-range:${SYMBOL_FONT_UNICODE_RANGE};}`}</style>

      <body>
        <SiteConfigProvider initialConfig={toSiteWideConfig(config)} publicKeys={publicKeys}>
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
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
