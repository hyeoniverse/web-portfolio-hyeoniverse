"use client";

// ── 화살표 클릭 시 연결된 체인(선행·후속 전체)을 순서대로 — 넘버링 스테퍼 타임라인 ──
import React from "react";
import { Check, CalendarDays, Clock } from "lucide-react";
import { type CalEvent, type EventLabel, type TimeFormat, eventColorVar, eventTimeLabel, findLabel, statusOf, statusName, priorityOf, priorityName } from "./model";
import { formatDateValue } from "../dateUtils";
import styles from "./Calendar.module.css";

export default function CalendarChainModal({
  events, labels, language, onOpenEvent, timeFormat = "12h",
}: {
  events: CalEvent[];
  labels: EventLabel[];
  language: string;
  onOpenEvent?: (id: string) => void;
  timeFormat?: TimeFormat;
}) {
  const t = (ko: string, en: string) => (language === "ko" ? ko : en);
  // finish-to-start 규칙상 날짜순 = 의존 순서
  const ordered = React.useMemo(
    () => [...events].sort((a, b) => (a.date + (a.time || "99:99")).localeCompare(b.date + (b.time || "99:99"))),
    [events],
  );

  return (
    <div className={styles.chainFlow}>
      {ordered.map((ev) => {
        const label = findLabel(ev.labelId, labels);
        const st = statusOf(ev.status);
        const pr = priorityOf(ev.priority);
        const done = ev.status === "done";
        return (
          <button
            key={ev.id}
            type="button"
            className={`${styles.chainStep}${done ? ` ${styles.chainStepDone}` : ""}`}
            style={{ ["--_c" as string]: eventColorVar(ev, labels) }}
            onClick={() => onOpenEvent?.(ev.id)}
          >
            <span className={styles.chainStepRail} aria-hidden>
              <span className={styles.chainStepNode}>{done && <Check size={9} strokeWidth={3.5} />}</span>
            </span>
            <span className={styles.chainStepBody}>
              <span className={styles.chainStepTitleRow}>
                <span className={styles.chainStepTitle}>{ev.title || t("(제목 없음)", "(Untitled)")}</span>
                {st && <span className={styles.chainChip} style={{ ["--_sc" as string]: st.color }}><span className={styles.statusDot} />{statusName(ev.status, language)}</span>}
                {pr && <span className={styles.chainChip} style={{ ["--_sc" as string]: pr.color }}><span className={styles.statusDot} />{priorityName(ev.priority, language)}</span>}
              </span>
              <span className={styles.chainStepMeta}>
                <span className={styles.chainMetaItem}><CalendarDays size={12} />{formatDateValue(ev.date, null, language)}</span>
                {ev.time && <span className={styles.chainMetaItem}><Clock size={12} />{eventTimeLabel(ev, timeFormat)}</span>}
                {label && <span className={styles.chainMetaItem}><span className={styles.chainLabelDot} style={{ background: eventColorVar(ev, labels) }} />{label.name}</span>}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
