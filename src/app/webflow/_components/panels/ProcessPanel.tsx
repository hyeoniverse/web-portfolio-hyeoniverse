"use client";

import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Language } from "@/providers/LanguageProvider";
import type { ProcessStep } from "@/data/webflow";
import { checkMobileLayout } from "../../_hooks/mobileCheck";
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
  const [isMobile, setIsMobile] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Detect mobile/tablet (width ≤ 1024 or height < 750)
  useLayoutEffect(() => {
    const check = () => setIsMobile(checkMobileLayout());
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Desktop: track horizontal scroll progress via RAF
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
          const offset = Math.max(0, Math.min(-rect.left, extraWidth));
          contentRef.current.style.transform = `translateX(${offset}px)`;

          const progress = Math.max(0, Math.min(1, -rect.left / extraWidth));
          const newIndex = Math.min(
            process.length - 1,
            Math.floor(progress * process.length),
          );

          // Smooth progress bar
          if (progressRef.current) {
            const progressPct = ((newIndex + 0.5) / process.length) * 100;
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

  // Mobile/Tablet: GSAP ScrollTrigger pin + accordion expand/collapse
  const stepListRef = useRef<HTMLDivElement>(null);
  const mobileStRef = useRef<ScrollTrigger | null>(null);

  useLayoutEffect(() => {
    if (!isMobile) return;
    const viewport = contentRef.current;
    const stepList = stepListRef.current;
    if (!viewport || !stepList) return;

    const total = process.length;
    const scrollDist = total * 500;
    let prevIdx = 0;

    const rows = Array.from(
      stepList.querySelectorAll<HTMLElement>(`.${styles.processStepRow}`),
    );
    const contents = Array.from(
      stepList.querySelectorAll<HTMLElement>(`.${styles.processStepContent}`),
    );

    // Calculate heights: collapsed rows show only dot+label
    const COLLAPSED_H = 36;
    const applyLayout = (activeIdx: number) => {
      const listH = stepList.offsetHeight;
      const activeH = listH - COLLAPSED_H * (total - 1);

      rows.forEach((row, i) => {
        if (i === activeIdx) {
          row.style.height = `${activeH}px`;
          row.style.opacity = "1";
        } else {
          row.style.height = `${COLLAPSED_H}px`;
          row.style.opacity = "0.5";
        }
      });
      contents.forEach((el, i) => {
        el.style.opacity = i === activeIdx ? "1" : "0";
      });
    };

    applyLayout(0);

    const ctx = gsap.context(() => {
      const st = ScrollTrigger.create({
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
            applyLayout(newIndex);
          }
        },
      });
      mobileStRef.current = st;
    }, viewport);

    return () => {
      mobileStRef.current = null;
      ctx.revert();
    };
  }, [isMobile, process.length]);

  // Click row → scroll to matching position (works on both desktop and mobile)
  const handleRowClick = useCallback(
    (index: number) => {
      if (checkMobileLayout()) {
        // Mobile: scroll within the pinned ScrollTrigger range
        const st = mobileStRef.current;
        if (!st) return;
        const targetProgress = (index + 0.5) / process.length;
        const targetScroll = st.start + targetProgress * (st.end - st.start);
        window.scrollTo({ top: targetScroll, behavior: "smooth" });
      } else {
        // Desktop: horizontal scroll
        if (!panelRef.current) return;
        const rect = panelRef.current.getBoundingClientRect();
        const extraWidth = rect.width - window.innerWidth;
        if (extraWidth <= 0) return;
        const targetProgress = (index + 0.5) / process.length;
        const targetLeft = -(targetProgress * extraWidth);
        const deltaScrollY = rect.left - targetLeft;
        window.scrollTo({ top: window.scrollY + deltaScrollY });
      }
    },
    [process.length],
  );

  // Click dot / node → scroll to matching position

  return (
    <div ref={panelRef} className={`${styles.panel} ${styles.panelExtraWide}`}>
      <div
        ref={contentRef}
        className={`${styles.pinnedContent} ${styles.mobilePinViewport}`}
      >
        {/* Title row */}
        <div className={styles.pinnedTitleRow}>
          <div>
            <span className={styles.panelNumber}>05</span>
            <h3 className={styles.panelTitle}>Design Process.</h3>
          </div>
        </div>

        {/* Timeline + content body (row on mobile, column on desktop) */}
        <div className={styles.processBody}>
          {/* Timeline: horizontal on desktop, vertical on mobile */}
          <div className={styles.processTimeline}>
            <div className={styles.processTimelineTrack}>
              <div
                ref={progressRef}
                className={styles.processTimelineProgress}
              />
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
                    onClick={() => handleRowClick(i)}
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
                      {isActive && <div className={styles.processNodePulse} />}
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

          {/* Step content area — slide on desktop, opacity crossfade on mobile */}
          <div className={styles.processSingleView}>
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
        </div>

        {/* Mobile: accordion step rows — active expanded, others collapsed */}
        <div ref={stepListRef} className={styles.processStepList}>
          {process.map((p, i) => {
            const isDone = i < activeIndex;
            const isActive = i === activeIndex;
            return (
              <div
                data-clickable="true"
                key={i}
                className={`${styles.processStepRow} ${
                  isActive ? styles.processStepRowActive : ""
                }`}
                onClick={() => handleRowClick(i)}
              >
                {/* Left: continuous connector line + dot */}
                <div className={styles.processStepConnector}>
                  <div
                    className={`${styles.processConnectorDot} ${
                      isDone
                        ? styles.processConnectorDotDone
                        : isActive
                          ? styles.processConnectorDotActive
                          : ""
                    }`}
                  />
                  {i < process.length - 1 && (
                    <div
                      className={`${styles.processConnectorLine} ${
                        isDone ? styles.processConnectorLineDone : ""
                      }`}
                    />
                  )}
                </div>

                {/* Right: collapsed = step label only, expanded = full content */}
                <span className={styles.processStepLabel}>
                  {p.step}. {p.title[language]}
                </span>
                <div className={styles.processStepContent}>
                  <div className={styles.processStepHeader}>
                    <span className={styles.processStepNum}>{p.step}</span>
                    <h4 className={styles.processStepContentTitle}>
                      {p.title[language]}
                    </h4>
                  </div>
                  <p className={styles.processStepContentDesc}>
                    {p.description[language]}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
