"use client";

import { useState, useEffect, useCallback } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useIsMobile } from "@/hooks/useIsMobile";
import styles from "./Footer.module.css";

/**
 * PC / 모바일 모드 전환 — viewport meta 오버라이드 방식.
 * · PC 모드: width=1280 → 모바일 브라우저가 데스크톱 레이아웃을 렌더(미디어쿼리·useIsMobile 모두 따라옴)
 * · 모바일 모드: width=device-width (기본)
 * 현재 모드의 반대를 버튼으로 노출. localStorage 로 유지(새로고침 후에도).
 * (데스크톱 브라우저는 viewport width 를 무시하므로 모바일 기기에서 주로 동작)
 */
const KEY = "view-mode";
const PC_VIEWPORT = "width=1280";
const MOBILE_VIEWPORT = "width=device-width, initial-scale=1";

function applyViewport(mode: "pc" | "mobile") {
  let meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "viewport");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", mode === "pc" ? PC_VIEWPORT : MOBILE_VIEWPORT);
}

export default function ViewModeToggle({ forceShow = false }: { forceShow?: boolean }) {
  const { language } = useLanguage();
  const { isMobile, isTouch } = useIsMobile();
  const [forced, setForced] = useState<"pc" | "mobile" | null>(null);

  useEffect(() => {
    const saved = (typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null) as "pc" | "mobile" | null;
    if (saved === "pc" || saved === "mobile") {
      setForced(saved);
      applyViewport(saved);
    }
  }, []);

  // 현재 적용 모드: 강제값 우선, 없으면 화면 너비 기준
  const currentMode: "pc" | "mobile" = forced ?? (isMobile ? "mobile" : "pc");
  // 버튼이 전환할 대상 = 현재의 반대
  const target: "pc" | "mobile" = currentMode === "mobile" ? "pc" : "mobile";

  const toggle = useCallback(() => {
    setForced(target);
    try { localStorage.setItem(KEY, target); } catch { /* noop */ }
    applyViewport(target);
  }, [target]);

  // 터치 기기(모바일/태블릿)에서만 노출 — 데스크톱은 viewport 오버라이드가 무효라 의미 없음.
  // isTouch 는 viewport 폭이 아닌 pointer:coarse 기준이라 PC 모드로 전환해도 계속 표시됨(되돌리기 가능).
  // forceShow: design-system 등 showcase 에서 데스크톱에서도 컴포넌트를 볼 수 있게 게이트 무시.
  if (!isTouch && !forceShow) return null;

  const label = target === "pc"
    ? (language === "ko" ? "PC 모드" : "Desktop mode")
    : (language === "ko" ? "모바일 모드" : "Mobile mode");

  return (
    <button type="button" className={styles.viewModeBtn} onClick={toggle} title={label} aria-label={label}>
      {target === "pc" ? <Monitor size={13} strokeWidth={1.8} /> : <Smartphone size={13} strokeWidth={1.8} />}
      <span>{label}</span>
    </button>
  );
}
