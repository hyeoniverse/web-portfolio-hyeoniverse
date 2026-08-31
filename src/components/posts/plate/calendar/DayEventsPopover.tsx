"use client";

// ── 셀에 다 안 들어간 이벤트 전체 목록 팝오버 (+N 클릭, 구글 캘린더 방식) ──
import React from "react";
import { createPortal } from "react-dom";
import { type CalEvent, type EventLabel, type TimeFormat, eventColorVar, formatClock } from "./model";
import { formatDateValue } from "../dateUtils";
import styles from "./Calendar.module.css";
import Pressable from "@/components/ui/Pressable";

export type DayPopState = { date: string; events: CalEvent[]; rect: DOMRect } | null;

export default function DayEventsPopover({
  state, labels, language, readOnly, onEventClick, onClose, onHover, timeFormat = "12h",
}: {
  state: DayPopState;
  labels: EventLabel[];
  language: string;
  readOnly?: boolean;
  timeFormat?: TimeFormat;
  onEventClick?: (ev: CalEvent) => void;
  onClose: () => void;
  onHover: (ev: CalEvent | null, rect?: DOMRect) => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!state) return;
    const close = () => onClose();
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("mousedown", onDown, true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [state, onClose]);

  if (!state || typeof document === "undefined") return null;
  const { rect, events } = state;

  const W = 240;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = Math.max(8, Math.min(rect.left, vw - W - 8));
  const below = rect.bottom + 6;
  const placeBelow = below + 220 < vh || below < vh / 2;
  const style: React.CSSProperties = placeBelow
    ? { top: below, left, width: W }
    : { bottom: vh - rect.top + 6, left, width: W };

  return createPortal(
    <div ref={ref} className={styles.dayPop} style={style}>
      <div className={styles.dayPopHead}>{formatDateValue(state.date, null, language)}</div>
      <div className={styles.dayPopList}>
        {events.map((ev) => (
          <Pressable
            key={ev.id}
            className={`${styles.chip}${ev.status === "done" ? ` ${styles.chipDone}` : ""}`}
            style={{ ["--_chip" as string]: eventColorVar(ev, labels) }}
            onClick={() => { onHover(null); onEventClick?.(ev); onClose(); }}
            onMouseEnter={(e) => onHover(ev, e.currentTarget.getBoundingClientRect())}
            onMouseLeave={() => onHover(null)}
            tabIndex={readOnly ? -1 : 0}
          >
            <span className={styles.chipDot} />
            <span className={styles.chipLabel}>{ev.time ? `${formatClock(ev.time, timeFormat)} ` : ""}{ev.title || " "}</span>
          </Pressable>
        ))}
      </div>
    </div>,
    document.body,
  );
}
