"use client";

import React, { useState, useRef, useEffect } from "react";
import { useEditorRef, useSelected, PlateElement, type PlateElementProps } from "platejs/react";
import { X, Check, CalendarClock, Eye, GripVertical, Undo2, Plus, BarChart3, ChevronDown, ChevronUp } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import PollPeriodEditor from "./PollPeriodEditor";
import Popover from "@/components/ui/Popover";
import { BlockDropZone, useBlockDrag } from "./BlockDragHandle";
import FloatingBar from "./toolbars/FloatingBar";
import EditorTextInput from "./EditorTextInput";
import SegmentedControl from "@/components/ui/SegmentedControl";
import TBtn from "./TBtn";
import { buildPollResult, POLL_SORT_LABELS, type PollSortKey } from "../pollResultView";
import { showToast } from "@/stores/toastStore";
import Pressable from "@/components/ui/Pressable";

export type PollOption = { optionId: string; label: string };

/** 투표 항목 라벨 최대 글자수 — 가독성/레이아웃 보호 */
const OPTION_MAX_LEN = 80;
/** 투표 항목 최대 개수 — 넉넉한 안전장치(사고/남용·직렬화 크기 방지). 도넛은 상위 8 + "기타"로 묶어 가독성 유지(reader) */
const MAX_OPTIONS = 50;
/** 제목/부제목/설명 글자수 제한 */
const TITLE_MAX = 80;
const SUBTITLE_MAX = 120;
const DESC_MAX = 300;

export function genPollId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* noop */ }
  return `p-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

/** 결과 도넛+막대 — 공용 buildPollResult(차트) + 공통 SegmentedControl(정렬). 리더와 차트 DOM 100% 동일(샘플 집계).
 *  정렬 컨트롤만 에디터=React SegmentedControl / 리더=동일 모양 vanilla 로 구현 분리. */
function PollResultView({ options, language }: { options: PollOption[]; language: string }) {
  const ko = language === "ko";
  const [sortKey, setSortKey] = useState<PollSortKey>("order");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // 샘플 집계 — 결정적이되 표시순≠득표순(정렬 데모가 보이게)
    const opts = options.map((o) => ({ id: o.optionId, label: o.label || (ko ? "항목" : "Option") }));
    const counts: Record<string, number> = {};
    options.forEach((o, i) => { counts[o.optionId] = ((i * 5 + 3) % 7) + 2; });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const mine = options[0] ? [options[0].optionId] : [];
    node.replaceChildren(buildPollResult({ options: opts, counts, total, mine, sortKey, sortDir, ko }));
  }, [options, ko, sortKey, sortDir]);
  // 같은 key 재클릭=방향 토글, 다른 key=전환(득표순만 desc 기본, 나머지 asc) — posts 페이지와 동일 패턴
  const onSort = (v: PollSortKey) => {
    if (v === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(v); setSortDir(v === "votes" ? "desc" : "asc"); }
  };
  return (
    <div contentEditable={false}>
      {/* onMouseDown 전파 차단 — Slate void 안에서 정렬 클릭 시 focus/selection 뺏김 방지(vanilla 버튼과 동일) */}
      <div className="poll-result-head" onMouseDown={(e) => e.stopPropagation()}>
        <SegmentedControl<PollSortKey>
          items={(["order", "votes", "alpha"] as PollSortKey[]).map((k) => ({ value: k, label: ko ? POLL_SORT_LABELS[k].ko : POLL_SORT_LABELS[k].en }))}
          value={sortKey}
          onChange={onSort}
          sortDir={sortDir}
          size="sm"
        />
      </div>
      <div ref={ref} />
    </div>
  );
}

/** 결과화면 예시 미리보기 — 실제 리더 결과화면(도넛+막대)과 동일. 헤더/기간은 읽기 전용 표시.
 *  편집 복귀는 상단 편집|결과 토글이 담당(리더/디테일엔 없음). */
function PollResultPreview({ options, title, subtitle, description, startAt, endAt, language }: {
  options: PollOption[]; title: string; subtitle: string; description: string; startAt: string | null; endAt: string | null; language: string;
}) {
  const t = (ko: string, en: string) => (language === "ko" ? ko : en);
  const fmt = (iso: string | null) => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleString(language === "ko" ? "ko-KR" : "en-US", { dateStyle: "medium", timeStyle: "short" }); } catch { return iso; }
  };
  const sampleTotal = options.reduce((a, _o, i) => a + (((i * 5 + 3) % 7) + 2), 0);
  const hasHeader = !!(title || subtitle || description || startAt || endAt);

  return (
    <div className="poll-preview" contentEditable={false}>
      {hasHeader && (
        <div className="poll-header">
          {title && <><div className="poll-head-label">{t("제목", "Title")}</div><div className="poll-title">{title}</div></>}
          {subtitle && <><div className="poll-head-label">{t("부제목", "Subtitle")}</div><div className="poll-subtitle">{subtitle}</div></>}
          {description && <><div className="poll-head-label">{t("설명", "About")}</div><div className="poll-desc">{description}</div></>}
          {(startAt || endAt) && <div className="poll-period">{t("기간 ", "Period ")}{fmt(startAt)} ~ {fmt(endAt)}</div>}
        </div>
      )}

      <PollResultView options={options} language={language} />

      <div className="poll-foot">
        <span className="poll-footer">{t(`${sampleTotal}명 참여`, `${sampleTotal} votes`)} · {t("예시 미리보기", "Sample preview")}</span>
      </div>
    </div>
  );
}

/**
 * 투표 블록 — void 요소. 내부 UI 는 전부 Slate 바깥(contentEditable=false)의 순수 React.
 * 옵션은 el.options 배열로 관리, 라벨은 PollTextInput(캡션 패턴)으로 편집.
 */
export function PollElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const selected = useSelected();
  const { language } = useLanguage();
  const el = props.element as Record<string, unknown>;
  const options = (Array.isArray(el.options) ? el.options : []) as PollOption[];
  const multiple = !!el.multiple;
  const startAt = (el.startAt as string) || null;
  const endAt = (el.endAt as string) || null;
  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();
  const { blockDragProps } = useBlockDrag(elPath);
  const resultsBeforeVote = !!el.resultsBeforeVote;
  const allowRetract = el.allowRetract !== false; // 기본 true (투표 취소/변경 가능)
  const title = (el.title as string) || "";
  const subtitle = (el.subtitle as string) || "";
  const description = (el.description as string) || "";
  const [preview, setPreview] = useState(false); // 결과화면 미리보기 토글
  const [barExpanded, setBarExpanded] = useState(false); // 플로팅 바 펼치기(하위 메뉴 내용 인라인 표시)
  const [uiFocused, setUiFocused] = useState(false);
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);

  // 최신 element 참조 — document(드래그) 핸들러처럼 stale 클로저에서 호출돼도 현재 노드/옵션을 보게.
  const elementRef = useRef(props.element);
  elementRef.current = props.element;

  const t = (ko: string, en: string) => (language === "ko" ? ko : en);
  // 글자수 제한 초과 시 toast 알림 (공통 컴포넌트 패턴)
  const overflowToast = (max: number) => showToast(t(`최대 ${max}자까지 입력할 수 있습니다.`, `Up to ${max} characters.`), "warning");
  // path 를 호출 시점에 새로 찾고 노드 존재를 검증한 뒤 setNodes — stale path 로 인한 destructure 에러 방지.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update = (patch: Record<string, any>) => {
    // path 를 호출 시점에 새로 찾고 노드 존재를 검증한 뒤 setNodes — stale path 로 인한 에러 방지.
    let p: number[] | null = null;
    try { const pp = editor.api.findPath(elementRef.current); p = pp ? Array.from(pp) : null; } catch { p = null; }
    if (!p) return;
    try { if (!editor.api.node(p)) return; } catch { return; }
    try { editor.tf.setNodes(patch, { at: p }); } catch { /* noop */ }
  };
  const setOptions = (next: PollOption[]) => update({ options: next });
  // 최신 element 에서 옵션 배열을 다시 읽음 (드래그 onUp 의 stale 클로저 대비)
  const currentOptions = (): PollOption[] => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const o = (elementRef.current as any)?.options;
    return Array.isArray(o) ? o : [];
  };

  const addOption = (label: string) => {
    const v = label.trim();
    if (!v) return;
    if (options.length >= MAX_OPTIONS) return;
    setOptions([...options, { optionId: genPollId(), label: v }]);
  };
  const updateOption = (i: number, label: string) => {
    if (options[i]?.label === label) return;
    const next = options.slice();
    next[i] = { ...next[i], label };
    setOptions(next);
  };
  const removeOption = (i: number) => {
    if (options.length <= 2) return; // 최소 2개 유지
    setOptions(options.filter((_, j) => j !== i));
  };
  const moveOption = (from: number, to: number) => {
    const cur = currentOptions();
    if (from === to || from < 0 || to < 0 || from >= cur.length || to >= cur.length) return;
    const next = cur.slice();
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setOptions(next);
  };

  // pointer 기반 드래그 정렬 — document 리스너로 끝까지 추적 (void 라 Slate 간섭 없음).
  // drag state 로 ghost/드롭 indicator/grabbing 커서 시각 피드백.
  const startReorder = (from: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag({ from, over: from });
    document.body.classList.add("poll-grabbing");
    // 흐려진 복제본이 커서를 따라다니게 (drag ghost) — ref 로 직접 transform (re-render 없이 부드럽게)
    const moveGhost = (x: number, y: number) => { const g = ghostRef.current; if (g) g.style.transform = `translate(${x + 12}px, ${y + 8}px)`; };
    requestAnimationFrame(() => moveGhost(e.clientX, e.clientY));
    let target = from;
    const onMove = (ev: PointerEvent) => {
      moveGhost(ev.clientX, ev.clientY);
      const row = (document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null)?.closest("[data-poll-opt]");
      if (row) { const idx = Number(row.getAttribute("data-poll-opt")); if (!Number.isNaN(idx) && idx !== target) { target = idx; setDrag({ from, over: idx }); } }
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerup", onUp, true);
      document.body.classList.remove("poll-grabbing");
      setDrag(null);
      moveOption(from, target);
    };
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerup", onUp, true);
  };

  const getAnchorRect = () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dom = editor.api.toDOMNode(props.element as any);
      return (dom as HTMLElement | null)?.getBoundingClientRect() ?? new DOMRect();
    } catch { return new DOMRect(); }
  };

  return (
    <BlockDropZone path={elPath}>
      <div {...blockDragProps}>
        <PlateElement {...props} className="poll-block">
          {/* void 내부 — 전부 Slate 바깥(순수 React) */}
          <div
            contentEditable={false}
            onFocusCapture={() => setUiFocused(true)}
            onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setUiFocused(false); }}
          >
            {/* ── 상단 바 — 블록 정체성(eyebrow) + 편집|결과 토글(공통 SegmentedControl, 항상 노출) ── */}
            <div className="poll-topbar">
              <span className="poll-eyebrow"><BarChart3 size={16} strokeWidth={2} />{t("투표", "Poll")}</span>
              <SegmentedControl<"edit" | "result">
                items={[{ value: "edit", label: t("편집", "Edit") }, { value: "result", label: t("결과", "Results") }]}
                value={preview ? "result" : "edit"}
                onChange={(v) => setPreview(v === "result")}
                size="sm"
              />
            </div>

            {/* ── toolbar (선택/포커스 시) ── 단일/다중 · 기간 · 결과 공개 · 취소 허용 · 미리보기.
                keepInView: 스크롤로 블록이 뷰포트를 벗어나도 바가 사라지지 않고 화면 안에 따라옴(콘텐츠 위에 겹쳐도 OK).
                펼치기(barExpanded): 접힘=한 줄(기간은 hover popover). 펼치면 세로 스택 + 기간 설정을 인라인 패널로 노출. */}
            <FloatingBar open={selected || uiFocused} getAnchorRect={getAnchorRect} inline={!barExpanded} keepInView>
              <div className="poll-tb-main">
                <SegmentedControl<"single" | "multiple">
                  items={[
                    { value: "single", label: t("단일", "Single") },
                    { value: "multiple", label: t("다중", "Multiple") },
                  ]}
                  value={multiple ? "multiple" : "single"}
                  onChange={(v) => update({ multiple: v === "multiple" })}
                  size="sm"
                />
                <span className="poll-tb-div" />
                {!barExpanded && (
                  <>
                    <Popover openOnHover placement="bottom-start" offset={8} maxHeight={false} contentClassName="poll-period-menu"
                      trigger={
                        <TBtn active={!!(startAt || endAt)} tooltip={t("투표 시작·종료 시각 설정 (미설정 시 상시). hover 로 열림", "Set start/end time (open-ended if unset). Opens on hover")} style={{ gap: "var(--spacing-3xs)" }}>
                          <CalendarClock size={13} />{t("기간", "Period")}
                        </TBtn>
                      }>
                      {() => (
                        <PollPeriodEditor startAt={startAt} endAt={endAt} update={update} language={language} />
                      )}
                    </Popover>
                    <span className="poll-tb-div" />
                  </>
                )}
                <TBtn active={resultsBeforeVote} tooltip={t("마감 전에도 실시간 집계를 표시", "Show live tally before it closes")} style={{ gap: "var(--spacing-3xs)" }}
                  onMouseDown={() => update({ resultsBeforeVote: !resultsBeforeVote })}>
                  <Eye size={13} />{t("투표 전 결과 공개", "Show results")}
                </TBtn>
                <TBtn active={allowRetract} tooltip={t("투표자가 선택을 취소하고 다시 투표 가능", "Voters can retract and vote again")} style={{ gap: "var(--spacing-3xs)" }}
                  onMouseDown={() => update({ allowRetract: !allowRetract })}>
                  <Undo2 size={13} />{t("취소 허용", "Allow retract")}
                </TBtn>
                <span className="poll-tb-div" />
                <TBtn active={preview} tooltip={t("결과화면 예시 미리보기 (샘플 데이터)", "Preview result screen (sample data)")} style={{ gap: "var(--spacing-3xs)" }}
                  onMouseDown={() => setPreview((v) => !v)}>
                  <Eye size={13} />{preview ? t("편집", "Edit") : t("결과 미리보기", "Preview")}
                </TBtn>
                <span className="poll-tb-div" />
                <TBtn active={barExpanded} tooltip={barExpanded ? t("접기", "Collapse") : t("펼치기 (기간 설정 인라인 표시)", "Expand (inline period settings)")}
                  onMouseDown={() => setBarExpanded((v) => !v)}>
                  {barExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </TBtn>
              </div>
              {barExpanded && (
                <div className="poll-tb-panel">
                  <div className="poll-tb-panel-label">{t("기간 설정", "Period")}</div>
                  <PollPeriodEditor startAt={startAt} endAt={endAt} update={update} language={language} />
                </div>
              )}
            </FloatingBar>

            {/* ── 제목·부제목·설명 입력 — 편집 모드에서만. 미리보기에선 결과 화면처럼 읽기 전용으로 보임 ── */}
            {!preview && (
              <div className="poll-edit-head">
                <EditorTextInput label={t("제목", "Title")} wrapperClassName="poll-field" className="poll-title-input" value={title} maxLength={TITLE_MAX} variant="capsule" showCount onOverflow={() => overflowToast(TITLE_MAX)}
                  placeholder={t("투표 제목 (선택)", "Poll title (optional)")} onCommit={(v) => update({ title: v })} />
                <EditorTextInput label={t("부제목", "Subtitle")} wrapperClassName="poll-field" className="poll-subtitle-input" value={subtitle} maxLength={SUBTITLE_MAX} variant="capsule" showCount onOverflow={() => overflowToast(SUBTITLE_MAX)}
                  placeholder={t("부제목 (선택)", "Subtitle (optional)")} onCommit={(v) => update({ subtitle: v })} />
                <EditorTextInput label={t("설명", "Description")} wrapperClassName="poll-field poll-field-block" className="poll-desc-input" value={description} maxLength={DESC_MAX} variant="capsule" multiline showCount onOverflow={() => overflowToast(DESC_MAX)}
                  placeholder={t("투표에 대한 설명 (선택)", "Describe this poll (optional)")} onCommit={(v) => update({ description: v })} />
              </div>
            )}

            {preview ? (
              <PollResultPreview options={options} title={title} subtitle={subtitle} description={description} startAt={startAt} endAt={endAt} language={language} />
            ) : (
            <div className="poll-body">
            {/* ── 항목 섹션 헤더 — eyebrow 라벨 + 개수. 헤더 폼과 옵션 리스트의 계층 구분 ── */}
            <div className="poll-opts-head">
              <span className="poll-opts-label">{t("항목", "Options")}</span>
              <span className="poll-opts-count">{options.length}</span>
            </div>
            {/* ── 옵션 리스트 (드래그 핸들로 순서 변경, 라벨은 캡션 패턴 input) ── */}
            <div className="poll-options">
            {options.map((opt, i) => (
              <div
                className={`poll-option-row${drag?.from === i ? " poll-option-dragging" : ""}`}
                data-poll-opt={i}
                data-cursor={drag ? "grab" : undefined}
                key={i}
              >
                {drag && drag.from !== i && drag.over === i && (
                  <span className={`poll-drop-line${drag.from < drag.over ? " poll-drop-line-bottom" : " poll-drop-line-top"}`} aria-hidden />
                )}
                <span className="poll-drag" aria-label="reorder"
                  draggable={false}
                  data-cursor="grab"
                  onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
                  onPointerDown={startReorder(i)}>
                  <GripVertical size={14} />
                </span>
                <span className={`poll-option-marker${multiple ? " poll-option-marker-multi" : ""}`}>
                  {multiple && <Check size={12} />}
                </span>
                <EditorTextInput className="poll-option-input" value={opt.label} placeholder={t("항목", "Option")}
                  maxLength={OPTION_MAX_LEN} clearable={false} onOverflow={() => overflowToast(OPTION_MAX_LEN)} onCommit={(v) => updateOption(i, v)} />
                {options.length > 2 && (
                  <Pressable className="poll-option-remove" aria-label="remove"
                    onMouseDown={(e) => { e.preventDefault(); removeOption(i); }}>
                    <X size={14} />
                  </Pressable>
                )}
              </div>
            ))}

            {/* ── 추가: 하단 빈 input 에 입력 후 Enter/blur 로 항목 추가 (최대 MAX_OPTIONS 개) ── */}
            {options.length < MAX_OPTIONS ? (
              <div className="poll-add-row">
                <span className={`poll-option-marker poll-add-marker${multiple ? " poll-option-marker-multi" : ""}`} aria-hidden>
                  <Plus size={12} />
                </span>
                <EditorTextInput className="poll-add-input" value="" placeholder={t("항목 추가", "Add item")}
                  maxLength={OPTION_MAX_LEN} clearOnCommit onCommit={addOption} />
              </div>
            ) : (
              <div className="poll-add-limit">{t(`항목은 최대 ${MAX_OPTIONS}개까지`, `Up to ${MAX_OPTIONS} options`)}</div>
            )}
            </div>

            {/* drag ghost — 흐려진 복제본이 커서를 따라다님 */}
            {drag && (
              <div ref={ghostRef} className="poll-drag-ghost" aria-hidden>
                <span className={`poll-option-marker${multiple ? " poll-option-marker-multi" : ""}`}>
                  {multiple && <Check size={12} />}
                </span>
                <span className="poll-drag-ghost-label">{options[drag.from]?.label || t("항목", "Option")}</span>
              </div>
            )}
            </div>)}
          </div>
          {props.children}
        </PlateElement>
      </div>
    </BlockDropZone>
  );
}
