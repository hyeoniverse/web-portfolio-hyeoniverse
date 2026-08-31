"use client";

import { useState } from "react";
import DatePickerPopover from "@/components/ui/DatePicker/DatePickerPopover";
import TimePickerPopover from "@/components/ui/DatePicker/TimePickerPopover";
import Pressable from "@/components/ui/Pressable";

interface Props {
  startAt: string | null;
  endAt: string | null;
  update: (patch: { startAt?: string; endAt?: string }) => void;
  language: "ko" | "en";
}

type Field = "start" | "end";
type Part = "date" | "time";

function parts(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return { y: d.getFullYear(), mo: d.getMonth() + 1, da: d.getDate(), h: d.getHours(), mi: d.getMinutes() };
}
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * 투표 기간 편집기 — 시작/종료 각각 [날짜 trigger][시간 trigger].
 * 값 없으면 trigger(클릭 열림), 값 있으면 텍스트(더블클릭 편집).
 * picker 는 하나만 공유 — 어떤 trigger 를 눌러도 그 필드·부분을 편집하는 단일 picker 가 아래에 펼쳐진다.
 */
export default function PollPeriodEditor({ startAt, endAt, update, language }: Props) {
  const t = (ko: string, en: string) => (language === "ko" ? ko : en);
  const [editing, setEditing] = useState<{ field: Field; part: Part } | null>(null);

  const sp = parts(startAt);
  const ep = parts(endAt);
  const partsOf = (f: Field) => (f === "start" ? sp : ep);

  const commit = (field: Field, iso: string) => {
    if (field === "start") {
      if (endAt && new Date(iso).getTime() > new Date(endAt).getTime()) update({ startAt: iso, endAt: iso });
      else update({ startAt: iso });
    } else {
      update({ endAt: iso });
    }
  };
  const setDatePart = (field: Field, y: number, mo: number, da: number) => {
    const cur = partsOf(field);
    const d = new Date(y, mo - 1, da, cur?.h ?? 9, cur?.mi ?? 0);
    commit(field, d.toISOString());
  };
  const setTimePart = (field: Field, h: number, mi: number) => {
    const cur = partsOf(field);
    const now = new Date();
    const d = new Date(cur?.y ?? now.getFullYear(), (cur?.mo ?? now.getMonth() + 1) - 1, cur?.da ?? now.getDate(), h, mi);
    commit(field, d.toISOString());
  };

  const toggle = (field: Field, part: Part) =>
    setEditing((c) => (c && c.field === field && c.part === part ? null : { field, part }));

  const trigger = (field: Field, part: Part) => {
    const p = partsOf(field);
    const has = !!p;
    const label = part === "date"
      ? (p ? `${p.y}.${pad(p.mo)}.${pad(p.da)}` : t("날짜 선택", "Select date"))
      : (p ? `${pad(p.h)}:${pad(p.mi)}` : t("시간", "Time"));
    const on = editing?.field === field && editing?.part === part;
    return (
      <Pressable
        className={`poll-period-trigger${has ? " poll-period-trigger-text" : ""}${on ? " poll-period-trigger-on" : ""}`}
        onClick={() => toggle(field, part)}
      >
        {label}
      </Pressable>
    );
  };

  const cur = editing ? partsOf(editing.field) : null;
  const now = new Date();

  return (
    <div className="poll-period" onMouseDown={(e) => e.preventDefault()}>
      <div className="poll-period-field">
        <span className="poll-period-field-label">{t("시작", "Start")}</span>
        {trigger("start", "date")}
        {trigger("start", "time")}
      </div>
      <div className="poll-period-field">
        <span className="poll-period-field-label">{t("종료", "End")}</span>
        {trigger("end", "date")}
        {trigger("end", "time")}
      </div>
      {editing && (
        <div className="poll-period-picker">
          {editing.part === "date" ? (
            <DatePickerPopover
              inline
              format="date"
              year={String(cur?.y ?? now.getFullYear())}
              month={pad(cur?.mo ?? now.getMonth() + 1)}
              day={pad(cur?.da ?? now.getDate())}
              minDate={editing.field === "end" && startAt ? new Date(startAt) : undefined}
              onSelect={(y, mo, da) => setDatePart(editing.field, Number(y), Number(mo), Number(da))}
              onClose={() => setEditing(null)}
            />
          ) : (
            <TimePickerPopover
              inline
              hour={pad(cur?.h ?? 9)}
              minute={pad(cur?.mi ?? 0)}
              onSelect={(h, mi) => setTimePart(editing.field, Number(h), Number(mi))}
              onClose={() => setEditing(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
