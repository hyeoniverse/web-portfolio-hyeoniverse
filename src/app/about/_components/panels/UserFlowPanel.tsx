"use client";

import { useState, useCallback, memo } from "react";
import type { Language } from "@/providers/LanguageProvider";
import { userFlows } from "@/data/about/architecture";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { usePinnedScroll } from "../../_hooks/usePinnedScroll";
import { useMobilePinScroll } from "../../_hooks/useMobilePinScroll";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import PinnedTitleRow from "../PinnedTitleRow";
import T from "@/components/ui/T";

import UserFlowDiagram from "./userFlow/UserFlowDiagram";
import UserFlowMobileList from "./userFlow/UserFlowMobileList";
import shared from "../AboutPanel.module.css";
import local from "./UserFlowPanel.module.css";
const styles = { ...shared, ...local };

interface UserFlowPanelProps {
  language: Language;
  scrollBy?: (deltaX: number) => void;
}

function UserFlowPanel({
  language,
  scrollBy,
}: UserFlowPanelProps) {
  /* admin(about.userFlows) override — 비어있으면 정적 데이터 */
  const cfg = useSiteConfig();
  const cfgFlows = cfg.about.userFlows;
  const flows = cfgFlows && cfgFlows.length > 0 ? cfgFlows : userFlows;
  const flowCount = flows.length;
  const isMobile = useMobileLayout();

  /* ── Pinned Scroll ── */
  const { panelRef, contentRef, activeIndex, scrollToItem } = usePinnedScroll(
    flowCount,
    undefined,
    scrollBy,
  );

  const [mobileActiveIdx, setMobileActiveIdx] = useState(0);
  const mobileStRef = useMobilePinScroll(
    contentRef,
    flowCount,
    500,
    useCallback((idx: number) => setMobileActiveIdx(idx), []),
    [],
  );

  const currentIdx = isMobile ? mobileActiveIdx : activeIndex;
  const activeFlow = flows[currentIdx] ?? flows[0];

  return (
    <div
      ref={panelRef}
      className={`${styles.panel} ${styles.panelExtraWide} ${styles.panelFlush}`}
    >
      <div
        ref={contentRef}
        className={`${styles.pinnedContent} ${styles.mobilePinViewport}`}
      >
        <PinnedTitleRow
          panelKey="userflow"
          className={isMobile ? styles.ufTitleRow : undefined}
          dotNav={{
            count: flowCount,
            activeIndex: currentIdx,
            onDotClick: (i) => scrollToItem(i, mobileStRef),
            labels: flows.map((f) => f.title),
          }}
          rightContent={
            <div className={styles.ufFlowLegend}>
              <div className={styles.ufLegendItem}>
                <svg width="28" height="16" viewBox="0 0 28 16">
                  <rect x="1" y="1" width="26" height="14" rx="7" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" />
                </svg>
                <span><T k="aboutPage.userFlow.startEnd" /></span>
              </div>
              <div className={styles.ufLegendItem}>
                <svg width="28" height="16" viewBox="0 0 28 16">
                  <rect x="1" y="1" width="26" height="14" rx="3" fill="none" stroke="var(--text-secondary)" strokeWidth="1" />
                </svg>
                <span><T k="aboutPage.userFlow.screenAction" /></span>
              </div>
              <div className={styles.ufLegendItem}>
                <svg width="22" height="16" viewBox="0 0 22 16">
                  <polygon points="11,0 22,8 11,16 0,8" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" />
                </svg>
                <span><T k="aboutPage.userFlow.decision" /></span>
              </div>
            </div>
          }
        />

        {/* ── Desktop: Info (top) + Diagram (bottom) ── */}
        <UserFlowDiagram flow={activeFlow} language={language} seqKey={currentIdx} />

        {/* ── Mobile: simplified flow list ── */}
        <UserFlowMobileList flows={flows} language={language} activeIdx={currentIdx} />
      </div>
    </div>
  );
}

export default memo(UserFlowPanel);
