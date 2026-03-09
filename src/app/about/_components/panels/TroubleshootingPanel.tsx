"use client";

import { useCallback, useRef, useState, useEffect, memo } from "react";
import type { Language } from "@/providers/LanguageProvider";
import { troubleShootingItems } from "@/data/about/troubleshooting";
import { renderHighlight } from "../renderHighlight";
import { useMobileLayout } from "../../_hooks/mobileCheck";
import { usePinnedScroll } from "../../_hooks/usePinnedScroll";
import PinnedTitleRow from "../PinnedTitleRow";
import T from "@/components/ui/T";
import shared from "../AboutSection.module.css";
import local from "./TroubleshootingPanel.module.css";
const styles = { ...shared, ...local };

interface TroubleshootingPanelProps {
  language: Language;
  scrollBy?: (deltaX: number) => void;
}

function TroubleshootingPanel({
  language,
  scrollBy,
}: TroubleshootingPanelProps) {
  const items = troubleShootingItems;
  const isMobile = useMobileLayout();
  const listRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
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
        detail.scrollTo({ top: target.offsetTop, behavior: "smooth" });
      }
    },
    [],
  );

  // 활성 항목 변경 시 해당 항목으로 리스트 자동 스크롤
  useEffect(() => {
    const list = listRef.current;
    if (!list || isMobile) return;
    const item = list.children[displayIndex] as HTMLElement | undefined;
    if (!item) return;
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
  useEffect(() => {
    if (isMobile) return;

    const handleWheel = (e: WheelEvent) => {
      const panel = panelRef.current;
      const detail = detailRef.current;
      if (!panel || !detail) return;

      const panelRect = panel.getBoundingClientRect();
      const extraWidth = panelRect.width - window.innerWidth;
      if (extraWidth <= 0) return;
      const progress = -panelRect.left / extraWidth;
      if (progress < 0.02 || progress > 0.98) return;

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
        detail.scrollTop = detail.scrollHeight - detail.clientHeight;
      } else if (progress <= 0.02) {
        // 왼쪽 밖 → 정방향 진입 시 상단부터
        detail.scrollTop = 0;
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
          <div ref={listRef} className={styles.troubleList} style={{ '--items-count': items.length + 1 } as React.CSSProperties}>
            {items.map((item, index) => (
              <div
                data-clickable="true"
                key={index}
                className={`${styles.troubleListItem} ${
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

          {/* 오른쪽: 상세 콘텐츠 (세로 연속 스크롤) */}
          <div ref={detailRef} className={styles.troubleDetail}>
            {items.map((item, index) => (
              <div
                key={index}
                className={`${styles.troubleDetailItem} ${
                  index === displayIndex ? styles.troubleDetailItemActive : ""
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
                      <T k="aboutPage.troubleshooting.cause" />
                    </span>
                    <p>{renderHighlight(item.cause[language])}</p>
                  </div>
                  <div className={styles.troubleEntry}>
                    <span
                      className={`${styles.troubleLabel} ${styles.troubleLabelAccent}`}
                    >
                      <T k="aboutPage.troubleshooting.solution" />
                    </span>
                    <p>{renderHighlight(item.solution[language])}</p>
                  </div>
                  <div className={styles.troubleEntry}>
                    <span
                      className={`${styles.troubleLabel} ${styles.troubleLabelInsight}`}
                    >
                      <T k="aboutPage.troubleshooting.keyInsight" />
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
                    <T k="aboutPage.troubleshooting.cause" />
                  </span>
                  <p>{renderHighlight(item.cause[language])}</p>
                </div>
                <div className={styles.troubleEntry}>
                  <span
                    className={`${styles.troubleLabel} ${styles.troubleLabelAccent}`}
                  >
                    <T k="aboutPage.troubleshooting.solution" />
                  </span>
                  <p>{renderHighlight(item.solution[language])}</p>
                </div>
                <div className={styles.troubleEntry}>
                  <span
                    className={`${styles.troubleLabel} ${styles.troubleLabelInsight}`}
                  >
                    <T k="aboutPage.troubleshooting.keyInsight" />
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

export default memo(TroubleshootingPanel);
