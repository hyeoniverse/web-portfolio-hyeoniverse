"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Language } from "@/providers/LanguageProvider";
import type { TroubleShootingItem } from "@/data/webflow";
import { renderHighlight } from "../renderHighlight";
import { checkMobileLayout } from "../../_hooks/mobileCheck";
import styles from "../WebFlowSection.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface TroubleshootingPanelProps {
  language: Language;
  t: (key: string) => string;
  items: TroubleShootingItem[];
}

export default function TroubleshootingPanel({
  language,
  t,
  items,
}: TroubleshootingPanelProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Detect mobile/tablet (width ≤ 1024 or height < 750)
  useLayoutEffect(() => {
    const check = () => setIsMobile(checkMobileLayout());
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Desktop: track horizontal scroll progress via RAF
  // Counter-translate inner content so it appears pinned in the viewport
  useEffect(() => {
    if (typeof window === "undefined" || checkMobileLayout()) return;

    let rafId: number;
    let prevIndex = 0;

    const update = () => {
      if (panelRef.current && contentRef.current) {
        const rect = panelRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const extraWidth = rect.width - vw;

        if (extraWidth > 0) {
          // Counter-translate: pin content while panel scrolls
          const offset = Math.max(0, Math.min(-rect.left, extraWidth));
          contentRef.current.style.transform = `translateX(${offset}px)`;

          // Map scroll progress → active item index
          const progress = Math.max(0, Math.min(1, -rect.left / extraWidth));
          const newIndex = Math.min(
            items.length - 1,
            Math.floor(progress * items.length),
          );
          if (newIndex !== prevIndex) {
            prevIndex = newIndex;
            setActiveIndex(newIndex);
          }
        }
      }
      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [items.length]);

  // Mobile/Tablet: GSAP ScrollTrigger pin + JS-driven detail transforms
  useLayoutEffect(() => {
    if (!isMobile) return;
    const viewport = contentRef.current;
    if (!viewport) return;

    const total = items.length;
    const scrollDist = total * 500;
    let prevIdx = 0;

    // Query detail items + their stagger children for JS-driven animation
    const detailItems = Array.from(
      viewport.querySelectorAll<HTMLElement>(`.${styles.troubleDetailItem}`),
    );

    // Stagger children: header + entries within each detail item
    const getStaggerChildren = (el: HTMLElement) =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          `.${styles.troubleDetailHeader}, .${styles.troubleEntry}`,
        ),
      );

    // Set initial state: first item cascade-visible, rest hidden
    detailItems.forEach((el, i) => {
      el.style.opacity = i === 0 ? "1" : "0";
      const children = getStaggerChildren(el);
      children.forEach((child, ci) => {
        if (i === 0) {
          child.style.opacity = "1";
          child.style.transform = "translateY(0)";
        } else {
          child.style.opacity = "0";
          child.style.transform = "translateY(16px)";
        }
        child.style.transition = `opacity 0.4s ease ${ci * 0.1}s, transform 0.4s cubic-bezier(0.4,0,0.2,1) ${ci * 0.1}s`;
      });
    });

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: viewport,
        start: "top top",
        end: `+=${scrollDist}`,
        pin: true,
        pinSpacing: true,
        onUpdate: (self) => {
          const newIndex = Math.min(
            total - 1,
            Math.floor(self.progress * total),
          );

          if (newIndex !== prevIdx) {
            prevIdx = newIndex;
            setActiveIndex(newIndex);

            // JS-driven stagger cascade
            detailItems.forEach((el, i) => {
              el.style.opacity = i === newIndex ? "1" : "0";
              const children = getStaggerChildren(el);
              children.forEach((child, ci) => {
                if (i === newIndex) {
                  child.style.opacity = "1";
                  child.style.transform = "translateY(0)";
                  child.style.transitionDelay = `${ci * 0.1}s`;
                } else {
                  child.style.opacity = "0";
                  child.style.transform = "translateY(16px)";
                  child.style.transitionDelay = "0s";
                }
              });
            });
          }
        },
      });
    }, viewport);

    return () => ctx.revert();
  }, [isMobile, items.length]);

  // Click list item → scroll to matching position (GSAP scrub animates)
  const handleItemClick = useCallback(
    (index: number) => {
      if (!panelRef.current || checkMobileLayout()) return;

      const rect = panelRef.current.getBoundingClientRect();
      const extraWidth = rect.width - window.innerWidth;
      if (extraWidth <= 0) return;

      const targetProgress = (index + 0.5) / items.length;
      const targetLeft = -(targetProgress * extraWidth);
      const deltaScrollY = rect.left - targetLeft;

      window.scrollTo({ top: window.scrollY + deltaScrollY });
    },
    [items.length],
  );

  return (
    <div ref={panelRef} className={`${styles.panel} ${styles.panelExtraWide}`}>
      {/* Inner wrapper: counter-translated to appear pinned */}
      <div ref={contentRef} className={`${styles.pinnedContent} ${styles.mobilePinViewport}`}>
        <div className={styles.pinnedTitleRow}>
          <div>
            <span className={`${styles.panelNumber} ${styles.animate}`}>08</span>
            <h3
              className={`${styles.panelTitle} ${styles.panelTitleCompact} ${styles.animate}`}
            >
              Trouble Shooting.
            </h3>
          </div>
          <div className={`${styles.dotNav} ${styles.dotNavMobileOnly}`}>
            {items.map((_, i) => (
              <div
                data-clickable="true"
                key={i}
                className={`${styles.dot} ${
                  i === activeIndex ? styles.dotActive : ""
                }`}
                onClick={() => handleItemClick(i)}
              />
            ))}
          </div>
        </div>

        {/* Desktop: split layout — list + detail */}
        <div className={`${styles.troubleSplit} ${styles.animate}`}>
          {/* Left: item list */}
          <div className={styles.troubleList}>
            {items.map((item, index) => (
              <div
                data-clickable="true"
                key={index}
                className={`${styles.troubleListItem} ${
                  index === activeIndex ? styles.troubleListItemActive : ""
                }`}
                onClick={() => handleItemClick(index)}
              >
                <span className={styles.troubleNumber}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className={styles.troubleListTitle}>
                  {item.problem[language]}
                </span>
              </div>
            ))}
          </div>

          {/* Right: detail content (stacked, CSS opacity transition) */}
          <div className={styles.troubleDetail}>
            {items.map((item, index) => (
              <div
                key={index}
                className={`${styles.troubleDetailItem} ${
                  index === activeIndex ? styles.troubleDetailItemActive : ""
                }`}
              >
                <div className={styles.troubleDetailHeader}>
                  <span className={styles.troubleDetailNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h4 className={styles.troubleTitle}>
                    {item.problem[language]}
                  </h4>
                </div>
                <div className={styles.troubleBody}>
                  <div className={styles.troubleEntry}>
                    <span className={styles.troubleLabel}>
                      {t("webflow.troubleshooting.cause")}
                    </span>
                    <p>{renderHighlight(item.cause[language])}</p>
                  </div>
                  <div className={styles.troubleEntry}>
                    <span
                      className={`${styles.troubleLabel} ${styles.troubleLabelAccent}`}
                    >
                      {t("webflow.troubleshooting.solution")}
                    </span>
                    <p>{renderHighlight(item.solution[language])}</p>
                  </div>
                  <div className={styles.troubleEntry}>
                    <span
                      className={`${styles.troubleLabel} ${styles.troubleLabelInsight}`}
                    >
                      {t("webflow.troubleshooting.keyInsight")}
                    </span>
                    <p className={styles.troubleInsightText}>
                      {renderHighlight(item.keyInsight[language])}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: all items displayed (fallback, hidden when pin active) */}
        <div className={styles.troubleMobileList}>
          {items.map((item, index) => (
            <div
              key={index}
              className={`${styles.troubleMobileItem} ${styles.animate}`}
            >
              <div className={styles.troubleMobileHeader}>
                <span className={styles.troubleNumber}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h4 className={styles.troubleTitle}>
                  {item.problem[language]}
                </h4>
              </div>
              <div className={styles.troubleBody}>
                <div className={styles.troubleEntry}>
                  <span className={styles.troubleLabel}>
                    {t("webflow.troubleshooting.cause")}
                  </span>
                  <p>{renderHighlight(item.cause[language])}</p>
                </div>
                <div className={styles.troubleEntry}>
                  <span
                    className={`${styles.troubleLabel} ${styles.troubleLabelAccent}`}
                  >
                    {t("webflow.troubleshooting.solution")}
                  </span>
                  <p>{renderHighlight(item.solution[language])}</p>
                </div>
                <div className={styles.troubleEntry}>
                  <span
                    className={`${styles.troubleLabel} ${styles.troubleLabelInsight}`}
                  >
                    {t("webflow.troubleshooting.keyInsight")}
                  </span>
                  <p className={styles.troubleInsightText}>
                    {renderHighlight(item.keyInsight[language])}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
