"use client";

import { useRef, useCallback, useLayoutEffect, memo } from "react";
import gsap from "gsap";
import Image from "next/image";
import type { Language } from "@/providers/LanguageProvider";
import type { DesignConceptItem } from "@/data/about";
import { useMobileLayout } from "../../_hooks/mobileCheck";
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
import local from "./DesignConceptPanel.module.css";
const styles = { ...shared, ...local };

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

function DesignConceptPanel({
  language,
  concepts,
  mode = "strip",
  scrollBy,
}: DesignConceptPanelProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobileLayout();
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

  // 1. usePinnedScroll — contentRef 제공 (데스크톱 RAF + scrollToItem)
  const { panelRef, contentRef, activeIndex, setActiveIndex, scrollToItem } = usePinnedScroll(
    concepts.length,
    onIndexChange,
    scrollBy,
  );

  // 2. 모바일 인덱스 변경 핸들러 — setActiveIndex로 dotNav 동기화
  const handleMobileIndexChange = useCallback((newIndex: number) => {
    setActiveIndex(newIndex);

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
  }, [setActiveIndex]);

  // 3. useMobilePinScroll — contentRef 사용 (모바일 pin + 스크롤)
  const mobileStRef = useMobilePinScroll(contentRef, concepts.length, 400, handleMobileIndexChange);

  // 데스크톱: 스택 모드 초기화
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
    <div ref={panelRef} className={`${styles.panel} ${styles.panelExtraWide} ${styles.dcPanel}`}>
      <div ref={contentRef} className={`${styles.pinnedContent} ${styles.dcViewport}`}>
        <PinnedTitleRow
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
          dotNav={{
            count: concepts.length,
            activeIndex,
            onDotClick: handleDotClick,
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
          {concepts.map((concept, idx) => {
            const Demo = demoMap[concept.id];
            return (
              <div key={concept.id} className={styles.dcMobileCard}>
                <div className={styles.dcMobileCardBg}>
                  <Image
                    src={concept.image!}
                    alt={concept.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    priority={idx === 0}
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

export default memo(DesignConceptPanel);
