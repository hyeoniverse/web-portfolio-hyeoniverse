"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, type RefObject } from "react";
import Pressable from "@/components/ui/Pressable";
import shared from "../../AboutPanel.module.css";
import local from "../DesignSystemPanel.module.css";
const styles = { ...shared, ...local };

/* 모바일 탭 바에 이 패널의 이전/다음 컨트롤을 끼워 넣는다.
   탭 바는 About 셸이 그리고 슬롯만 비워 두므로 포털로 붙이고,
   패널이 화면에 있을 때만 보이도록 IntersectionObserver 로 판단한다. */
export function useTabActionsPortal({
  isMobile,
  contentRef,
  activeIndex,
  count,
  onSelect,
}: {
  isMobile: boolean;
  contentRef: RefObject<HTMLDivElement | null>;
  activeIndex: number;
  count: number;
  onSelect: (index: number) => void;
}) {
  const [tabSlot, setTabSlot] = useState<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!isMobile) return;
    setTabSlot(document.getElementById("about-tab-actions"));
    const el = contentRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => { observer.disconnect(); setTabSlot(null); setInView(false); };
  }, [isMobile, contentRef]);
  if (!tabSlot || !isMobile || !inView) return null;
  return createPortal(
    <>
      <Pressable noTapScale
        data-clickable="true"
        className={styles.tabNavBtn}
        onClick={() => onSelect(Math.max(0, activeIndex - 1))}
        disabled={activeIndex === 0}
      >
        ‹
      </Pressable>
      <span className={styles.tabNavCounter}>
        {activeIndex + 1}/{count}
      </span>
      <Pressable noTapScale
        data-clickable="true"
        className={styles.tabNavBtn}
        onClick={() => onSelect(Math.min(count - 1, activeIndex + 1))}
        disabled={activeIndex === count - 1}
      >
        ›
      </Pressable>
    </>,
    tabSlot,
  );
}
