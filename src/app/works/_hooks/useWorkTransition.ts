"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import { LANDING_PAGE_SLUGS, isLandingPath } from "@/components/works/landing/registry";
import { LONG_PRESS_DURATION, type Project } from "@/data/projects";
import { workHref } from "../_components/layouts/shared";

export interface TransitionData {
  id: string;
  image: string;
  rect: DOMRect;
}

interface PressedCard {
  index: number;
  project: Project;
}

/* ── 카드 → 작품 상세 전환 ──
   두 갈래로 들어온다. 클릭은 즉시 전환하고, 롱프레스는 누르는 동안 카드를 키우다가
   LONG_PRESS_DURATION 을 채우면 전환한다. 확대는 state 가 아니라 card.dataset.hoverScale 로 쓴다 —
   매 프레임 리렌더를 피하고, 수평 스크롤 엔진이 같은 루프에서 이 값을 읽어 자기 변환에 곱한다.
   대체 레이아웃 5종은 카드 DOM 구조가 달라 롱프레스 없이 handleLayoutProjectClick 만 쓴다. */
export function useWorkTransition(cardActiveClassName: string) {
  const { navigateWithTransition, isTransitioning } = usePageTransition();
  /* 랜딩으로 그리는 작업물은 미리 받아 둔다 — 판 전환은 새 페이지가 커밋되는 순간 찍는데, 받아 두지 않으면
     로딩 화면이 먼저 커밋돼 뼈대가 밀려 들어왔다. 전용 페이지가 있는 작업물 몇 개뿐이라 목록을 열 때 한 번에 */
  const router = useRouter();
  useEffect(() => {
    for (const slug of LANDING_PAGE_SLUGS) router.prefetch(`/works/${slug}`);
  }, [router]);
  const cardRefs = useRef<Map<number, HTMLElement>>(new Map());
  const pressStartRef = useRef<number | null>(null);
  const pressRafRef = useRef<number | null>(null);
  const [transitionData, setTransitionData] = useState<TransitionData | null>(null);
  const [pressedCard, setPressedCard] = useState<PressedCard | null>(null);

  /* 목록의 전환 막(WorkTransitionOverlay)을 깔고 넘어간다. 랜딩으로 그리는 작업물은 판 전환이 떠나는 목록을 찍어
     밀어내야 해서 막을 깔지 않는다 — 깔면 목록이 먼저 바탕색으로 덮여 빈 화면이 밀려났다 */
  const startCardTransition = useCallback(
    (project: Project, rect: DOMRect) => {
      const href = workHref(project);
      if (!isLandingPath(href)) setTransitionData({ id: project.id, image: project.image, rect });
      navigateWithTransition(href, project.image, rect);
    },
    [navigateWithTransition],
  );

  /** 진행 중인 프레스 애니메이션과 카드에 직접 쓴 확대값을 되돌린다 */
  const clearPress = useCallback(() => {
    if (pressRafRef.current) cancelAnimationFrame(pressRafRef.current);
    if (pressedCard) {
      const card = cardRefs.current.get(pressedCard.index);
      if (card) {
        delete card.dataset.hoverScale;
        card.classList.remove(cardActiveClassName);
      }
    }
    pressStartRef.current = null;
    setPressedCard(null);
  }, [pressedCard, cardActiveClassName]);

  const triggerTransition = useCallback(
    (index: number, project: Project) => {
      const card = cardRefs.current.get(index);
      if (!card) return;

      const rect = card.getBoundingClientRect();
      startCardTransition(project, rect);
    },
    [startCardTransition],
  );

  const handleCardClick = useCallback(
    (index: number, project: Project) => {
      if (transitionData || isTransitioning) return;
      clearPress();
      triggerTransition(index, project);
    },
    [transitionData, isTransitioning, clearPress, triggerTransition],
  );

  const handlePressStart = useCallback(
    (index: number, project: Project) => {
      if (transitionData) return;

      const card = cardRefs.current.get(index);
      if (!card) return;

      setPressedCard({ index, project });
      pressStartRef.current = performance.now();
      card.classList.add(cardActiveClassName);
      card.dataset.hoverScale = "1";

      const animatePress = () => {
        if (!pressStartRef.current) return;

        const elapsed = performance.now() - pressStartRef.current;
        const progress = Math.min(elapsed / LONG_PRESS_DURATION, 1);

        card.dataset.hoverScale = String(1 + progress * 0.5);

        if (progress >= 1) {
          triggerTransition(index, project);
          setPressedCard(null);
          pressStartRef.current = null;
          delete card.dataset.hoverScale;
          card.classList.remove(cardActiveClassName);
          return;
        }

        pressRafRef.current = requestAnimationFrame(animatePress);
      };

      pressRafRef.current = requestAnimationFrame(animatePress);
    },
    [transitionData, triggerTransition, cardActiveClassName],
  );

  /** 대체 레이아웃 공통 — 레이아웃이 계산한 rect 로 바로 전환한다 */
  const handleLayoutProjectClick = useCallback(
    (project: Project, rect: DOMRect) => startCardTransition(project, rect),
    [startCardTransition],
  );

  return {
    cardRefs,
    transitionData,
    handleCardClick,
    handlePressStart,
    handlePressEnd: clearPress,
    handleLayoutProjectClick,
  };
}
