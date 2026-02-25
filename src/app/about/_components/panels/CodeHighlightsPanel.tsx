"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { flushSync } from "react-dom";
import type { Language } from "@/providers/LanguageProvider";
import type { CodeExample } from "@/data/about";
import CodeHighlight from "../CodeHighlight";
import { renderHighlight } from "../renderHighlight";
import { getCodeDemo } from "./CodeDemos";
import { usePinnedScroll } from "../../_hooks/usePinnedScroll";
import PinnedTitleRow from "../PinnedTitleRow";
import styles from "../AboutSection.module.css";

interface CodeHighlightsPanelProps {
  language: Language;
  codeExamples: CodeExample[];
  scrollBy?: (deltaX: number) => void;
}

export default function CodeHighlightsPanel({
  language,
  codeExamples,
  scrollBy,
}: CodeHighlightsPanelProps) {
  const { panelRef, contentRef, activeIndex, scrollToItem } = usePinnedScroll(
    codeExamples.length,
    undefined,
    scrollBy,
  );
  const [expandedMobileCode, setExpandedMobileCode] = useState<number | null>(
    null,
  );
  const [codePage, setCodePage] = useState<{ page: number; total: number }>({
    page: 1,
    total: 1,
  });
  const codeWrapRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 코드 오버플로우 감지 및 페이지 위치 추적
  useEffect(() => {
    const wrap = codeWrapRefs.current[activeIndex];
    if (!wrap) return;
    const pre = wrap.querySelector("pre");
    if (!pre) return;

    pre.scrollTop = 0;

    const update = () => {
      const clientH = pre.clientHeight;
      const scrollH = pre.scrollHeight;
      if (clientH <= 0 || scrollH <= clientH) {
        setCodePage({ page: 1, total: 1 });
        return;
      }
      const maxScroll = scrollH - clientH;
      const steps = Math.max(1, Math.round(maxScroll / clientH));
      const total = steps + 1;
      const progress = pre.scrollTop / maxScroll;
      const page = Math.min(total, Math.round(progress * steps) + 1);
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

  // 모바일: 패널의 *축소된* 콘텐츠가 뷰포트를 벗어나면
  // 펼쳐진 항목 닫기
  useEffect(() => {
    if (expandedMobileCode === null) return;
    const el = panelRef.current;
    if (!el) return;

    let rafId: number;

    const check = () => {
      const rect = el.getBoundingClientRect();
      if (rect.top <= 0) {
        const openBody = el.querySelector(
          `.${styles.codeMobileBodyOpen}`,
        ) as HTMLElement | null;
        if (openBody) {
          const expandedHeight = openBody.offsetHeight;
          const collapsedBottom = rect.bottom - expandedHeight;

          if (
            collapsedBottom < 0 &&
            rect.bottom < window.innerHeight * 0.5
          ) {
            const heightBefore = el.offsetHeight;
            openBody.style.transition = "none";
            flushSync(() => setExpandedMobileCode(null));
            const heightAfter = el.offsetHeight;
            const delta = heightBefore - heightAfter;

            if (delta > 0) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const l = (window as any).lenis;
              if (l) {
                l.scrollTo(l.scroll - delta, { immediate: true });
              }
              el.style.marginBottom = "";
            }

            requestAnimationFrame(() => {
              openBody.style.transition = "";
            });
            return;
          }
        }
      }
      rafId = requestAnimationFrame(check);
    };

    rafId = requestAnimationFrame(check);
    return () => cancelAnimationFrame(rafId);
  }, [expandedMobileCode, panelRef]);

  const scrollCodePage = useCallback(
    (direction: 1 | -1) => {
      const wrap = codeWrapRefs.current[activeIndex];
      if (!wrap) return;
      const pre = wrap.querySelector("pre");
      if (!pre) return;
      const maxScroll = pre.scrollHeight - pre.clientHeight;
      const steps = Math.max(1, Math.round(maxScroll / pre.clientHeight));
      const stepSize = maxScroll / steps;
      pre.scrollBy({ top: direction * stepSize, behavior: "smooth" });
    },
    [activeIndex],
  );

  return (
    <div ref={panelRef} className={`${styles.panel} ${styles.panelExtraWide}`}>
      {/* 내부 래퍼: 고정된 것처럼 보이도록 카운터 트랜슬레이션 */}
      <div ref={contentRef} className={styles.pinnedContent}>
        <PinnedTitleRow
          number="10"
          title="Code Highlights."
          compact
          animate
          dotNav={{
            count: codeExamples.length,
            activeIndex,
            onDotClick: scrollToItem,
            labels: codeExamples.map((e) => e.title),
          }}
        />

        {/* 데스크톱: 단일 패인 뷰 — 한 번에 하나씩 */}
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

        {/* 모바일: 하단 구분선이 있는 목록 */}
        <div className={styles.codeListMobile}>
          {codeExamples.map((example, index) => {
            const isOpen = expandedMobileCode === index;
            return (
              <div key={index} className={styles.codeItemMobile}>
                <div
                  data-clickable="true"
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
                    <div className={styles.codeDemo}>{getCodeDemo(index)}</div>
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
