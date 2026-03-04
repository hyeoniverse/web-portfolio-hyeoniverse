"use client";

import { useState, useEffect, useRef } from "react";
import { useSoundManager } from "@/hooks/useSoundManager";
import styles from "./TypeWriter.module.css";
import { cn } from "@/utils";

interface TypeWriterProps {
  text: string;
  typingSpeed?: number;
  cursorBlinkSpeed?: number;
  delay?: number;
  className?: string;
  cursorClassName?: string;
  threshold?: number;
  fontSize?: string | number;
  align?: "left" | "center" | "right";
  onComplete?: () => void;
  caption?: string;
  captionClassName?: string;
  captionDelay?: number;
  replayTrigger?: number;
}

export default function TypeWriter({
  text,
  typingSpeed = 150,
  cursorBlinkSpeed = 500,
  delay = 0,
  className,
  cursorClassName,
  threshold = 0.1,
  fontSize,
  align,
  onComplete,
  caption,
  captionClassName,
  captionDelay = 500,
  replayTrigger,
}: TypeWriterProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);
  const [showCaption, setShowCaption] = useState(false);
  const [hasTypedOnce, setHasTypedOnce] = useState(false); // 타이핑 완료 여부

  const { playSound } = useSoundManager();

  const textIndexRef = useRef(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cursorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);

  /** IntersectionObserver */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [threshold]);

  /** 타이핑 effect */
  useEffect(() => {
    const startCursorBlinking = () => {
      setCursorVisible(true);
      if (cursorIntervalRef.current) clearInterval(cursorIntervalRef.current);
      cursorIntervalRef.current = setInterval(() => {
        setCursorVisible((prev) => !prev);
      }, cursorBlinkSpeed);
    };

    const completeTyping = () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setDisplayedText(text);
      setHasTypedOnce(true); // 완료 표시
      setShowCaption(Boolean(caption));
      startCursorBlinking();
      onComplete?.();
    };

    if (!inView) {
      completeTyping();
      return;
    }

    // 이미 타이핑 완료했다면 다시 타이핑하지 않음
    if (hasTypedOnce) return;

    // 타이핑 초기화
    textIndexRef.current = 0;
    setDisplayedText("");
    setShowCaption(false);

    const typeCharacter = () => {
      const currentIndex = textIndexRef.current;
      const nextChar = text[currentIndex];

      if (currentIndex < text.length && nextChar !== undefined) {
        setDisplayedText((prev) => prev + nextChar);
        playSound("typing");
        textIndexRef.current += 1;
        typingTimeoutRef.current = setTimeout(typeCharacter, typingSpeed);
      } else {
        setHasTypedOnce(true); // ✅ 완료 표시
        startCursorBlinking();
        if (caption) setTimeout(() => setShowCaption(true), captionDelay);
        onComplete?.();
      }
    };

    typingTimeoutRef.current = setTimeout(typeCharacter, delay);

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (cursorIntervalRef.current) clearInterval(cursorIntervalRef.current);
    };
  }, [
    inView,
    text,
    typingSpeed,
    cursorBlinkSpeed,
    delay,
    caption,
    captionDelay,
    onComplete,
    playSound,
    hasTypedOnce, // ✅ 중요: 완료 여부 의존성
  ]);

  /** text 변경 시 초기화 */
  useEffect(() => {
    setDisplayedText("");
    textIndexRef.current = 0;
    setShowCaption(false);
    setCursorVisible(true);
    setHasTypedOnce(false);
  }, [text]);

  /** replayTrigger 변경 시 재생 */
  useEffect(() => {
    if (replayTrigger === undefined || replayTrigger === 0) return;
    setDisplayedText("");
    textIndexRef.current = 0;
    setShowCaption(false);
    setCursorVisible(true);
    setHasTypedOnce(false);
  }, [replayTrigger]);

  return (
    <div className="vertical">
      <span
        ref={containerRef}
        className={cn(styles.typewriter, className)}
        style={{ fontSize, display: "block", textAlign: align ?? "left" }}
      >
        {displayedText}
        <span
          className={cn(
            styles.cursor,
            cursorVisible ? styles.visible : styles.hidden,
            cursorClassName
          )}
          aria-hidden="true"
        >
          |
        </span>
      </span>

      {caption && (
        <span className={cn(styles.caption, showCaption && styles.captionVisible, captionClassName)}>{caption}</span>
      )}
    </div>
  );
}
