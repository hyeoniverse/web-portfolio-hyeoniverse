"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { Star } from "@/components/icons";
import Pressable from "@/components/ui/Pressable";
import Tooltip from "@/components/ui/Tooltip";
import type { TroubleShootingItem } from "@/data/about/types";
import type { Language } from "@/providers/LanguageProvider";
import { displayTitle } from "./itemHelpers";
import shared from "../../AboutSection.module.css";
import local from "../TroubleshootingPanel.module.css";
import own from "./TroubleTabBar.module.css";
const styles = { ...shared, ...local, ...own };

/* IDE 탭 바 — 항목 전체를 탭으로 늘어놓고 활성 탭만 indicator 를 붙인다.
   모바일 터치는 브라우저의 overflow 스크롤을 쓰고, 데스크톱 마우스만 직접 드래그를 구현한다.
   드래그와 클릭을 구분해야 해서 이동 거리(moved)를 재고, 클릭 핸들러가 그 값을 본다. */
export default function TroubleTabBar({
  items,
  displayIndex,
  mobileActiveIdx,
  isMobile,
  language,
  onSelect,
}: {
  items: TroubleShootingItem[];
  displayIndex: number;
  mobileActiveIdx: number;
  isMobile: boolean;
  language: Language;
  onSelect: (index: number) => void;
}) {
  // IDE tab bar drag-to-scroll — 모바일 터치는 native overflow scroll, 데스크톱 마우스는 manual.
  // setPointerCapture 안 씀 (button click 이 wrapper 로 가로채여서 발화 안 되는 문제) → document-level mousemove/up 으로 처리.
  const ideTabBarRef = useRef<HTMLDivElement>(null);
  const tabDragRef = useRef({ active: false, startX: 0, startScroll: 0, moved: 0 });
  const handleTabMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ideTabBarRef.current;
    if (!el) return;
    tabDragRef.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: 0 };
  }, []);

  // document-level mousemove / mouseup — 드래그가 tabbar 바깥으로 나가도 계속 작동.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = tabDragRef.current;
      const el = ideTabBarRef.current;
      if (!drag.active || !el) return;
      const dx = e.clientX - drag.startX;
      drag.moved = Math.max(drag.moved, Math.abs(dx));
      el.scrollLeft = drag.startScroll - dx;
      // 5px 이상 움직였으면 drag 의도 확정 → 커서를 drag (grab) 로 전환
      if (drag.moved > 5 && el.getAttribute("data-cursor") !== "grab") {
        el.setAttribute("data-cursor", "grab");
      }
    };
    const onUp = () => {
      tabDragRef.current.active = false;
      const el = ideTabBarRef.current;
      if (el && el.hasAttribute("data-cursor")) el.removeAttribute("data-cursor");
      // moved 는 click 핸들러가 체크한 뒤 자동으로 다음 mousedown 에서 0 으로 리셋됨
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  // 활성 탭이 항상 viewport 안에 들어오도록 tab bar 자동 스크롤
  useEffect(() => {
    if (!isMobile) return;
    const bar = ideTabBarRef.current;
    if (!bar) return;
    const buttons = bar.querySelectorAll(`.${styles.ideTab}`);
    const activeTab = buttons[mobileActiveIdx] as HTMLElement | undefined;
    if (!activeTab) return;
    const barRect = bar.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    const PADDING = 16;
    if (tabRect.left < barRect.left + PADDING) {
      bar.scrollBy({ left: tabRect.left - barRect.left - PADDING, behavior: "smooth" });
    } else if (tabRect.right > barRect.right - PADDING) {
      bar.scrollBy({ left: tabRect.right - barRect.right + PADDING, behavior: "smooth" });
    }
  }, [mobileActiveIdx, isMobile]);

  return (
          <div
            ref={ideTabBarRef}
            className={styles.ideTabBar}
            data-lenis-prevent
            onMouseDown={handleTabMouseDown}
          >
            <LayoutGroup id="trouble-ide-tabs">
              {items.map((item, index) => {
                const isActive = index === displayIndex;
                const filename = `${String(index + 1).padStart(2, "0")}.md`;
                return (
                  <Tooltip
                    key={index}
                    content={displayTitle(item)[language]}
                    placement="bottom"
                    delay={150}
                  >
                    <Pressable noTapScale
                      data-clickable="true"
                      className={`${styles.ideTab} ${isActive ? styles.ideTabActive : ""}`}
                      onClick={() => {
                        // 드래그 5px 이상 움직였으면 click 무시
                        if (tabDragRef.current.moved > 5) return;
                        onSelect(index);
                      }}
                    >
                      {item.recommended ? (
                        <Star
                          size={11}
                          fill="currentColor"
                          strokeWidth={1.5}
                          className={styles.ideTabStar}
                          aria-hidden
                        />
                      ) : (
                        <span className={styles.ideTabDot} aria-hidden />
                      )}
                      <span className={styles.ideTabName}>{filename}</span>
                      {isActive && (
                        <motion.span
                          layoutId="ide-tab-indicator"
                          className={styles.ideTabIndicator}
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        />
                      )}
                    </Pressable>
                  </Tooltip>
                );
              })}
            </LayoutGroup>
          </div>
  );
}
