"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Language } from "@/providers/LanguageProvider";
import type { CodeExample } from "@/data/webflow";
import CodeHighlight from "../CodeHighlight";
import { renderHighlight } from "../renderHighlight";
import { getCodeDemo } from "./CodeDemos";
import { checkMobileLayout } from "../../_hooks/mobileCheck";
import styles from "../WebFlowSection.module.css";

interface CodeHighlightsPanelProps {
  language: Language;
  codeExamples: CodeExample[];
}

export default function CodeHighlightsPanel({
  language,
  codeExamples,
}: CodeHighlightsPanelProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [expandedMobileCode, setExpandedMobileCode] = useState<number | null>(
    null,
  );
  const [codePage, setCodePage] = useState<{ page: number; total: number }>({
    page: 1,
    total: 1,
  });
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const codeWrapRefs = useRef<(HTMLDivElement | null)[]>([]);

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
          const offset = Math.max(0, Math.min(-rect.left, extraWidth));
          contentRef.current.style.transform = `translateX(${offset}px)`;

          const progress = Math.max(
            0,
            Math.min(1, -rect.left / extraWidth),
          );
          const newIndex = Math.min(
            codeExamples.length - 1,
            Math.floor(progress * codeExamples.length),
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
  }, [codeExamples.length]);

  // Click dot → scroll to matching position
  const handleDotClick = useCallback(
    (index: number) => {
      if (!panelRef.current || checkMobileLayout()) return;

      const rect = panelRef.current.getBoundingClientRect();
      const extraWidth = rect.width - window.innerWidth;
      if (extraWidth <= 0) return;

      const targetProgress = (index + 0.5) / codeExamples.length;
      const targetLeft = -(targetProgress * extraWidth);
      const deltaScrollY = rect.left - targetLeft;

      window.scrollTo({ top: window.scrollY + deltaScrollY });
    },
    [codeExamples.length],
  );

  // Detect code overflow and track page position
  useEffect(() => {
    const wrap = codeWrapRefs.current[activeIndex];
    if (!wrap) return;
    const pre = wrap.querySelector("pre");
    if (!pre) return;

    pre.scrollTop = 0;

    const update = () => {
      const clientH = pre.clientHeight;
      if (clientH <= 0) return;
      const total = Math.max(1, Math.ceil(pre.scrollHeight / clientH));
      const page = Math.min(
        total,
        Math.floor(pre.scrollTop / clientH) + 1,
      );
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

  const scrollCodePage = useCallback(
    (direction: 1 | -1) => {
      const wrap = codeWrapRefs.current[activeIndex];
      if (!wrap) return;
      const pre = wrap.querySelector("pre");
      if (!pre) return;
      pre.scrollBy({ top: direction * pre.clientHeight, behavior: "smooth" });
    },
    [activeIndex],
  );

  return (
    <div
      ref={panelRef}
      className={`${styles.panel} ${styles.panelExtraWide}`}
    >
      {/* Inner wrapper: counter-translated to appear pinned */}
      <div ref={contentRef} className={styles.pinnedContent}>
        <div className={styles.pinnedTitleRow}>
          <div>
            <span className={`${styles.panelNumber} ${styles.animate}`}>07</span>
            <h3
              className={`${styles.panelTitle} ${styles.panelTitleCompact} ${styles.animate}`}
            >
              Code Highlights.
            </h3>
          </div>

          {/* Dot navigation */}
          <div className={`${styles.dotNav} ${styles.animate}`}>
            {codeExamples.map((_, index) => (
              <div
                data-clickable="true"
                key={index}
                className={`${styles.dot} ${
                  index === activeIndex ? styles.dotActive : ""
                }`}
                onClick={() => handleDotClick(index)}
              />
            ))}
          </div>
        </div>

        {/* Desktop: single pane view — one item at a time */}
        <div className={`${styles.codeSingleView} ${styles.animate}`}>
          {codeExamples.map((example, index) => (
            <div
              key={index}
              className={`${styles.codeSinglePane} ${
                index === activeIndex ? styles.codeSinglePaneActive : ""
              }`}
            >
              <div className={styles.codeSingleHeader}>
                <span className={styles.codeSingleNumber}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className={styles.codeSingleMeta}>
                  <h4>{example.title}</h4>
                  <p className={styles.codeSingleDesc}>
                    {renderHighlight(example.description[language])}
                  </p>
                </div>
              </div>
              <div className={styles.codeSingleBody}>
                <div className={styles.codeDemo}>{getCodeDemo(index)}</div>
                <div
                  ref={(el) => {
                    codeWrapRefs.current[index] = el;
                  }}
                  className={styles.codeScrollWrap}
                >
                  <CodeHighlight
                    code={example.code}
                    language={example.language}
                  />
                  {codePage.total > 1 && index === activeIndex && (
                    <div className={styles.codePageNav}>
                      <button
                        data-clickable="true"
                        className={styles.codePageBtn}
                        disabled={codePage.page <= 1}
                        onClick={() => scrollCodePage(-1)}
                      >
                        ↑
                      </button>
                      <span>
                        {codePage.page}/{codePage.total}
                      </span>
                      <button
                        data-clickable="true"
                        className={styles.codePageBtn}
                        disabled={codePage.page >= codePage.total}
                        onClick={() => scrollCodePage(1)}
                      >
                        ↓
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile: list with border-bottom dividers */}
        <div className={styles.codeListMobile}>
          {codeExamples.map((example, index) => {
            const isOpen = expandedMobileCode === index;
            return (
              <div
                key={index}
                className={styles.codeItemMobile}
              >
                <div
                  className={styles.codeMobileHeader}
                  onClick={() => setExpandedMobileCode(isOpen ? null : index)}
                >
                  <span className={styles.codeNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className={styles.codeMobilePreview}>
                    <h4 className={styles.codeTitle}>{example.title}</h4>
                    <p className={styles.codeDesc}>
                      {renderHighlight(example.description[language])}
                    </p>
                  </div>
                  <span
                    className={`${styles.codeMobileToggle} ${isOpen ? styles.codeMobileToggleOpen : ""}`}
                  >
                    +
                  </span>
                </div>
                <div
                  className={`${styles.codeMobileBody} ${isOpen ? styles.codeMobileBodyOpen : ""}`}
                >
                  <div className={styles.codeRevealContent}>
                    <div className={styles.codeDemo}>
                      {getCodeDemo(index)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <CodeHighlight
                        code={example.code}
                        language={example.language}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
