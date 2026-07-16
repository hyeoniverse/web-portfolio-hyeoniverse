"use client";

// ── 이벤트 추가/편집 모달 (캘린더 블록) ──
// 날짜(필수)·제목(필수)·내용·라벨(필수, 선택/생성/수정/삭제)·태그·시간.
import React, { useContext, useState } from "react";
import { createPortal } from "react-dom";
import { Clock, Trash2, Check, Plus, Pencil, CalendarDays, ArrowLeft, ArrowRight, Repeat, SlidersHorizontal } from "lucide-react";
import { ModalFooterContext } from "@/components/ui/Modal";
import TimePickerPopover from "@/components/ui/DatePicker/TimePickerPopover";
import DatePickerPopover from "@/components/ui/DatePicker/DatePickerPopover";
import Input from "@/components/ui/Input";
import EditableInput from "@/components/ui/EditableInput";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import SegmentedControl from "@/components/ui/SegmentedControl";
import NumberInput from "@/components/ui/NumberInput";
import Checkbox from "@/components/ui/Checkbox";
import Chip from "@/components/ui/Chip/Chip";
import ColorPicker from "@/components/ui/ColorPicker";
import Tooltip from "@/components/ui/Tooltip";
import Popover from "@/components/ui/Popover";
import RichMemo from "./RichMemo";
import EventRelationField from "./EventRelationField";
import { _imageUploadFn } from "../utils";
import { useModalStore } from "@/stores/modalStore";
import { showToast } from "@/stores/toastStore";
import { type CalEvent, type EventLabel, type RecurFreq, type RecurRule, type TimeFormat, EVENT_COLORS, EVENT_STATUSES, EVENT_PRIORITIES, colorVar, statusOf, statusName, priorityOf, priorityName, findLabel, successorsOf, wouldCycle, formatClock, recurSummary, EVENT_TITLE_MAX, EVENT_LABEL_MAX, EVENT_LABEL_COUNT_MAX, EVENT_COLOR_COUNT_MAX } from "./model";
import { parseDate, formatDateValue } from "../dateUtils";
import { genShortId } from "../dateUtils";
import styles from "./Calendar.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

export type EventDraft = { date: string; endDate: string | null; status: string | null; priority: string | null; title: string; desc: string; time: string | null; endTime: string | null; labelId: string | null; tags: string[]; deps: string[]; repeat: RecurRule | null };
/** 다른 이벤트에도 영향을 주는 관계 변경 — 후속 작업(이 이벤트를 선행으로 갖는 이벤트들의 id) */
export type RelationIntent = { successorIds: string[] };
/** 반복 이벤트 편집/삭제 적용 범위 — "this": 이 회차만, "all": 시리즈 전체, "single": 반복 아님 */
export type RecurScope = "this" | "all" | "single";
type LabelEdit = { mode: "create" } | { mode: "edit"; id: string } | null;

// 조건 지정 요일 값 → byweekday 배열 (일=전요일, 평일=월~금, 주말=토·일, 그 외 단일 요일)
function ordDayToByweekday(v: string): number[] {
  if (v === "day") return [0, 1, 2, 3, 4, 5, 6];
  if (v === "weekday") return [1, 2, 3, 4, 5];
  if (v === "weekend") return [0, 6];
  return [parseInt(v, 10)];
}

export default function CalendarEventModal({
  modalId, mode, initial, labels: initialLabels, tagSuggestions, language, onSubmit, onDelete,
  eventId, allEvents, onOpenEvent, recurring, timeFormat = "12h", readOnly = false,
}: {
  modalId: string;
  mode: "add" | "edit";
  /** 읽기전용(리더뷰) — 편집 전환 불가, 보기 상세만 */
  readOnly?: boolean;
  initial: EventDraft;
  labels: EventLabel[];
  tagSuggestions: string[];
  language: string;
  onSubmit: (draft: EventDraft, labels: EventLabel[], relations: RelationIntent, scope: RecurScope) => void;
  onDelete?: (scope: RecurScope) => void;
  /** 반복 이벤트의 특정 회차를 편집 중일 때 — "이 일정만 / 전체" 선택 노출 */
  recurring?: { masterId: string; occurrenceDate: string } | null;
  timeFormat?: TimeFormat;
  /** 이 이벤트의 id (관계·멘션 self 제외/후속 계산용) */
  eventId: string;
  /** 같은 달력의 전체 이벤트 (관계 후보·멘션 대상·제목 해석) */
  allEvents: CalEvent[];
  /** 멘션/관계 칩 클릭 시 해당 이벤트 열기 */
  onOpenEvent?: (id: string) => void;
}) {
  const t = (ko: string, en: string) => (language === "ko" ? ko : en);
  const closeModal = useModalStore((s) => s.closeModal);
  const footerEl = useContext(ModalFooterContext);

  // 기존 이벤트는 뷰(상세) 먼저, "편집" 버튼으로 편집 전환. 새 이벤트는 바로 편집.
  const [viewing, setViewing] = useState(mode === "edit");
  const [date, setDate] = useState(initial.date);
  const [endDate, setEndDate] = useState<string | null>(initial.endDate);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [statusKey, setStatusKey] = useState<string | null>(initial.status);
  const [priorityKey, setPriorityKey] = useState<string | null>(initial.priority);
  const [title, setTitle] = useState(initial.title);
  const [desc, setDesc] = useState(initial.desc);
  const [time, setTime] = useState<string | null>(initial.time);
  const [endTime, setEndTime] = useState<string | null>(initial.endTime);
  const [startTimeOpen, setStartTimeOpen] = useState(false);
  const [endTimeOpen, setEndTimeOpen] = useState(false);
  const [repeatFreq, setRepeatFreq] = useState<"" | RecurFreq>(initial.repeat?.freq ?? "");
  const [repeatUntil, setRepeatUntil] = useState<string | null>(initial.repeat?.until ?? null);
  const [repeatUntilOpen, setRepeatUntilOpen] = useState(false);
  const [repeatInterval, setRepeatInterval] = useState<number>(initial.repeat?.interval ?? 1);
  const [repeatByweekday, setRepeatByweekday] = useState<number[]>(initial.repeat?.byweekday ?? []);
  // 고급(사용자화) 반복 — 월: 날짜 지정(bymonthday) / 조건 지정(bysetpos+요일). 연: 해당 달(bymonth) + 선택적 조건.
  const [repeatBymonthday, setRepeatBymonthday] = useState<number[]>(initial.repeat?.bymonthday ?? []);
  const [repeatBymonth, setRepeatBymonth] = useState<number[]>(initial.repeat?.bymonth ?? []);
  const [repeatBysetpos, setRepeatBysetpos] = useState<number | null>(initial.repeat?.bysetpos ?? null);
  // 조건 지정 요일 값 — "0"~"6"(단일 요일) | "day"(일) | "weekday"(평일) | "weekend"(주말)
  const [repeatOrdDay, setRepeatOrdDay] = useState<string>(() => {
    const wds = initial.repeat?.byweekday;
    if (!wds || wds.length === 0) return "0";
    const s = [...new Set(wds)].sort((a, b) => a - b).join(",");
    if (s === "0,1,2,3,4,5,6") return "day";
    if (s === "1,2,3,4,5") return "weekday";
    if (s === "0,6") return "weekend";
    return String(wds[0]);
  });
  const [repeatCustom, setRepeatCustom] = useState<boolean>(
    !!(initial.repeat && ((initial.repeat.interval ?? 1) > 1 || (initial.repeat.byweekday?.length ?? 0) > 0
      || (initial.repeat.bymonthday?.length ?? 0) > 0 || (initial.repeat.bymonth?.length ?? 0) > 0 || initial.repeat.bysetpos != null)),
  );
  // 현재 상태로부터 반복 규칙(종료 제외) 구성 — 저장·요약 공통 사용
  const buildRepeatCore = (): RecurRule | null => {
    if (!repeatFreq) return null;
    const r: RecurRule = { freq: repeatFreq };
    if (repeatCustom && repeatInterval > 1) r.interval = repeatInterval;
    if (repeatCustom) {
      if (repeatFreq === "weekly" && repeatByweekday.length > 0) r.byweekday = [...repeatByweekday].sort((a, b) => a - b);
      else if (repeatFreq === "monthly") {
        if (repeatBysetpos != null) { r.bysetpos = repeatBysetpos; r.byweekday = ordDayToByweekday(repeatOrdDay); }
        else if (repeatBymonthday.length > 0) r.bymonthday = [...repeatBymonthday].sort((a, b) => a - b);
      } else if (repeatFreq === "yearly") {
        if (repeatBymonth.length > 0) r.bymonth = [...repeatBymonth].sort((a, b) => a - b);
        if (repeatBysetpos != null) { r.bysetpos = repeatBysetpos; r.byweekday = ordDayToByweekday(repeatOrdDay); }
      }
    }
    return r;
  };
  // 반복 종료 방식: 안 함 / 횟수(count) / 날짜(until)
  const [repeatEnd, setRepeatEnd] = useState<"never" | "count" | "until">(
    initial.repeat?.count ? "count" : initial.repeat?.until ? "until" : "never",
  );
  const [repeatCount, setRepeatCount] = useState<number>(initial.repeat?.count ?? 10);
  const [recurPopOpen, setRecurPopOpen] = useState(false);
  // 반복 회차 편집 시 적용 범위 (기본: 전체 일정)
  const [recurScope, setRecurScope] = useState<"this" | "all">("all");
  const scopeArg = (): RecurScope => (recurring ? recurScope : "single");
  const [labels, setLabels] = useState<EventLabel[]>(initialLabels);
  const [labelId, setLabelId] = useState<string | null>(initial.labelId);
  const [tags, setTags] = useState<string[]>(initial.tags);
  // 관계 — deps: 선행 작업, successorIds: 후속 작업(이 이벤트를 선행으로 갖는 이벤트)
  const [deps, setDeps] = useState<string[]>(initial.deps ?? []);
  const [successorIds, setSuccessorIds] = useState<string[]>(() => successorsOf(eventId, allEvents).map((e) => e.id));

  // deps 편집 중인 상태를 반영한 working 이벤트 집합 (순환 검사용)
  const workingEvents = allEvents.map((e) => (e.id === eventId ? { ...e, deps } : e));
  const titleOf = (id: string) => allEvents.find((e) => e.id === id)?.title || t("(제목 없음)", "(Untitled)");
  // 선행 후보: 자기 자신·이미 선택·순환 유발 제외
  const predCandidates = allEvents.filter((e) => e.id !== eventId && !deps.includes(e.id) && !wouldCycle(eventId, e.id, workingEvents));
  // 후속 후보: 자기 자신·이미 선택·순환 유발 제외 (이 이벤트를 e 의 선행으로 넣는 것 → e 기준 순환 검사)
  const succCandidates = allEvents.filter((e) => e.id !== eventId && !successorIds.includes(e.id) && !wouldCycle(e.id, eventId, workingEvents));

  // 라벨 생성/수정 폼
  const [labelEdit, setLabelEdit] = useState<LabelEdit>(null);
  const [lName, setLName] = useState("");
  const [lColor, setLColor] = useState(EVENT_COLORS[0].key);
  const [tagInput, setTagInput] = useState("");
  // 프리셋 외 커스텀 색칩 — 기존 라벨이 쓰던 커스텀 색 + 사용자가 ColorPicker 로 추가한 색
  const presetKeys = new Set(EVENT_COLORS.map((c) => c.key));
  const [customColors, setCustomColors] = useState<string[]>(() =>
    Array.from(new Set(initialLabels.map((l) => l.color).filter((c) => c && !presetKeys.has(c))))
  );
  const [pickerColor, setPickerColor] = useState("#3b82f6");
  const addCustomColor = (hex: string) => {
    setLColor(hex);
    setCustomColors((prev) => {
      if (prev.includes(hex)) return prev;
      if (prev.length >= EVENT_COLOR_COUNT_MAX) {
        showToast(t(`색은 최대 ${EVENT_COLOR_COUNT_MAX}개까지 추가할 수 있습니다.`, `Up to ${EVENT_COLOR_COUNT_MAX} colors.`), "warning");
        return prev;
      }
      return [...prev, hex];
    });
  };

  const close = () => closeModal(modalId);
  const save = () => {
    if (!title.trim()) { showToast(t("제목을 입력해 주세요.", "Please enter a title."), "warning"); return; }
    if (!labelId) { showToast(t("라벨을 선택해 주세요.", "Please select a label."), "warning"); return; }
    const end = endDate && endDate > date ? endDate : null;
    // 종료 시각은 시작 시각이 있고 그보다 이후일 때만 저장
    const endT = time && endTime && endTime > time ? endTime : null;
    const repeatCore = buildRepeatCore();
    const repeat: RecurRule | null = repeatCore ? {
      ...repeatCore,
      ...(repeatEnd === "count" && repeatCount > 0 ? { count: repeatCount }
        : repeatEnd === "until" && repeatUntil && repeatUntil >= date ? { until: repeatUntil } : {}),
    } : null;
    onSubmit({ date, endDate: end, status: statusKey, priority: priorityKey, title: title.trim(), desc: desc.trim(), time, endTime: endT, labelId, tags, deps, repeat }, labels, { successorIds }, scopeArg());
    close();
  };
  const remove = () => { onDelete?.(scopeArg()); close(); };

  // ── 라벨 CRUD ──
  const startCreate = () => {
    if (labels.length >= EVENT_LABEL_COUNT_MAX) {
      showToast(t(`라벨은 최대 ${EVENT_LABEL_COUNT_MAX}개까지 추가할 수 있습니다.`, `Up to ${EVENT_LABEL_COUNT_MAX} labels.`), "warning");
      return;
    }
    setLName(""); setLColor(EVENT_COLORS[0].key); setLabelEdit({ mode: "create" });
  };
  const startEdit = (l: EventLabel) => { setLName(l.name); setLColor(l.color); setLabelEdit({ mode: "edit", id: l.id }); };
  const cancelLabelEdit = () => setLabelEdit(null);
  const submitLabel = () => {
    const name = lName.trim();
    if (!name) return;
    if (labelEdit?.mode === "edit") {
      setLabels((prev) => prev.map((l) => (l.id === labelEdit.id ? { ...l, name, color: lColor } : l)));
    } else {
      const label: EventLabel = { id: genShortId(), name, color: lColor };
      setLabels((prev) => [...prev, label]);
      setLabelId(label.id);
    }
    setLabelEdit(null);
  };
  const deleteLabel = () => {
    if (labelEdit?.mode !== "edit") return;
    const id = labelEdit.id;
    setLabels((prev) => prev.filter((l) => l.id !== id));
    if (labelId === id) setLabelId(null);
    setLabelEdit(null);
  };

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag || tags.includes(tag)) { setTagInput(""); return; }
    setTags((prev) => [...prev, tag]);
    setTagInput("");
  };
  const removeTag = (idx: number) => setTags((prev) => prev.filter((_, i) => i !== idx));

  const timeParts = time ? time.split(":").map(Number) : [9, 0];
  const endTimeParts = endTime ? endTime.split(":").map(Number) : [Math.min(23, timeParts[0] + 1), timeParts[1]];
  const addHour = (hm: string) => { const [h, m] = hm.split(":").map(Number); return `${pad(Math.min(23, h + 1))}:${pad(m)}`; };
  const suggestable = tagSuggestions.filter((s) => !tags.includes(s));
  const d = parseDate(date) ?? new Date();
  const dEnd = parseDate(endDate) ?? d;
  const dUntil = parseDate(repeatUntil ?? undefined) ?? d;

  // 고급 반복 UI 옵션 — 서수(첫 번째~마지막) + 요일
  const ordinalOpts = [
    { value: "1", label: t("첫 번째", "First") }, { value: "2", label: t("두 번째", "Second") },
    { value: "3", label: t("세 번째", "Third") }, { value: "4", label: t("네 번째", "Fourth") },
    { value: "5", label: t("다섯 번째", "Fifth") },
    { value: "-2", label: t("끝에서 두 번째", "2nd-to-last"), divider: true }, { value: "-1", label: t("마지막", "Last") },
  ];
  const weekdayOpts = [
    ...["일", "월", "화", "수", "목", "금", "토"].map((w, i) => ({ value: String(i), label: language === "ko" ? `${w}요일` : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][i] })),
    { value: "day", label: t("일", "Day"), divider: true },
    { value: "weekday", label: t("평일", "Weekday") },
    { value: "weekend", label: t("주말", "Weekend day") },
  ];
  const monthShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  // "n번째 요일" 조건 select 2개 (월·연 공통)
  const ordCondRow = (
    <div className={styles.recurOrdRow}>
      <Select value={String(repeatBysetpos ?? 1)} onChange={(v) => setRepeatBysetpos(parseInt(v, 10))} width="s" size="sm" dropdownClassName={styles.selectAboveModal} options={ordinalOpts} />
      <Select value={repeatOrdDay} onChange={setRepeatOrdDay} width="m" size="sm" dropdownClassName={styles.selectAboveModal} options={weekdayOpts} />
    </div>
  );
  const curLabel = findLabel(labelId ?? undefined, labels);
  const vSt = statusOf(statusKey ?? undefined);
  const vPr = priorityOf(priorityKey ?? undefined);

  return (
    <>
    {/* 편집 중(!viewing)엔 Esc 가 모달을 닫지 않도록 전파 차단 — 멘션 메뉴 등만 처리하고 편집 내용 보존 */}
    <div
      style={{ display: "contents" }}
      onKeyDown={(e) => { if (e.key === "Escape" && !viewing) { e.stopPropagation(); close(); } }}
    >
    {viewing ? (
      <div className={styles.viewDetail}>
        <div className={styles.vdHead} style={{ ["--_c" as string]: colorVar(curLabel?.color) }}>
          <span className={styles.vdBar} />
          <h3 className={styles.vdTitle}>{title || t("(제목 없음)", "(Untitled)")}</h3>
        </div>
        {/* 라벨 — 날짜 위로 */}
        <div className={styles.vdSection}>
          <span className={styles.vdLabel}>{t("라벨", "Label")}</span>
          {curLabel ? (
            <div className={styles.vdRow}>
              <span className={styles.previewLabel} style={{ ["--_c" as string]: colorVar(curLabel.color) }}><span className={styles.previewLabelDot} />{curLabel.name}</span>
            </div>
          ) : <span className={styles.vdEmpty}>{t("비어있음", "Empty")}</span>}
        </div>
        <div className={styles.vdSection}>
          <span className={styles.vdLabel}>{t("날짜", "Date")}</span>
          <div className={styles.vdRow}>
            <CalendarDays size={15} className={styles.vdIcon} />
            <span>{formatDateValue(date, null, language)}{endDate && endDate > date ? ` ~ ${formatDateValue(endDate, null, language)}` : ""}</span>
            {time && <span className={styles.vdTimeBadge}><Clock size={12} />{formatClock(time, timeFormat)}{endTime && endTime > time ? ` – ${formatClock(endTime, timeFormat)}` : ""}</span>}
          </div>
        </div>
        {/* 반복 — 날짜 아래로 */}
        <div className={`${styles.vdSection} ${styles.vdDividerBottom}`}>
          <span className={styles.vdLabel}>{t("반복", "Repeat")}</span>
          {repeatFreq ? (
            <div className={styles.vdRow}>
              <Repeat size={14} className={styles.vdIcon} />
              <span>{recurSummary(buildRepeatCore() ?? { freq: repeatFreq as RecurFreq }, language, false)}{repeatEnd === "count" ? ` · ${repeatCount}${t("회", "×")}` : repeatEnd === "until" && repeatUntil ? ` · ~ ${formatDateValue(repeatUntil, null, language)}` : ""}</span>
            </div>
          ) : <span className={styles.vdEmpty}>{t("비어있음", "Empty")}</span>}
        </div>
        <div className={styles.vdSection}>
          <span className={styles.vdLabel}>{t("상태 · 중요도", "Status · Priority")}</span>
          {(vSt || vPr) ? (
            <div className={styles.vdRow}>
              {vSt && <span className={styles.previewStatus} style={{ ["--_sc" as string]: vSt.color }}><span className={styles.previewStatusDot} />{statusName(statusKey ?? undefined, language)}</span>}
              {vPr && <span className={styles.previewStatus} style={{ ["--_sc" as string]: vPr.color }}><span className={styles.previewStatusDot} />{priorityName(priorityKey ?? undefined, language)}</span>}
            </div>
          ) : <span className={styles.vdEmpty}>{t("비어있음", "Empty")}</span>}
        </div>
        <div className={`${styles.vdSection} ${styles.vdDividerBottom}`}>
          <span className={styles.vdLabel}>{t("태그", "Tags")}</span>
          {tags.length > 0 ? (
            <div className={styles.vdTags}>{tags.map((tg) => <span key={tg} className={styles.previewTag}>#{tg}</span>)}</div>
          ) : <span className={styles.vdEmpty}>{t("비어있음", "Empty")}</span>}
        </div>
        <div className={styles.vdSection}>
          <span className={styles.vdLabel}>{t("연관 이벤트", "Related events")}</span>
          {(deps.length > 0 || successorIds.length > 0) ? (
            <>
              {deps.length > 0 && (
                <div className={styles.vdRelRow}>
                  <span className={styles.vdRelKind}><ArrowLeft size={12} />{t("선행", "Pred")}</span>
                  <div className={styles.vdRelChips}>
                    {deps.map((id) => <Chip key={id} variant="capsule" truncate maxLength={12} className={styles.relNavChip} onClick={() => { close(); onOpenEvent?.(id); }}>{titleOf(id)}</Chip>)}
                  </div>
                </div>
              )}
              {successorIds.length > 0 && (
                <div className={styles.vdRelRow}>
                  <span className={styles.vdRelKind}><ArrowRight size={12} />{t("후속", "Succ")}</span>
                  <div className={styles.vdRelChips}>
                    {successorIds.map((id) => <Chip key={id} variant="capsule" truncate maxLength={12} className={styles.relNavChip} onClick={() => { close(); onOpenEvent?.(id); }}>{titleOf(id)}</Chip>)}
                  </div>
                </div>
              )}
            </>
          ) : <span className={styles.vdEmpty}>{t("비어있음", "Empty")}</span>}
        </div>
        <div className={`${styles.vdSection} ${styles.vdDividerTop}`}>
          <span className={styles.vdLabel}>{t("내용", "Details")}</span>
          {desc ? (
            <div
              className={styles.vdDesc}
              dangerouslySetInnerHTML={{ __html: desc }}
              onClick={(e) => {
                // 내용 안 이벤트 멘션 클릭 → 해당 이벤트 열기
                const a = (e.target as HTMLElement).closest("[data-event-id]") as HTMLElement | null;
                const id = a?.getAttribute("data-event-id");
                if (id) { e.preventDefault(); close(); onOpenEvent?.(id); }
              }}
            />
          ) : <span className={styles.vdEmpty}>{t("비어있음", "Empty")}</span>}
        </div>
      </div>
    ) : (
    <div className={styles.modalBody}>
    {recurring && (
      <div className={styles.recurScopeBar}>
        <span className={styles.recurScopeLabel}>{t("적용 범위", "Apply to")}</span>
        <SegmentedControl<"this" | "all">
          variant="subtle"
          items={[
            { value: "this", label: t("이 일정만", "This event") },
            { value: "all", label: t("전체 일정", "All events") },
          ]}
          value={recurScope}
          onChange={setRecurScope}
          size="sm"
        />
      </div>
    )}
    <div className={styles.modalForm}>
      <div className={styles.modalCol}>
      {/* 제목 (필수) — 카운터는 input 내부(EditableInput), 초과 입력 시 toast */}
      <div className={`${styles.section} ${styles.sectionFull}`}>
        <span className={styles.sectionLabel}>{t("제목", "Title")}<span className={styles.reqDot} aria-hidden /></span>
        <EditableInput
          value={title}
          onChange={setTitle}
          placeholder={t("이벤트 제목", "Event title")}
          maxHint={EVENT_TITLE_MAX}
          maxLength={EVENT_TITLE_MAX}
          autoFocus
          onEnter={save}
          onOverflow={() => showToast(t(`최대 ${EVENT_TITLE_MAX}자까지 입력할 수 있습니다.`, `Up to ${EVENT_TITLE_MAX} characters.`), "warning")}
        />
      </div>

      {/* 라벨 (필수, 선택/생성/수정/삭제) — 날짜 위, 아래 구분선 */}
      <div className={`${styles.section} ${styles.sectionFull} ${styles.grpDividerBottom}`}>
        <span className={styles.sectionLabel}>{t("라벨", "Label")}<span className={styles.reqDot} aria-hidden /></span>
        <div className={styles.labelRow}>
          {labels.map((l) => (
            <span key={l.id} className={`${styles.labelChip}${labelId === l.id ? ` ${styles.labelChipOn}` : ""}`} style={{ ["--_lc" as string]: colorVar(l.color) }}>
              <button type="button" className={styles.labelChipSelect} onClick={() => setLabelId(labelId === l.id ? null : l.id)}>
                <span className={styles.labelDot} />{l.name}
              </button>
              <Tooltip content={t("수정", "Edit")} placement="top"><button type="button" className={styles.labelChipEdit} onClick={() => startEdit(l)}><Pencil size={11} /></button></Tooltip>
            </span>
          ))}
          {!labelEdit && labels.length < EVENT_LABEL_COUNT_MAX && (
            <button type="button" className={styles.labelAdd} onClick={startCreate}><Plus size={12} />{t("라벨", "Label")}</button>
          )}
        </div>
        {labelEdit && (
          <div className={styles.labelCreate}>
            <Input
              value={lName}
              onChange={setLName}
              placeholder={t("라벨 이름", "Label name")}
              maxLength={EVENT_LABEL_MAX}
              size="sm"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); submitLabel(); } }}
            />
            <div className={styles.colorRow}>
              {EVENT_COLORS.map((c) => (
                <button key={c.key} type="button" className={`${styles.swatch}${lColor === c.key ? ` ${styles.swatchOn}` : ""}`} style={{ ["--_sw" as string]: c.var }} onClick={() => setLColor(c.key)} aria-label={c.key} />
              ))}
              {customColors.map((hex) => (
                <button key={hex} type="button" className={`${styles.swatch}${lColor === hex ? ` ${styles.swatchOn}` : ""}`} style={{ ["--_sw" as string]: hex }} onClick={() => setLColor(hex)} aria-label={hex} />
              ))}
              <ColorPicker
                inline
                value={pickerColor}
                onChange={(c) => setPickerColor(c.hex)}
                onChangeComplete={(c) => addCustomColor(c.hex)}
              >
                {({ toggle }) => (
                  <button type="button" className={styles.swatchAdd} onClick={toggle} aria-label={t("색 추가", "Add color")}><Plus size={12} /></button>
                )}
              </ColorPicker>
              {labelEdit.mode === "edit" && (
                <Button size="xs" variant="subtle" tone="danger" icon={<Trash2 size={12} />} onClick={deleteLabel} style={{ marginRight: "auto" }}>{t("삭제", "Delete")}</Button>
              )}
              <Button size="xs" variant="subtle" onClick={cancelLabelEdit} style={labelEdit.mode === "edit" ? undefined : { marginLeft: "auto" }}>{t("취소", "Cancel")}</Button>
              <Button size="xs" variant="primary" onClick={submitLabel} disabled={!lName.trim()}>{labelEdit.mode === "edit" ? t("저장", "Save") : t("추가", "Add")}</Button>
            </div>
          </div>
        )}
      </div>

      {/* 날짜 (필수, 2열 전체) — 시작 + 선택적 종료(기간 토글) */}
      <div className={`${styles.section} ${styles.sectionFull}`}>
        <div className={styles.sectionLabelRow}>
          <span className={styles.sectionLabel}>{t("날짜", "Date")}<span className={styles.reqDot} aria-hidden /></span>
          <Button size="2xs" variant="subtle" className={endDate != null ? styles.rangeToggleOn : undefined} onClick={() => setEndDate((prev) => (prev ? null : date))}>
            {t("기간", "Range")}
          </Button>
        </div>
        <div className={styles.dateRow}>
          <span className={styles.monthNavWrap}>
            <button type="button" className={styles.dateTrigger} onClick={() => { setStartOpen((o) => !o); setEndOpen(false); }}>
              <CalendarDays size={14} />{formatDateValue(date, null, language)}
            </button>
            {startOpen && (
              <DatePickerPopover
              portal
                year={String(d.getFullYear())} month={pad(d.getMonth() + 1)} day={pad(d.getDate())}
                format="date"
                onSelect={(y, mo, da) => { const nd = `${y}-${mo}-${da}`; setDate(nd); if (endDate && endDate < nd) setEndDate(nd); }}
                onClose={() => setStartOpen(false)}
              />
            )}
          </span>
          {endDate != null && (
            <>
              <span className={styles.dateTilde}>~</span>
              <span className={styles.monthNavWrap}>
                <button type="button" className={styles.dateTrigger} onClick={() => { setEndOpen((o) => !o); setStartOpen(false); }}>
                  <CalendarDays size={14} />{formatDateValue(endDate, null, language)}
                </button>
                {endOpen && (
                  <DatePickerPopover
              portal
                    year={String(dEnd.getFullYear())} month={pad(dEnd.getMonth() + 1)} day={pad(dEnd.getDate())}
                    format="date"
                    minDate={d}
                    onSelect={(y, mo, da) => setEndDate(`${y}-${mo}-${da}`)}
                    onClose={() => setEndOpen(false)}
                  />
                )}
              </span>
            </>
          )}
        </div>
      </div>

      {/* 시간 (시작 ~ 종료) */}
      <div className={`${styles.section} ${styles.sectionFull}`}>
        <div className={styles.sectionLabelRow}>
          <span className={styles.sectionLabel}>{t("시간", "Time")}</span>
          {time && (
            <Button size="2xs" variant="subtle" onClick={() => { setTime(null); setEndTime(null); setStartTimeOpen(false); setEndTimeOpen(false); }}>{t("제거", "Clear")}</Button>
          )}
        </div>
        {!time ? (
          <button type="button" className={styles.timeToggle} onClick={() => { setTime("09:00"); setEndTime(addHour("09:00")); }}>
            <Clock size={13} />{t("시간 추가", "Add time")}
          </button>
        ) : (
          <div className={styles.dateRow}>
            <span className={styles.monthNavWrap}>
              <button type="button" className={`${styles.dateTrigger} ${styles.timeToggleOn}`} onClick={() => { setStartTimeOpen((o) => !o); setEndTimeOpen(false); }}>
                <Clock size={14} />{formatClock(time, timeFormat)}
              </button>
              {startTimeOpen && (
                <TimePickerPopover
                  portal
                  defaultFormat={timeFormat === "24h" ? "24" : "12"}
                  hour={pad(timeParts[0])} minute={pad(timeParts[1])}
                  onSelect={(h, mi) => { const nt = `${pad(Number(h))}:${pad(Number(mi))}`; setTime(nt); if (!endTime || endTime <= nt) setEndTime(addHour(nt)); }}
                  onClose={() => setStartTimeOpen(false)}
                />
              )}
            </span>
            <span className={styles.dateTilde}>~</span>
            <span className={styles.monthNavWrap}>
              <button type="button" className={`${styles.dateTrigger}${endTime ? ` ${styles.timeToggleOn}` : ""}`} onClick={() => { if (!endTime) setEndTime(addHour(time)); setEndTimeOpen((o) => !o); setStartTimeOpen(false); }}>
                <Clock size={14} />{endTime ? formatClock(endTime, timeFormat) : t("종료", "End")}
              </button>
              {endTimeOpen && endTime && (
                <TimePickerPopover
                  portal
                  defaultFormat={timeFormat === "24h" ? "24" : "12"}
                  hour={pad(endTimeParts[0])} minute={pad(endTimeParts[1])}
                  onSelect={(h, mi) => setEndTime(`${pad(Number(h))}:${pad(Number(mi))}`)}
                  onClose={() => setEndTimeOpen(false)}
                />
              )}
            </span>
          </div>
        )}
      </div>

      {/* 반복 — "이 일정만" 편집 시엔 이 회차가 시리즈에서 분리되므로 반복 설정 숨김 */}
      {!(recurring && recurScope === "this") && (
      <div className={`${styles.section} ${styles.sectionFull}`}>
        <span className={styles.sectionLabel}>{t("반복", "Repeat")}</span>
        <div className={styles.dateRow}>
          <Select
            value={repeatCustom ? "custom" : repeatFreq}
            onChange={(v) => {
              if (v === "custom") {
                setRepeatCustom(true);
                setRepeatFreq((f) => f || "weekly");
                setRepeatByweekday((prev) => (prev.length ? prev : [d.getDay()]));
                setRecurPopOpen(true);
              } else {
                setRepeatCustom(false);
                setRepeatFreq(v as "" | RecurFreq);
                setRepeatInterval(1);
                setRepeatByweekday([]);
                if (!v) { setRepeatEnd("never"); setRepeatUntil(null); setRepeatUntilOpen(false); setRecurPopOpen(false); }
              }
            }}
            width="m"
            dropdownClassName={styles.selectAboveModal}
            options={[
              { value: "", label: t("반복 안 함", "No repeat") },
              { value: "daily", label: t("매일", "Daily") },
              { value: "weekly", label: t("매주", "Weekly") },
              { value: "monthly", label: t("매월", "Monthly") },
              { value: "custom", label: t("사용자화", "Custom") },
            ]}
          />
          {repeatFreq && (
            <Popover
              open={recurPopOpen}
              onOpenChange={setRecurPopOpen}
              placement="bottom-start"
              offset={6}
              responsive={false}
              contentClassName={styles.recurPop}
              trigger={
                <button type="button" className={styles.dateTrigger} onClick={() => setRecurPopOpen((o) => !o)}>
                  <SlidersHorizontal size={14} />
                  <span className={styles.dateTriggerText}>{recurSummary(buildRepeatCore() ?? { freq: repeatFreq as RecurFreq }, language, false)}</span>
                </button>
              }
            >
              <div className={styles.recurPopBody}>
                {repeatCustom && (
                  <div className={styles.recurCustom}>
                    <div className={styles.recurCustomRow}>
                      <span className={styles.recurText}>{t("매", "Every")}</span>
                      <NumberInput
                        value={repeatInterval} min={1} max={99} height={28} width={34}
                        className={styles.recurStepper}
                        onCommit={(n) => setRepeatInterval(Math.min(99, Math.max(1, n || 1)))}
                        ariaLabel={t("간격", "Interval")}
                      />
                      <Select
                        value={repeatFreq || "weekly"}
                        onChange={(v) => {
                          const f = v as RecurFreq;
                          setRepeatFreq(f);
                          if (f === "weekly") setRepeatByweekday((prev) => (prev.length ? prev : [d.getDay()])); else setRepeatByweekday([]);
                          if (f === "monthly") { setRepeatBysetpos(null); setRepeatBymonthday((prev) => (prev.length ? prev : [d.getDate()])); } else setRepeatBymonthday([]);
                          if (f === "yearly") { setRepeatBysetpos(null); setRepeatBymonth((prev) => (prev.length ? prev : [d.getMonth() + 1])); } else setRepeatBymonth([]);
                        }}
                        width="s"
                        size="sm"
                        dropdownClassName={styles.selectAboveModal}
                        options={[
                          { value: "daily", label: t("일", "day") },
                          { value: "weekly", label: t("주", "week") },
                          { value: "monthly", label: t("개월", "month") },
                          { value: "yearly", label: t("년", "year") },
                        ]}
                      />
                      <span className={styles.recurText}>{repeatFreq === "weekly" ? t("마다 해당 요일에", "on") : repeatFreq === "yearly" ? t("마다 해당 달에", "in") : t("마다", "")}</span>
                    </div>
                    {repeatFreq === "weekly" && (
                      <div className={styles.recurWeekdays}>
                        {[t("일", "S"), t("월", "M"), t("화", "T"), t("수", "W"), t("목", "T"), t("금", "F"), t("토", "S")].map((w, i) => (
                          <button
                            key={i} type="button"
                            className={`${styles.recurWd}${repeatByweekday.includes(i) ? ` ${styles.recurWdOn}` : ""}`}
                            onClick={() => setRepeatByweekday((prev) => (prev.includes(i) ? (prev.length > 1 ? prev.filter((x) => x !== i) : prev) : [...prev, i]))}
                          >{w}</button>
                        ))}
                      </div>
                    )}
                    {/* 월간 — 날짜 지정(bymonthday) / 조건 지정(n번째 요일) */}
                    {repeatFreq === "monthly" && (
                      <div className={styles.recurAdv}>
                        <SegmentedControl<"day" | "ordinal">
                          variant="subtle"
                          className={styles.recurModeSeg}
                          items={[{ value: "day", label: t("날짜 지정", "On day") }, { value: "ordinal", label: t("조건 지정", "On the…") }]}
                          value={repeatBysetpos != null ? "ordinal" : "day"}
                          onChange={(v) => {
                            if (v === "ordinal") { setRepeatBysetpos((p) => p ?? 1); setRepeatOrdDay((prev) => prev || String(d.getDay())); }
                            else { setRepeatBysetpos(null); setRepeatBymonthday((prev) => (prev.length ? prev : [d.getDate()])); }
                          }}
                          size="sm"
                        />
                        {repeatBysetpos == null ? (
                          <div className={styles.recurDayGrid}>
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => (
                              <button key={n} type="button"
                                className={`${styles.recurDay}${repeatBymonthday.includes(n) ? ` ${styles.recurDayOn}` : ""}`}
                                onClick={() => setRepeatBymonthday((prev) => (prev.includes(n) ? (prev.length > 1 ? prev.filter((x) => x !== n) : prev) : [...prev, n]))}
                              >{n}</button>
                            ))}
                          </div>
                        ) : ordCondRow}
                      </div>
                    )}
                    {/* 연간 — 해당 달(bymonth) grid + 선택적 조건 지정 */}
                    {repeatFreq === "yearly" && (
                      <div className={styles.recurAdv}>
                        <div className={styles.recurYearCols}>
                          <div className={styles.recurMonthGrid}>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                              <button key={m} type="button"
                                className={`${styles.recurMonth}${repeatBymonth.includes(m) ? ` ${styles.recurMonthOn}` : ""}`}
                                onClick={() => setRepeatBymonth((prev) => (prev.includes(m) ? (prev.length > 1 ? prev.filter((x) => x !== m) : prev) : [...prev, m]))}
                              >{language === "ko" ? `${m}월` : monthShort[m - 1]}</button>
                            ))}
                          </div>
                          <div className={styles.recurYearCond}>
                            <label className={styles.recurCondToggle}>
                              <Checkbox shape="square" checked={repeatBysetpos != null} onChange={(c) => { if (c) { setRepeatBysetpos((p) => p ?? 1); setRepeatOrdDay((prev) => prev || String(d.getDay())); } else setRepeatBysetpos(null); }} />
                              <span className={styles.recurText}>{t("조건 지정", "On the…")}</span>
                            </label>
                            {repeatBysetpos != null && ordCondRow}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className={styles.recurEnd}>
                  <span className={styles.recurText}>{t("종료", "Ends")}</span>
                  <SegmentedControl<"never" | "count" | "until">
                    variant="subtle"
                    items={[
                      { value: "never", label: t("안 함", "Never") },
                      { value: "count", label: t("횟수", "Count") },
                      { value: "until", label: t("날짜", "Date") },
                    ]}
                    value={repeatEnd}
                    onChange={(v) => { setRepeatEnd(v); if (v === "until" && !repeatUntil) setRepeatUntil(date); }}
                    size="sm"
                  />
                  {repeatEnd === "count" && (
                    <span className={styles.recurCountWrap}>
                      <NumberInput
                        value={repeatCount} min={1} max={400} height={28} width={40}
                        className={styles.recurStepper}
                        onCommit={(n) => setRepeatCount(Math.min(400, Math.max(1, n || 1)))}
                        ariaLabel={t("횟수", "Count")}
                      />
                      <span className={styles.recurText}>{t("회", "times")}</span>
                    </span>
                  )}
                  {repeatEnd === "until" && (
                    <span className={styles.monthNavWrap}>
                      <button type="button" className={`${styles.dateTrigger} ${styles.recurDateBtn}`} onClick={() => setRepeatUntilOpen((o) => !o)}>
                        <CalendarDays size={14} />{repeatUntil ? formatDateValue(repeatUntil, null, language) : t("날짜 선택", "Pick date")}
                      </button>
                      {repeatUntilOpen && (
                        <DatePickerPopover
              portal
                          year={String(dUntil.getFullYear())} month={pad(dUntil.getMonth() + 1)} day={pad(dUntil.getDate())}
                          format="date" minDate={d}
                          onSelect={(y, mo, da) => setRepeatUntil(`${y}-${mo}-${da}`)}
                          onClose={() => setRepeatUntilOpen(false)}
                        />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </Popover>
          )}
          {repeatFreq && (
            <span className={styles.recurEndLabel}>
              {repeatEnd === "count" ? `${repeatCount}${t("회", "×")}` : repeatEnd === "until" && repeatUntil ? `~ ${formatDateValue(repeatUntil, null, language)}` : t("계속", "Forever")}
            </span>
          )}
        </div>
      </div>
      )}

      </div>
      <div className={styles.modalCol}>

      {/* 상태 · 중요도 (나란히) — 2열 상단 */}
      <div className={styles.sectionRow}>
        <div className={styles.section}>
          <span className={styles.sectionLabel}>{t("상태", "Status")}</span>
          <Select
            value={statusKey ?? ""}
            onChange={(v) => setStatusKey(v || null)}
            placeholder={t("없음", "None")}
            width="full"
            dropdownClassName={styles.selectAboveModal}
            options={[
              { value: "", label: t("없음", "None") },
              ...EVENT_STATUSES.map((s) => ({ value: s.key, label: language === "ko" ? s.name[0] : s.name[1], icon: <span className={styles.statusDot} style={{ ["--_sc" as string]: s.color } as React.CSSProperties} /> })),
            ]}
          />
        </div>
        <div className={styles.section}>
          <span className={styles.sectionLabel}>{t("중요도", "Priority")}</span>
          <Select
            value={priorityKey ?? ""}
            onChange={(v) => setPriorityKey(v || null)}
            placeholder={t("없음", "None")}
            width="full"
            dropdownClassName={styles.selectAboveModal}
            options={[
              { value: "", label: t("없음", "None") },
              ...EVENT_PRIORITIES.map((p) => ({ value: p.key, label: language === "ko" ? p.name[0] : p.name[1], icon: <span className={styles.statusDot} style={{ ["--_sc" as string]: p.color } as React.CSSProperties} /> })),
            ]}
          />
        </div>
      </div>

      {/* 태그 — 입력창(공통 Input, + 버튼 없이 Enter/콤마로 추가) + 추가된 칩은 아래에 */}
      <div className={`${styles.section} ${styles.sectionFull} ${styles.grpDividerBottom}`}>
        <span className={styles.sectionLabel}>{t("태그", "Tags")}</span>
        <Input
          value={tagInput}
          onChange={setTagInput}
          placeholder={t("태그 입력 후 Enter", "Type a tag, press Enter")}
          clearable={false}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === ",") && !e.nativeEvent.isComposing) { e.preventDefault(); addTag(tagInput); }
          }}
        />
        {tags.length > 0 && (
          <div className={styles.tagRow}>
            {tags.map((tg, i) => (
              <Chip key={`${tg}-${i}`} variant="capsule" onRemove={() => removeTag(i)}>{tg}</Chip>
            ))}
          </div>
        )}
        {suggestable.length > 0 && (
          <div className={styles.tagSuggest}>
            {suggestable.map((s) => (
              <Chip key={s} variant="capsule" className={styles.suggestChip} leftIcon={<Plus size={11} />} onClick={() => addTag(s)}>{s}</Chip>
            ))}
          </div>
        )}
      </div>

      {/* 연관 이벤트 — 선행/후속 작업 (같은 달력 내) */}
      <div className={`${styles.section} ${styles.sectionFull}`}>
        <span className={styles.sectionLabel}>{t("연관 이벤트", "Related events")}</span>
        <EventRelationField
          label={t("선행 작업", "Predecessors")}
          icon={<ArrowLeft size={12} />}
          selectedIds={deps}
          candidates={predCandidates}
          resolveTitle={titleOf}
          onAdd={(id) => setDeps((prev) => [...prev, id])}
          onRemove={(id) => setDeps((prev) => prev.filter((x) => x !== id))}
          language={language}
          dropdownClassName={styles.selectAboveModal}
          chipMaxLength={12}
        />
        <EventRelationField
          label={t("후속 작업", "Successors")}
          icon={<ArrowRight size={12} />}
          selectedIds={successorIds}
          candidates={succCandidates}
          resolveTitle={titleOf}
          onAdd={(id) => setSuccessorIds((prev) => [...prev, id])}
          onRemove={(id) => setSuccessorIds((prev) => prev.filter((x) => x !== id))}
          language={language}
          dropdownClassName={styles.selectAboveModal}
          chipMaxLength={12}
        />
      </div>

      </div>

      </div>
      {/* 내용 — 가벼운 리치 메모(서식 + 이미지) — 편집 쉽게 맨 아래 전체폭 */}
      <div className={styles.memoSection}>
        <span className={styles.sectionLabel}>{t("내용", "Details")}</span>
        <RichMemo
          value={desc}
          onChange={setDesc}
          placeholder={t("내용을 입력하세요. @ 로 날짜·이벤트 멘션", "Enter details. @ to mention a date or event")}
          language={language}
          onImageUpload={_imageUploadFn.current ?? undefined}
          mentionEvents={allEvents.filter((e) => e.id !== eventId)}
        />
      </div>
      </div>
    )}
    </div>

      {/* 액션 — 모달 기본 footer 로 portal */}
      {footerEl && createPortal(
        viewing ? (
          <>
            {onDelete && (
              <Button size="sm" variant="subtle" tone="danger" icon={<Trash2 size={13} />} soundDisabled onClick={remove} style={{ marginRight: "auto" }}>{t("삭제", "Delete")}</Button>
            )}
            <Button size="sm" variant="outline" soundDisabled onClick={close}>{t("닫기", "Close")}</Button>
            {!readOnly && <Button size="sm" variant="primary" icon={<Pencil size={13} />} soundDisabled onClick={() => setViewing(false)}>{t("편집", "Edit")}</Button>}
          </>
        ) : (
          <>
            {mode === "edit" && onDelete && (
              <Button size="sm" variant="subtle" tone="danger" icon={<Trash2 size={13} />} soundDisabled onClick={remove} style={{ marginRight: "auto" }}>{t("삭제", "Delete")}</Button>
            )}
            <Button size="sm" variant="outline" soundDisabled onClick={() => (mode === "edit" ? setViewing(true) : close())}>{t("취소", "Cancel")}</Button>
            <Button size="sm" variant="primary" icon={<Check size={13} />} soundDisabled onClick={save}>{t("저장", "Save")}</Button>
          </>
        ),
        footerEl,
      )}
    </>
  );
}
