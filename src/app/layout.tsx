import type { Metadata } from "next";
import type React from "react";
import "@/styles/global.css";
import { siteConfig } from "@/config/site.config";
import {
  IBM_Plex_Mono,
  Inter,
  Playfair_Display,
  JetBrains_Mono,
  Bebas_Neue,
  Space_Grotesk,
  Cormorant_Garamond,
  Abril_Fatface,
  Instrument_Serif,
} from "next/font/google";

import LoadingScreen from "@/components/layout/LoadingScreen";
import Nav from "@/components/layout/Nav";
import Modal from "@/components/ui/Modal";
import CursorTrail from "@/components/effects/CursorTrail";
import { LenisProvider } from "@/providers/LenisProvider";

import FaviconSwitcher from "@/components/common/FaviconSwitcher";
import ActionButtons from "@/components/common/ActionButtons/ActionButtons";
import SideNavigation from "@/components/layout/SideNavigation";
import ScrollIndicator from "@/components/layout/ScrollIndicator";
import Footer from "@/components/layout/Footer";
import ScrollRestoration from "@/components/common/ScrollRestoration";
import SectionTransition from "@/components/effects/SectionTransition";

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

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ibm-plex",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
});
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-playfair",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-jetbrains",
});
const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-bebas",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-cormorant",
});
const abril = Abril_Fatface({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-abril",
});
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-instrument",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${ibmPlexMono.variable} ${inter.variable} ${playfair.variable} ${jetbrains.variable} ${bebas.variable} ${spaceGrotesk.variable} ${cormorant.variable} ${abril.variable} ${instrumentSerif.variable}`}
    >
      <head>
        <link rel="icon" href="/favicon-light.ico" />
      </head>

      <body>
        <LenisProvider>
          <Nav />
          <main>{children}</main>

          <aside>
            <FaviconSwitcher />
            <ScrollRestoration />
            <LoadingScreen />
            <Modal />
            <CursorTrail />
          </aside>
        </LenisProvider>
      </body>
    </html>
  );
}
