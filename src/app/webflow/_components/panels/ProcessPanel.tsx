"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Language } from "@/providers/LanguageProvider";
import type { ProcessStep } from "@/data/webflow";
import styles from "../WebFlowSection.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface ProcessPanelProps {
  language: Language;
  process: ProcessStep[];
}

export default function ProcessPanel({ language, process }: ProcessPanelProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Desktop: track horizontal scroll progress via RAF
  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth <= 1024) return;

    let rafId: number;
    let prevIndex = 0;

    const update = () => {
      if (panelRef.current && contentRef.current) {
        const rect = panelRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const extraWidth = rect.width - vw;

        if (extraWidth > 0) {
          const offset = Math.max(0, Math.min(-rect.left, extraWidth));
          contentRef.current.style.transform = `translateX(${offset}px)`;

          const progress = Math.max(
            0,
            Math.min(1, -rect.left / extraWidth),
          );
          const newIndex = Math.min(
            process.length - 1,
            Math.floor(progress * process.length),
          );

          // Smooth progress bar
          if (progressRef.current) {
            const progressPct =
              ((newIndex + 0.5) / process.length) * 100;
            progressRef.current.style.width = `${progressPct}%`;
          }

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
  }, [process.length]);

  // Mobile: GSAP pin + scrub crossfade
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth > 1024) return;

    const content = contentRef.current;
    const panel = panelRef.current;
    if (!content || !panel) return;

    const panes = Array.from(
      content.querySelectorAll<HTMLElement>(`.${styles.processMobilePane}`),
    );
    if (panes.length < 2) return;
    const count = panes.length;

    /* Set initial positions: first pane visible, rest off-screen right */
    panes.forEach((pane, i) => {
      gsap.set(pane, { xPercent: i === 0 ? 0 : 100 });
    });

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: content,
          start: "top top",
          end: `+=${count * 800}`,
          pin: true,
          pinSpacing: true,
          scrub: 0.8,
        },
      });
      tl.to({}, { duration: 1.5 });
      for (let i = 0; i < count - 1; i++) {
        tl.to(panes[i], { xPercent: -100, duration: 0.7 });
        tl.to(panes[i + 1], { xPercent: 0, duration: 0.7 }, "<");
        tl.to({}, { duration: 1.5 });
      }
    }, panel);

    return () => ctx.revert();
  }, []);

  // Click dot / node → scroll to matching position
  const handleDotClick = useCallback(
    (index: number) => {
      if (!panelRef.current || window.innerWidth <= 1024) return;

      const rect = panelRef.current.getBoundingClientRect();
      const extraWidth = rect.width - window.innerWidth;
      if (extraWidth <= 0) return;

      const targetProgress = (index + 0.5) / process.length;
      const targetLeft = -(targetProgress * extraWidth);
      const deltaScrollY = rect.left - targetLeft;

      window.scrollTo({ top: window.scrollY + deltaScrollY });
    },
    [process.length],
  );

  return (
    <div
      ref={panelRef}
      className={`${styles.panel} ${styles.panelExtraWide}`}
    >
      <div ref={contentRef} className={styles.processFixed}>
        {/* Title row + dot navigation */}
        <div className={styles.processTitleRow}>
          <div>
            <span className={`${styles.panelNumber} ${styles.animate}`}>
              05
            </span>
            <h3 className={`${styles.panelTitle} ${styles.animate}`}>
              Design Process.
            </h3>
          </div>
          <div className={`${styles.processDotNav} ${styles.animate}`}>
            {process.map((_, i) => (
              <div
                data-clickable="true"
                key={i}
                className={`${styles.processDot} ${
                  i === activeIndex ? styles.processDotActive : ""
                }`}
                onClick={() => handleDotClick(i)}
              />
            ))}
          </div>
        </div>

        {/* Desktop: horizontal timeline */}
        <div className={`${styles.processTimeline} ${styles.animate}`}>
          <div className={styles.processTimelineTrack}>
            <div ref={progressRef} className={styles.processTimelineProgress} />
          </div>
          <div className={styles.processTimelineNodes}>
            {process.map((p, i) => {
              const isDone = i < activeIndex;
              const isActive = i === activeIndex;
              return (
                <div
                  data-clickable="true"
                  key={i}
                  className={`${styles.processTimelineNode} ${
                    isActive ? styles.processTimelineNodeActive : ""
                  }`}
                  onClick={() => handleDotClick(i)}
                >
                  <div className={styles.processNodeDotWrap}>
                    <div
                      className={`${styles.processNodeDot} ${
                        isDone
                          ? styles.processNodeDotDone
                          : isActive
                            ? styles.processNodeDotActive
                            : ""
                      }`}
                    />
                    {isActive && (
                      <div className={styles.processNodePulse} />
                    )}
                  </div>
                  <span
                    className={`${styles.processNodeLabel} ${
                      isDone || isActive ? styles.processNodeLabelActive : ""
                    }`}
                  >
                    {p.step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Desktop: step content area — marquee slide */}
        <div className={`${styles.processSingleView} ${styles.animate}`}>
          {process.map((p, i) => (
            <div
              key={i}
              className={`${styles.processSinglePane} ${
                i === activeIndex
                  ? styles.processSinglePaneActive
                  : i < activeIndex
                    ? styles.processSinglePanePast
                    : ""
              }`}
            >
              <span className={styles.processStepBigNum}>{p.step}</span>
              <div className={styles.processStepRight}>
                <h4 className={styles.processStepTitle}>
                  {p.title[language]}
                </h4>
                <p className={styles.processStepDesc}>
                  {p.description[language]}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile: step counter */}
        <div className={styles.processStepCounter}>
          {String(activeIndex + 1).padStart(2, "0")}{" "}
          <span className={styles.processStepCounterSlash}>/</span>{" "}
          {String(process.length).padStart(2, "0")}
        </div>

        {/* Mobile: pinned crossfade list */}
        <div className={styles.processMobileList}>
          {process.map((p, i) => (
            <div
              key={i}
              className={`${styles.processMobilePane} ${
                i === 0 ? styles.processMobilePaneActive : ""
              }`}
            >
              <span className={styles.processStepBigNum}>{p.step}</span>
              <h4 className={styles.processStepTitle}>
                {p.title[language]}
              </h4>
              <p className={styles.processStepDesc}>
                {p.description[language]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
