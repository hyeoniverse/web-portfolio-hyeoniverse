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
  Gowun_Dodum,
  Nanum_Gothic,
  Source_Code_Pro,
  IBM_Plex_Mono,
  Roboto_Mono,
  Inconsolata,
  Lora,
  EB_Garamond,
  Merriweather,
  Poppins,
  Nunito,
  Ubuntu_Mono,
  DM_Mono,
  Courier_Prime,
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
const gowunDodum = Gowun_Dodum({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-gowun-dodum",
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
const sourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-source-code-pro",
  display: "swap",
  preload: false,
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
  preload: false,
});
const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-roboto-mono",
  display: "swap",
  preload: false,
});
const inconsolata = Inconsolata({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inconsolata",
  display: "swap",
  preload: false,
});
const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-lora",
  display: "swap",
  preload: false,
});
const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-eb-garamond",
  display: "swap",
  preload: false,
});
const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-merriweather",
  display: "swap",
  preload: false,
});
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
  preload: false,
});
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-nunito",
  display: "swap",
  preload: false,
});
const ubuntuMono = Ubuntu_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-ubuntu-mono",
  display: "swap",
  preload: false,
});
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
  preload: false,
});
const courierPrime = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-courier-prime",
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
      className={`${inter.variable} ${playfair.variable} ${jetbrains.variable} ${spaceGrotesk.variable} ${instrumentSerif.variable} ${cormorant.variable} ${dmSans.variable} ${firaCode.variable} ${notoSerifKR.variable} ${nanumMyeongjo.variable} ${gowunBatang.variable} ${notoSansKR.variable} ${gothicA1.variable} ${ibmPlexSansKR.variable} ${nanumGothicCoding.variable} ${hahmlet.variable} ${gowunDodum.variable} ${nanumGothic.variable} ${sourceCodePro.variable} ${ibmPlexMono.variable} ${robotoMono.variable} ${inconsolata.variable} ${lora.variable} ${ebGaramond.variable} ${merriweather.variable} ${poppins.variable} ${nunito.variable} ${ubuntuMono.variable} ${dmMono.variable} ${courierPrime.variable}`}
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
