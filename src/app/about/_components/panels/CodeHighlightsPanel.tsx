"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { flushSync } from "react-dom";
import type Lenis from "@studio-freight/lenis";
import type { Language } from "@/providers/LanguageProvider";
import { codeExamples } from "@/data/about/codeExamples";
import type { CodeExample } from "@/data/about/types";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import CodeHighlight from "../CodeHighlight";
import { renderHighlight } from "../renderHighlight";
import CodeDemoSlot, { type CodeDemoMode } from "./CodeDemoSlot";
import { detectCodeLanguage } from "./detectCodeLanguage";
import { usePinnedScroll } from "../../_hooks/usePinnedScroll";
import PinnedTitleRow from "../PinnedTitleRow";
import shared from "../AboutSection.module.css";
import local from "./CodeHighlightsPanel.module.css";
import Pressable from "@/components/ui/Pressable";
const styles = { ...shared, ...local };

interface CodeHighlightsPanelProps {
  language: Language;
  scrollBy?: (deltaX: number) => void;
}

/* 데모가 실제로 있는 항목만 데모 칸을 만든다. 빈 CodeDemoSlot 은 null 을 반환하는데
   감싼 .codeDemo 가 flex:1 이라, 그냥 두면 아무것도 없는 칸이 폭 절반을 차지한다. */
function hasDemo(e: CodeExample): boolean {
  if (e.demoMode === "sandbox") {
    return !!e.demoFiles && Object.values(e.demoFiles).some((c) => c.trim());
  }
  if (e.demoMode === "media") return !!e.demoMedia?.trim();
  return false;
}

/* admin (siteConfig.about.codeHighlights) flat shape → CodeExample nested shape 변환 */
type CfgCode = { title: string; description_ko: string; description_en: string; language: string; code: string;
  demoMode?: CodeDemoMode; demoMedia?: string; demoFiles?: Record<string, string>; demoTemplate?: string; demoBg?: string };
function adaptCode(list: CfgCode[]): CodeExample[] {
  return list.map((c) => ({
    title: c.title,
    description: { ko: c.description_ko, en: c.description_en },
    language: c.language,
    code: c.code,
    demoMode: c.demoMode,
    demoMedia: c.demoMedia,
    demoFiles: c.demoFiles,
    demoTemplate: c.demoTemplate,
    demoBg: c.demoBg,
  }));
}

function CodeHighlightsPanel({
  language,
  scrollBy,
}: CodeHighlightsPanelProps) {
  const cfg = useSiteConfig();
  const cfgCode = cfg.about.codeHighlights;
  const examples = cfgCode && cfgCode.length > 0 ? adaptCode(cfgCode) : codeExamples;
  const { panelRef, contentRef, activeIndex, scrollToItem } = usePinnedScroll(
    examples.length,
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
              // LenisProvider 가 window.lenis 로 인스턴스 노출 (디버깅 + 외부 접근용)
              const l = (window as typeof window & { lenis?: Lenis }).lenis;
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
    <div ref={panelRef} className={`${styles.panel} ${styles.panelExtraWide} ${styles.panelFlush}`}>
      {/* 내부 래퍼: 고정된 것처럼 보이도록 카운터 트랜슬레이션 */}
      <div ref={contentRef} className={styles.pinnedContent}>
        <PinnedTitleRow
          panelKey="codeHighlights"
          className={`${styles.titleRowCompact} ${local.codePinTitleRow}`}
          title="Code Highlights."
          compact
          animate
          dotNav={{
            count: examples.length,
            activeIndex,
            onDotClick: scrollToItem,
            labels: examples.map((e) => e.title),
          }}
        />

        {/* 데스크톱: 단일 패인 뷰 — 한 번에 하나씩 */}
        <div className={`${styles.codeSingleView} ${styles.animate}`}>
          {examples.map((example, index) => (
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
                {hasDemo(example) && (
                  <div className={styles.codeDemo} style={example.demoBg ? { background: example.demoBg } : undefined}><CodeDemoSlot mode={example.demoMode} media={example.demoMedia} files={example.demoFiles} template={example.demoTemplate} active={index === activeIndex} /></div>
                )}
                <div
                  ref={(el) => {
                    codeWrapRefs.current[index] = el;
                  }}
                  className={styles.codeScrollWrap}
                >
                  <CodeHighlight
                    code={example.code}
                    language={example.language || detectCodeLanguage(example.code)}
                  />
                  {codePage.total > 1 && index === activeIndex && (
                    <div className={styles.codePageNav}>
                      <Pressable
                        data-clickable="true"
                        className={styles.codePageBtn}
                        disabled={codePage.page <= 1}
                        onClick={() => scrollCodePage(-1)}
                      >
                        ↑
                      </Pressable>
                      <span>
                        {codePage.page}/{codePage.total}
                      </span>
                      <Pressable
                        data-clickable="true"
                        className={styles.codePageBtn}
                        disabled={codePage.page >= codePage.total}
                        onClick={() => scrollCodePage(1)}
                      >
                        ↓
                      </Pressable>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 모바일: 하단 구분선이 있는 목록 */}
        <div className={styles.codeListMobile}>
          {examples.map((example, index) => {
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
                    {hasDemo(example) && (
                      <div className={styles.codeDemo} style={example.demoBg ? { background: example.demoBg } : undefined}><CodeDemoSlot mode={example.demoMode} media={example.demoMedia} files={example.demoFiles} template={example.demoTemplate} active={isOpen} /></div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <CodeHighlight
                        code={example.code}
                        language={example.language || detectCodeLanguage(example.code)}
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
