"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { TroubleShootingItem } from "@/data/about/types";
import styles from "../TroubleshootingPanel.module.css";

/* 데스크탑 휠 내비게이션 — 이 패널은 가로로 핀된 화면 안에 다시 세로 스크롤 영역이 둘 있다
   (사이드바 목록, 본문 에디터). 휠 하나로 셋을 조율해야 해서 직접 라우팅한다.

   - 사이드바 위에서는 사이드바만 스크롤한다(Lenis 까지 막는다)
   - 본문은 끝에 닿기 전까지 본문만 스크롤한다
   - 끝에 닿은 뒤 "명백하게 넘어가려는" 세고 연속된 휠일 때만 다음 항목으로 넘긴다.
     문턱을 낮게 두면 본문 끝에서 살짝만 굴려도 넘어가 읽기를 방해하므로, 누적 delta 와
     쿨다운, 끝에 막 닿은 직후의 유예(fling 흡수)를 함께 본다 */
export function useTroubleWheelNav({
  isMobile,
  panelRef,
  ideEditorRef,
  listRef,
  visibleItems,
  scrollBy,
  detailIndex,
  setDetailIndex,
}: {
  isMobile: boolean;
  panelRef: RefObject<HTMLDivElement | null>;
  ideEditorRef: RefObject<HTMLDivElement | null>;
  listRef: RefObject<HTMLDivElement | null>;
  visibleItems: { item: TroubleShootingItem; idx: number }[];
  /** 가로 핀 트랙을 직접 밀 때 쓴다 (패널 경계에서 다음 패널로 넘길 때) */
  scrollBy?: (deltaX: number) => void;
  /** 현재 열린 항목 — 휠 핸들러가 재구독 없이 최신 값을 읽어야 해 ref 로 미러링한다 */
  detailIndex: number;
  setDetailIndex: (next: number | ((prev: number) => number)) => void;
}) {
  // 휠 누적·마지막 활동·마지막 전환 시각 — 이 효과 안에서만 쓴다
  const scrollAccumRef = useRef(0);
  const lastActiveTimeRef = useRef(0);
  const lastAdvanceRef = useRef(0);
  const detailIndexRef = useRef(detailIndex);
  useEffect(() => {
    detailIndexRef.current = detailIndex;
  }, [detailIndex]);

  useEffect(() => {
    if (isMobile) return;
    const QUIET_MS = 100; // 이 이상 active wheel 없으면 누적 reset
    const ACTIVE_DELTA = 5;
    // 콘텐츠 끝에서 "명백하게 다음으로 넘어가려는" 세고 연속된 스크롤일 때만 전환.
    // 값이 낮으면 본문 끝에 닿자마자 살짝만 굴려도 넘어가 읽기를 방해한다.
    const ITEM_THRESHOLD = 450; // 누적 delta px — 1 항목 advance 트리거
    const PANEL_THRESHOLD = 500;
    const EDGE_TOLERANCE = 5;
    const COOLDOWN_MS = 400; // advance 후 이 시간 동안은 추가 advance 차단
    const EDGE_GRACE_MS = 400; // 본문 끝에 막 닿은 직후 이 시간 동안은 전환 X (fling 흡수)

    // 본문 끝(edge)에 진입한 시각. 0 = 아직 edge 아님. "멈췄다 다시 스크롤" 판정용.
    let atEdgeSince = 0;

    const handleWheel = (e: WheelEvent) => {
      const panel = panelRef.current;
      const editor = ideEditorRef.current;
      const list = listRef.current;
      if (!panel) return;

      const panelRect = panel.getBoundingClientRect();
      const extraWidth = panelRect.width - window.innerWidth;
      if (extraWidth <= 0) return;
      const progress = -panelRect.left / extraWidth;
      if (progress < 0.02 || progress > 0.98) return;

      // sidebar 위에서 휠 — sidebar 자체 스크롤만. 본문/패널 절대 안 건드림 (Lenis 도 차단).
      if (list && list.contains(e.target as Node)) {
        const { scrollTop: lTop, scrollHeight: lH, clientHeight: lCh } = list;
        e.stopPropagation();
        e.preventDefault();
        if (lH > lCh) {
          const lAtTop = lTop <= 0;
          const lAtBottom = lTop + lCh >= lH - 1;
          if ((e.deltaY > 0 && !lAtBottom) || (e.deltaY < 0 && !lAtTop)) {
            list.scrollBy({ top: e.deltaY });
          }
        }
        scrollAccumRef.current = 0;
        return;
      }

      // 본문(editor content)이 스크롤 방향으로 더 갈 수 있으면 — 본문을 직접 스크롤(Lenis 가로 이동 차단).
      const content = editor?.querySelector(`.${styles.ideEditorContent}`) as HTMLElement | null;
      if (content && content.scrollHeight > content.clientHeight + EDGE_TOLERANCE) {
        const atTop = content.scrollTop <= EDGE_TOLERANCE;
        const atBottom = content.scrollTop + content.clientHeight >= content.scrollHeight - EDGE_TOLERANCE;
        const goingDown = e.deltaY > 0;
        if ((goingDown && !atBottom) || (!goingDown && !atTop)) {
          e.stopPropagation();
          e.preventDefault();
          content.scrollBy({ top: e.deltaY });
          scrollAccumRef.current = 0;
          atEdgeSince = 0;
          return;
        }
      }

      // 여기부터는 본문 끝(또는 스크롤 불가 항목). Lenis 가로 이동을 막고, "명백한 재스크롤" 일 때만 전환.
      e.stopPropagation();
      e.preventDefault();

      const now = performance.now();

      // momentum tail(약한 delta) — 무시. lastActive 를 갱신하지 않아 "손 뗌(release)" 을 감지할 수 있게 둔다.
      if (Math.abs(e.deltaY) < ACTIVE_DELTA) return;
      // 전환 직후 잠금
      if (now - lastAdvanceRef.current < COOLDOWN_MS) return;

      if (atEdgeSince === 0) atEdgeSince = now;
      const wasQuiet = now - lastActiveTimeRef.current > QUIET_MS;
      lastActiveTimeRef.current = now;

      // 끝에 막 닿은 직후 — 강한 fling 잔여 스크롤을 흡수(전환 X)
      if (now - atEdgeSince < EDGE_GRACE_MS) {
        scrollAccumRef.current = 0;
        return;
      }

      const cur = detailIndexRef.current;
      const curVisIdx = visibleItems.findIndex((v) => v.idx === cur);
      const dir = e.deltaY > 0 ? 1 : -1;
      const nextVisIdx = dir > 0
        ? Math.min(visibleItems.length - 1, curVisIdx + 1)
        : Math.max(0, curVisIdx - 1);
      const nextOriginalIdx = visibleItems[nextVisIdx]?.idx ?? cur;
      const atBoundary = nextOriginalIdx === cur;

      const doAdvance = () => {
        if (atBoundary) {
          // 마지막 항목 + 아래 방향일 때만 다음 패널로
          if (dir > 0 && scrollBy) {
            lastAdvanceRef.current = now;
            atEdgeSince = 0;
            scrollAccumRef.current = 0;
            scrollBy(window.innerWidth);
          }
          return;
        }
        setDetailIndex(nextOriginalIdx);
        lastAdvanceRef.current = now;
        atEdgeSince = 0;
        scrollAccumRef.current = 0;
      };

      // (a) 끝에서 멈췄다(quiet) 다시 스크롤 = 명백한 의도 → 즉시 전환
      if (wasQuiet) {
        doAdvance();
        return;
      }

      // (b) 손 안 떼고 계속 세게 밀 때만 — 높은 누적 임계 넘으면 전환
      scrollAccumRef.current += e.deltaY;
      if (Math.abs(scrollAccumRef.current) >= (atBoundary ? PANEL_THRESHOLD : ITEM_THRESHOLD)) {
        doAdvance();
      }
    };
    window.addEventListener("wheel", handleWheel, { capture: true, passive: false });
    return () => window.removeEventListener("wheel", handleWheel, { capture: true });
    // ref 객체와 setState 는 참조가 고정이라 추가해도 재구독이 늘지 않는다
  }, [isMobile, visibleItems, scrollBy, panelRef, ideEditorRef, listRef, setDetailIndex]);
}
