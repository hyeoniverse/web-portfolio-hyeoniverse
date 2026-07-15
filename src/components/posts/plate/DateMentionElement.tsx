"use client";

// ── 날짜/시간 멘션 (inline void) ──
// 노션식 @날짜 인라인 pill. 클릭하면 DatePicker(+시간) popover 로 편집.
// 저장: { type:"date_mention", date:"YYYY-MM-DD", time?:"HH:mm", id }

import React, { useEffect, useRef, useState } from "react";
import { useEditorRef, useSelected, PlateElement, type PlateElementProps } from "platejs/react";
import { CalendarDays, Clock, Trash2 } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import Popover from "@/components/ui/Popover";
import DatePickerPopover from "@/components/ui/DatePicker/DatePickerPopover";
import TimePickerPopover from "@/components/ui/DatePicker/TimePickerPopover";
import { formatDateValue, parseDate, toDateStr, _pendingDateMentionOpen } from "./dateUtils";
import styles from "./DateMention.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

export function DateMentionElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const selected = useSelected();
  const { language } = useLanguage();
  const t = (ko: string, en: string) => (language === "ko" ? ko : en);

  const el = props.element as Record<string, unknown>;
  const date = (el.date as string) || toDateStr(new Date());
  const time = (el.time as string) || null;
  const id = (el.id as string) || "";

  const [open, setOpen] = useState(false);

  // stale path 방지 — 호출 시점에 path 재탐색 후 setNodes
  const elementRef = useRef(props.element);
  elementRef.current = props.element;
  const update = (patch: Record<string, unknown>) => {
    let p: number[] | null = null;
    try { const pp = editor.api.findPath(elementRef.current); p = pp ? Array.from(pp) : null; } catch { p = null; }
    if (!p) return;
    try { editor.tf.setNodes(patch, { at: p }); } catch { /* noop */ }
  };
  const removeNode = () => {
    let p: number[] | null = null;
    try { const pp = editor.api.findPath(elementRef.current); p = pp ? Array.from(pp) : null; } catch { p = null; }
    if (!p) return;
    try { editor.tf.removeNodes({ at: p }); } catch { /* noop */ }
  };

  // @ 메뉴 "날짜 선택…" 으로 방금 삽입된 경우 자동으로 편집 오픈
  useEffect(() => {
    if (id && _pendingDateMentionOpen.current === id) {
      _pendingDateMentionOpen.current = null;
      setOpen(true);
    }
  }, [id]);

  const d = parseDate(date, time) ?? new Date();
  const label = formatDateValue(date, time, language);

  const setDatePart = (y: number, mo: number, da: number) => {
    update({ date: `${y}-${pad(mo)}-${pad(da)}` });
  };
  const toggleTime = () => {
    if (time) update({ time: null });
    else update({ time: "09:00" });
  };
  const setTimePart = (h: number, mi: number) => {
    update({ time: `${pad(h)}:${pad(mi)}` });
  };

  return (
    <PlateElement {...props} as="span">
      <span contentEditable={false} style={{ userSelect: "none" }}>
        <Popover
          open={open}
          onOpenChange={setOpen}
          placement="bottom-start"
          offset={6}
          maxHeight={false}
          responsive={false}
          contentClassName={styles.editor}
          trigger={
            <span className={`${styles.pill}${selected ? ` ${styles.pillSelected}` : ""}`} role="button" tabIndex={0}>
              <CalendarDays size={13} aria-hidden />
              <span>{label}</span>
            </span>
          }
        >
          <div className={styles.editorBody} onMouseDown={(e) => e.preventDefault()}>
            <DatePickerPopover
              inline
              format="date"
              year={String(d.getFullYear())}
              month={pad(d.getMonth() + 1)}
              day={pad(d.getDate())}
              onSelect={(y, mo, da) => setDatePart(Number(y), Number(mo), Number(da))}
              onClose={() => { /* inline — 닫힘은 popover 가 관리 */ }}
            />
            <div className={styles.timeRow}>
              <button type="button" className={`${styles.timeToggle}${time ? ` ${styles.timeToggleOn}` : ""}`} onClick={toggleTime}>
                <Clock size={13} aria-hidden />
                {time ? t("시간 포함", "Include time") : t("시간 추가", "Add time")}
              </button>
              <button type="button" className={styles.removeBtn} onClick={() => { removeNode(); setOpen(false); }}>
                <Trash2 size={13} aria-hidden />
                {t("삭제", "Remove")}
              </button>
            </div>
            {time && (
              <TimePickerPopover
                inline
                hour={pad(d.getHours())}
                minute={pad(d.getMinutes())}
                onSelect={(h, mi) => setTimePart(Number(h), Number(mi))}
                onClose={() => { /* inline */ }}
              />
            )}
          </div>
        </Popover>
      </span>
      <span style={{ padding: "0 1px" }}>{props.children}</span>
    </PlateElement>
  );
}
