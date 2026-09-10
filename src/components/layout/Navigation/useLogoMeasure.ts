"use client";

import { useState, useEffect, useCallback, useRef, type RefObject } from "react";
import type { MotionValue } from "framer-motion";

/** 로딩이 끝나 네비게이션 자리로 줄어드는 시간·곡선(ms). */
const SHRINK = { duration: 800, delay: 50, easing: "cubic-bezier(0.76, 0, 0.24, 1)" };

type LogoMotion = {
  x: MotionValue<number>;
  y: MotionValue<number>;
  scaleX: MotionValue<number>;
  scaleY: MotionValue<number>;
};

/**
 * 로딩 화면의 큰 로고가 네비게이션 자리로 줄어드는 연출을 맡는다.
 *
 * 로고는 네비게이션 자리에 놓인 채로 transform 만으로 화면 한가운데에서 크게 보였다가 제자리로
 * 돌아온다. 자리(레이아웃)를 옮기면 레이아웃 밀림으로 잡히기 때문이다. transform 값은 framer 의
 * motion value 로 쥐고, 여기서 직접 움직인다.
 *
 * 순서
 * 1. 글자 로고는 서버 HTML 부터 CSS(`cssLoadingClass`)가 한가운데로 옮기고 키워 둔다.
 *    이미지·배지 로고는 비율을 CSS 로 낼 수 없어 재기 전까지 숨긴다(Navigation 이 처리).
 * 2. 다음 프레임에 넘겨받는다 — CSS 가 계산한 행렬을 그대로 읽어(이미지·배지는 재서) motion value 에
 *    맞춰 넣고, 클래스를 뗀다. 한 번만 한다.
 * 3. 전환이 시작되면 지금 모습에서 네비게이션 자리로 줄인다 — 합성기(compositor)에서.
 *
 * 줄이는 애니메이션을 framer 의 motion value 로 돌리면 자바스크립트가 매 프레임 transform 을 쓴다.
 * 그러면 메인 스레드가 막히는 순간 같이 멈춘다. 로딩이 끝나는 무렵이 마침 페이지의 3D 가 첫 프레임을
 * 그리는(셰이더 컴파일·텍스처 업로드로 GPU 를 기다리는) 때라, 줄어들다 멈췄다가 끝에 한 번에
 * 도착했다(실제 GPU 첫 방문 약 0.3초, 모바일 조건 약 0.5초). transform 을 Web Animations 로
 * 애니메이션하면 합성기가 보간하므로 메인 스레드가 막혀도 계속 움직인다.
 *
 * 3번을 `animate` prop 의 목표가 바뀌는 것에 맡기면 안 된다. 하이드레이션이 무거운 페이지에서는
 * 측정(rAF)보다 로딩 완료 타이머가 먼저 와서 React 가 두 변화를 한 번에 그리는데, 그러면 목표가
 * 처음(네비게이션 자리)과 같아 보여 framer 가 움직이지 않는다. 로고가 큰 채로 멈췄다(/posts 모바일).
 *
 * @param logoRef 네비게이션 로고 요소
 * @param state.showLoadingLogo 로딩 로고가 떠 있는 동안만 넘겨받는다
 * @param state.isLoading 로딩이 끝나면 다음을 위해 되돌린다
 * @param state.isTransitioning 네비게이션 자리로 줄어들기 시작하는 순간
 * @param options.cssLoadingClass 재기 전 모습을 그리는 CSS 클래스(글자 로고만)
 * @param options.stretch 장평(scaleX). 제자리의 scaleX 가 이 값이다
 * @param options.motion 로고에 걸린 motion value
 */
export function useLogoMeasure(
  logoRef: RefObject<HTMLElement | null>,
  state: { showLoadingLogo: boolean; isLoading: boolean; isTransitioning: boolean },
  options: { cssLoadingClass?: string; stretch: number; motion: LogoMotion },
) {
  const { showLoadingLogo, isLoading, isTransitioning } = state;
  const { cssLoadingClass, stretch, motion } = options;
  const [logoMeasured, setLogoMeasured] = useState(false);
  const handedOff = useRef(false);
  const shrinking = useRef<Animation | null>(null);

  const handoff = useCallback(() => {
    const el = logoRef.current;
    if (!el || handedOff.current) return;
    handedOff.current = true;

    let x: number, y: number, scale: number;
    const m =
      cssLoadingClass && el.classList.contains(cssLoadingClass)
        ? new DOMMatrixReadOnly(getComputedStyle(el).transform)
        : null;
    if (cssLoadingClass) el.classList.remove(cssLoadingClass);

    if (m && m.d > 1.01) {
      /* 글자 로고 — CSS 행렬을 그대로 쓴다. 다시 계산하면 반올림만큼이라도 어긋나 넘겨받는 순간
         튄다. 원점이 같으므로 행렬(a, d, e, f)이 곧 scaleX·scaleY·x·y 다. 브라우저가 CSS 삼각함수를
         몰라 transform 이 버려졌다면(배율 1) 아래에서 잰다. */
      x = m.e;
      y = m.f;
      scale = m.d;
    } else {
      /* 이미지·배지 로고 — 로딩 글자 크기를 임시 요소로 재 비율을 구하고, 제자리에서 화면
         한가운데까지의 거리를 잰다. */
      const tempEl = document.createElement("span");
      tempEl.style.cssText = "font-size:var(--fluid-font-size-6xl);position:absolute;visibility:hidden;";
      tempEl.textContent = "H";
      document.body.appendChild(tempEl);
      const loadingFontSize = parseFloat(getComputedStyle(tempEl).fontSize);
      document.body.removeChild(tempEl);
      const navFontSize = parseFloat(getComputedStyle(el).fontSize);
      scale = navFontSize > 0 ? loadingFontSize / navFontSize : 1;
      // transformOrigin: "left center" 기준 → 스케일된 너비를 반영한 중앙 오프셋
      const rect = el.getBoundingClientRect();
      x = window.innerWidth / 2 - rect.left - (rect.width * scale) / 2;
      y = window.innerHeight / 2 - (rect.top + rect.height / 2);
    }

    /* 이 프레임에 transform 을 직접 써 둔다. motion value 는 framer 가 다음 프레임에야 그리므로,
       그 사이 한 프레임 동안 클래스가 빠진 로고가 제자리로 튀어 보인다. */
    el.style.transform = `translateX(${x}px) translateY(${y}px) scaleX(${scale * stretch}) scaleY(${scale})`;
    motion.x.jump(x);
    motion.y.jump(y);
    motion.scaleX.jump(scale * stretch);
    motion.scaleY.jump(scale);
    setLogoMeasured(true);
  }, [logoRef, cssLoadingClass, stretch, motion]);

  /* 로딩 로고가 떠 있으면 다음 프레임에 넘겨받는다. 그 전에 로딩이 끝나면 예약을 거둔다 —
     끝난 뒤에 돌면 제자리로 가야 할 로고를 크게 고정해 버린다. */
  useEffect(() => {
    if (!showLoadingLogo || handedOff.current || !logoRef.current) return;
    const id = requestAnimationFrame(handoff);
    return () => cancelAnimationFrame(id);
  }, [showLoadingLogo, handoff, logoRef]);

  /* 전환이 시작되면 지금 모습에서 네비게이션 자리로. 아직 못 넘겨받았으면 지금 넘겨받는다.
     끝 모습(제자리)을 먼저 인라인과 motion value 에 넣어 두고, 합성기 애니메이션이 지금 모습에서
     거기까지 보간한다. 애니메이션이 도는 동안에는 인라인보다 애니메이션이 이기고, 끝나면 인라인의
     제자리가 남는다. isTransitioning 은 400ms 뒤 로딩 종료와 함께 꺼지지만 애니메이션(0.85초)은
     끝까지 둔다 — 여기서 정리 함수로 멈추면 중간에 선다. */
  useEffect(() => {
    if (!isTransitioning) return;
    const el = logoRef.current;
    if (!el) return;
    handoff();
    const from = el.style.transform || getComputedStyle(el).transform;
    const to = `translateX(0px) translateY(0px) scaleX(${stretch}) scaleY(1)`;
    motion.x.jump(0);
    motion.y.jump(0);
    motion.scaleX.jump(stretch);
    motion.scaleY.jump(1);
    el.style.transform = to;
    shrinking.current?.cancel();
    /* 움직임 줄이기를 켠 사람에게는 줄이는 과정을 건너뛰고 바로 제자리에 둔다(뒤 글자 등장과 같게). */
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    shrinking.current = el.animate([{ transform: from }, { transform: to }], { ...SHRINK, fill: "backwards" });
  }, [isTransitioning, handoff, logoRef, motion, stretch]);

  useEffect(() => () => shrinking.current?.cancel(), []);

  // 로딩이 완전히 끝나면 다음 로딩을 위해 되돌린다.
  useEffect(() => {
    if (!isLoading) {
      handedOff.current = false;
      setLogoMeasured(false);
    }
  }, [isLoading]);

  return { logoMeasured };
}
