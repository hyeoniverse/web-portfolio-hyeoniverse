"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, GripVertical, Pencil } from "lucide-react";
import CloseButton from "@/components/ui/CloseButton";
import BilingualInputPair from "@/components/admin/BilingualInputPair";
import styles from "./TagNotesEditor.module.css";

export type TagNote = { ko: string; en: string };

/** 3-state toggle 버튼 — header 우측 */
function GroupToggleButton({
  state,
  addLabel,
  cancelLabel,
  editLabel,
  onClick,
}: {
  state: "add" | "cancel" | "edit";
  addLabel: string;
  cancelLabel: string;
  editLabel: string;
  onClick: () => void;
}) {
  const icon =
    state === "add" ? <Plus size={10} strokeWidth={2.5} />
      : state === "cancel" ? <X size={10} strokeWidth={2.5} />
        : <Pencil size={10} strokeWidth={2.5} />;
  const label = state === "add" ? addLabel : state === "cancel" ? cancelLabel : editLabel;
  return (
    <button
      type="button"
      className={styles.toggleBtn}
      data-cursor="big"
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <span className={styles.toggleIconSlot}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={state}
            className={styles.toggleIconInner}
            initial={{ opacity: 0, rotate: -90 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 90 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
          >
            {icon}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className={styles.toggleLabelSlot}>
        <span className={styles.toggleLabelSizer} aria-hidden>{label}</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={state}
            className={styles.toggleLabelInner}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}

export interface TagNotesEditorProps {
  /** 표시 + 정렬 순서 source (tags / tech 등) */
  items: string[];
  /** 항목별 ko/en 설명 — entry 없는 항목은 undefined */
  notes: Record<string, TagNote>;
  /** items 재정렬 / 항목 제거 후 호출 */
  onItemsChange: (next: string[]) => void;
  /** notes 변경 (entry 추가/수정/삭제) 후 호출 */
  onNotesChange: (next: Record<string, TagNote>) => void;
  /** 라벨 prefix — "#" (tags) 또는 빈 string (tech 등) */
  prefix?: string;
  /** placeholder — KO / EN 인풋 공통 */
  notePlaceholder?: string;
  /** add 버튼 라벨 */
  addLabel?: string;
  /** cancel 버튼 라벨 (editing 중) */
  cancelLabel?: string;
  /** edit 버튼 라벨 (readonly 상태) */
  editLabel?: string;
  /** remove tag 버튼 title */
  removeTitle?: string;
  /** true 면 entry input 을 textarea 로 (여러 항목 입력 가능) — 역할/담당업무 같이 multi-item case 용 */
  multiLine?: boolean;
}

/**
 * 항목별 ko/en 설명을 추가/편집할 수 있는 list.
 * 각 group: [#item ×] ────── [+ Add / × Cancel] → entry 펼치면 KO/EN 인풋 (clip-path 애니메이션).
 * group 자체는 vertical drag-reorder 지원.
 */
export default function TagNotesEditor({
  items,
  notes,
  onItemsChange,
  onNotesChange,
  prefix = "#",
  notePlaceholder = "",
  addLabel = "Add description",
  cancelLabel = "Cancel",
  editLabel = "Edit",
  removeTitle = "Remove",
  multiLine = false,
}: TagNotesEditorProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropPos, setDropPos] = useState<{ idx: number; side: "top" | "bottom" } | null>(null);
  const resetDrag = useCallback(() => { setDragIdx(null); setDropPos(null); }, []);
  // 편집 중인 item (한 번에 하나만). null = 모두 readonly (entry 없으면 add 버튼)
  const [editingItem, setEditingItem] = useState<string | null>(null);
  // 편집 모드 — "all" (전체 pair input), "newest" (마지막 pair 만 input, 나머지 readonly)
  const [editMode, setEditMode] = useState<"all" | "newest">("all");
  // 체크박스 일괄 선택 — editing 중인 multiLine pair 들 중 삭제할 idx
  const [selectedIdxs, setSelectedIdxs] = useState<Set<number>>(new Set());
  // editing item 바뀌면 selection reset
  useEffect(() => { setSelectedIdxs(new Set()); }, [editingItem]);
  // pair-level drag — editing 중인 multiLine pair 의 순서 변경
  const [pairDragIdx, setPairDragIdx] = useState<number | null>(null);
  const [pairDropPos, setPairDropPos] = useState<{ idx: number; side: "top" | "bottom" } | null>(null);
  const resetPairDrag = useCallback(() => { setPairDragIdx(null); setPairDropPos(null); }, []);

  // entry 의 ko/en 에서 빈 pair (양쪽 모두 trim 시 비어있음) 제거.
  // 모두 비면 null 반환 — entry 자체 제거 시그널
  const normalizeEntry = useCallback((e: { ko: string; en: string }) => {
    const ko = e.ko.split("\n");
    const en = e.en.split("\n");
    const len = Math.max(ko.length, en.length);
    const kept: { ko: string; en: string }[] = [];
    for (let i = 0; i < len; i++) {
      const k = ko[i] ?? "";
      const v = en[i] ?? "";
      if (k.trim() || v.trim()) kept.push({ ko: k, en: v });
    }
    if (kept.length === 0) return null;
    return { ko: kept.map((p) => p.ko).join("\n"), en: kept.map((p) => p.en).join("\n") };
  }, []);
  // section 레벨 indicator 위치 계산용 — group 별 ref
  const sectionRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // 새 설명 pair 추가 직후 마지막 KO input 으로 focus.
  // setEntry → parent rerender → editingItem effect → input mount 까지 보장 위해 50ms delay.
  const focusLastPairInput = useCallback((item: string) => {
    setTimeout(() => {
      const groupEl = groupRefs.current.get(item);
      if (!groupEl) return;
      const textInputs = groupEl.querySelectorAll<HTMLInputElement>('input[type="text"]');
      if (textInputs.length === 0) return;
      // 마지막 pair = KO + EN 두 input. KO 가 먼저 mount → index length-2
      const target = textInputs[textInputs.length - 2] ?? textInputs[textInputs.length - 1];
      target?.focus();
    }, 50);
  }, []);

  // 편집 중인 group 밖 클릭 시 편집 모드 해제 (blur 와 동일 정책)
  useEffect(() => {
    if (!editingItem) return;
    const handler = (e: PointerEvent) => {
      // section 안 (gap / 다른 group / 체크박스 등 포함) 클릭은 편집 유지.
      // section 자체 밖에서 클릭해야 편집 종료
      if (sectionRef.current?.contains(e.target as Node)) return;
      const cur = notes[editingItem];
      if (cur) {
        const normalized = normalizeEntry(cur);
        const map = { ...notes };
        if (normalized === null) {
          delete map[editingItem];
          onNotesChange(map);
        } else if (normalized.ko !== cur.ko || normalized.en !== cur.en) {
          map[editingItem] = normalized;
          onNotesChange(map);
        }
      }
      setEditingItem(null);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [editingItem, notes, onNotesChange]);
  // dropPos 변화에 따라 indicator y 좌표 계산 (group rect → section 상대 offset)
  const [indicatorTop, setIndicatorTop] = useState<number | null>(null);
  useEffect(() => {
    if (dragIdx === null || dropPos === null) { setIndicatorTop(null); return; }
    const targetItem = items[dropPos.idx];
    const groupEl = groupRefs.current.get(targetItem);
    const sectionEl = sectionRef.current;
    if (!groupEl || !sectionEl) { setIndicatorTop(null); return; }
    // no-op 위치 확인
    let effectiveTo = dropPos.idx + (dropPos.side === "bottom" ? 1 : 0);
    if (dragIdx < effectiveTo) effectiveTo -= 1;
    if (effectiveTo === dragIdx) { setIndicatorTop(null); return; }
    const groupRect = groupEl.getBoundingClientRect();
    const sectionRect = sectionEl.getBoundingClientRect();
    // gap 의 정중앙 — top: group 위쪽 gap 중앙, bottom: group 아래쪽 gap 중앙
    // section gap = var(--spacing-md) → 약 16px → 절반 8px
    const GAP_HALF = 8;
    const y = dropPos.side === "top"
      ? groupRect.top - sectionRect.top - GAP_HALF
      : groupRect.bottom - sectionRect.top + GAP_HALF;
    setIndicatorTop(y);
  }, [dragIdx, dropPos, items]);
  // 신규 entry 가 막 추가됐는지 추적 — 추가 직후 자동 editing 진입
  const prevNotesRef = useRef(notes);
  useEffect(() => {
    const newKey = Object.keys(notes).find((k) => !(k in prevNotesRef.current));
    if (newKey) setEditingItem(newKey);
    prevNotesRef.current = notes;
  }, [notes]);
  // drop 이 정상 발화했는지 추적 — onDrop 에서 set, onDragEnd 에서 확인 후 fallback
  const droppedRef = useRef(false);
  const handleDrop = useCallback((_targetIdx: number) => {
    droppedRef.current = true;
    if (dragIdx === null || dropPos === null) { resetDrag(); return; }
    let to = dropPos.idx + (dropPos.side === "bottom" ? 1 : 0);
    if (dragIdx < to) to -= 1;
    if (to !== dragIdx) {
      const next = [...items];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(to, 0, moved);
      onItemsChange(next);
    }
    resetDrag();
  }, [dragIdx, dropPos, items, onItemsChange, resetDrag]);

  // 마지막 항목 삭제 시 exit 애니메이션을 위해 항상 section 렌더링 (빈 list 면 자동 빈 공간 처리)
  return (
    <div
      className={styles.section}
      ref={sectionRef}
      // section 전체 cursor 를 grab 으로 일관 — group 사이 gap 영역 통과 시에도 동일 cursor.
      // input/button 처럼 own data-cursor 가진 자식은 innermost 우선 룰로 자동 override
      data-cursor="grab"
      // gap 영역(group 사이 빈 공간) 에서도 drop 받게 section 레벨에서도 처리.
      // dropPos 는 직전 group 의 dragover 에서 set 된 값 그대로 사용
      onDragOver={(e) => {
        if (dragIdx === null) return;
        e.preventDefault();
      }}
      onDrop={(e) => {
        if (dragIdx === null) return;
        e.preventDefault();
        handleDrop(dragIdx);
      }}
    >
      {/* 단일 drop indicator — gap 정중앙. section absolute */}
      {indicatorTop !== null && (
        <div className={styles.dropIndicator} style={{ top: indicatorTop }} />
      )}
      <AnimatePresence initial={false}>
      {items.map((item, idx) => {
        const entry = notes[item];
        const setEntry = (next: TagNote | null) => {
          const map = { ...notes };
          if (next === null) delete map[item];
          else map[item] = next;
          onNotesChange(map);
        };
        const removeItem = () => {
          onItemsChange(items.filter((_, j) => j !== idx));
          if (notes[item]) setEntry(null);
        };
        const isDragging = dragIdx === idx;
        // multiLine pair 구조 (header bulk-delete 와 body 가 공유)
        const pairsForItem = entry
          ? (() => {
              const koItems = entry.ko.split("\n");
              const enItems = entry.en.split("\n");
              const len = Math.max(koItems.length, enItems.length, 1);
              return Array.from({ length: len }, (_, i) => ({ ko: koItems[i] ?? "", en: enItems[i] ?? "" }));
            })()
          : [];
        const writePairsForItem = (next: { ko: string; en: string }[]) => {
          setEntry({ ko: next.map((p) => p.ko).join("\n"), en: next.map((p) => p.en).join("\n") });
        };
        return (
          <motion.div
            key={item}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div
              ref={(el) => {
                if (el) groupRefs.current.set(item, el);
                else groupRefs.current.delete(item);
              }}
              className={`${styles.group} ${isDragging ? styles.groupDragging : ""}`}
              draggable
              // mousedown 위치 기반 drag 가능 여부 결정 — button/input/textarea/label/select 영역은
              // drag 비활성화 (click/edit 보존), 그 외 (grip / 텍스트 / 빈 공간) 는 즉시 drag 가능
              onMouseDown={(e) => {
                const target = e.target as HTMLElement;
                const isInteractive = !!target.closest("button, a, input, textarea, select, [contenteditable]");
                (e.currentTarget as HTMLElement).setAttribute("draggable", isInteractive ? "false" : "true");
              }}
              // mouseup 시 draggable=true 복원 — cursor 표시 (grab) 가 idle 상태에서 정확히 보임
              onMouseUp={(e) => {
                (e.currentTarget as HTMLElement).setAttribute("draggable", "true");
              }}
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => {
                if (dragIdx === null) return;
                e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                const mid = rect.top + rect.height / 2;
                const rawSide: "top" | "bottom" = e.clientY < mid ? "top" : "bottom";
                // 정규화 — "top of N" (N>0) 은 "bottom of N-1" 과 같은 gap 위치라 통합.
                // 결과: 한 gap 당 단일 dropPos 표현 → indicator 1개만 발화
                if (rawSide === "top" && idx > 0) {
                  setDropPos({ idx: idx - 1, side: "bottom" });
                } else {
                  setDropPos({ idx, side: rawSide });
                }
              }}
              onDrop={(e) => { e.preventDefault(); handleDrop(idx); }}
              onDragEnd={(e) => {
                // drop 이 안 잡혔으면 (cursor 가 section 밖에서 release) fallback 으로 보정
                if (!droppedRef.current) handleDrop(idx);
                droppedRef.current = false;
                (e.currentTarget as HTMLElement).setAttribute("draggable", "true");
                resetDrag();
              }}
            >
            <div className={styles.header}>
              <span className={styles.tagGroup}>
                <span className={styles.grip} aria-hidden title="드래그로 순서 변경" data-cursor="grab">
                  <GripVertical size={12} strokeWidth={2} />
                </span>
                <span className={styles.tag}>{prefix}{item}</span>
                <CloseButton
                  size="sm"
                  onClick={removeItem}
                  ariaLabel="remove"
                  title={removeTitle}
                />
              </span>
              {!entry ? (
                /* 신규 entry — 단일 + 설명 추가 버튼 */
                <GroupToggleButton
                  state="add"
                  addLabel={addLabel}
                  cancelLabel={cancelLabel}
                  editLabel={editLabel}
                  onClick={() => {
                    setEntry({ ko: "", en: "" });
                    focusLastPairInput(item);
                  }}
                />
              ) : (
                <div className={styles.headerActions}>
                  {/* 편집/취소 + 일괄삭제 capsule group */}
                  <div className={styles.capsuleGroup} data-cursor="big">
                    {multiLine && editingItem === item && selectedIdxs.size > 0 && (
                      <button
                        type="button"
                        className={styles.capsuleAddBtn}
                        data-cursor="big"
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          const filtered = pairsForItem.filter((_, i) => !selectedIdxs.has(i));
                          if (filtered.length === 0) {
                            setEntry(null);
                            setEditingItem(null);
                          } else {
                            writePairsForItem(filtered);
                          }
                          setSelectedIdxs(new Set());
                        }}
                        title="선택 삭제"
                      >
                        <X size={10} strokeWidth={2.5} />
                        삭제 ({selectedIdxs.size})
                      </button>
                    )}
                    <GroupToggleButton
                      state={editingItem === item ? "cancel" : "edit"}
                      addLabel={addLabel}
                      cancelLabel={cancelLabel}
                      editLabel={editLabel}
                      onClick={() => {
                        if (editingItem === item) {
                          const normalized = normalizeEntry(entry);
                          if (normalized === null) setEntry(null);
                          else if (normalized.ko !== entry.ko || normalized.en !== entry.en) setEntry(normalized);
                          setEditingItem(null);
                        } else {
                          const normalized = normalizeEntry(entry);
                          if (normalized && (normalized.ko !== entry.ko || normalized.en !== entry.en)) {
                            setEntry(normalized);
                          }
                          setEditMode("all");
                          setEditingItem(item);
                        }
                      }}
                    />
                  </div>
                  {/* + 설명 추가 — 항상 분리, 가장 오른쪽 */}
                  {multiLine && (
                    <button
                      type="button"
                      className={styles.standaloneAddBtn}
                      data-cursor="big"
                      onMouseDown={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEntry({
                          ko: entry.ko + "\n",
                          en: entry.en + "\n",
                        });
                        if (editingItem !== item) {
                          setEditMode("newest");
                          setEditingItem(item);
                        }
                        focusLastPairInput(item);
                      }}
                    >
                      <Plus size={10} strokeWidth={2.5} />
                      {addLabel}
                    </button>
                  )}
                </div>
              )}
            </div>
            {/* readonly + editing body — 통합 ul (li 단위로 input/readonly swap, 깜빡임 방지) */}
            <AnimatePresence initial={false}>
              {entry && (
                <motion.ul
                  key="body"
                  className={styles.readonly}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                  onDoubleClick={editingItem !== item ? (e) => { e.stopPropagation(); setEditingItem(item); } : undefined}
                >
                  {(() => {
                    const closeEdit = () => {
                      const normalized = normalizeEntry(entry);
                      if (normalized === null) setEntry(null);
                      else if (normalized.ko !== entry.ko || normalized.en !== entry.en) setEntry(normalized);
                      setEditingItem(null);
                    };
                    const koItems = entry.ko.split("\n");
                    const enItems = entry.en.split("\n");
                    const len = Math.max(koItems.length, enItems.length, 1);
                    const pairs = Array.from({ length: len }, (_, i) => ({ ko: koItems[i] ?? "", en: enItems[i] ?? "" }));
                    const writePairs = (next: { ko: string; en: string }[]) => {
                      setEntry({ ko: next.map((p) => p.ko).join("\n"), en: next.map((p) => p.en).join("\n") });
                    };
                    const handlePairDrop = () => {
                      if (pairDragIdx === null || pairDropPos === null) { resetPairDrag(); return; }
                      let to = pairDropPos.idx + (pairDropPos.side === "bottom" ? 1 : 0);
                      if (pairDragIdx < to) to -= 1;
                      if (to !== pairDragIdx) {
                        const next = [...pairs];
                        const [moved] = next.splice(pairDragIdx, 1);
                        next.splice(to, 0, moved);
                        writePairs(next);
                      }
                      resetPairDrag();
                    };
                    const isEditingThis = editingItem === item;
                    // 각 pair li 단위 렌더 — input vs readonly 결정 + bullet/divider 동일하게
                    return pairs.map((pair, i) => {
                      const isInput = isEditingThis && (
                        !multiLine || editMode === "all" || (editMode === "newest" && i === pairs.length - 1)
                      );
                      // editing 중 (multiLine) — 모든 pair 에 체크박스, drag-reorder grip 은 "all" 모드에서만
                      const showCheckbox = multiLine && isEditingThis;
                      const showGrip = multiLine && isEditingThis && editMode === "all" && isInput;
                      const checked = selectedIdxs.has(i);
                      const toggleChecked = () => {
                        setSelectedIdxs((prev) => {
                          const next = new Set(prev);
                          if (next.has(i)) next.delete(i);
                          else next.add(i);
                          return next;
                        });
                      };
                      let pairDropSide: "top" | "bottom" | null = null;
                      if (showGrip && pairDragIdx !== null && pairDragIdx !== i && pairDropPos?.idx === i) {
                        let effTo = pairDropPos.idx + (pairDropPos.side === "bottom" ? 1 : 0);
                        if (pairDragIdx < effTo) effTo -= 1;
                        if (effTo !== pairDragIdx) pairDropSide = pairDropPos.side;
                      }
                      // 비어있는 readonly pair 는 li 자체 skip (체크박스 있어도 의미 없으니)
                      if (!isInput && !pair.ko.trim() && !pair.en.trim()) return null;
                      const liCls = `${styles.readonlyItem} ${pairDragIdx === i ? styles.itemRowDragging : ""} ${pairDropSide === "top" ? styles.itemRowDropTop : ""} ${pairDropSide === "bottom" ? styles.itemRowDropBottom : ""}`;
                      return (
                        <li
                          key={i}
                          className={liCls}
                          draggable={showGrip}
                          onMouseDown={showGrip ? (e) => {
                            const t = e.target as HTMLElement;
                            const isGrip = !!t.closest(`.${styles.pairGrip}`);
                            (e.currentTarget as HTMLElement).setAttribute("draggable", String(isGrip));
                          } : undefined}
                          onMouseUp={showGrip ? (e) => { (e.currentTarget as HTMLElement).setAttribute("draggable", "true"); } : undefined}
                          onDragStart={showGrip ? () => setPairDragIdx(i) : undefined}
                          onDragOver={showGrip ? (e) => {
                            if (pairDragIdx === null) return;
                            e.preventDefault();
                            const rect = e.currentTarget.getBoundingClientRect();
                            const mid = rect.top + rect.height / 2;
                            const rawSide: "top" | "bottom" = e.clientY < mid ? "top" : "bottom";
                            if (rawSide === "top" && i > 0) setPairDropPos({ idx: i - 1, side: "bottom" });
                            else setPairDropPos({ idx: i, side: rawSide });
                          } : undefined}
                          onDrop={showGrip ? (e) => { e.preventDefault(); handlePairDrop(); } : undefined}
                          onDragEnd={showGrip ? (e) => {
                            (e.currentTarget as HTMLElement).setAttribute("draggable", "true");
                            resetPairDrag();
                          } : undefined}
                        >
                          <div className={styles.itemRow}>
                            {/* grip — 가장 앞 (체크박스보다 외곽) */}
                            {showGrip && (
                              <span className={styles.pairGrip} data-cursor="grab" aria-hidden title="드래그로 순서 변경">
                                <GripVertical size={12} strokeWidth={2} />
                              </span>
                            )}
                            {/* input 모드 — checkbox + bullet 을 itemRow 의 28px 라인에 정렬 */}
                            {isInput && showCheckbox && (
                              <label className={styles.itemCheckLabel} data-cursor="big">
                                <input
                                  type="checkbox"
                                  className={styles.itemCheckbox}
                                  checked={checked}
                                  onChange={toggleChecked}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onPointerDown={(e) => e.stopPropagation()}
                                />
                              </label>
                            )}
                            {isInput && (
                              <span className={styles.bullet} aria-hidden>
                                <svg viewBox="0 0 4 4" width="4" height="4">
                                  <circle cx="2" cy="2" r="2" fill="currentColor" />
                                </svg>
                              </span>
                            )}

                            {isInput ? (
                              <BilingualInputPair
                                value={pair}
                                onChange={(next) => writePairs(pairs.map((p, j) => (j === i ? next : p)))}
                                placeholder={notePlaceholder}
                                onEnter={closeEdit}
                              />
                            ) : (() => {
                              const hasKo = !!pair.ko.trim();
                              const hasEn = !!pair.en.trim();
                              // bullet + checkbox 는 첫 번째 보이는 line 에만 (KO 우선, 없으면 EN)
                              const renderLeading = () => (
                                <>
                                  {showCheckbox && (
                                    <label className={styles.readonlyCheckLabel} data-cursor="big">
                                      <input
                                        type="checkbox"
                                        className={styles.itemCheckbox}
                                        checked={checked}
                                        onChange={toggleChecked}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onPointerDown={(e) => e.stopPropagation()}
                                      />
                                    </label>
                                  )}
                                  <span className={styles.readonlyBulletInline} aria-hidden>
                                    <svg viewBox="0 0 4 4" width="4" height="4">
                                      <circle cx="2" cy="2" r="2" fill="currentColor" />
                                    </svg>
                                  </span>
                                </>
                              );
                              const renderSpacer = () => (
                                <>
                                  {showCheckbox && <span className={styles.readonlyCheckSpacer} aria-hidden />}
                                  <span className={styles.readonlyBulletSpacer} aria-hidden />
                                </>
                              );
                              return (
                                <div className={styles.readonlyInlineGroup}>
                                  {hasKo && (
                                    <div className={styles.readonlyLine}>
                                      {renderLeading()}
                                      <span className={styles.readonlyBadge}>KO</span>
                                      <span className={styles.readonlyText}>{pair.ko.trim()}</span>
                                    </div>
                                  )}
                                  {hasEn && (
                                    <div className={styles.readonlyLine}>
                                      {hasKo ? renderSpacer() : renderLeading()}
                                      <span className={styles.readonlyBadge}>EN</span>
                                      <span className={styles.readonlyText}>{pair.en.trim()}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </li>
                      );
                    });
                  })()}
                </motion.ul>
              )}
            </AnimatePresence>
            </div>
          </motion.div>
        );
      })}
      </AnimatePresence>
    </div>
  );
}
