"use client";

import { useLayoutEffect, useCallback, useRef, useState, useEffect } from "react";
import type { Language } from "@/providers/LanguageProvider";
import type { TroubleShootingItem } from "@/data/behind";
import { renderHighlight } from "../renderHighlight";
import { useMobileLayout } from "../../_hooks/mobileCheck";
import { usePinnedScroll } from "../../_hooks/usePinnedScroll";
import { useMobilePinScroll } from "../../_hooks/useMobilePinScroll";
import PinnedTitleRow from "../PinnedTitleRow";
import styles from "../BehindSection.module.css";

/** 디테일 항목 내의 스태거 자식 요소 조회 (헤더 + 엔트리) */
function getStaggerChildren(_viewport: HTMLElement, el: HTMLElement): HTMLElement[] {
  return Array.from(
    el.querySelectorAll<HTMLElement>(
      `.${styles.troubleDetailHeader}, .${styles.troubleEntry}`,
    ),
  );
}

interface TroubleshootingPanelProps {
  language: Language;
  t: (key: string) => string;
  items: TroubleShootingItem[];
  scrollBy?: (deltaX: number) => void;
}

export default function TroubleshootingPanel({
  language,
  t,
  items,
  scrollBy,
}: TroubleshootingPanelProps) {
  const isMobile = useMobileLayout();
  const listRef = useRef<HTMLDivElement>(null);
  const [listPage, setListPage] = useState({ page: 1, total: 1 });
  const { panelRef, contentRef, activeIndex, setActiveIndex, scrollToItem } = usePinnedScroll(
    items.length,
    undefined,
    scrollBy,
  );

  // 모바일: 초기 상태 설정 (첫 번째 항목 표시, 나머지 숨김)
  useLayoutEffect(() => {
    if (!isMobile) return;
    const viewport = contentRef.current;
    if (!viewport) return;

    const detailItems = Array.from(
      viewport.querySelectorAll<HTMLElement>(`.${styles.troubleDetailItem}`),
    );

    detailItems.forEach((el, i) => {
      el.style.opacity = i === 0 ? "1" : "0";
      const children = getStaggerChildren(viewport, el);
      children.forEach((child, ci) => {
        if (i === 0) {
          child.style.opacity = "1";
          child.style.transform = "translateY(0)";
        } else {
          child.style.opacity = "0";
          child.style.transform = "translateY(16px)";
        }
        child.style.transition = `opacity 0.4s ease ${ci * 0.1}s, transform 0.4s cubic-bezier(0.4,0,0.2,1) ${ci * 0.1}s`;
      });
    });
  }, [isMobile, contentRef]);

  // 모바일: ScrollTrigger 고정 + 스태거 캐스케이드 애니메이션
  const handleMobileIndexChange = useCallback((newIndex: number) => {
    setActiveIndex(newIndex);

    const viewport = contentRef.current;
    if (!viewport) return;

    const detailItems = Array.from(
      viewport.querySelectorAll<HTMLElement>(`.${styles.troubleDetailItem}`),
    );

    detailItems.forEach((el, i) => {
      el.style.opacity = i === newIndex ? "1" : "0";
      const children = getStaggerChildren(viewport, el);
      children.forEach((child, ci) => {
        if (i === newIndex) {
          child.style.opacity = "1";
          child.style.transform = "translateY(0)";
          child.style.transitionDelay = `${ci * 0.1}s`;
        } else {
          child.style.opacity = "0";
          child.style.transform = "translateY(16px)";
          child.style.transitionDelay = "0s";
        }
      });
    });
  }, [contentRef, setActiveIndex]);

  const mobileStRef = useMobilePinScroll(contentRef, items.length, 500, handleMobileIndexChange);

  // dotNav + 리스트 항목 클릭 핸들러 — 데스크톱/모바일 모두 지원
  const handleItemClick = useCallback(
    (index: number) => {
      scrollToItem(index, mobileStRef);
    },
    [scrollToItem, mobileStRef],
  );

  // 활성 항목 변경 시 해당 항목으로 리스트 자동 스크롤
  useEffect(() => {
    const list = listRef.current;
    if (!list || isMobile) return;
    const item = list.children[activeIndex] as HTMLElement | undefined;
    if (!item) return;
    // sticky 페이지 네비 높이만큼 여유 확보
    const lastChild = list.lastElementChild as HTMLElement | null;
    const navH = lastChild?.classList.contains(styles.troublePageNav)
      ? lastChild.offsetHeight
      : 0;
    const itemTop = item.offsetTop;
    const itemBottom = itemTop + item.offsetHeight;
    const viewTop = list.scrollTop;
    const visibleBottom = viewTop + list.clientHeight - navH;
    if (itemTop < viewTop) {
      list.scrollTo({ top: itemTop, behavior: "smooth" });
    } else if (itemBottom > visibleBottom) {
      list.scrollTo({ top: itemBottom - list.clientHeight + navH, behavior: "smooth" });
    }
  }, [activeIndex, isMobile]);

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

  return (
    <div ref={panelRef} className={`${styles.panel} ${styles.panelExtraWide}`}>
      {/* 내부 래퍼: 고정된 것처럼 보이도록 카운터 트랜슬레이션 */}
      <div ref={contentRef} className={`${styles.pinnedContent} ${styles.mobilePinViewport}`}>
        <PinnedTitleRow
          number="08"
          title="Trouble Shooting."
          compact
          animate
          dotNav={{
            count: items.length,
            activeIndex,
            onDotClick: handleItemClick,
            className: styles.dotNavMobileOnly,
          }}
        />

        {/* 데스크톱: 분할 레이아웃 — 목록 + 상세 */}
        <div className={`${styles.troubleSplit} ${styles.animate}`}>
          {/* 왼쪽: 항목 목록 */}
          <div ref={listRef} className={styles.troubleList}>
            {items.map((item, index) => (
              <div
                data-clickable="true"
                key={index}
                className={`${styles.troubleListItem} ${
                  index === activeIndex ? styles.troubleListItemActive : ""
                }`}
                onClick={() => handleItemClick(index)}
              >
                <span className={styles.troubleNumber}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className={styles.troubleListTitle}>
                  {item.problem[language]}
                </span>
              </div>
            ))}
            {listPage.total > 1 && (
              <div className={styles.troublePageNav}>
                <button className={styles.troublePageBtn} disabled={listPage.page <= 1} onClick={() => scrollListPage(-1)}>↑</button>
                <span>{listPage.page}/{listPage.total}</span>
                <button className={styles.troublePageBtn} disabled={listPage.page >= listPage.total} onClick={() => scrollListPage(1)}>↓</button>
              </div>
            )}
          </div>

          {/* 오른쪽: 상세 콘텐츠 (스택, CSS opacity 트랜지션) */}
          <div className={styles.troubleDetail}>
            {items.map((item, index) => (
              <div
                key={index}
                className={`${styles.troubleDetailItem} ${
                  index === activeIndex ? styles.troubleDetailItemActive : ""
                }`}
              >
                <div className={styles.troubleDetailHeader}>
                  <span className={styles.troubleDetailNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h4 className={styles.troubleTitle}>
                    {item.problem[language]}
                  </h4>
                </div>
                <div className={styles.troubleBody}>
                  <div className={styles.troubleEntry}>
                    <span className={styles.troubleLabel}>
                      {t("behind.troubleshooting.cause")}
                    </span>
                    <p>{renderHighlight(item.cause[language])}</p>
                  </div>
                  <div className={styles.troubleEntry}>
                    <span
                      className={`${styles.troubleLabel} ${styles.troubleLabelAccent}`}
                    >
                      {t("behind.troubleshooting.solution")}
                    </span>
                    <p>{renderHighlight(item.solution[language])}</p>
                  </div>
                  <div className={styles.troubleEntry}>
                    <span
                      className={`${styles.troubleLabel} ${styles.troubleLabelInsight}`}
                    >
                      {t("behind.troubleshooting.keyInsight")}
                    </span>
                    <p className={styles.troubleInsightText}>
                      {renderHighlight(item.keyInsight[language])}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 모바일: 모든 항목 표시 (폴백, pin 활성 시 숨김) */}
        <div className={styles.troubleMobileList}>
          {items.map((item, index) => (
            <div
              key={index}
              className={`${styles.troubleMobileItem} ${styles.animate}`}
            >
              <div className={styles.troubleMobileHeader}>
                <span className={styles.troubleNumber}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h4 className={styles.troubleTitle}>
                  {item.problem[language]}
                </h4>
              </div>
              <div className={styles.troubleBody}>
                <div className={styles.troubleEntry}>
                  <span className={styles.troubleLabel}>
                    {t("behind.troubleshooting.cause")}
                  </span>
                  <p>{renderHighlight(item.cause[language])}</p>
                </div>
                <div className={styles.troubleEntry}>
                  <span
                    className={`${styles.troubleLabel} ${styles.troubleLabelAccent}`}
                  >
                    {t("behind.troubleshooting.solution")}
                  </span>
                  <p>{renderHighlight(item.solution[language])}</p>
                </div>
                <div className={styles.troubleEntry}>
                  <span
                    className={`${styles.troubleLabel} ${styles.troubleLabelInsight}`}
                  >
                    {t("behind.troubleshooting.keyInsight")}
                  </span>
                  <p className={styles.troubleInsightText}>
                    {renderHighlight(item.keyInsight[language])}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
