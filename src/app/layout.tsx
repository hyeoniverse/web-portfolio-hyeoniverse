import type { Metadata, Viewport } from "next";
import type React from "react";
import { createHash } from "node:crypto";
import "@/styles/layers.css"; // 층 순서 선언 — 반드시 첫 CSS import(docs/design-system.md 4-2)
import "@/styles/global.css";
/* 한글 본문·UI 폰트 — 라틴 웹폰트들엔 한글 글리프가 없어 OS 기본 글꼴(맥 애플고딕/윈도우 맑은고딕)로
   떨어지던 것을 Pretendard 로 통일한다(#1158). dynamic subset 이라 쓰는 글자 조각만 내려받는다 */
import "@/styles/vendor/pretendard.css";
import {
  Inter,
  Playfair_Display,
  JetBrains_Mono,
  Space_Grotesk,
  Nanum_Myeongjo,
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
import { toSiteWideConfig } from "@/config/siteWideConfig";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { getPublicKeys } from "@/lib/getSecret";

import ScrollRestoration from "@/components/common/ScrollRestoration";
import { PageTransitionProvider } from "@/providers/PageTransitionProvider";
import { SYMBOL_FONT_FAMILY, SYMBOL_FONT_UNICODE_RANGE } from "@/config/symbolFont.generated";
// Vercel Web Analytics(방문 수) · Speed Insights(체감 성능) — 배포 환경에서만 스크립트를 싣는다(로컬은 콘솔 로그만)
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

/** 탭 아이콘 주소에 붙일 버전 — 아이콘은 브랜드 설정으로 그리니(/api/favicon) 그 값이 바뀔 때만 바뀐다.
 *  주소가 바뀌어야 브라우저가 들고 있던 예전 아이콘(캐시 1시간 · 사파리는 더 오래)을 버리고 새로 받는다 */
function faviconVersion(brand: unknown): string {
  return createHash("sha1").update(JSON.stringify(brand ?? {})).digest("hex").slice(0, 8);
}

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getSiteConfig();
  const siteName = cfg.metadata.title || "Hyeoniverse";
  const iconV = faviconVersion(cfg.brand);
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
    /* 서버 HTML 의 탭 아이콘 — 사파리가 쓰는 것. 사파리는 페이지가 뜬 뒤 JS 로 넣은 아이콘을 따르지 않고 SVG 를 못 그리는
       버전도 있어, 처음부터 PNG 를 걸어 둔다. 다른 브라우저는 FaviconSync(client)가 그 위에 SVG 를 얹어 바꾼다.
       사파리는 받은 아이콘을 오래 붙잡아 두므로, 브랜드 설정이 바뀌면 경로 안의 버전이 바뀌어 새 주소로 다시 받게 한다(api/favicon/v) */
    icons: {
      icon: [
        { url: `/api/favicon/v/${iconV}/light.png`, type: "image/png", sizes: "64x64", media: "(prefers-color-scheme: light)" },
        { url: `/api/favicon/v/${iconV}/dark.png`, type: "image/png", sizes: "64x64", media: "(prefers-color-scheme: dark)" },
      ],
      /* media 를 안 따르는 브라우저용 — 라이트 아이콘. 링크 없이 찾는 /favicon.ico · /apple-touch-icon.png 은 next.config 에서 */
      shortcut: `/api/favicon/v/${iconV}/light.png`,
      apple: { url: `/api/favicon/v/${iconV}/apple.png`, sizes: "180x180" },
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
/* -latin 접미사 변수들: next/font 값을 그대로 노출하지 않고 _typography.css 토큰에서
   한글 웹폰트를 뒤에 합성해 --font-playfair 등 원래 이름으로 다시 내보낸다(#1158).
   ThemeProvider 의 폰트 설정 override(inline setProperty/removeProperty)와도 안전하게 공존:
   override 는 토큰을 덮고, 기본값 복원은 토큰(한글 폴백 포함)으로 돌아온다. */
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-playfair-latin",
  /* swap — 장식 제목(About "Behind the Scenes" · 프로필 히어로)이 이 글꼴이어야 한다. optional 이면 첫 방문에
     늦게 온 글꼴을 버리고 대체 글꼴로 남아, 세리프가 아닌 글꼴로 보일 수 있었다(D26). 미리 받지는 않는다 */
  display: "swap",
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
/* 제목 · 장식 글자(--font-family-display)의 한글 — 나눔명조(D27). 영문 세리프와 짝을 맞춘다.
   한글 폰트는 슬라이스가 많아 preload 하지 않는다(unicode-range 로 필요한 조각만 요청됨) */
const serifKr = Nanum_Myeongjo({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-serif-kr",
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
      className={`${inter.variable} ${playfair.variable} ${jetbrains.variable} ${spaceGrotesk.variable} ${instrumentSerif.variable} ${serifKr.variable}`}
    >
      {/* favicon — 서버 HTML 에는 PNG(metadata.icons), 그 위에 FaviconSync(client)가 prefers-color-scheme 에 맞춰 SVG 를 건다 */}

      {/* 로고 기호 글꼴 — 브랜드 글꼴에 ✦ 같은 기호가 없어 탭 아이콘과 로고가 서로 다른 모양이던 것을
          같은 글꼴로 맞춘다(#1048). unicode-range 에 걸리는 기호를 실제로 쓸 때만 내려받는다 */}
      {/* href·precedence 를 줘야 React 가 이 style 을 문서 head 로 올린다. 없으면 "Cannot render a
          <style> outside the main document…" 로 콘솔에 에러가 난다(React 19 의 style 호이스팅 규칙) */}
      <style href="brand-symbol-font" precedence="default">{`@font-face{font-family:'${SYMBOL_FONT_FAMILY}';src:url(/api/brand-symbol-font) format('opentype');font-display:swap;unicode-range:${SYMBOL_FONT_UNICODE_RANGE};}`}</style>

      <body>
        <SiteConfigProvider initialConfig={toSiteWideConfig(config)} publicKeys={publicKeys}>
          <ThemeProvider>
            <FaviconSync version={faviconVersion(config.brand)} />
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
