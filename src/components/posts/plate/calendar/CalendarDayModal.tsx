"use client";

// ── 날짜 상세 모달 — 특정 날짜의 모든 일정을 한 번에 (월/타임라인 공용) ──
import React, { useContext } from "react";
import { createPortal } from "react-dom";
import { Plus } from "@/components/icons";
import { ModalFooterContext } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useModalStore } from "@/stores/modalStore";
import { type CalEvent, type EventLabel, type TimeFormat, eventColorVar, eventTimeLabel, statusOf, statusName, priorityOf, priorityName, findLabel } from "./model";
import styles from "./Calendar.module.css";
import Pressable from "@/components/ui/Pressable";

export default function CalendarDayModal({
  modalId, date, events, labels, language, readOnly, onOpenEvent, onAdd, timeFormat = "12h", onClose,
}: {
  modalId: string;
  date: string;
  events: CalEvent[];
  labels: EventLabel[];
  language: string;
  readOnly?: boolean;
  timeFormat?: TimeFormat;
  onOpenEvent?: (ev: CalEvent) => void;
  onAdd?: (date: string) => void;
  /** 제공 시 close() 가 store 모달 대신 이걸 호출 — 전체화면 peek 패널 재사용용 */
  onClose?: () => void;
}) {
  const t = (ko: string, en: string) => (language === "ko" ? ko : en);
  const closeModal = useModalStore((s) => s.closeModal);
  const footerEl = useContext(ModalFooterContext);
  const close = () => (onClose ? onClose() : closeModal(modalId));

  // 시간 있는 일정은 시간순, 없는(종일) 일정은 위로
  const sorted = [...events].sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));

  return (
    <>
      <div className={styles.dayModal}>
        {sorted.length === 0 ? (
          <div className={styles.dayModalEmpty}>{t("일정이 없습니다", "No events")}</div>
        ) : (
          <div className={styles.dayModalList}>
            {sorted.map((ev) => {
              const st = statusOf(ev.status);
              const pr = priorityOf(ev.priority);
              const label = findLabel(ev.labelId, labels);
              const spanning = ev.endDate && ev.endDate > ev.date;
              const sub = [label?.name, st && statusName(ev.status, language), pr && priorityName(ev.priority, language)].filter(Boolean).join("  ·  ");
              return (
                <Pressable
                  key={ev.id}
                  className={`${styles.dayRow}${ev.status === "done" ? ` ${styles.dayRowDone}` : ""}`}
                  style={{ ["--_c" as string]: eventColorVar(ev, labels) }}
                  onClick={() => { close(); onOpenEvent?.(ev); }}
                >
                  <span className={styles.dayRowTime}>
                    {ev.time ? eventTimeLabel(ev, timeFormat) : t("종일", "All-day")}
                  </span>
                  <span className={styles.dayRowBody}>
                    <span className={styles.dayRowTitleLine}>
                      <span className={styles.dayRowDot} />
                      <span className={styles.dayRowTitle}>{ev.title || t("(제목 없음)", "(Untitled)")}</span>
                      {spanning && <span className={styles.dayRowRange}>{t("기간", "Range")}</span>}
                    </span>
                    {sub && <span className={styles.dayRowSub}>{sub}</span>}
                  </span>
                </Pressable>
              );
            })}
          </div>
        )}
      </div>

      {footerEl && createPortal(
        <>
          {!readOnly && onAdd && (
            <Button size="sm" variant="outline" icon={<Plus size={13} />} soundDisabled onClick={() => { close(); onAdd(date); }} style={{ marginRight: "auto" }}>
              {t("이벤트 추가", "Add event")}
            </Button>
          )}
          <Button size="sm" variant="primary" soundDisabled onClick={close}>{t("닫기", "Close")}</Button>
        </>,
        footerEl,
      )}
    </>
  );
}
