"use client";

import { useEffect, useState } from "react";
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
const CustomFontsLoader = dynamic(() => import("@/components/common/CustomFontsLoader"), { ssr: false });

/**
 * 화면 위에 겹쳐 뜨는 것들.
 *
 * 여기 있는 것은 대부분 조작해야 비로소 쓰인다 — 문의 서랍은 "Get in Touch" 를 눌러야,
 * 모달과 토스트는 무언가 띄워야, 배경음은 켜야 나온다. 그런데 전부 화면이 뜨자마자
 * 내려받고 있었다. 문의 서랍만 64 KiB 다.
 *
 * 그래서 로딩 화면과 페이지 전환만 곧바로 올리고, 나머지는 화면이 자리를 잡은 뒤
 * 한가한 틈에 올린다. 늦게 올라와도 문제가 없는 이유는 이것들이 모두 스토어의 값을 보고
 * 그리기 때문이다 — 올라오기 전에 토스트를 띄우면 스토어에 쌓여 있다가 그려진다.
 */
export default function ClientOverlays() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let idle = 0;
    /* 화면에 필요한 것들을 다 받은 뒤(load) 한가한 틈에 올린다.
       load 를 기다리지 않고 유휴 시점만 보면, 표지 그림처럼 화면에 보이는 것과
       회선을 두고 다투게 된다(재 보니 가장 큰 요소가 800ms 늦어졌다). */
    const start = () => {
      idle = "requestIdleCallback" in window
        ? requestIdleCallback(() => setReady(true), { timeout: 2000 })
        : (setTimeout(() => setReady(true), 300) as unknown as number);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      if (idle && "cancelIdleCallback" in window) cancelIdleCallback(idle);
      else if (idle) clearTimeout(idle);
    };
  }, []);

  return (
    <aside>
      <LoadingScreen />
      <PageTransitionOverlay />
      {ready && (
        <>
          <Modal />
          <ToastContainer />
          <ContactDrawerWrapper />
          <CursorTrail />
          <BGMController />
          <VisitTracker />
          <SettingsSync />
          <CustomFontsLoader />
        </>
      )}
    </aside>
  );
}
