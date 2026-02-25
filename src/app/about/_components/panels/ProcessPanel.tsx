"use client";

import { useRef, useState, useLayoutEffect, useCallback } from "react";
import type { Language } from "@/providers/LanguageProvider";
import type { ProcessStep } from "@/data/about";
import { useMobileLayout } from "../../_hooks/mobileCheck";
import { usePinnedScroll } from "../../_hooks/usePinnedScroll";
import { useMobilePinScroll } from "../../_hooks/useMobilePinScroll";
import { renderHighlight } from "../renderHighlight";
import PinnedTitleRow from "../PinnedTitleRow";
import styles from "../AboutSection.module.css";

interface ProcessPanelProps {
  language: Language;
  process: ProcessStep[];
  scrollBy?: (deltaX: number) => void;
}

export default function ProcessPanel({ language, process, scrollBy }: ProcessPanelProps) {
  const isMobile = useMobileLayout();
  const progressRef = useRef<HTMLDivElement>(null);

  // 데스크톱: 인덱스 변경 시 프로그레스 바 업데이트
  const onIndexChange = useCallback(
    (index: number) => {
      if (progressRef.current) {
        const progressPct = ((index + 0.5) / process.length) * 100;
        progressRef.current.style.width = `${progressPct}%`;
      }
    },
    [process.length],
  );

  const { panelRef, contentRef, activeIndex, scrollToItem } = usePinnedScroll(
    process.length,
    onIndexChange,
    scrollBy,
  );

  // 모바일/태블릿: 아코디언 레이아웃
  const stepListRef = useRef<HTMLDivElement>(null);
  const [mobileActiveIdx, setMobileActiveIdx] = useState(0);
  const COLLAPSED_HEIGHT = 36;

  const handleMobileIndexChange = useCallback((activeIdx: number) => {
    setMobileActiveIdx(activeIdx);
    const stepList = stepListRef.current;
    if (!stepList) return;

    const rows = Array.from(
      stepList.querySelectorAll<HTMLElement>(`.${styles.processStepRow}`),
    );
    const contents = Array.from(
      stepList.querySelectorAll<HTMLElement>(`.${styles.processStepContent}`),
    );
    const total = rows.length;
    const listHeight = stepList.offsetHeight;
    const activeHeight = listHeight - COLLAPSED_HEIGHT * (total - 1);

    rows.forEach((row, i) => {
      if (i === activeIdx) {
        row.style.height = `${activeHeight}px`;
        row.style.opacity = "1";
      } else {
        row.style.height = `${COLLAPSED_HEIGHT}px`;
        row.style.opacity = "0.5";
      }
    });
    contents.forEach((el, i) => {
      el.style.opacity = i === activeIdx ? "1" : "0";
    });
  }, []);

  // 모바일: 초기 레이아웃 설정
  useLayoutEffect(() => {
    if (!isMobile) return;
    handleMobileIndexChange(0);
  }, [isMobile, handleMobileIndexChange]);

  // 모바일: GSAP ScrollTrigger 고정 스크롤
  const mobileStRef = useMobilePinScroll(
    contentRef, process.length, 500, handleMobileIndexChange,
  );

  // 행 클릭 → 해당 위치로 스크롤 (데스크톱은 훅, 모바일은 ScrollTrigger)
  const handleRowClick = useCallback(
    (index: number) => {
      if (isMobile) {
        const st = mobileStRef.current;
        if (!st) return;
        const targetProgress = (index + 0.5) / process.length;
        const targetScroll = st.start + targetProgress * (st.end - st.start);
        window.scrollTo({ top: targetScroll, behavior: "smooth" });
      } else {
        scrollToItem(index);
      }
    },
    [process.length, scrollToItem, mobileStRef, isMobile],
  );

  return (
    <div ref={panelRef} className={`${styles.panel} ${styles.panelExtraWide}`}>
      <div
        ref={contentRef}
        className={`${styles.pinnedContent} ${styles.mobilePinViewport}`}
      >
        {/* 타이틀 행 */}
        <PinnedTitleRow number="06" title="Design Process." />

        {/* 타임라인 + 콘텐츠 본문 (모바일은 행, 데스크톱은 열) */}
        <div className={styles.processBody}>
          {/* 타임라인: 데스크톱은 수평, 모바일은 수직 */}
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

          {/* 스텝 콘텐츠 영역 — 데스크톱은 슬라이드, 모바일은 크로스페이드 */}
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
                    {renderHighlight(p.description[language])}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 모바일: 아코디언 스텝 행 — 활성은 확장, 나머지는 축소 */}
        <div ref={stepListRef} className={styles.processStepList}>
          {process.map((p, i) => {
            const isDone = i < mobileActiveIdx;
            const isActive = i === mobileActiveIdx;
            return (
              <div
                data-clickable="true"
                key={i}
                className={`${styles.processStepRow} ${
                  isActive ? styles.processStepRowActive : ""
                }`}
                onClick={() => handleRowClick(i)}
              >
                {/* 왼쪽: 연속 연결선 + 점 */}
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

                {/* 오른쪽: 축소 = 스텝 라벨만, 확장 = 전체 콘텐츠 */}
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
                    {renderHighlight(p.description[language])}
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
