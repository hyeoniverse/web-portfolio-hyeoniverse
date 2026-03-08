"use client";

import dynamic from "next/dynamic";

const LoadingScreen = dynamic(() => import("@/components/layout/LoadingScreen"), { ssr: false });
const PageTransitionOverlay = dynamic(() => import("@/components/layout/PageTransitionOverlay"), { ssr: false });
const Modal = dynamic(() => import("@/components/ui/Modal"), { ssr: false });
const ContactDrawerWrapper = dynamic(() => import("@/components/layout/ContactDrawer/ContactDrawerWrapper"), { ssr: false });
const CursorTrail = dynamic(() => import("@/components/effects/CursorTrail"), { ssr: false });
const FaviconSwitcher = dynamic(() => import("@/components/common/FaviconSwitcher"), { ssr: false });
const BGMController = dynamic(() => import("@/components/common/BGMController"), { ssr: false });
const VisitTracker = dynamic(() => import("@/components/common/VisitTracker"), { ssr: false });
const SettingsSync = dynamic(() => import("@/components/common/SettingsSync"), { ssr: false });

export default function ClientOverlays() {
  return (
    <aside>
      <LoadingScreen />
      <PageTransitionOverlay />
      <Modal />
      <ContactDrawerWrapper />
      <CursorTrail />
      <FaviconSwitcher />
      <BGMController />
      <VisitTracker />
      <SettingsSync />
    </aside>
  );
}
