"use client";

import { useState, useCallback } from "react";
import styles from "./StaggerText.module.css";

export interface StaggerTextProps {
  /** Text content to split into characters */
  children: string;
  /** Additional CSS class for the container */
  className?: string;
  /** Delay between each character animation in seconds */
  delayPerChar?: number;
  /** Custom stroke color (CSS variable or color value) */
  strokeColor?: string;
  /** Stroke width in pixels */
  strokeWidth?: number;
  /** Whether to enable hover effect */
  hoverEffect?: boolean;
}

/**
 * StaggerText Component
 *
 * Splits text into individual characters with staggered hover animation.
 * - On hover: characters become outlined one by one (forward order)
 * - On hover off: characters fill back with color (reverse order) while stroke remains
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
  const chars = children.split("");
  const totalChars = chars.length;

  const handleMouseEnter = useCallback(() => {
    if (!hoverEffect) return;
    setIsExiting(false);
    setIsHovered(true);
  }, [hoverEffect]);

  const handleMouseLeave = useCallback(() => {
    if (!hoverEffect) return;
    setIsHovered(false);
    setIsExiting(true);
    // Remove stroke after all characters have filled back
    const totalDuration = totalChars * delayPerChar * 1000 + 50;
    setTimeout(() => {
      setIsExiting(false);
    }, totalDuration);
  }, [hoverEffect, totalChars, delayPerChar]);

  // Custom style for stroke color and width
  const customStrokeStyle = strokeColor
    ? ({
        "--stagger-text-stroke-color": strokeColor,
        "--stagger-text-stroke-width": `${strokeWidth}px`,
      } as React.CSSProperties)
    : undefined;

  return (
    <span
      className={`${styles.container} ${className || ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={customStrokeStyle}
    >
      {chars.map((char, i) => {
        // Forward: first char starts first (0, 1, 2, ...)
        // Reverse: last char starts first (n-1, n-2, ..., 0)
        const forwardDelay = i * delayPerChar;
        const reverseDelay = (totalChars - 1 - i) * delayPerChar;
        const delay = isHovered ? forwardDelay : reverseDelay;

        // Determine class based on state
        let charClass = styles.char;
        if (isHovered) {
          charClass += ` ${styles.charHovered}`;
        } else if (isExiting) {
          charClass += ` ${styles.charExiting}`;
        }

        return (
          <span
            key={i}
            className={charClass}
            style={{ transitionDelay: `${delay}s` }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        );
      })}
    </span>
  );
}
