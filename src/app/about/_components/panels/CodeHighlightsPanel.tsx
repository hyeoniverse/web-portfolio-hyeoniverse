"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { flushSync } from "react-dom";
import type { Language } from "@/providers/LanguageProvider";
import { codeExamples } from "@/data/about/codeExamples";
import CodeHighlight from "../CodeHighlight";
import { renderHighlight } from "../renderHighlight";
import { getCodeDemo } from "./CodeDemos";
import { usePinnedScroll } from "../../_hooks/usePinnedScroll";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import PinnedTitleRow from "../PinnedTitleRow";
import shared from "../AboutSection.module.css";
import local from "./CodeHighlightsPanel.module.css";
const styles = { ...shared, ...local };

interface CodeHighlightsPanelProps {
  language: Language;
  scrollBy?: (deltaX: number) => void;
}

function CodeHighlightsPanel({
  language,
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
  const mobileHeaderRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isMobile = useMobileLayout();

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

  /**
   * 모바일 / 태블릿 — 스크롤 위치에 따라 항목을 자동 펼침.
   *
   * 동작:
   *   - 처음엔 expandedMobileCode = null → 모든 항목 접혀 있음
   *   - 사용자가 스크롤하면서 어떤 항목의 헤더가 viewport 중앙 \"활성 영역\" 에
   *     들어오면 그 항목을 자동 펼침
   *   - 다른 항목이 활성 영역에 들어오면 이전 항목은 자동 닫힘
   *
   * 활성 영역 = viewport 세로 중앙 약 30% 띠 (rootMargin -35% / -35%)
   * 헤더(고정 높이) 만 관찰해 body 의 펼침/접힘 layout shift 가 observer 를
   * 다시 트리거하지 않게 함.
   */
  useEffect(() => {
    if (!isMobile) return;
    const headers = mobileHeaderRefs.current.filter(
      (h): h is HTMLDivElement => h != null,
    );
    if (headers.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // 활성 영역에 들어와 있는 entry 중 첫 번째 (top 기준 가장 위에 있는 것) 를 선택
        const intersecting = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top,
          );
        if (intersecting.length === 0) return;
        const target = intersecting[0].target as HTMLDivElement;
        const idxStr = target.dataset.idx;
        if (!idxStr) return;
        const idx = Number(idxStr);
        setExpandedMobileCode((prev) => (prev === idx ? prev : idx));
      },
      {
        rootMargin: "-35% 0px -35% 0px",
        threshold: 0,
      },
    );

    headers.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [isMobile]);

  // 모바일에서 데스크톱으로 전환 시 펼친 항목 정리
  useEffect(() => {
    if (!isMobile && expandedMobileCode !== null) {
      flushSync(() => setExpandedMobileCode(null));
    }
  }, [isMobile, expandedMobileCode]);

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
    <div ref={panelRef} className={`${styles.panel} ${styles.panelExtraWide} ${styles.panelFlush}`}>
      {/* 내부 래퍼: 고정된 것처럼 보이도록 카운터 트랜슬레이션 */}
      <div ref={contentRef} className={styles.pinnedContent}>
        <PinnedTitleRow
          className={styles.titleRowCompact}
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
                  ref={(el) => {
                    mobileHeaderRefs.current[index] = el;
                  }}
                  data-idx={index}
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

export default memo(CodeHighlightsPanel);
