"use client";

import { useState, memo } from "react";

import type { Language } from "@/providers/LanguageProvider";
import { codeExamples } from "@/data/about/codeExamples";
import type { CodeExample } from "@/data/about/types";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import CodeHighlight from "../CodeHighlight";
import { renderHighlight } from "../renderHighlight";
import CodeDemoSlot, { type CodeDemoMode } from "./CodeDemoSlot";
import { detectCodeLanguage } from "./detectCodeLanguage";
import { usePinnedScroll } from "../../_hooks/usePinnedScroll";
import { useNearViewport } from "../../_hooks/useNearViewport";
import { useCodePaging } from "./codeHighlights/useCodePaging";
import PinnedTitleRow from "../PinnedTitleRow";
import frame from "../AboutPanel.module.css";
import shell from "../AboutSection.module.css";
import local from "./CodeHighlightsPanel.module.css";
import Pressable from "@/components/ui/Pressable";
const shared = { ...frame, ...shell };
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
  /* 코드 데모 미리보기(Sandpack)는 띄울 때마다 CodeSandbox 에서 3 MB 가까이 받는다. 데스크톱은 끝없는
     가로 스크롤 때문에 이 패널이 세 벌이라, 세 벌이 페이지를 열자마자 화면 밖에서 각자 미리보기를 띄웠다.
     데스크톱 보기가 화면 근처에 온 벌만 띄운다(ErdPanel 과 같은 방식). 모바일에서는 이 보기가
     display: none 이라 켜지지 않고, 목록에서 펼친 항목만 띄운다. */
  const { ref: singleViewRef, near } = useNearViewport<HTMLDivElement>();
  const { codeWrapRefs, codePage, scrollCodePage } = useCodePaging({
    activeIndex,
    expandedMobileCode,
    setExpandedMobileCode,
    panelRef,
  });

  return (
    <div ref={panelRef} className={`${styles.panel} ${styles.panelExtraWide} ${styles.panelFlush}`}>
      {/* 내부 래퍼: 고정된 것처럼 보이도록 카운터 트랜슬레이션 */}
      <div ref={contentRef} className={styles.pinnedContent}>
        <PinnedTitleRow
          panelKey="codeHighlights"
          className={`${styles.titleRowCompact} ${local.codePinTitleRow}`}
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
        <div ref={singleViewRef} className={`${styles.codeSingleView} ${styles.animate}`}>
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
                  <div className={styles.codeDemo} style={example.demoBg ? { background: example.demoBg } : undefined}><CodeDemoSlot mode={example.demoMode} media={example.demoMedia} files={example.demoFiles} template={example.demoTemplate} active={near && index === activeIndex} /></div>
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
