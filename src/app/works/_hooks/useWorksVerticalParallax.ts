"use client";

import { useLayoutEffect, type RefObject } from "react";
import gsap from "gsap";

/* ── 모바일 세로 스크롤 이미지 패럴랙스 ──
   세로 단일 컬럼에서는 수평 엔진이 돌지 않는다. 대신 스크롤 속도를 그대로 이미지 y 오프셋으로 바꿔
   카드가 지나갈 때 안쪽 이미지가 살짝 끌리게 한다. scale 1.05 는 오프셋이 여백을 드러내지 않게 하는 여유분. */
export function useWorksVerticalParallax({
  sliderRef,
  enabled,
  cardClassName,
  imageWrapClassName,
}: {
  sliderRef: RefObject<HTMLDivElement | null>;
  /** 모바일 세로 레이아웃일 때만 돈다 */
  enabled: boolean;
  cardClassName: string;
  imageWrapClassName: string;
}) {
  useLayoutEffect(() => {
    if (!enabled) return;
    const slider = sliderRef.current;
    if (!slider) return;

    const cards = gsap.utils.toArray<HTMLElement>(`.${cardClassName}`, slider);
    const cardImages = cards.map((c) => c.querySelector(`.${imageWrapClassName}`) as HTMLElement | null);

    let lastScrollY = window.scrollY;
    let velocity = 0;
    let imageOffset = 0;
    let targetImageOffset = 0;
    let rafId: number;

    const animate = () => {
      const scrollY = window.scrollY;
      velocity = scrollY - lastScrollY;
      lastScrollY = scrollY;

      targetImageOffset = gsap.utils.clamp(-40, 40, -velocity * 1.5);
      imageOffset += (targetImageOffset - imageOffset) * 0.08;

      cardImages.forEach((img) => {
        if (img) gsap.set(img, { y: imageOffset, scale: 1.05 });
      });

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [enabled, sliderRef, cardClassName, imageWrapClassName]);
}
