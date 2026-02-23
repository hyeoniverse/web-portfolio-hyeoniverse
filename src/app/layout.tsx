import type { Metadata } from "next";
import type React from "react";
import "@/styles/global.css";
import {
  Inter,
  Playfair_Display,
  JetBrains_Mono,
  Space_Grotesk,
  Instrument_Serif,
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

import FaviconSwitcher from "@/components/common/FaviconSwitcher";
import ScrollRestoration from "@/components/common/ScrollRestoration";
import BGMController from "@/components/common/BGMController";
import VisitTracker from "@/components/common/VisitTracker";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getSiteConfig();

  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${inter.variable} ${playfair.variable} ${jetbrains.variable} ${spaceGrotesk.variable} ${instrumentSerif.variable}`}
    >
      <head>
        <link rel="icon" href="/favicon-light.ico" />
      </head>

      <body>
        <SiteConfigProvider initialConfig={config}>
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
