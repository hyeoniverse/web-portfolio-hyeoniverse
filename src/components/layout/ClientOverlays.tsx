"use client";

import dynamic from "next/dynamic";
import LoadingScreen from "@/components/layout/LoadingScreen";

const PageTransitionOverlay = dynamic(() => import("@/components/layout/PageTransitionOverlay"), { ssr: false });
const Modal = dynamic(() => import("@/components/ui/Modal"), { ssr: false });
const ToastContainer = dynamic(() => import("@/components/ui/Toast"), { ssr: false });
const ContactDrawerWrapper = dynamic(() => import("@/components/layout/ContactDrawer/ContactDrawerWrapper"), { ssr: false });
const CursorTrail = dynamic(() => import("@/components/effects/CursorTrail"), { ssr: false });
// FaviconSwitcher 제거 — FaviconSync (ThemeProvider 안) 가 동적 favicon 처리 (theme + siteConfig 기반)
const BGMController = dynamic(() => import("@/components/common/BGMController"), { ssr: false });
const VisitTracker = dynamic(() => import("@/components/common/VisitTracker"), { ssr: false });
const SettingsSync = dynamic(() => import("@/components/common/SettingsSync"), { ssr: false });

export default function ClientOverlays() {
  return (
    <aside>
      <LoadingScreen />
      <PageTransitionOverlay />
      <Modal />
      <ToastContainer />
      <ContactDrawerWrapper />
      <CursorTrail />
      <BGMController />
      <VisitTracker />
      <SettingsSync />
    </aside>
  );
}
