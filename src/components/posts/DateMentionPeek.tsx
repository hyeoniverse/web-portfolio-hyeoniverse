"use client";

// ── 리더뷰: 날짜 멘션([data-date-mention]) hover 시 미니 달력 peek ──
// 요일·해당 월 맥락을 바로 볼 수 있게. 위임 hover 로 span 감지 → MiniCalendar 팝오버.
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import MiniCalendar from "./plate/calendar/MiniCalendar";
import styles from "./DateMentionPeek.module.css";

const PEEK_W = 236; // 미니 달력 대략 폭 (뷰포트 클램프용)

export default function DateMentionPeek({ containerRef, language }: {
  containerRef: RefObject<HTMLDivElement | null>;
  language: string;
}) {
  const [peek, setPeek] = useState<{ date: string; top: number; left: number } | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* 아래 이펙트의 deps 에 들어가므로 신원을 고정한다.
     매 렌더 새로 만들면 hover 리스너를 렌더마다 떼었다 다시 거는 꼴이 된다. */
  const cancelHide = useCallback(() => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
  }, []);
  const scheduleHide = useCallback(() => {
    cancelHide();
    hideTimer.current = setTimeout(() => setPeek(null), 160);
  }, [cancelHide]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onOver = (e: MouseEvent) => {
      const span = (e.target as HTMLElement | null)?.closest?.("[data-date-mention]") as HTMLElement | null;
      if (!span || !el.contains(span)) return;
      const date = span.getAttribute("data-date-mention");
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
      cancelHide();
      const r = span.getBoundingClientRect();
      const left = Math.max(8, Math.min(r.left, window.innerWidth - PEEK_W - 8));
      setPeek({ date, top: r.bottom + 6, left });
    };
    const onOut = (e: MouseEvent) => {
      const span = (e.target as HTMLElement | null)?.closest?.("[data-date-mention]");
      if (!span) return;
      const to = e.relatedTarget as Node | null;
      if (to && span.contains(to)) return; // 같은 span 내부 이동은 무시
      scheduleHide();
    };
    el.addEventListener("mouseover", onOver);
    el.addEventListener("mouseout", onOut);
    return () => {
      el.removeEventListener("mouseover", onOver);
      el.removeEventListener("mouseout", onOut);
      cancelHide();
    };
  }, [containerRef, cancelHide, scheduleHide]);

  if (!peek) return null;
  return createPortal(
    <div
      className={styles.peek}
      style={{ top: peek.top, left: peek.left }}
      onMouseEnter={cancelHide}
      onMouseLeave={scheduleHide}
    >
      <MiniCalendar date={peek.date} onSelect={() => { /* peek 전용 — 이동 없음 */ }} language={language} />
    </div>,
    document.body,
  );
}
