"use client";

import { useRef, useEffect, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import DatePicker, { type Format } from "./DatePicker";
import { usePortalContainer } from "../portalContainer";
import styles from "./DatePicker.module.css";

interface DatePickerPopoverProps {
  year: string;
  month: string;
  day: string;
  format: Format;
  onSelect: (year: string, month: string, day: string) => void;
  onClose: () => void;
  /** 이 시점 이전은 cell 비활성 */
  minDate?: Date;
  /** 이 시점 이후는 cell 비활성 */
  maxDate?: Date;
  /** trigger 아래 inline 으로 펼침 (absolute popover 대신). 외부 클릭/ESC 자동 닫힘 비활성. */
  inline?: boolean;
  /** 사이트 설정과 무관하게 렌더 모드 강제 (예: 연/월 이동은 항상 spinner) */
  forceMode?: "spinner" | "calendar";
  /** absolute 대신 portal(fixed)로 띄워 overflow 컨테이너(모달 스크롤 등)에 잘리지 않게. */
  portal?: boolean;
}

export default function DatePickerPopover({
  year, month, day, format, onSelect, onClose, minDate, maxDate, inline = false, forceMode, portal = false,
}: DatePickerPopoverProps) {
  const { language } = useLanguage();
  const { datePickerStyle } = useSiteConfig();
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
        // 아래 공간 부족하면 위로 flip (trigger 와 GAP 만큼 띄워 안 겹치게), 그래도 넘치면 뷰포트 안으로 clamp
        if (top + ph > vh - MARGIN && r.top - ph - GAP > MARGIN) top = r.top - ph - GAP;
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

  const mode = forceMode ?? (datePickerStyle === "calendar" ? "calendar" : "spinner");

  const chrome = (
    <div className={styles.popoverChrome}>
      <DatePicker
        year={year} month={month} day={day}
        format={format} mode={mode} language={language}
        onSelect={onSelect}
        minDate={minDate}
        maxDate={maxDate}
      />
    </div>
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
