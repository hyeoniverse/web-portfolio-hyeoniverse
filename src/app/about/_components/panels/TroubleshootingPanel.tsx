"use client";

import React, { useCallback, useRef, useState, useEffect, memo } from "react";
import { Star } from "lucide-react";
import type { Language } from "@/providers/LanguageProvider";
import { troubleShootingItems } from "@/data/about/troubleshooting";
import type { TroubleshootingDifficulty } from "@/data/about/types";
import { renderHighlight } from "../renderHighlight";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { usePinnedScroll } from "../../_hooks/usePinnedScroll";
import PinnedTitleRow from "../PinnedTitleRow";
import FlowDiagram from "../FlowDiagram";
import T from "@/components/ui/T";
import shared from "../AboutSection.module.css";
import local from "./TroubleshootingPanel.module.css";
const styles = { ...shared, ...local };

interface TroubleshootingPanelProps {
  language: Language;
  scrollBy?: (deltaX: number) => void;
}

/** 난이도 dot — 1~3 단계, 표시 채워진 갯수 */
function DifficultyDots({ level, large }: { level: TroubleshootingDifficulty; large?: boolean }) {
  return (
    <span className={large ? styles.troubleHeaderDifficulty : styles.troubleDifficultyBadge} title={`Difficulty ${level}/3`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`${styles.troubleDifficultyDot} ${i <= level ? styles.troubleDifficultyDotActive : ""}`}
        />
      ))}
    </span>
  );
}

function TroubleshootingPanel({
  language,
  scrollBy,
}: TroubleshootingPanelProps) {
  const items = troubleShootingItems;
  const isMobile = useMobileLayout();
  const listRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);
  const [listPage, setListPage] = useState({ page: 1, total: 1 });
  const [detailIndex, setDetailIndex] = useState(0);
  const { panelRef, contentRef } = usePinnedScroll(
    items.length,
    undefined,
    scrollBy,
  );

  const displayIndex = detailIndex;

  // 클릭 핸들러 — 데스크톱: 디테일 영역으로 스크롤
  const handleItemClick = useCallback(
    (index: number) => {
      const detail = detailRef.current;
      if (!detail) return;
      const itemEls = detail.querySelectorAll(`.${styles.troubleDetailItem}`);
      const target = itemEls[index] as HTMLElement | undefined;
      if (target) {
        userScrolledRef.current = true;
        detail.scrollTo({ top: target.offsetTop, behavior: "smooth" });
      }
    },
    [],
  );

  // 활성 항목 변경 시 해당 항목으로 리스트 자동 스크롤
  useEffect(() => {
    const scroll = listRef.current;
    if (!scroll || isMobile) return;

    // 첫 번째 항목이면 맨 위로 (section label 포함)
    if (displayIndex === 0) {
      scroll.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const listItems = scroll.querySelectorAll(`.${styles.troubleListItem}`);
    const item = listItems[displayIndex] as HTMLElement | undefined;
    if (!item) return;

    // section label이 바로 위에 있으면 그것까지 보이도록
    const prev = item.previousElementSibling;
    const targetTop = prev?.classList.contains(styles.troubleSectionLabel)
      ? (prev as HTMLElement).offsetTop
      : item.offsetTop;

    const itemBottom = item.offsetTop + item.offsetHeight;
    const viewTop = scroll.scrollTop;
    const visibleBottom = viewTop + scroll.clientHeight;

    if (targetTop < viewTop) {
      scroll.scrollTo({ top: targetTop, behavior: "smooth" });
    } else if (itemBottom > visibleBottom) {
      scroll.scrollTo({ top: itemBottom - scroll.clientHeight, behavior: "smooth" });
    }
  }, [displayIndex, isMobile]);

  // 리스트 오버플로 감지 → 페이지 네비게이션 표시
  useEffect(() => {
    const el = listRef.current;
    if (!el || isMobile) return;
    const update = () => {
      const { clientHeight, scrollHeight, scrollTop } = el;
      if (scrollHeight <= clientHeight) { setListPage({ page: 1, total: 1 }); return; }
      const maxScroll = scrollHeight - clientHeight;
      const steps = Math.max(1, Math.round(maxScroll / clientHeight));
      const total = steps + 1;
      const page = Math.min(total, Math.round((scrollTop / maxScroll) * steps) + 1);
      setListPage({ page, total });
    };
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => { ro.disconnect(); el.removeEventListener("scroll", update); };
  }, [isMobile]);

  const scrollListPage = useCallback((dir: 1 | -1) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollBy({ top: dir * el.clientHeight, behavior: "smooth" });
  }, []);

  // 데스크톱: 디테일 컨테이너 스크롤 위치 → detailIndex 추적
  useEffect(() => {
    const detail = detailRef.current;
    if (!detail || isMobile) return;

    const onScroll = () => {
      const itemEls = detail.querySelectorAll(`.${styles.troubleDetailItem}`);
      const mid = detail.scrollTop + detail.clientHeight / 2;
      let idx = 0;
      for (let i = 0; i < itemEls.length; i++) {
        const el = itemEls[i] as HTMLElement;
        if (el.offsetTop <= mid) idx = i;
      }
      setDetailIndex(idx);
    };

    detail.addEventListener("scroll", onScroll, { passive: true });
    return () => detail.removeEventListener("scroll", onScroll);
  }, [isMobile]);

  // 데스크톱: 패널 포커스 시 wheel → 디테일 컨테이너 스크롤, 경계 도달 시 가로 스크롤
  // 단, wheel target 이 sidebar(목록) 내부면 sidebar 가 자체 스크롤하도록 양보
  useEffect(() => {
    if (isMobile) return;

    const handleWheel = (e: WheelEvent) => {
      const panel = panelRef.current;
      const detail = detailRef.current;
      const list = listRef.current;
      if (!panel || !detail) return;

      const panelRect = panel.getBoundingClientRect();
      const extraWidth = panelRect.width - window.innerWidth;
      if (extraWidth <= 0) return;
      const progress = -panelRect.left / extraWidth;
      if (progress < 0.02 || progress > 0.98) return;

      // sidebar 위에서 휠 → sidebar 가 직접 스크롤. 단, 끝에 도달하면 detail 로 위임
      if (list && list.contains(e.target as Node)) {
        const { scrollTop: lTop, scrollHeight: lH, clientHeight: lCh } = list;
        if (lH > lCh) {
          const lAtTop = lTop <= 0;
          const lAtBottom = lTop + lCh >= lH - 1;
          if ((e.deltaY > 0 && !lAtBottom) || (e.deltaY < 0 && !lAtTop)) {
            e.stopPropagation();
            e.preventDefault();
            list.scrollBy({ top: e.deltaY });
            return;
          }
        }
      }

      const { scrollTop, scrollHeight, clientHeight } = detail;
      if (scrollHeight <= clientHeight) return;

      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

      if ((e.deltaY > 0 && !atBottom) || (e.deltaY < 0 && !atTop)) {
        e.stopPropagation();
        e.preventDefault();
        detail.scrollBy({ top: e.deltaY });
      }
    };

    window.addEventListener("wheel", handleWheel, { capture: true, passive: false });
    return () => window.removeEventListener("wheel", handleWheel, { capture: true });
  }, [isMobile, panelRef]);

  // 데스크톱: 패널이 뷰포트 밖일 때 진입 방향에 맞춰 스크롤 위치 사전 설정
  // → 진입 시 이미 올바른 위치에 있으므로 플래시 없음
  useEffect(() => {
    if (isMobile) return;
    const panel = panelRef.current;
    const detail = detailRef.current;
    if (!panel || !detail) return;

    const check = () => {
      const rect = panel.getBoundingClientRect();
      const extra = rect.width - window.innerWidth;
      if (extra <= 0) return;
      const progress = -rect.left / extra;

      if (progress >= 0.98) {
        // 오른쪽 밖 → 역스크롤 시 하단부터 시작하도록 사전 설정
        userScrolledRef.current = false;
        detail.scrollTop = detail.scrollHeight - detail.clientHeight;
      } else if (progress <= 0.02) {
        // 왼쪽 밖 → 정방향 진입 시 상단부터 (사용자 클릭 스크롤 중이면 건너뜀)
        if (!userScrolledRef.current) {
          detail.scrollTop = 0;
        }
      } else {
        // 패널이 뷰포트 안에 있으면 플래그 유지 (사용자 클릭 상태 존중)
      }
    };

    const raf = { id: requestAnimationFrame(function loop() { check(); raf.id = requestAnimationFrame(loop); }) };
    return () => cancelAnimationFrame(raf.id);
  }, [isMobile, panelRef]);

  return (
    <div ref={panelRef} className={`${styles.panel} ${styles.panelExtraWide}`}>
      {/* 내부 래퍼: 고정된 것처럼 보이도록 카운터 트랜슬레이션 */}
      <div ref={contentRef} className={styles.pinnedContent}>
        <PinnedTitleRow
         
          title={<T k="aboutPage.panels.troubleShooting" />}
          compact
          animate
          dotNav={{
            count: items.length,
            activeIndex: displayIndex,
            onDotClick: handleItemClick,
            className: styles.dotNavMobileOnly,
          }}
        />

        {/* 데스크톱: 분할 레이아웃 — 목록 + 상세 */}
        <div className={`${styles.troubleSplit} ${styles.animate}`}>
          {/* 왼쪽: 항목 목록 */}
          <div className={styles.troubleList}>
            <div ref={listRef} className={styles.troubleListScroll}>
              {items.map((item, index) => {
                // 같은 section 의 첫 번째 항목일 때만 라벨 렌더 (그룹 헤더 역할)
                const prev = index > 0 ? items[index - 1] : null;
                const isSectionStart = !!item.section && item.section.ko !== prev?.section?.ko;
                // 그룹 내 위치 — count badge 용
                const sectionItems = items.filter((it) => it.section?.ko === item.section?.ko);
                return (
                  <React.Fragment key={index}>
                    {isSectionStart && item.section && (
                      <div className={styles.troubleSectionLabel}>
                        <span>{item.section[language]}</span>
                        <span className={styles.troubleSectionCount}>{sectionItems.length}</span>
                      </div>
                    )}
                    <div
                      data-clickable="true"
                      className={`${styles.troubleListItem} ${styles.troubleListItemGrouped} ${
                        index === displayIndex ? styles.troubleListItemActive : ""
                      }`}
                      onClick={() => handleItemClick(index)}
                    >
                      <span className={styles.troubleNumber}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className={styles.troubleListTitle}>
                        {item.problem[language]}
                      </span>
                      <span className={styles.troubleListBadges}>
                        {item.recommended && (
                          <span className={styles.troubleRecommendedBadge} title="추천">
                            <Star size={11} fill="currentColor" strokeWidth={1.5} />
                          </span>
                        )}
                        {item.difficulty && <DifficultyDots level={item.difficulty} />}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
            <div className={styles.troublePageNav}>
              <button className={styles.troublePageBtn} disabled={listPage.page <= 1} onClick={() => scrollListPage(-1)}>↑</button>
              <span>{listPage.page}/{listPage.total}</span>
              <button className={styles.troublePageBtn} disabled={listPage.page >= listPage.total} onClick={() => scrollListPage(1)}>↓</button>
            </div>
          </div>

          {/* 오른쪽: 상세 콘텐츠 (세로 연속 스크롤) */}
          <div ref={detailRef} className={styles.troubleDetail}>
            {items.map((item, index) => (
              <div
                key={index}
                className={`${styles.troubleDetailItem} ${
                  index === displayIndex ? styles.troubleDetailItemActive : ""
                }`}
              >
                <div className={styles.detailHeader}>
                  <span className={`${styles.detailNumber} ${styles.watermarkNumber} ${styles.troubleDetailNumber}`}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h4 className={styles.troubleTitle}>
                    {item.problem[language]}
                  </h4>
                  <span className={styles.troubleHeaderBadges}>
                    {item.recommended && (
                      <span className={styles.troubleHeaderRecommended}>
                        <Star size={11} fill="currentColor" strokeWidth={1.5} />
                        {language === "ko" ? "추천" : "Recommended"}
                      </span>
                    )}
                    {item.difficulty && <DifficultyDots level={item.difficulty} large />}
                  </span>
                </div>
                <div className={styles.troubleBody}>
                  <div className={styles.troubleEntry}>
                    <span className={styles.entryLabel}>
                      <T k="aboutPage.troubleshooting.definition" />
                    </span>
                    <p>{renderHighlight(item.definition[language], language)}</p>
                  </div>
                  <div className={styles.troubleEntry}>
                    <span className={styles.entryLabel}>
                      {item.causeLabel
                        ? item.causeLabel[language]
                        : <T k="aboutPage.troubleshooting.cause" />}
                    </span>
                    <p>{renderHighlight(item.cause[language], language)}</p>
                  </div>
                  <div className={styles.troubleEntry}>
                    <span
                      className={`${styles.entryLabel} ${styles.entryLabelAccent}`}
                    >
                      <T k="aboutPage.troubleshooting.solution" />
                    </span>
                    <p>{renderHighlight(item.solution[language], language)}</p>
                  </div>
                  {item.comparisons && item.comparisons.length > 0 && (
                    <div className={styles.troubleEntry}>
                      <div className={local.troubleComparisons}>
                        {item.comparisons.map((table, ti) => (
                          <div key={ti} className={local.troubleComparisonWrap}>
                            {table.label && (
                              <span className={local.troubleComparisonLabel}>{table.label[language]}</span>
                            )}
                            <table className={local.troubleTable}>
                              <thead>
                                <tr>
                                  {table.headers.map((h, hi) => (
                                    <th key={hi}>{h[language]}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {table.rows.map((row, ri) => (
                                  <tr key={ri} className={row.highlight ? local.troubleTableRowHighlight : undefined}>
                                    {row.cells.map((cell, ci) => (
                                      <td key={ci}>{renderHighlight(cell[language], language)}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {table.description && (
                              <p className={local.troubleComparisonDesc}>{renderHighlight(table.description[language], language)}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {item.diagrams && item.diagrams.length > 0 && (
                    <div className={styles.troubleEntry}>
                      <span className={styles.entryLabel}>
                        <T k="aboutPage.troubleshooting.flow" />
                      </span>
                      <div className={local.troubleDiagrams}>
                        {item.diagrams.map((d, di) => (
                          <div key={di} className={local.troubleDiagramWrap}>
                            {d.title && (
                              <span className={local.troubleDiagramTitle}>{d.title[language]}</span>
                            )}
                            <FlowDiagram nodes={d.nodes} edges={d.edges} language={language} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className={styles.troubleEntry}>
                    <span
                      className={`${styles.entryLabel} ${styles.entryLabelInsight}`}
                    >
                      <T k="aboutPage.troubleshooting.keyInsight" />
                    </span>
                    <p className={styles.troubleInsightText}>
                      {renderHighlight(item.keyInsight[language], language)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 모바일: 모든 항목 표시 (폴백, pin 활성 시 숨김) */}
        <div className={styles.troubleMobileList}>
          {items.map((item, index) => {
            const prev = index > 0 ? items[index - 1] : null;
            const isSectionStart = !!item.section && item.section.ko !== prev?.section?.ko;
            const sectionItems = items.filter((it) => it.section?.ko === item.section?.ko);
            return (
            <React.Fragment key={index}>
              {isSectionStart && item.section && (
                <div className={`${styles.troubleSectionLabel} ${styles.troubleSectionLabelMobile}`}>
                  <span>{item.section[language]}</span>
                  <span className={styles.troubleSectionCount}>{sectionItems.length}</span>
                </div>
              )}
              <div
                className={`${styles.troubleMobileItem} ${styles.animate}`}
              >
                <div className={styles.troubleMobileHeader}>
                  <span className={styles.troubleNumber}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h4 className={styles.troubleTitle}>
                  {item.problem[language]}
                </h4>
                <span className={styles.troubleHeaderBadges}>
                  {item.recommended && (
                    <span className={styles.troubleHeaderRecommended}>
                      <Star size={11} fill="currentColor" strokeWidth={1.5} />
                      {language === "ko" ? "추천" : "Rec"}
                    </span>
                  )}
                  {item.difficulty && <DifficultyDots level={item.difficulty} large />}
                </span>
              </div>
              <div className={styles.troubleBody}>
                <div className={styles.troubleEntry}>
                  <span className={styles.entryLabel}>
                    {item.causeLabel
                      ? item.causeLabel[language]
                      : <T k="aboutPage.troubleshooting.cause" />}
                  </span>
                  <p>{renderHighlight(item.cause[language], language)}</p>
                </div>
                <div className={styles.troubleEntry}>
                  <span
                    className={`${styles.entryLabel} ${styles.entryLabelAccent}`}
                  >
                    <T k="aboutPage.troubleshooting.solution" />
                  </span>
                  <p>{renderHighlight(item.solution[language], language)}</p>
                </div>
                {item.comparisons && item.comparisons.length > 0 && (
                  <div className={styles.troubleEntry}>
                    <div className={local.troubleComparisons}>
                      {item.comparisons.map((table, ti) => (
                        <div key={ti} className={local.troubleComparisonWrap}>
                          {table.label && (
                            <span className={local.troubleComparisonLabel}>{table.label[language]}</span>
                          )}
                          <table className={local.troubleTable}>
                            <thead>
                              <tr>
                                {table.headers.map((h, hi) => (
                                  <th key={hi}>{h[language]}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {table.rows.map((row, ri) => (
                                <tr key={ri} className={row.highlight ? local.troubleTableRowHighlight : undefined}>
                                  {row.cells.map((cell, ci) => (
                                    <td key={ci}>{renderHighlight(cell[language], language)}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {item.diagrams && item.diagrams.length > 0 && (
                  <div className={styles.troubleEntry}>
                    <span className={styles.entryLabel}>
                      <T k="aboutPage.troubleshooting.flow" />
                    </span>
                    <div className={local.troubleDiagrams}>
                      {item.diagrams.map((d, di) => (
                        <div key={di} className={local.troubleDiagramWrap}>
                          {d.title && (
                            <span className={local.troubleDiagramTitle}>{d.title[language]}</span>
                          )}
                          <FlowDiagram nodes={d.nodes} edges={d.edges} language={language} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className={styles.troubleEntry}>
                  <span
                    className={`${styles.entryLabel} ${styles.entryLabelInsight}`}
                  >
                    <T k="aboutPage.troubleshooting.keyInsight" />
                  </span>
                  <p className={styles.troubleInsightText}>
                    {renderHighlight(item.keyInsight[language], language)}
                  </p>
                </div>
              </div>
            </div>
            </React.Fragment>
          );
          })}
        </div>
      </div>
    </div>
  );
}

export default memo(TroubleshootingPanel);
