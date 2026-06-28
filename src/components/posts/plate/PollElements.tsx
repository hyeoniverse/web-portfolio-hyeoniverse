"use client";

import React, { useState, useRef } from "react";
import { useEditorRef, useSelected, PlateElement, type PlateElementProps } from "platejs/react";
import { X, Check, CalendarClock, Eye, GripVertical } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import DateTimePicker from "@/components/ui/DatePicker/DateTimePicker";
import Popover from "@/components/ui/Popover";
import { BlockDropZone, useBlockDrag } from "./BlockDragHandle";
import FloatingBar from "./toolbars/FloatingBar";
import EditorTextInput from "./EditorTextInput";

export type PollOption = { optionId: string; label: string };

export function genPollId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* noop */ }
  return `p-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
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
  const [uiFocused, setUiFocused] = useState(false);
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);

  // 최신 element 참조 — document(드래그) 핸들러처럼 stale 클로저에서 호출돼도 현재 노드/옵션을 보게.
  const elementRef = useRef(props.element);
  elementRef.current = props.element;

  const t = (ko: string, en: string) => (language === "ko" ? ko : en);
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
    setOptions([...options, { optionId: genPollId(), label: v }]);
  };
  const updateOption = (i: number, label: string) => {
    if (options[i]?.label === label) return;
    const next = options.slice();
    next[i] = { ...next[i], label };
    setOptions(next);
  };
  const removeOption = (i: number) => {
    if (options.length <= 1) return;
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
            {/* ── toolbar (선택/포커스 시) ── 단일/복수 · 기간 · 결과 미리보기 */}
            <FloatingBar open={selected || uiFocused} getAnchorRect={getAnchorRect} inline>
              <button type="button" className={`poll-mode-btn${!multiple ? " poll-mode-active" : ""}`}
                onMouseDown={(e) => { e.preventDefault(); update({ multiple: false }); }}>{t("단일", "Single")}</button>
              <button type="button" className={`poll-mode-btn${multiple ? " poll-mode-active" : ""}`}
                onMouseDown={(e) => { e.preventDefault(); update({ multiple: true }); }}>{t("복수", "Multiple")}</button>
              <span className="poll-tb-div" />
              <Popover placement="bottom-start" offset={8} contentClassName="poll-period-menu"
                trigger={
                  <button type="button" className={`poll-mode-btn${(startAt || endAt) ? " poll-mode-active" : ""}`}>
                    <CalendarClock size={13} /> {t("기간", "Period")}
                  </button>
                }>
                {() => (
                  <div className="poll-period" onMouseDown={(e) => e.preventDefault()}>
                    <div className="poll-period-row">
                      <span className="poll-period-label">{t("시작", "Start")}</span>
                      <DateTimePicker inline value={startAt} onChange={(iso) => {
                        if (iso && endAt && new Date(iso).getTime() > new Date(endAt).getTime()) update({ startAt: iso, endAt: iso });
                        else update({ startAt: iso || undefined });
                      }} />
                    </div>
                    <div className="poll-period-row">
                      <span className="poll-period-label">{t("종료", "End")}</span>
                      <DateTimePicker inline value={endAt} minDate={startAt ? new Date(startAt) : undefined}
                        onChange={(iso) => update({ endAt: iso || undefined })} />
                    </div>
                  </div>
                )}
              </Popover>
              <span className="poll-tb-div" />
              <button type="button" className={`poll-mode-btn${resultsBeforeVote ? " poll-mode-active" : ""}`}
                onMouseDown={(e) => { e.preventDefault(); update({ resultsBeforeVote: !resultsBeforeVote }); }}>
                <Eye size={13} /> {t("투표 전 결과 공개", "Show results")}
              </button>
            </FloatingBar>

            {/* ── 옵션 (드래그 핸들로 순서 변경, 라벨은 캡션 패턴 input) ── */}
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
                  onCommit={(v) => updateOption(i, v)} />
                {options.length > 1 && (
                  <button type="button" className="poll-option-remove" aria-label="remove"
                    onMouseDown={(e) => { e.preventDefault(); removeOption(i); }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}

            {/* ── 추가: 하단 빈 input 에 입력 후 Enter/blur 로 항목 추가 ── */}
            <div className="poll-add-row">
              <span className={`poll-option-marker poll-add-marker${multiple ? " poll-option-marker-multi" : ""}`} aria-hidden />
              <EditorTextInput className="poll-add-input" value="" placeholder={t("항목 추가", "Add item")}
                clearOnCommit onCommit={addOption} />
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
          </div>
          {props.children}
        </PlateElement>
      </div>
    </BlockDropZone>
  );
}
