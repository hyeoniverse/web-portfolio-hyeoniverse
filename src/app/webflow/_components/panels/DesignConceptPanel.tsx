"use client";

import { useRef, useCallback, useLayoutEffect } from "react";
import gsap from "gsap";
import Image from "next/image";
import type { Language } from "@/providers/LanguageProvider";
import type { DesignConceptItem } from "@/data/webflow";
import { checkMobileLayout } from "../../_hooks/mobileCheck";
import { usePinnedScroll } from "../../_hooks/usePinnedScroll";
import { useMobilePinScroll } from "../../_hooks/useMobilePinScroll";
import PinnedTitleRow from "../PinnedTitleRow";
import TypographyDemo from "./demos/TypographyDemo";
import ColorSystemDemo from "./demos/ColorSystemDemo";
import MotionScrollDemo from "./demos/MotionScrollDemo";
import LayoutSpacingDemo from "./demos/LayoutSpacingDemo";
import GridSystemDemo from "./demos/GridSystemDemo";
import IconographyDemo from "./demos/IconographyDemo";
import styles from "../WebFlowSection.module.css";

export type DcTransitionMode = "strip" | "stack";

interface DesignConceptPanelProps {
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

export default function DesignConceptPanel({
  language,
  concepts,
  mode = "strip",
  scrollBy,
}: DesignConceptPanelProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const isMobile = checkMobileLayout();
  const isStrip = mode === "strip";

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

  const { panelRef, contentRef, activeIndex, scrollToItem } = usePinnedScroll(
    concepts.length,
    onIndexChange,
    scrollBy,
  );

  useLayoutEffect(() => {
    if (isStrip) return;
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
  }, [isStrip]);

  const handleMobileIndexChange = useCallback((newIndex: number) => {
    const stack = stackRef.current;
    if (!stack) return;

    const overlays = stack.querySelectorAll<HTMLElement>(`.${styles.dcCardOverlay}`);
    const backgrounds = stack.querySelectorAll<HTMLElement>(`.${styles.dcCardBg}`);
    const cards = stack.querySelectorAll<HTMLElement>(`.${styles.dcCard}`);
    const total = cards.length;

    cards.forEach((card, i) => {
      gsap.set(card, { zIndex: total - i, opacity: 1 });
    });
    overlays.forEach((overlay, i) => {
      overlay.style.opacity = i === newIndex ? "1" : "0";
    });
    backgrounds.forEach((bg, i) => {
      bg.style.transform = i < newIndex ? "translateY(-100%)" : "";
    });
    cards.forEach((card, i) => {
      card.style.pointerEvents = i === newIndex ? "auto" : "none";
    });
  }, []);

  // 모바일: 초기 레이아웃 설정 (ProcessPanel 패턴과 동일)
  useLayoutEffect(() => {
    if (!isMobile) return;
    handleMobileIndexChange(0);
  }, [isMobile, handleMobileIndexChange]);

  useMobilePinScroll(contentRef, concepts.length, 400, handleMobileIndexChange);

  const cardElements = concepts.map((concept) => {
    const Demo = demoMap[concept.id];
    return (
      <div key={concept.id} className={styles.dcCard}>
        <div className={styles.dcCardBg}>
          <Image
            src={concept.image}
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
    <div ref={panelRef} className={`${styles.panel} ${styles.panelExtraWide}`}>
      <div ref={contentRef} className={`${styles.pinnedContent} ${styles.dcViewport}`}>
        <PinnedTitleRow
          number="04"
          title="Design Concept."
          dotNav={{
            count: concepts.length,
            activeIndex,
            onDotClick: scrollToItem,
            labels: concepts.map((c) => c.title),
            className: styles.dotNavMobile,
          }}
        />

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

        <div className={styles.dcMobileList}>
          {concepts.map((concept) => {
            const Demo = demoMap[concept.id];
            return (
              <div key={concept.id} className={styles.dcMobileCard}>
                <div className={styles.dcMobileCardBg}>
                  <Image
                    src={concept.image}
                    alt={concept.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <div className={styles.dcMobileCardContent}>
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
          })}
        </div>
      </div>
    </div>
  );
}
