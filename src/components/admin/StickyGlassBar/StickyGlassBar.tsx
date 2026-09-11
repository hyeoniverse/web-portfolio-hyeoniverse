"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./StickyGlassBar.module.css";

/* 화면에 떠 있는 인스턴스 수. 마지막 하나가 사라질 때만 --sticky-bar-h 를 지운다 —
   하나가 unmount 될 때 무조건 지우면 아직 떠 있는 다른 바의 높이까지 없어진다. */
let liveBars = 0;

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
  const [pushed, setPushed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  /* 이 바의 실제 높이를 --sticky-bar-h 로 알린다.
     아래에 겹쳐 붙는 sticky 요소(일괄 선택 바 등)가 top 을 계산하는 데 쓴다.
     고정값을 쓰면 안 된다 — 이 바는 flex-wrap 이라 좁은 화면에서 두 줄 이상으로 늘어나고,
     그때 아래 바가 이 바 뒤로 깔려 버린다. */
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const publish = () => {
      document.documentElement.style.setProperty("--sticky-bar-h", `${Math.round(bar.getBoundingClientRect().height)}px`);
    };
    liveBars += 1;
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(bar);
    return () => {
      ro.disconnect();
      liveBars -= 1;
      if (liveBars === 0) document.documentElement.style.removeProperty("--sticky-bar-h");
    };
  }, []);

  useEffect(() => {
    const update = () => {
      const s = sentinelRef.current;
      const bar = barRef.current;
      if (!s || !bar) return;
      /* 붙는 선은 바 자신의 sticky top 을 읽는다. 쓰는 곳에서 top 을 내려도(설정 화면에서
         탭 바 아래에 붙이는 등) 그 선에 맞춰 frost 가 켜진다. */
      const stickTop = parseFloat(getComputedStyle(bar).top) || 0;
      // sentinel(바 자연 위치)이 붙는 선에 닿으면 pin
      setPinned(s.getBoundingClientRect().top <= stickTop + 0.5);
      /* 자기 구역이 끝나 위로 밀려나는 중. 구역마다 바를 두는 화면(About 설정)에서 생긴다.
         사이트 nav 에는 배경이 없어 밀려난 글자·버튼이 nav 글자와 겹치므로 내용을 감춘다. */
      setPushed(bar.getBoundingClientRect().top < stickTop - 0.5);
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
      <div ref={barRef} className={`${styles.bar}${pinned ? ` ${styles.pinned}` : ""}${pushed ? ` ${styles.pushed}` : ""}${className ? ` ${className}` : ""}`}>
        {children}
      </div>
    </>
  );
}
