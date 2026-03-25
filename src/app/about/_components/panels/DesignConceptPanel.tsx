"use client";

import { useRef, useCallback, useLayoutEffect, memo } from "react";
import gsap from "gsap";
import type { Language } from "@/providers/LanguageProvider";
import type { DesignConceptItem } from "@/data/about";
import { useMobileLayout } from "../../_hooks/mobileCheck";
import { usePinnedScroll } from "../../_hooks/usePinnedScroll";
import { useMobilePinScroll } from "../../_hooks/useMobilePinScroll";
import PinnedTitleRow from "../PinnedTitleRow";
import T from "@/components/ui/T";
import shared from "../AboutSection.module.css";
import local from "./DesignConceptPanel.module.css";
const styles = { ...shared, ...local };

interface DesignConceptPanelProps {
  language: Language;
  philosophy: DesignConceptItem[];
  scrollBy?: (deltaX: number) => void;
}

/* ── SVG Concept Objects ── */

function OvalRipple() {
  return (
    <svg viewBox="0 0 400 400" className={styles.cpObject}>
      {[50, 95, 140, 175, 200].map((rx, i) => (
        <ellipse
          key={i}
          cx="200"
          cy="200"
          rx={rx}
          ry={rx * 0.65}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={1.5 - i * 0.2}
          opacity={0.6 - i * 0.1}
        />
      ))}
      <circle cx="200" cy="200" r="3" fill="var(--color-accent)" opacity="0.5" />
    </svg>
  );
}

function LineCurve() {
  return (
    <svg viewBox="0 0 400 300" className={styles.cpObject}>
      {[60, 110, 160, 210].map((y, i) => (
        <g key={i} opacity={0.15 + i * 0.15}>
          <line x1="20" y1={y} x2="180" y2={y} stroke="var(--color-accent)" strokeWidth={1.2} />
          <path
            d={`M180 ${y} C250 ${y}, 300 ${y + (i % 2 === 0 ? 40 : -40)}, 380 ${y + (i % 2 === 0 ? 30 : -30)}`}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={1.2}
          />
        </g>
      ))}
      {[60, 110, 160, 210].map((y) =>
        [20, 60, 100, 140, 180].map((x) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill="var(--color-accent)" opacity="0.2" />
        )),
      )}
    </svg>
  );
}

function DepthLayer() {
  return (
    <svg viewBox="0 0 400 320" className={styles.cpObject}>
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={80 - i * 22}
          y={20 + i * 32}
          width="260"
          height="170"
          rx="10"
          fill="var(--color-accent)"
          opacity={0.04 + i * 0.08}
        />
      ))}
      <rect x={14} y={116} width="260" height="170" rx="10" fill="none" stroke="var(--color-accent)" strokeWidth="1" opacity="0.3" />
      <line x1="320" y1="50" x2="320" y2="260" stroke="var(--color-accent)" strokeWidth="0.8" opacity="0.2" />
      <polygon points="314,250 326,250 320,268" fill="var(--color-accent)" opacity="0.2" />
    </svg>
  );
}

function NegativeSpaceObj() {
  return (
    <svg viewBox="0 0 400 400" className={styles.cpObject}>
      <circle cx="200" cy="200" r="180" fill="none" stroke="var(--color-accent)" strokeWidth="0.8" opacity="0.15" />
      <circle cx="200" cy="200" r="120" fill="none" stroke="var(--color-accent)" strokeWidth="0.5" opacity="0.08" strokeDasharray="4 8" />
      <circle cx="200" cy="200" r="4" fill="var(--color-accent)" opacity="0.6" />
    </svg>
  );
}

const objectMap: Record<string, React.FC> = {
  oval: OvalRipple,
  "line-curve": LineCurve,
  depth: DepthLayer,
  space: NegativeSpaceObj,
};

function DesignConceptPanel({
  language,
  philosophy,
  scrollBy,
}: DesignConceptPanelProps) {
  const cardsRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobileLayout();

  const onIndexChange = useCallback((index: number) => {
    const container = cardsRef.current;
    if (!container) return;

    const cards = container.querySelectorAll<HTMLElement>(`.${styles.cpCard}`);
    cards.forEach((card, i) => {
      const body = card.querySelector<HTMLElement>(`.${styles.cpCardBody}`);
      const obj = card.querySelector<HTMLElement>(`.${styles.cpObjectWrap}`);
      const variant = card.dataset.variant;
      const centered = variant === "depth" || variant === "space";
      const base = centered ? "translate(-50%, -50%)" : "translateY(-50%)";

      if (i === index) {
        card.style.opacity = "1";
        card.style.pointerEvents = "auto";
        if (body) body.style.transform = "translateY(0)";
        if (obj) obj.style.transform = `${base} scale(1)`;
      } else {
        card.style.opacity = "0";
        card.style.pointerEvents = "none";
        if (body) {
          body.style.transform = i < index ? "translateY(-24px)" : "translateY(24px)";
        }
        if (obj) {
          obj.style.transform = i < index
            ? `${base} scale(1.08)`
            : `${base} scale(0.92)`;
        }
      }
    });
  }, []);

  const { panelRef, contentRef, activeIndex, setActiveIndex, scrollToItem } =
    usePinnedScroll(philosophy.length, onIndexChange, scrollBy);

  const handleMobileIndexChange = useCallback(
    (newIndex: number) => {
      setActiveIndex(newIndex);
      const container = cardsRef.current;
      if (!container) return;

      const cards = container.querySelectorAll<HTMLElement>(`.${styles.cpCard}`);
      const total = cards.length;
      cards.forEach((card, i) => {
        gsap.set(card, { zIndex: total - i });
        const body = card.querySelector<HTMLElement>(`.${styles.cpCardBody}`);
        card.style.opacity = i === newIndex ? "1" : "0";
        card.style.pointerEvents = i === newIndex ? "auto" : "none";
        if (body) {
          body.style.transform = i === newIndex ? "translateY(0)" : "translateY(24px)";
        }
      });
    },
    [setActiveIndex],
  );

  // start: "top 150px" — section top 스크롤 시 이미 트리거 지점을 지난 상태 → 즉시 pin
  const mobileStRef = useMobilePinScroll(contentRef, philosophy.length, 400, handleMobileIndexChange, {
    start: "top 150px",
  });

  useLayoutEffect(() => {
    const container = cardsRef.current;
    if (!container) return;
    const cards = Array.from(container.querySelectorAll<HTMLElement>(`.${styles.cpCard}`));
    const total = cards.length;
    cards.forEach((card, i) => {
      gsap.set(card, {
        zIndex: total - i,
        opacity: i === 0 ? 1 : 0,
        pointerEvents: i === 0 ? "auto" : "none",
      });
    });
  }, [isMobile]);

  const handleDotClick = useCallback(
    (index: number) => scrollToItem(index, mobileStRef),
    [scrollToItem, mobileStRef],
  );

  return (
    <div ref={panelRef} className={`${styles.panel} ${styles.panelExtraWide} ${styles.cpPanel}`}>
      <div ref={contentRef} className={`${styles.pinnedContent} ${styles.cpViewport}`}>
        <PinnedTitleRow
          className={isMobile ? styles.cpTitleRow : undefined}
          title={<T k="aboutPage.panels.designConcept" />}
          dotNav={{
            count: philosophy.length,
            activeIndex,
            onDotClick: handleDotClick,
            labels: philosophy.map((c) => c.title),
            className: styles.dotNavMobile,
          }}
        />

        <div ref={cardsRef} className={styles.cpCards}>
          {philosophy.map((item, idx) => {
            const Obj = objectMap[item.id];
            const num = String(idx + 1).padStart(2, "0");
            const total = String(philosophy.length).padStart(2, "0");
            return (
              <div key={item.id} className={styles.cpCard} data-variant={item.id}>
                {/* Hero zone */}
                <div className={styles.cpHero}>
                  <span className={styles.cpHeroTitle}>{item.title}</span>
                  {Obj && (
                    <div className={styles.cpObjectWrap}>
                      <Obj />
                    </div>
                  )}
                  <span className={styles.cpIndexText}>
                    <span>{num}</span> / {total}
                  </span>
                </div>

                {/* Content zone */}
                <div className={styles.cpCardBody}>
                  <span className={styles.cpLabel}>{item.title}</span>
                  <div className={styles.cpContent}>
                    <h4 className={styles.cpSubtitle}>{item.subtitle[language]}</h4>
                    <p className={styles.cpDesc}>{item.description[language]}</p>
                  </div>
                  {item.examples && item.examples.length > 0 && (
                    <div className={styles.cpExamples}>
                      {item.examples.map((ex) => (
                        <span key={ex} className={styles.cpExampleTag}>{ex}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.cpMobileList}>
          {philosophy.map((item, idx) => {
            const Obj = objectMap[item.id];
            const num = String(idx + 1).padStart(2, "0");
            const total = String(philosophy.length).padStart(2, "0");
            return (
              <div key={item.id} className={styles.cpMobileCard} data-variant={item.id}>
                <div className={styles.cpHero}>
                  <span className={styles.cpHeroTitle}>{item.title}</span>
                  {Obj && (
                    <div className={styles.cpObjectWrap}>
                      <Obj />
                    </div>
                  )}
                  <span className={styles.cpIndexText}>
                    <span>{num}</span> / {total}
                  </span>
                </div>
                <div className={styles.cpCardBody}>
                  <span className={styles.cpLabel}>{item.title}</span>
                  <div className={styles.cpContent}>
                    <h4 className={styles.cpSubtitle}>{item.subtitle[language]}</h4>
                    <p className={styles.cpDesc}>{item.description[language]}</p>
                  </div>
                  {item.examples && item.examples.length > 0 && (
                    <div className={styles.cpExamples}>
                      {item.examples.map((ex) => (
                        <span key={ex} className={styles.cpExampleTag}>{ex}</span>
                      ))}
                    </div>
                  )}
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
