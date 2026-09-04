"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { flushSync } from "react-dom";
import type Lenis from "@studio-freight/lenis";
import shared from "../../AboutPanel.module.css";
import local from "../CodeHighlightsPanel.module.css";
const styles = { ...shared, ...local };

/* 코드 블록 가로 페이지 넘김 — 예제가 화면보다 넓으면 좌우로 페이지를 나눠 보여 준다.
   현재 페이지는 스크롤 위치에서 역산하고, 모바일에서 코드를 펼치면 패널 높이가 바뀌므로
   그때마다 다시 잰다. */
export function useCodePaging({
  activeIndex,
  expandedMobileCode,
  setExpandedMobileCode,
  panelRef,
}: {
  activeIndex: number;
  expandedMobileCode: number | null;
  setExpandedMobileCode: (v: number | null) => void;
  panelRef: RefObject<HTMLDivElement | null>;
}) {
  const codeWrapRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [codePage, setCodePage] = useState<{ page: number; total: number }>({ page: 1, total: 1 });

  // 코드 오버플로우 감지 및 페이지 위치 추적
  useEffect(() => {
    const wrap = codeWrapRefs.current[activeIndex];
    if (!wrap) return;
    const pre = wrap.querySelector("pre");
    if (!pre) return;

    pre.scrollTop = 0;

    const update = () => {
      const clientH = pre.clientHeight;
      const scrollH = pre.scrollHeight;
      if (clientH <= 0 || scrollH <= clientH) {
        setCodePage({ page: 1, total: 1 });
        return;
      }
      const maxScroll = scrollH - clientH;
      const steps = Math.max(1, Math.round(maxScroll / clientH));
      const total = steps + 1;
      const progress = pre.scrollTop / maxScroll;
      const page = Math.min(total, Math.round(progress * steps) + 1);
      setCodePage({ page, total });
    };

    requestAnimationFrame(update);
    pre.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      pre.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [activeIndex]);

  // 모바일: 패널의 *축소된* 콘텐츠가 뷰포트를 벗어나면
  // 펼쳐진 항목 닫기
  useEffect(() => {
    if (expandedMobileCode === null) return;
    const el = panelRef.current;
    if (!el) return;

    let rafId: number;

    const check = () => {
      const rect = el.getBoundingClientRect();
      if (rect.top <= 0) {
        const openBody = el.querySelector(
          `.${styles.codeMobileBodyOpen}`,
        ) as HTMLElement | null;
        if (openBody) {
          const expandedHeight = openBody.offsetHeight;
          const collapsedBottom = rect.bottom - expandedHeight;

          if (
            collapsedBottom < 0 &&
            rect.bottom < window.innerHeight * 0.5
          ) {
            const heightBefore = el.offsetHeight;
            openBody.style.transition = "none";
            flushSync(() => setExpandedMobileCode(null));
            const heightAfter = el.offsetHeight;
            const delta = heightBefore - heightAfter;

            if (delta > 0) {
              // LenisProvider 가 window.lenis 로 인스턴스 노출 (디버깅 + 외부 접근용)
              const l = (window as typeof window & { lenis?: Lenis }).lenis;
              if (l) {
                l.scrollTo(l.scroll - delta, { immediate: true });
              }
              el.style.marginBottom = "";
            }

            requestAnimationFrame(() => {
              openBody.style.transition = "";
            });
            return;
          }
        }
      }
      rafId = requestAnimationFrame(check);
    };

    rafId = requestAnimationFrame(check);
    return () => cancelAnimationFrame(rafId);
    // setState 는 참조가 고정 — 재구독이 늘지 않는다
  }, [expandedMobileCode, panelRef, setExpandedMobileCode]);

  const scrollCodePage = useCallback(
    (direction: 1 | -1) => {
      const wrap = codeWrapRefs.current[activeIndex];
      if (!wrap) return;
      const pre = wrap.querySelector("pre");
      if (!pre) return;
      const maxScroll = pre.scrollHeight - pre.clientHeight;
      const steps = Math.max(1, Math.round(maxScroll / pre.clientHeight));
      const stepSize = maxScroll / steps;
      pre.scrollBy({ top: direction * stepSize, behavior: "smooth" });
    },
    [activeIndex],
  );


  return { codeWrapRefs, codePage, scrollCodePage };
}
