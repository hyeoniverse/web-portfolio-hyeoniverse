"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./StickyGlassBar.module.css";

/**
 * 공통 sticky glass 헤더 바 — 에디터 topBar 와 동일 패턴을 공통화.
 *
 * 스크롤해서 사이트 nav(--header-height) 아래에 pin 되면 glass frost 가 페이드인:
 *   - 위(top): nav 영역까지 확장(-header-height) → nav 뒤로 frost 가 깔림
 *   - 양옆(left/right): 뷰포트 끝까지 full-bleed(100vw)
 *   - 아래(bottom): mask 로 페이드아웃 → 콘텐츠로 자연스럽게 사라짐
 * pin 되기 전(자연 위치)엔 frost 를 숨겨(opacity:0) 일반 in-flow 바처럼 보인다.
 *
 * 사용: 필터/검색 바, 액션 바 등 admin 목록/편집 페이지의 sticky 헤더.
 *   <StickyGlassBar className={shell.filterBar}> ...filters... </StickyGlassBar>
 * className 은 안쪽 바에 붙어 레이아웃(flex 등)을 담당.
 */
export default function StickyGlassBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const [pinned, setPinned] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const s = sentinelRef.current;
      if (!s) return;
      const header =
        parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-height")) || 64;
      // sentinel(바 자연 위치)이 nav 아래 라인에 닿으면 pin
      setPinned(s.getBoundingClientRect().top <= header + 0.5);
    };
    update();
    // scroll 은 버블 안 하므로 capture=true — 중첩 스크롤 컨테이너까지 잡음
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <>
      <div ref={sentinelRef} className={styles.sentinel} aria-hidden />
      <div className={`${styles.bar}${pinned ? ` ${styles.pinned}` : ""}${className ? ` ${className}` : ""}`}>
        {children}
      </div>
    </>
  );
}
