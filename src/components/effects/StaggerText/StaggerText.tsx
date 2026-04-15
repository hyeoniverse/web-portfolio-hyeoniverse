"use client";

import { useState, useCallback, useRef } from "react";
import styles from "./StaggerText.module.css";

export interface StaggerTextProps {
  /** 글자 단위로 분리할 텍스트 내용 */
  children: string;
  /** 컨테이너에 추가할 CSS 클래스 */
  className?: string;
  /** 각 글자 애니메이션 간의 지연 시간 (초) */
  delayPerChar?: number;
  /** 커스텀 스트로크 색상 (CSS 변수 또는 색상 값) */
  strokeColor?: string;
  /** 스트로크 너비 (픽셀) */
  strokeWidth?: number;
  /** 호버 효과 활성화 여부 */
  hoverEffect?: boolean;
}

/**
 * StaggerText 컴포넌트
 *
 * 텍스트를 개별 글자로 분리하여 시차 호버 애니메이션을 적용합니다.
 * - 호버 시: 글자가 순방향으로 하나씩 아웃라인으로 변경
 * - 호버 해제 시: 역방향으로 글자가 색상으로 채워지면서 스트로크 유지
 *
 * @example
 * ```tsx
 * <StaggerText className={styles.title}>Hello World</StaggerText>
 * <StaggerText delayPerChar={0.05} strokeColor="#ff0000">Custom</StaggerText>
 * ```
 */
export default function StaggerText({
  children,
  className,
  delayPerChar = 0.04,
  strokeColor,
  strokeWidth = 1,
  hoverEffect = true,
}: StaggerTextProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const chars = children.split("");
  const totalChars = chars.length;

  // hover 시점의 실제 글자 색을 읽어 stroke 색으로 저장 (color:transparent 되기 전)
  // strokeColor prop이 명시돼도 실제 글자 색을 우선해 동적으로 따라감
  const captureStrokeColor = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    // 글자 색이 적용된 첫 번째 char 엘리먼트에서 읽기 (container는 inherit)
    const charEl = el.querySelector(`.${styles.char}`) as HTMLElement | null;
    const source = charEl ?? el;
    const computed = getComputedStyle(source).color;
    if (computed) {
      el.style.setProperty("--stagger-text-stroke-color", computed);
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!hoverEffect) return;
    captureStrokeColor();
    setIsExiting(false);
    setIsHovered(true);
  }, [hoverEffect, captureStrokeColor]);

  const handleMouseLeave = useCallback(() => {
    if (!hoverEffect) return;
    setIsHovered(false);
    setIsExiting(true);
    // 모든 글자가 다시 채워진 후 스트로크 제거
    const totalDuration = totalChars * delayPerChar * 1000 + 50;
    setTimeout(() => {
      setIsExiting(false);
    }, totalDuration);
  }, [hoverEffect, totalChars, delayPerChar]);

  // strokeColor prop은 초기 값(hover 전)으로 사용, hover 시 동적으로 덮어씀
  const customStrokeStyle = {
    ...(strokeColor && { "--stagger-text-stroke-color": strokeColor }),
    "--stagger-text-stroke-width": `${strokeWidth}px`,
  } as React.CSSProperties;

  return (
    <span
      ref={containerRef}
      className={`${styles.container} ${className || ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={customStrokeStyle}
    >
      {chars.map((char, i) => {
        // 순방향: 첫 번째 글자부터 시작 (0, 1, 2, ...)
        // 역방향: 마지막 글자부터 시작 (n-1, n-2, ..., 0)
        const forwardDelay = i * delayPerChar;
        const reverseDelay = (totalChars - 1 - i) * delayPerChar;
        const delay = isHovered ? forwardDelay : reverseDelay;

        // 상태에 따라 클래스 결정
        let charClass = styles.char;
        if (isHovered) {
          charClass += ` ${styles.charHovered}`;
        } else if (isExiting) {
          charClass += ` ${styles.charExiting}`;
        }

        // 공백은 inline span으로 렌더 → 단어 단위 줄바꿈 허용
        if (char === " ") {
          return <span key={i}> </span>;
        }

        return (
          <span
            key={i}
            className={charClass}
            style={{ transitionDelay: `${delay}s` }}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
}
