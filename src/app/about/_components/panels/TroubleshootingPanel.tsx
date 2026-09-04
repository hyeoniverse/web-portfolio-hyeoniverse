"use client";

import { useCallback, useRef, useState, useEffect, memo } from "react";
import type { Language } from "@/providers/LanguageProvider";
import { aboutDecisions } from "@/data/generated/aboutContent";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import type { TroubleshootingDiagram, TroubleShootingItem } from "@/data/about/types";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { usePinnedScroll } from "../../_hooks/usePinnedScroll";
import { useMobilePinScroll } from "../../_hooks/useMobilePinScroll";
import PinnedTitleRow from "../PinnedTitleRow";
import { ImageViewer } from "@/components/ui/ImageViewer";
import shared from "../AboutSection.module.css";
import local from "./TroubleshootingPanel.module.css";
import DiagramFullscreenViewer from "./troubleshooting/DiagramFullscreenViewer";
import TroubleExplorer from "./troubleshooting/TroubleExplorer";
import TroubleStatusBar from "./troubleshooting/TroubleStatusBar";
import TroubleTabBar from "./troubleshooting/TroubleTabBar";
import { useTroubleContent } from "./troubleshooting/useTroubleContent";
import { useTroubleWheelNav } from "./troubleshooting/useTroubleWheelNav";
import { useTroubleMobileNav } from "./troubleshooting/useTroubleMobileNav";
import TroubleEditor from "./troubleshooting/TroubleEditor";
const styles = { ...shared, ...local };


interface TroubleshootingPanelProps {
  language: Language;
  scrollBy?: (deltaX: number) => void;
}


function TroubleshootingPanel({
  language,
  scrollBy,
}: TroubleshootingPanelProps) {
  /* admin(about.troubleshooting) override — 비어있으면 정적 데이터 */
  const cfg = useSiteConfig();
  const cfgItems = cfg.about.troubleshooting;
  const items = cfgItems && cfgItems.length > 0 ? cfgItems : aboutDecisions;
  const isMobile = useMobileLayout();
  const listRef = useRef<HTMLDivElement>(null);
  const [detailIndex, setDetailIndex] = useState(0);
  const { panelRef, contentRef } = usePinnedScroll(
    items.length,
    undefined,
    scrollBy,
  );

  /** 모바일/태블릿: 핀 스크롤 진행도가 활성 인덱스를 결정. */
  const [mobileActiveIdx, setMobileActiveIdx] = useState(0);
  const [ideFontScale, setIdeFontScale] = useState(1); // IDE 텍스트 크기 사용자 조절 (0.85 ~ 1.3)
  const [enlargedDiagram, setEnlargedDiagram] = useState<TroubleshootingDiagram | null>(null);
  // 필터는 사이드바(TroubleExplorer)가 들고 있고, 결과 목록만 받아 온다 —
  // 탭 바와 스크롤 전환이 사이드바와 같은 목록을 봐야 한다.
  const [visibleItems, setVisibleItems] = useState<{ item: TroubleShootingItem; idx: number }[]>(
    () => items.map((item, idx) => ({ item, idx })),
  );
  const { renderParagraphs, renderImagesAt, viewerState, closeViewer } = useTroubleContent(language);

  const prevIdxRef = useRef(0);

  const handleMobileIndexChange = useCallback((idx: number) => {
    prevIdxRef.current = idx;
    setMobileActiveIdx(idx);
  }, []);

  const mobileStRef = useMobilePinScroll(
    contentRef,
    items.length,
    1000,
    handleMobileIndexChange,
  );

  // IDE editor 의 탭 전환 입력 처리.
  //  룰: "처음 edge 에 닿기만 한 것" 은 전환 안 하고, "닿은 뒤 또 스크롤" 이면 전환.
  //   - 또 스크롤 = (a) release 후 새 burst (QUIET_MS 이상 active 없다가 다시 active),
  //                또는 (b) 손 안 떼고 계속 push (edge 위 active 누적이 PUSH_THRESHOLD 도달).
  //   - momentum tail (delta <ACTIVE_DELTA) 은 무시 → fling 으로 닿기만 한 케이스 안전.
  //  - Touch: 가로 swipe (|dx| > |dy| × 1.2) 로 다음/이전 탭. 세로면 native 스크롤 유지.
  // handleItemClick 은 아래에서 선언되므로 ref 로 우회 (TDZ 회피).
  const ideEditorRef = useRef<HTMLDivElement>(null);

  useTroubleWheelNav({
    isMobile,
    panelRef,
    ideEditorRef,
    listRef,
    visibleItems,
    scrollBy,
    detailIndex,
    setDetailIndex,
  });


  const displayIndex = isMobile ? mobileActiveIdx : detailIndex;

  /* 열려 있는 항목을 markdown 으로 — 화면이 항목을 `01.md` 로 보여 주면서 정작 파일을
     꺼내 갈 방법이 없었다. 소제목 라벨은 화면과 같은 번역을 그대로 쓴다. */


  // 클릭 핸들러 — 데스크톱: detailIndex 만 set (sidebar 가 선택, IDE editor 가 해당 item 렌더) / 모바일: 즉시 점프 + index sync
  const handleItemClick = useCallback(
    (index: number) => {
      if (isMobile) {
        const handle = mobileStRef.current;
        const st = handle?.scrollTrigger;
        if (!st) return;
        const targetProgress = (index + 0.5) / items.length;
        const targetScroll = st.start + targetProgress * (st.end - st.start);
        // immediate: true → Lenis 가 animation 없이 즉시 jump → 사용자에겐 탭/내용만 바뀌는 것처럼 보임
        const lenis = (window as { lenis?: { scrollTo: (t: number, opts?: { immediate?: boolean }) => void } }).lenis;
        if (lenis) {
          lenis.scrollTo(targetScroll, { immediate: true });
        } else {
          window.scrollTo({ top: targetScroll });
        }
        // cascade 우회: 클릭 점프는 한 칸씩 step 하지 않고 한번에 목표 idx 로 sync
        handle.syncIndex(index);
        return;
      }
      // PC: sidebar 클릭 = activeIdx 변경. IDE editor 가 해당 item 렌더.
      setDetailIndex(index);
    },
    [isMobile, mobileStRef, items.length],
  );

  const { activeIdxRef } = useTroubleMobileNav({
    isMobile,
    items,
    activeIndex: mobileActiveIdx,
    ideEditorRef,
    onSelect: handleItemClick,
  });

  // 모바일 boundary clamp — 핀 범위 밖으로 스크롤 시도 시:
  // - 첫 항목 + 위로 이탈: 이전 패널로 (허용)
  // - 마지막 항목 + 아래로 이탈: 다음 패널로 (허용)
  // - 그 외: 핀 boundary 로 snap-back. 강한 fling 으로 중간 항목에서 패널을 통과해버리는 문제 방지.
  useEffect(() => {
    if (!isMobile) return;
    let rafId: number | null = null;
    let snapping = false;
    const onScroll = () => {
      if (rafId !== null || snapping) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const st = mobileStRef.current?.scrollTrigger;
        if (!st) return;
        const cur = activeIdxRef.current;
        const y = window.scrollY;
        const lenis = (window as { lenis?: { scrollTo: (t: number, opts?: { duration?: number }) => void } }).lenis;
        if (y < st.start - 1 && cur > 0) {
          snapping = true;
          lenis?.scrollTo(st.start, { duration: 0.25 });
          window.setTimeout(() => { snapping = false; }, 350);
        } else if (y > st.end + 1 && cur < items.length - 1) {
          snapping = true;
          lenis?.scrollTo(st.end, { duration: 0.25 });
          window.setTimeout(() => { snapping = false; }, 350);
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
    // activeIdxRef 는 훅이 돌려준 ref 라 참조가 고정 — 재구독이 늘지 않는다
  }, [isMobile, items.length, mobileStRef, activeIdxRef]);
  // ide editor wheel handler 에서 사용 가능하도록 ref 에 최신 함수 reference 보관

  // 활성 항목 변경 시 해당 항목으로 리스트 자동 스크롤.
  // visibleItems 순서 (filter/collapse 적용 후) 의 index 로 DOM listItems 와 매칭.
  useEffect(() => {
    const scroll = listRef.current;
    if (!scroll || isMobile) return;

    const visIdx = visibleItems.findIndex((v) => v.idx === displayIndex);
    if (visIdx === -1) return; // 현재 active 항목이 filter/collapse 로 숨겨진 경우

    // 첫 번째 항목이면 맨 위로 (section label 포함)
    if (visIdx === 0) {
      scroll.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const listItems = scroll.querySelectorAll(`.${styles.troubleListItem}`);
    const item = listItems[visIdx] as HTMLElement | undefined;
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
  }, [displayIndex, isMobile, visibleItems]);

  // PC: 패널 위 wheel → 항목 (탭/파일) advance. 마지막/처음 도달 시 wheel 통과 → 가로 다음 패널.
  // editor content 가 스크롤 가능하면 우선 editor 스크롤 (긴 항목 본문 가독성).
  // sidebar 위에서 휠 — sidebar list 자체 스크롤만, item advance 안 함.
  // Cooldown 으로 trackpad 폭주 (한 번 스크롤에 여러 step) 차단.
  // 시간 기반 throttle — 연속 swipe 도 일정 간격 (COOLDOWN_MS) 으로 step. release 없이도 자동으로 이어 advance.
  // 누적 + cooldown 조합: 누적 ≥ threshold 일 때만 + 마지막 advance 후 cooldown 지났을 때만.

  // displayIndex 변경 시 editor content 를 smooth 하게 맨 위로 — 새 항목 제목부터.
  // 1) 이전 motion.div (exit 중) 도 같이 smooth 하게 위로 (rewind 느낌)
  // 2) AnimatePresence wait 모드 라 새 motion.div mount 후 한 번 더 — rAF 로 paint 후
  useEffect(() => {
    if (isMobile) return;
    const editor = ideEditorRef.current;
    if (!editor) return;
    const rewind = () => {
      editor.querySelectorAll(`.${styles.ideEditorContent}`).forEach((el) => {
        (el as HTMLElement).scrollTo({ top: 0, behavior: "smooth" });
      });
    };
    rewind(); // 즉시 — 이전 content 도 위로 rewind
    const raf = requestAnimationFrame(() => {
      // 다음 frame — 새 motion.div mount 됐으면 거기에도 적용
      rewind();
    });
    return () => cancelAnimationFrame(raf);
  }, [displayIndex, isMobile]);

  return (
    <div ref={panelRef} className={`${styles.panel} ${styles.panelExtraWide}`}>
      {/* 내부 래퍼: 고정된 것처럼 보이도록 카운터 트랜슬레이션 (데스크톱),
          모바일에서는 useMobilePinScroll 가 contentRef 를 핀 → 100vh 뷰포트 */}
      <div ref={contentRef} className={`${styles.pinnedContent} ${styles.mobilePinViewport}`}>
        <PinnedTitleRow
          panelKey="troubleshooting"
          className={`${styles.titleRowCompact} ${local.troublePinTitleRow}`}
          compact
          animate
        />

        {/* IDE wrapper — sidebar (PC) + main pane (breadcrumb + editor + status bar). Mobile 은 sidebar 숨김 + tab bar 노출 */}
        <div className={`${styles.ideWrap} ${styles.animate}`}>
          {/* sidebar — IDE 탐색기 (Explorer) 스타일. PC 만 노출 (mobile 은 tab bar 가 대신) */}
          <TroubleExplorer
            items={items}
            language={language}
            activeIndex={displayIndex}
            onItemClick={handleItemClick}
            listRef={listRef}
            onVisibleItemsChange={setVisibleItems}
          />

          {/* Main pane — sidebar 오른쪽에 위치 (PC), 단독 column (mobile) */}
          <div className={styles.ideMainPane}>
          {/* Breadcrumb */}
          <div className={styles.ideBreadcrumb}>
            <span className={styles.ideBreadcrumbCrumb}>src</span>
            <span className={styles.ideBreadcrumbSep}>/</span>
            <span className={styles.ideBreadcrumbCrumb}>troubleshooting</span>
            {items[displayIndex]?.section && (
              <>
                <span className={styles.ideBreadcrumbSep}>/</span>
                <span className={styles.ideBreadcrumbCrumb}>
                  {items[displayIndex].section![language].toLowerCase().replace(/\s+/g, "-")}
                </span>
              </>
            )}
            <span className={styles.ideBreadcrumbSep}>/</span>
            <span className={styles.ideBreadcrumbFile}>
              {String(displayIndex + 1).padStart(2, "0")}.md
            </span>
          </div>

          <TroubleTabBar
            items={items}
            displayIndex={displayIndex}
            mobileActiveIdx={mobileActiveIdx}
            isMobile={isMobile}
            language={language}
            onSelect={handleItemClick}
          />

          {/* Editor pane */}
          <TroubleEditor
            items={items}
            displayIndex={displayIndex}
            language={language}
            fontScale={ideFontScale}
            editorRef={ideEditorRef}
            renderParagraphs={renderParagraphs}
            renderImagesAt={renderImagesAt}
            onEnlargeDiagram={setEnlargedDiagram}
          />

          {/* Status bar — 우측에 내보내기 + 폰트 크기 조절 버튼.
              좁은 화면에서는 바가 가로로 밀려 우측 버튼이 화면 밖으로 나간다. 그래서
              breadcrumb 에 이미 있는 정보(섹션 · 파일 형식)는 모바일에서 접는다. */}
          <TroubleStatusBar
            items={items}
            displayIndex={displayIndex}
            language={language}
            isMobile={isMobile}
            contentRef={contentRef}
            fontScale={ideFontScale}
            onFontScaleChange={setIdeFontScale}
          />
        </div>
        </div>

      </div>

      {/* Flow chart 인터랙티브 풀스크린 viewer — 휠 zoom, 드래그 pan, 컨트롤 버튼 */}
      {enlargedDiagram && (
        <DiagramFullscreenViewer
          diagram={enlargedDiagram}
          language={language}
          onClose={() => setEnlargedDiagram(null)}
        />
      )}

      {/* 공통 ImageViewer — zoom / pan / 멀티 image 네비 / 키보드 / 풀스크린 등 모두 지원 */}
      <ImageViewer
        images={viewerState?.images ?? []}
        index={viewerState?.index ?? 0}
        open={!!viewerState && viewerState.images.length > 0}
        onClose={closeViewer}
        title={viewerState?.title}
      />
    </div>
  );
}

export default memo(TroubleshootingPanel);
