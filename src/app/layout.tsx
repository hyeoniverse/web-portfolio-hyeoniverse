import type { Metadata } from "next";
import type React from "react";
import "@/styles/global.css";
import {
  Inter,
  Playfair_Display,
  JetBrains_Mono,
  Space_Grotesk,
  Instrument_Serif,
  Cormorant_Garamond,
  DM_Sans,
  Fira_Code,
  Noto_Serif_KR,
  Nanum_Myeongjo,
  Gowun_Batang,
  Noto_Sans_KR,
  Gothic_A1,
  IBM_Plex_Sans_KR,
  Nanum_Gothic_Coding,
  Hahmlet,
  Sunflower,
  Gowun_Dodum,
  Song_Myung,
  Diphylleia,
  Grandiflora_One,
  Nanum_Gothic,
  Do_Hyeon,
  Jua,
  Dongle,
  Orbit,
} from "next/font/google";

import LoadingScreen from "@/components/layout/LoadingScreen";
import Navigation from "@/components/layout/Navigation";
import PageTransitionOverlay from "@/components/layout/PageTransitionOverlay";
import Modal from "@/components/ui/Modal";
import ContactDrawerWrapper from "@/components/layout/ContactDrawer/ContactDrawerWrapper";
import CursorTrail from "@/components/effects/CursorTrail";
import Footer from "@/components/layout/Footer";

import { LenisProvider } from "@/providers/LenisProvider";
import RecaptchaProvider from "@/providers/RecaptchaProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { LanguageProvider } from "@/providers/LanguageProvider";
import { SiteConfigProvider } from "@/providers/SiteConfigProvider";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { getPublicKeys } from "@/lib/getSecret";

import FaviconSwitcher from "@/components/common/FaviconSwitcher";
import ScrollRestoration from "@/components/common/ScrollRestoration";
import BGMController from "@/components/common/BGMController";
import VisitTracker from "@/components/common/VisitTracker";
import SettingsSync from "@/components/common/SettingsSync";

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getSiteConfig();
  const siteName = cfg.metadata.title;
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

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-playfair",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-instrument",
  display: "swap",
});
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  variable: "--font-cormorant",
  display: "swap",
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});
const firaCode = Fira_Code({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-fira-code",
  display: "swap",
});
const notoSerifKR = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-serif-kr",
  display: "swap",
  preload: false,
});
const nanumMyeongjo = Nanum_Myeongjo({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-nanum-myeongjo",
  display: "swap",
  preload: false,
});
const gowunBatang = Gowun_Batang({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-gowun-batang",
  display: "swap",
  preload: false,
});
const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-noto-sans-kr",
  display: "swap",
  preload: false,
});
const gothicA1 = Gothic_A1({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-gothic-a1",
  display: "swap",
  preload: false,
});
const ibmPlexSansKR = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans-kr",
  display: "swap",
  preload: false,
});
const nanumGothicCoding = Nanum_Gothic_Coding({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-nanum-gothic-coding",
  display: "swap",
  preload: false,
});
const hahmlet = Hahmlet({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-hahmlet",
  display: "swap",
  preload: false,
});
const sunflower = Sunflower({
  weight: ["300", "500", "700"],
  variable: "--font-sunflower",
  display: "swap",
});
const gowunDodum = Gowun_Dodum({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-gowun-dodum",
  display: "swap",
  preload: false,
});
const songMyung = Song_Myung({
  weight: ["400"],
  variable: "--font-song-myung",
  display: "swap",
});
const diphylleia = Diphylleia({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-diphylleia",
  display: "swap",
  preload: false,
});
const grandifloraOne = Grandiflora_One({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-grandiflora-one",
  display: "swap",
  preload: false,
});
const nanumGothic = Nanum_Gothic({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  variable: "--font-nanum-gothic",
  display: "swap",
  preload: false,
});
const doHyeon = Do_Hyeon({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-do-hyeon",
  display: "swap",
  preload: false,
});
const jua = Jua({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-jua",
  display: "swap",
  preload: false,
});
const dongle = Dongle({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-dongle",
  display: "swap",
  preload: false,
});
const orbit = Orbit({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-orbit",
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
      className={`${inter.variable} ${playfair.variable} ${jetbrains.variable} ${spaceGrotesk.variable} ${instrumentSerif.variable} ${cormorant.variable} ${dmSans.variable} ${firaCode.variable} ${notoSerifKR.variable} ${nanumMyeongjo.variable} ${gowunBatang.variable} ${notoSansKR.variable} ${gothicA1.variable} ${ibmPlexSansKR.variable} ${nanumGothicCoding.variable} ${hahmlet.variable} ${sunflower.variable} ${gowunDodum.variable} ${songMyung.variable} ${diphylleia.variable} ${grandifloraOne.variable} ${nanumGothic.variable} ${doHyeon.variable} ${jua.variable} ${dongle.variable} ${orbit.variable}`}
    >
      <head>
        <link rel="icon" href="/favicon-light.ico" />
      </head>

      <body>
        <SiteConfigProvider initialConfig={config} publicKeys={publicKeys}>
          <ThemeProvider>
            <LanguageProvider>
              <RecaptchaProvider>
                <LenisProvider>
                <Navigation />
                <main>{children}</main>
                <Footer />

                <aside>
                  <FaviconSwitcher />
                  <ScrollRestoration />
                  <BGMController />
                  <LoadingScreen />
                  <PageTransitionOverlay />
                  <Modal />
                  <ContactDrawerWrapper />
                  <CursorTrail />
                  <VisitTracker />
                  <SettingsSync />
                </aside>
                </LenisProvider>
              </RecaptchaProvider>
            </LanguageProvider>
          </ThemeProvider>
        </SiteConfigProvider>
      </body>
    </html>
  );
}
