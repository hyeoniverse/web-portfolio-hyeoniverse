"use client";

import { useRef, useEffect, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import TimePicker from "./TimePicker";
import { usePortalContainer } from "../portalContainer";
import styles from "./DatePicker.module.css";

interface TimePickerPopoverProps {
  hour: string;
  minute: string;
  onSelect: (hour: string, minute: string) => void;
  onClose: () => void;
  minuteStep?: number;
  /** trigger 아래 inline 으로 펼침 (absolute popover 대신). */
  inline?: boolean;
  /** absolute 대신 portal(fixed)로 띄워 overflow 컨테이너(모달 스크롤 등)에 잘리지 않게. */
  portal?: boolean;
  /** spinner 초기 표시 형식 — 기본 "24" */
  defaultFormat?: "24" | "12";
}

/** 시:분 picker popover — DatePickerPopover와 동일 패턴 */
export default function TimePickerPopover({
  hour, minute, onSelect, onClose, minuteStep, inline = false, portal = false, defaultFormat,
}: TimePickerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const portalContainer = usePortalContainer();
  const usePortal = portal && !inline;
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  // portal 모드: 원래 기준이던 부모(offsetParent) rect 하단-중앙에 fixed 배치 → absolute 와 동일 위치
  useLayoutEffect(() => {
    if (!usePortal) return;
    const parent = anchorRef.current?.parentElement;
    if (!parent) return;
    const update = () => {
      const r = parent.getBoundingClientRect();
      const vw = window.innerWidth, vh = window.innerHeight, MARGIN = 8, GAP = 4;
      const pop = popoverRef.current;
      const pw = pop?.offsetWidth ?? 0;
      const ph = pop?.offsetHeight ?? 0;
      let top = r.bottom + GAP; // 아래, trigger 와 GAP
      let left = r.left + r.width / 2; // popoverPortal 은 translateX(-50%) — left 는 중심
      if (ph) {
        if (top + ph > vh - MARGIN && r.top - ph - GAP > MARGIN) top = r.top - ph - GAP; // 위로 flip, GAP 만큼 띄워 안 겹침
        top = Math.max(MARGIN, Math.min(top, vh - ph - MARGIN));
      }
      if (pw) left = Math.max(MARGIN + pw / 2, Math.min(left, vw - MARGIN - pw / 2));
      setCoords({ top, left });
    };
    update(); // popover 는 항상 렌더(visibility:hidden)라 여기서 실측 → 페인트 전 배치 → flip flicker 없음
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [usePortal]);

  useEffect(() => {
    if (inline) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, inline]);

  useEffect(() => {
    if (inline) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, inline]);

  const chrome = (
    <motion.div
      className={styles.popoverChrome}
      layout
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <TimePicker hour={hour} minute={minute} onSelect={onSelect} minuteStep={minuteStep} defaultFormat={defaultFormat} />
    </motion.div>
  );

  if (usePortal) {
    return (
      <>
        <span ref={anchorRef} aria-hidden style={{ display: "none" }} />
        {createPortal(
          // 항상 렌더하되 좌표 잡히기 전엔 visibility:hidden — 측정용 실체가 있어야 flip 을 페인트 전에 끝냄
          <div ref={popoverRef} className={styles.popoverPortal} style={{ top: coords?.top ?? 0, left: coords?.left ?? 0, visibility: coords ? undefined : "hidden" }}>
            {chrome}
          </div>,
          portalContainer ?? document.body,
        )}
      </>
    );
  }

  return (
    <div
      ref={popoverRef}
      className={`${styles.popover}${inline ? ` ${styles.popoverInline}` : ""}`}
    >
      {chrome}
    </div>
  );
}
