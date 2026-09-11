"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { BREAKPOINT } from "@/constants";
import { useIsMobile } from "@/hooks/useIsMobile";
import { ChevronDown, ChevronUp } from "@/components/icons";
import Pressable from "@/components/ui/Pressable";
import styles from "./PostsSidebar.module.css";
import { useLanguage } from "@/providers/LanguageProvider";

/* /posts 우측 사이드바 — sticky + 자체 세로 스크롤. 위젯(TagCloud3D·PopularPosts 등)은 children 으로 받는다.
   barHidden(필터바가 스크롤로 숨은 상태)이면 그만큼 위로 붙는다(sidebarUp). */
export default function PostsSidebar({
  barHidden,
  children,
}: {
  barHidden: boolean;
  children: ReactNode;
}) {
  const { t } = useLanguage();
  const { isMobile: isCollapsed } = useIsMobile(BREAKPOINT.tablet);
  const ref = useRef<HTMLElement>(null);
  const [canUp, setCanUp] = useState(false);
  const [canDown, setCanDown] = useState(false);

  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanUp(el.scrollTop > 4);
    setCanDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, [check]);

  // fade 의 chevron: 짧게 클릭 → 한 화면(약 70%) 스크롤, 롱프레스(꾹) → 누르는 동안 연속 스크롤.
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const holdRaf = useRef<number | undefined>(undefined);
  const longPressed = useRef(false);

  const stopHold = useCallback(() => {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = undefined; }
    if (holdRaf.current) { cancelAnimationFrame(holdRaf.current); holdRaf.current = undefined; }
  }, []);

  // 누르기 시작 — 300ms 넘게 유지되면 연속 스크롤 시작(그 전에 떼면 일반 클릭으로 처리)
  const pressStart = useCallback((dir: 1 | -1) => {
    longPressed.current = false;
    holdTimer.current = setTimeout(() => {
      longPressed.current = true;
      const step = () => {
        const el = ref.current;
        if (!el) return;
        el.scrollTop += dir * 12; // 프레임당 연속 이동
        holdRaf.current = requestAnimationFrame(step);
      };
      holdRaf.current = requestAnimationFrame(step);
    }, 300);
  }, []);

  const handleClick = useCallback((dir: 1 | -1) => {
    if (longPressed.current) { longPressed.current = false; return; } // 롱프레스였으면 클릭 스크롤 스킵
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ top: dir * el.clientHeight * 0.7, behavior: "smooth" });
  }, []);

  useEffect(() => stopHold, [stopHold]); // 언마운트 시 타이머/rAF 정리

  const btnHandlers = (dir: 1 | -1) => ({
    onPointerDown: () => pressStart(dir),
    onPointerUp: stopHold,
    onPointerLeave: stopHold,
    onPointerCancel: stopHold,
    onClick: () => handleClick(dir),
  });

  return (
    <div
      className={`${styles.sidebarWrap} ${barHidden ? styles.sidebarUp : ""}`}
    >
      {canUp && (
        <div className={styles.sidebarFadeTop}>
          <Pressable
            noTapScale
            className={styles.sidebarScrollBtn}
            {...btnHandlers(-1)}
            aria-label={t("postsPage.scrollUp")}
            data-clickable="true"
          >
            <ChevronUp size={14} />
          </Pressable>
        </div>
      )}
      <aside
        ref={ref}
        aria-label={t("postsPage.sidebarLabel")}
        className={styles.sidebar}
        {...(!isCollapsed && { "data-lenis-prevent": true })}
      >
        {children}
      </aside>
      {canDown && (
        <div className={styles.sidebarFadeBottom}>
          <Pressable
            noTapScale
            className={styles.sidebarScrollBtn}
            {...btnHandlers(1)}
            aria-label={t("postsPage.scrollDown")}
            data-clickable="true"
          >
            <ChevronDown size={14} />
          </Pressable>
        </div>
      )}
    </div>
  );
}
