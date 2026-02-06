"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import styles from "./StaggerText.module.css";

export interface StaggerTextProps {
  /** Text content to split into characters */
  children: string;
  /** Additional CSS class for the container */
  className?: string;
  /** Delay between each character animation in ms */
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
 * Splits text into individual characters with typing-like staggered animation.
 * - On hover: characters become outlined one by one (like typing)
 * - On hover off: characters fill back with color in reverse order
 */
export default function StaggerText({
  children,
  className,
  delayPerChar = 40,
  strokeColor,
  strokeWidth = 1,
  hoverEffect = true,
}: StaggerTextProps) {
  const chars = children.split("");
  const totalChars = chars.length;

  // Track which characters are active (outlined)
  const [activeChars, setActiveChars] = useState<Set<number>>(new Set());
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Clear all pending timeouts
  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearAllTimeouts();
  }, [clearAllTimeouts]);

  const handleMouseEnter = useCallback(() => {
    if (!hoverEffect) return;
    clearAllTimeouts();

    // Activate characters one by one (forward: 0, 1, 2, ...)
    chars.forEach((_, i) => {
      const timeout = setTimeout(() => {
        setActiveChars((prev) => new Set([...prev, i]));
      }, i * delayPerChar);
      timeoutsRef.current.push(timeout);
    });
  }, [hoverEffect, chars, delayPerChar, clearAllTimeouts]);

  const handleMouseLeave = useCallback(() => {
    if (!hoverEffect) return;
    clearAllTimeouts();

    // Deactivate characters one by one (reverse: n-1, n-2, ..., 0)
    chars.forEach((_, i) => {
      const reverseIndex = totalChars - 1 - i;
      const timeout = setTimeout(() => {
        setActiveChars((prev) => {
          const next = new Set(prev);
          next.delete(reverseIndex);
          return next;
        });
      }, i * delayPerChar);
      timeoutsRef.current.push(timeout);
    });
  }, [hoverEffect, chars, totalChars, delayPerChar, clearAllTimeouts]);

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
      {chars.map((char, i) => (
        <span
          key={i}
          className={`${styles.char} ${activeChars.has(i) ? styles.charActive : ""}`}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );
}
