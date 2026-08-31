"use client";

// ── 일 뷰 우측 인라인 상세/편집 패널 (애플 캘린더식) ──
// 선택된 이벤트를 인라인으로 빠르게 편집(제목·라벨·상태·중요도·태그). 날짜/시간/반복/본문/관계는 전체 편집(모달).
import React from "react";
import { CalendarDays, Clock, Trash2, Pencil, Plus } from "@/components/icons";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Chip from "@/components/ui/Chip/Chip";
import Button from "@/components/ui/Button";
import { type CalEvent, type EventLabel, type TimeFormat, colorVar, eventTimeLabel, findLabel, isRecurring, EVENT_STATUSES, EVENT_PRIORITIES, statusName, priorityName } from "./model";
import { formatDateValue } from "../dateUtils";
import styles from "./Calendar.module.css";
import Pressable from "@/components/ui/Pressable";

export default function DayDetailPanel({
  event, labels, language, timeFormat = "12h", readOnly, date,
  onPatch, onDelete, onFullEdit, onCreate,
}: {
  event: CalEvent | null;
  labels: EventLabel[];
  language: string;
  timeFormat?: TimeFormat;
  readOnly?: boolean;
  date: string;
  onPatch?: (id: string, patch: Partial<CalEvent>) => void;
  onDelete?: (ev: CalEvent) => void;
  onFullEdit?: (ev: CalEvent) => void;
  onCreate?: (date: string) => void;
}) {
  const t = (ko: string, en: string) => (language === "ko" ? ko : en);
  const [title, setTitle] = React.useState(event?.title ?? "");
  const [tagInput, setTagInput] = React.useState("");
  // 선택 이벤트가 바뀌면 로컬 편집값 동기화
  const prevId = React.useRef(event?.id);
  if (event?.id !== prevId.current) { prevId.current = event?.id; if (title !== (event?.title ?? "")) setTitle(event?.title ?? ""); }

  // 반복 회차(가상)·읽기전용은 인라인 편집 불가 → 전체 편집 유도
  const editable = !readOnly && !!event && !!onPatch && !(event.master || event.id.includes("#"));

  if (!event) {
    return (
      <div className={styles.dayPanel}>
        <div className={styles.dayPanelEmpty}>
          <span className={styles.dayPanelEmptyText}>{t("이벤트를 선택하면 여기에 표시돼요", "Select an event to see details")}</span>
          {!readOnly && onCreate && (
            <Button size="sm" variant="subtle" icon={<Plus size={14} />} onClick={() => onCreate(date)}>{t("새 이벤트", "New event")}</Button>
          )}
        </div>
      </div>
    );
  }

  const label = findLabel(event.labelId, labels);
  const tags = event.tags ?? [];
  const commitTitle = () => { const v = title.trim(); if (editable && v !== (event.title ?? "")) onPatch!(event.id, { title: v }); };
  const addTag = (raw: string) => {
    const v = raw.trim().replace(/^#/, "");
    if (!v || !editable) { setTagInput(""); return; }
    if (!tags.includes(v)) onPatch!(event.id, { tags: [...tags, v] });
    setTagInput("");
  };
  const removeTag = (tg: string) => { if (editable) onPatch!(event.id, { tags: tags.filter((x) => x !== tg) }); };

  return (
    <div className={styles.dayPanel}>
      {/* 헤더 — 라벨 색 점 + 제목 */}
      <div className={styles.dayPanelHead}>
        <span className={styles.dayPanelDot} style={{ ["--_c" as string]: colorVar(label?.color) }} />
        {editable ? (
          <input
            className={styles.dayPanelTitle}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); commitTitle(); (e.target as HTMLInputElement).blur(); } }}
            placeholder={t("제목 없음", "Untitled")}
          />
        ) : (
          <h3 className={styles.dayPanelTitleStatic}>{event.title || t("(제목 없음)", "(Untitled)")}</h3>
        )}
      </div>

      {/* 날짜 · 시간 (읽기전용, 전체 편집에서 수정) */}
      <div className={styles.dayPanelMeta}>
        <div className={styles.dayPanelRow}>
          <CalendarDays size={14} className={styles.dayPanelIcon} />
          <span>{formatDateValue(event.date, null, language)}{event.endDate && event.endDate > event.date ? ` ~ ${formatDateValue(event.endDate, null, language)}` : ""}</span>
        </div>
        {event.time && (
          <div className={styles.dayPanelRow}>
            <Clock size={14} className={styles.dayPanelIcon} />
            <span className={styles.dayPanelTime}>{eventTimeLabel(event, timeFormat)}</span>
          </div>
        )}
      </div>

      {/* 라벨 */}
      <div className={styles.dayPanelField}>
        <span className={styles.dayPanelLabel}>{t("라벨", "Label")}</span>
        {editable ? (
          <div className={styles.dayPanelChips}>
            {labels.map((l) => (
              <Pressable
                key={l.id}
                className={`${styles.labelChip}${event.labelId === l.id ? ` ${styles.labelChipOn}` : ""}`}
                style={{ ["--_lc" as string]: colorVar(l.color) }}
                onClick={() => onPatch!(event.id, { labelId: event.labelId === l.id ? undefined : l.id })}
              >
                <span className={styles.labelChipSelect}><span className={styles.labelDot} />{l.name}</span>
              </Pressable>
            ))}
          </div>
        ) : label ? (
          <span className={styles.previewLabel} style={{ ["--_c" as string]: colorVar(label.color) }}><span className={styles.previewLabelDot} />{label.name}</span>
        ) : <span className={styles.dayPanelMuted}>{t("없음", "None")}</span>}
      </div>

      {/* 상태 · 중요도 */}
      <div className={styles.dayPanelDuo}>
        <div className={styles.dayPanelField}>
          <span className={styles.dayPanelLabel}>{t("상태", "Status")}</span>
          {editable ? (
            <Select
              value={event.status ?? ""}
              onChange={(v) => onPatch!(event.id, { status: (v || undefined) as CalEvent["status"] })}
              width="full" size="sm"
              options={[{ value: "", label: t("없음", "None") }, ...EVENT_STATUSES.map((s) => ({ value: s.key, label: language === "ko" ? s.name[0] : s.name[1], icon: <span className={styles.statusDot} style={{ ["--_sc" as string]: s.color } as React.CSSProperties} /> }))]}
            />
          ) : <span className={styles.dayPanelMuted}>{event.status ? statusName(event.status, language) : t("없음", "None")}</span>}
        </div>
        <div className={styles.dayPanelField}>
          <span className={styles.dayPanelLabel}>{t("중요도", "Priority")}</span>
          {editable ? (
            <Select
              value={event.priority ?? ""}
              onChange={(v) => onPatch!(event.id, { priority: (v || undefined) as CalEvent["priority"] })}
              width="full" size="sm"
              options={[{ value: "", label: t("없음", "None") }, ...EVENT_PRIORITIES.map((p) => ({ value: p.key, label: language === "ko" ? p.name[0] : p.name[1], icon: <span className={styles.statusDot} style={{ ["--_sc" as string]: p.color } as React.CSSProperties} /> }))]}
            />
          ) : <span className={styles.dayPanelMuted}>{event.priority ? priorityName(event.priority, language) : t("없음", "None")}</span>}
        </div>
      </div>

      {/* 태그 */}
      <div className={styles.dayPanelField}>
        <span className={styles.dayPanelLabel}>{t("태그", "Tags")}</span>
        {editable && (
          <Input value={tagInput} onChange={setTagInput} placeholder={t("태그 입력 후 Enter", "Type a tag, Enter")} size="sm" clearable={false}
            onKeyDown={(e) => { if ((e.key === "Enter" || e.key === ",") && !e.nativeEvent.isComposing) { e.preventDefault(); addTag(tagInput); } }} />
        )}
        {tags.length > 0 ? (
          <div className={styles.dayPanelChips}>
            {tags.map((tg) => <Chip key={tg} variant="capsule" onRemove={editable ? () => removeTag(tg) : undefined}>{tg}</Chip>)}
          </div>
        ) : !editable ? <span className={styles.dayPanelMuted}>{t("없음", "None")}</span> : null}
      </div>

      {/* 본문 (읽기전용 렌더 — 편집은 전체 편집) */}
      {event.desc && (
        <div className={styles.dayPanelField}>
          <span className={styles.dayPanelLabel}>{t("내용", "Details")}</span>
          <div className={styles.dayPanelDesc} dangerouslySetInnerHTML={{ __html: event.desc }} />
        </div>
      )}

      {/* 액션 */}
      {!readOnly && (
        <div className={styles.dayPanelActions}>
          {onFullEdit && (
            <Button size="sm" variant="subtle" icon={<Pencil size={13} />} onClick={() => onFullEdit(event)}>
              {isRecurring(event) || !editable ? t("전체 편집", "Full edit") : t("자세히", "Details")}
            </Button>
          )}
          {onDelete && (
            <Button size="sm" variant="subtle" tone="danger" icon={<Trash2 size={13} />} onClick={() => onDelete(event)}>{t("삭제", "Delete")}</Button>
          )}
        </div>
      )}
    </div>
  );
}
