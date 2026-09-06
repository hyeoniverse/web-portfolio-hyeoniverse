"use client";

import { useState, useEffect, useRef } from "react";

/** 표시 값이 바뀌는 데 걸리는 시간. 두 단추의 연출을 같게 맞춘다. */
const DISPLAY_DELAY_MS = 150;
const ANIM_DURATION_MS = 300;

/**
 * 두 값을 오가는 단추의 연출 상태.
 *
 * 네비게이션의 테마 단추와 언어 단추가 똑같이 동작한다. 마우스를 올리면 바뀔 값을 미리
 * 보여 주고, 떼면 원래 값으로 돌아가고, 누르면 실제로 바꾼다. 누른 직후에는 마우스를
 * 떼도 미리보기로 되돌리지 않는다. 이미 그 값이 되었기 때문이다.
 *
 * 이 로직이 두 단추에 각각 적혀 있었다. 테마는 컴포넌트 위쪽에 함수 셋으로, 언어는
 * 화면 코드 안에 그대로 다시. 글자만 다르고 내용은 같았다.
 *
 * @param current 지금 값
 * @param next    마우스를 올렸을 때 미리 보여 줄 값
 * @param onToggle 실제로 값을 바꾸는 처리
 */
export function useToggleAnimation<T>(current: T, next: T, onToggle: () => void) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [display, setDisplay] = useState(current);

  const displayTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const animTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /* 눌러서 값이 바뀐 직후의 mouseleave 한 번은 무시한다.
     그러지 않으면 방금 바꾼 값을 다시 이전 값으로 되돌려 보여 준다. */
  const locked = useRef(false);

  // 바깥에서 값이 바뀌면(다른 곳에서 테마를 바꾸는 등) 표시도 맞춘다.
  useEffect(() => setDisplay(current), [current]);

  const startPreview = (to: T) => {
    clearTimeout(displayTimer.current);
    clearTimeout(animTimer.current);
    setIsAnimating(true);
    displayTimer.current = setTimeout(() => setDisplay(to), DISPLAY_DELAY_MS);
    animTimer.current = setTimeout(() => setIsAnimating(false), ANIM_DURATION_MS);
  };

  const handleToggle = () => {
    if (isClicking) return;
    setIsClicking(true);
    locked.current = true;
    onToggle();
    setTimeout(() => setIsClicking(false), ANIM_DURATION_MS);
  };

  const handleMouseEnter = () => {
    if (isAnimating || isClicking) return;
    startPreview(next);
  };

  const handleMouseLeave = () => {
    if (isClicking) return;
    if (locked.current) {
      locked.current = false;
      return;
    }
    startPreview(current);
  };

  return { isAnimating, isClicking, display, handleToggle, handleMouseEnter, handleMouseLeave };
}
