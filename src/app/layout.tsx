import type { Metadata } from "next";
import type React from "react";
import "@/styles/global.css";
import { siteConfig } from "@/config/site.config";
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

import { LenisProvider } from "@/providers/LenisProvider";
import RecaptchaProvider from "@/providers/RecaptchaProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { LanguageProvider } from "@/providers/LanguageProvider";

import FaviconSwitcher from "@/components/common/FaviconSwitcher";
import ScrollRestoration from "@/components/common/ScrollRestoration";

export const metadata: Metadata = {
  title: siteConfig.metadata.title,
  description: siteConfig.metadata.description,
  keywords: siteConfig.metadata.keywords,
  authors: [{ name: siteConfig.metadata.author }],
  creator: siteConfig.metadata.author,
  openGraph: {
    title: siteConfig.metadata.title,
    description: siteConfig.metadata.description,
    type: "website",
    locale: siteConfig.metadata.locale,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.metadata.title,
    description: siteConfig.metadata.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${inter.variable} ${playfair.variable} ${jetbrains.variable} ${spaceGrotesk.variable} ${instrumentSerif.variable}`}
    >
      <head>
        <link rel="icon" href="/favicon-light.ico" />
      </head>

      <body>
        <ThemeProvider>
          <LanguageProvider>
            <RecaptchaProvider>
              <LenisProvider>
                <Navigation />
                <main>{children}</main>

                <aside>
                  <FaviconSwitcher />
                  <ScrollRestoration />
                  <LoadingScreen />
                  <PageTransitionOverlay />
                  <Modal />
                  <ContactDrawerWrapper />
                  <CursorTrail />
                </aside>
              </LenisProvider>
            </RecaptchaProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
