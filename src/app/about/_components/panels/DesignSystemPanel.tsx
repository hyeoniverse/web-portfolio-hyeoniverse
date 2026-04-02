"use client";

import { useRef, useCallback, useLayoutEffect, useState, useEffect, memo } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import Image from "next/image";
import type { Language } from "@/providers/LanguageProvider";
import type { DesignConceptItem, DcTransitionMode } from "@/data/about";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { usePinnedScroll } from "../../_hooks/usePinnedScroll";
import { useMobilePinScroll } from "../../_hooks/useMobilePinScroll";
import PinnedTitleRow from "../PinnedTitleRow";
import T from "@/components/ui/T";
import TypographyDemo from "./demos/TypographyDemo";
import ColorSystemDemo from "./demos/ColorSystemDemo";
import MotionScrollDemo from "./demos/MotionScrollDemo";
import LayoutSpacingDemo from "./demos/LayoutSpacingDemo";
import GridSystemDemo from "./demos/GridSystemDemo";
import IconographyDemo from "./demos/IconographyDemo";
import shared from "../AboutSection.module.css";
import local from "./DesignSystemPanel.module.css";
const styles = { ...shared, ...local };

interface DesignSystemPanelProps {
  language: Language;
  concepts: DesignConceptItem[];
  mode?: DcTransitionMode;
  scrollBy?: (deltaX: number) => void;
}

const demoMap: Record<string, React.FC> = {
  typography: TypographyDemo,
  color: ColorSystemDemo,
  motion: MotionScrollDemo,
  layout: LayoutSpacingDemo,
  grid: GridSystemDemo,
  icons: IconographyDemo,
};

function DesignSystemPanel({
  language,
  concepts,
  mode = "strip",
  scrollBy,
}: DesignSystemPanelProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const mobileBgRef = useRef<HTMLDivElement>(null);
  const mobileContentRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobileLayout();
  const isStrip = mode === "strip";

  /* ── Desktop: index change (strip translateX / stack crossfade) ── */
  const onIndexChange = useCallback(
    (index: number) => {
      if (isStrip && stripRef.current) {
        stripRef.current.style.transform = `translateX(-${index * 100}%)`;
      } else if (stackRef.current) {
        const grid = stackRef.current;
        const overlays = grid.querySelectorAll<HTMLElement>(`.${styles.dcCardOverlay}`);
        const backgrounds = grid.querySelectorAll<HTMLElement>(`.${styles.dcCardBg}`);
        const cards = grid.querySelectorAll<HTMLElement>(`.${styles.dcCard}`);

        overlays.forEach((overlay, i) => {
          (overlay as HTMLElement).style.opacity = i === index ? "1" : "0";
        });
        backgrounds.forEach((bg, i) => {
          (bg as HTMLElement).style.transform = i < index ? "translateX(-100%)" : "";
        });
        cards.forEach((card, i) => {
          (card as HTMLElement).style.pointerEvents = i === index ? "auto" : "none";
        });
      }
    },
    [isStrip],
  );

  // 1. usePinnedScroll — contentRef 제공 (데스크톱 RAF + scrollToItem)
  const { panelRef, contentRef, activeIndex, setActiveIndex, scrollToItem } = usePinnedScroll(
    concepts.length,
    onIndexChange,
    scrollBy,
  );

  /* ── Mobile: index change — bg layer (panel root) + content layer (viewport) ── */
  const handleMobileIndexChange = useCallback((newIndex: number) => {
    setActiveIndex(newIndex);

    // Background layer (absolute on panel root)
    const bg = mobileBgRef.current;
    if (bg) {
      const items = bg.querySelectorAll<HTMLElement>(`:scope > .${styles.dcMobileBgItem}`);
      items.forEach((item, i) => {
        item.style.opacity = i <= newIndex ? "1" : "0";
        item.style.transform = i < newIndex ? "translateY(-100%)" : "";
      });
    }

    // Content layer (inside pinned viewport)
    const content = mobileContentRef.current;
    if (content) {
      const cards = content.querySelectorAll<HTMLElement>(`:scope > .${styles.dcMobileContentCard}`);
      cards.forEach((card, i) => {
        card.style.opacity = i === newIndex ? "1" : "0";
        card.style.pointerEvents = i === newIndex ? "auto" : "none";
      });
    }
  }, [setActiveIndex]);

  // 3. useMobilePinScroll — nav+tab 아래에서 즉시 pin
  const mobileStRef = useMobilePinScroll(contentRef, concepts.length, 400, handleMobileIndexChange, {
    start: "top 150px",
  });

  // 데스크톱: 스택 모드 초기화
  useLayoutEffect(() => {
    if (isMobile || isStrip) return;
    const grid = stackRef.current;
    if (!grid) return;

    const cards = Array.from(
      grid.querySelectorAll<HTMLElement>(`.${styles.dcCard}`),
    );
    const total = cards.length;

    cards.forEach((card, i) => {
      gsap.set(card, { zIndex: total - i, opacity: 1 });
      if (i > 0) {
        gsap.set(card, { borderColor: "transparent" });
        const overlay = card.querySelector(`.${styles.dcCardOverlay}`);
        if (overlay) gsap.set(overlay, { opacity: 0 });
      }
    });
  }, [isMobile, isStrip]);

  // 모바일: 초기 레이아웃 설정
  useLayoutEffect(() => {
    if (!isMobile) return;
    handleMobileIndexChange(0);
  }, [isMobile, handleMobileIndexChange]);

  // dotNav 클릭 핸들러 — 데스크톱/모바일 모두 지원
  const handleDotClick = useCallback(
    (index: number) => {
      scrollToItem(index, mobileStRef);
    },
    [scrollToItem, mobileStRef],
  );

  // 모바일: 패널이 뷰포트에 보일 때만 탭바에 컨트롤 표시
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

  const tabActions = tabSlot && isMobile && inView
    ? createPortal(
        <>
          <button
            data-clickable="true"
            className={styles.tabNavBtn}
            onClick={() => handleDotClick(Math.max(0, activeIndex - 1))}
            disabled={activeIndex === 0}
          >
            ‹
          </button>
          <span className={styles.tabNavCounter}>
            {activeIndex + 1}/{concepts.length}
          </span>
          <button
            data-clickable="true"
            className={styles.tabNavBtn}
            onClick={() => handleDotClick(Math.min(concepts.length - 1, activeIndex + 1))}
            disabled={activeIndex === concepts.length - 1}
          >
            ›
          </button>
        </>,
        tabSlot,
      )
    : null;

  /* ── Desktop: card elements (bg + overlay combined) ── */
  const cardElements = concepts.map((concept) => {
    const Demo = demoMap[concept.id];
    return (
      <div key={concept.id} className={styles.dcCard}>
        <div className={styles.dcCardBg}>
          <Image
            src={concept.image!}
            alt={concept.title}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
        <div className={styles.dcCardOverlay}>
          <span className={styles.dcCardTitle}>{concept.title}</span>
          <h4 className={styles.dcCardSubtitle}>
            {concept.subtitle[language]}
          </h4>
          <p className={styles.dcCardDesc}>
            {concept.description[language]}
          </p>
          {Demo && <Demo />}
        </div>
      </div>
    );
  });

  return (
    <div
      ref={panelRef}
      className={`${styles.panel} ${styles.panelExtraWide} ${styles.dcPanel}`}
    >
      {tabActions}

      <div ref={contentRef} className={`${styles.pinnedContent} ${styles.dcViewport}`}>
        {/* ── Mobile: bg layer inside viewport — pin과 함께 이동 ── */}
        {isMobile && (
          <div ref={mobileBgRef} className={styles.dcMobileBg}>
            {concepts.map((concept, idx) => (
              <div key={concept.id} className={styles.dcMobileBgItem}>
                <Image
                  src={concept.image!}
                  alt=""
                  fill
                  sizes="100vw"
                  priority={idx === 0}
                />
              </div>
            ))}
          </div>
        )}
        <PinnedTitleRow
          className={isMobile ? styles.dcTitleRow : undefined}
          title={<T k="aboutPage.panels.designSystem" />}
          rightContent={
            <a
              href="/design-system"
              target="_blank"
              rel="noopener noreferrer"
              data-clickable="true"
              className={styles.externalLink}
            >
              Open ↗
            </a>
          }
          dotNav={isMobile ? undefined : {
            count: concepts.length,
            activeIndex,
            onDotClick: handleDotClick,
            labels: concepts.map((c) => c.title),
            className: styles.dotNavMobile,
          }}
        />

        {/* ── Desktop: full card stack inside viewport ── */}
        {!isMobile && (
          <div
            ref={stackRef}
            className={`${styles.dcCardStack} ${isStrip ? styles.dcModeStrip : styles.dcModeStack}`}
          >
            {isStrip ? (
              <div ref={stripRef} className={styles.dcCardStrip}>
                {cardElements}
              </div>
            ) : (
              cardElements
            )}
          </div>
        )}

        {/* ── Mobile: content overlays only (bg is on panel root) ── */}
        {isMobile && (
          <div ref={mobileContentRef} className={styles.dcMobileContentStack}>
            {concepts.map((concept) => {
              const Demo = demoMap[concept.id];
              return (
                <div key={concept.id} className={styles.dcMobileContentCard}>
                  <span className={styles.dcCardTitle}>{concept.title}</span>
                  <h4 className={styles.dcCardSubtitle}>
                    {concept.subtitle[language]}
                  </h4>
                  <p className={styles.dcCardDesc}>
                    {concept.description[language]}
                  </p>
                  {Demo && <Demo />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(DesignSystemPanel);
