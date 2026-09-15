"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

const HOVER_OPEN_MS = 800; // 카드 위에서 머물러야 deck 이 펼쳐지는 시간
// SeriesCard.module.css 의 deck 펼침 폭과 동일 (160px card + 16px gap)
const DECK_LAYER_WIDTH = 176;
// scroll 후 deck 우측에 남길 여유
const SCROLL_EDGE_PADDING = 24;

/* 시리즈 카드의 deck 펼침 — hover 800ms 유지 시 열고, 펼친 deck 이 가로 스크롤 컨테이너 밖이면 따라 스크롤한다.
   active(선택된) 카드가 가려져 있으면 보이는 위치로도 옮긴다. */
export function useSeriesDeck({
  deckCount,
  active,
  scrollContainerRef,
}: {
  deckCount: number;
  active?: boolean;
  scrollContainerRef?: RefObject<HTMLElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  // auto-scroll 이 진행되는 동안 카드가 cursor 밑에서 빠져나가 mouseleave 가 false-positive 로 fire 되어도 무시.
  // 스크롤이 끝난 뒤 :hover 상태를 한번 더 확인해 cursor 가 진짜로 떠났으면 닫음.
  const autoScrollingRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  /**
   * deck 펼침 시 우측이 scroll container 밖이면 자동 스크롤.
   * 핵심: 카드의 margin-right 가 0.5s CSS transition 으로 점차 늘어나면서 container.scrollWidth 도
   * 점차 커진다. 그래서 scrollBy({ behavior: "smooth" }) 한 번 호출은 시작 시점의 작은 maxScrollLeft 에
   * 즉시 clamp 되어 충분한 거리를 못 간다. 대신 rAF 루프로 매 프레임 scrollLeft 를 직접 증가시키면
   * 새로 늘어난 scrollWidth 가 그때그때 반영되어 deck 펼침 진행과 동기화된 스크롤이 가능.
   */
  const scrollDeckIntoView = (count: number) => {
    const card = cardRef.current;
    const container = scrollContainerRef?.current;
    if (!card || !container || count === 0) return;
    const cardRect = card.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const deckEndRight = cardRect.right + count * DECK_LAYER_WIDTH;
    const overflow = deckEndRight - (containerRect.right - SCROLL_EDGE_PADDING);
    if (overflow <= 0) return;

    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);

    autoScrollingRef.current = true;
    const startScroll = container.scrollLeft;
    const startTime = performance.now();
    const DURATION = 520; // CSS margin-right transition (0.5s) 살짝 넘김
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / DURATION);
      // easeOutCubic — 시작 빠르고 끝 부드럽게
      const eased = 1 - Math.pow(1 - t, 3);
      // 매 프레임 scrollLeft 를 직접 set — 이 시점의 scrollWidth 기준으로 brower 가 알아서 clamp.
      // 다음 프레임엔 margin-right 가 더 늘어나 scrollWidth 가 커지므로 scrollLeft 도 더 커질 수 있음
      container.scrollLeft = startScroll + overflow * eased;
      if (t < 1) {
        scrollRafRef.current = requestAnimationFrame(tick);
      } else {
        scrollRafRef.current = null;
        autoScrollingRef.current = false;
        // 스크롤 끝난 시점에 cursor 가 카드(hit-area 포함)에 더 이상 없으면 닫는다.
        // matches(":hover") 는 ::after pseudo 까지 포함한 paint area 의 hover 를 본다.
        if (!card.matches(":hover")) {
          setOpen(false);
        }
      }
    };
    scrollRafRef.current = requestAnimationFrame(tick);
  };

  // 선택(active)된 시리즈는 deck 을 펼친 상태로 유지한다. 해제되면(다른 시리즈 선택·필터 변경) 커서가
  // 카드 위에 없을 때만 접는다 — hover 중이면 hover 로직이 관리하게 둔다.
  useEffect(() => {
    if (active) {
      setOpen(true);
    } else if (!cardRef.current?.matches(":hover")) {
      setOpen(false);
    }
  }, [active]);

  // 활성(선택된) 시리즈가 부분적으로라도 가려져 있으면 부드럽게 scroll into view
  // mask gradient 영역 (28px) 도 고려해서 visible 판정
  useEffect(() => {
    if (!active) return;
    const card = cardRef.current;
    const container = scrollContainerRef?.current;
    if (!card || !container) return;
    const cardRect = card.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const MASK = 28; // .seriesRow --_mask-l / --_mask-r
    const leftHidden = (containerRect.left + MASK) - cardRect.left;
    const rightHidden = cardRect.right - (containerRect.right - MASK);
    if (leftHidden <= 0 && rightHidden <= 0) return; // 이미 다 보임
    let delta = 0;
    if (leftHidden > 0) delta = -leftHidden;
    else if (rightHidden > 0) delta = rightHidden;
    container.scrollBy({ left: delta, behavior: "smooth" });
  }, [active, scrollContainerRef]);

  const handleEnter = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => {
      setOpen(true);
      // setOpen 은 비동기 — 다음 프레임이 돼야 deckOpen 클래스가 붙고 margin-right transition 이 시작됨.
      // rAF 한 번 기다렸다 스크롤 루프 시작 → 첫 프레임부터 scrollWidth 가 늘기 시작
      requestAnimationFrame(() => scrollDeckIntoView(deckCount));
    }, HOVER_OPEN_MS);
  };
  const handleLeave = () => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    // auto-scroll 진행 중에는 mouseleave 가 카드 이동 때문에 잘못 발화될 수 있으니 무시.
    // 스크롤 종료 시점에 정상적으로 :hover 재확인해 닫을지 결정.
    if (autoScrollingRef.current) return;
    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
    // 선택된 시리즈는 커서가 떠나도 펼친 상태를 유지
    if (active) return;
    setOpen(false);
  };

  return { open, cardRef, handleEnter, handleLeave };
}
