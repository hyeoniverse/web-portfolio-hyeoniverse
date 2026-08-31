"use client";

import { useState, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { LocalizedText } from "@/types/common";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, GripVertical, Pencil } from "@/components/icons";
import Chip from "@/components/ui/Chip";
import Popover from "@/components/ui/Popover";
import BilingualInputPair from "@/components/admin/BilingualInputPair";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./TagNotesEditor.module.css";
import Pressable from "@/components/ui/Pressable";


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
    <Pressable
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
    </Pressable>
  );
}

/** 설명 body 펼침/접힘 래퍼 — 콘텐츠 높이를 측정해 framer 로 실제 px 를 애니메이션.
 *  (framer 의 height:"auto" 는 이 프로젝트에서 트랜지션이 안 먹고, grid 1fr 은 콘텐츠 변경 시
 *   즉시 스냅돼 편집(readonly→input) resize 가 안 되므로 — ResizeObserver 로 높이를 추적.)
 *  animateEnter=false(페이지 로드로 이미 있던 항목)면 첫 측정 반영을 즉시 처리해 로드 시 펼침 flash 방지. */
function CollapsibleBody({ animateEnter, children }: { animateEnter: boolean; children: React.ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);
  const [firstDone, setFirstDone] = useState(false);
  // 콘텐츠 높이를 매 렌더마다 동기 측정 — 편집으로 내용이 바뀌면 즉시 새 높이 반영.
  // (framer 의 height:"auto"/numeric height 는 이 프로젝트에서 mount 후 resize 가 스냅되지만,
  //  grid-template-rows 의 px 값은 tween 되므로 그걸 애니메이션 대상으로 쓴다.)
  // 매 렌더 측정이 의도라 deps 없음.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (el && el.scrollHeight !== h) setH(el.scrollHeight);
  });
  // 첫 측정(0→h)을 duration 0 으로 흘려보내 framer 가 grid-rows motion value 를 만들게 하되(이래야
  // 이후 편집 resize 가 tween 됨) 로드된 항목은 그 첫 반영이 눈에 안 띄게(instant) — 즉, firstDone 이후만 부드럽게.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (h > 0 && !firstDone) setFirstDone(true); }, [h, firstDone]);
  const instantFirst = !animateEnter && !firstDone;
  return (
    <motion.div
      style={{ display: "grid", overflow: "hidden" }}
      initial={{ gridTemplateRows: "0px", opacity: 0 }}
      animate={{ gridTemplateRows: `${h}px`, opacity: 1 }}
      exit={{ gridTemplateRows: "0px", opacity: 0 }}
      transition={{
        gridTemplateRows: { duration: instantFirst ? 0 : 0.26, ease: [0.4, 0, 0.2, 1] },
        opacity: { duration: instantFirst ? 0 : 0.18, ease: "easeOut" },
      }}
    >
      {/* align-self: start — grid 자식이 row 높이로 stretch 되면 scrollHeight 가 늘어난 채 고정돼
          접힐 때(내용이 줄어도) 측정이 안 바뀌는 버그. start 로 두면 항상 내용 높이로 측정됨. */}
      <div ref={innerRef} style={{ minHeight: 0, alignSelf: "start" }}>{children}</div>
    </motion.div>
  );
}

export interface TagNotesEditorProps {
  /** 표시 + 정렬 순서 source (tags / tech 등) */
  items: string[];
  /** 항목별 ko/en 설명 — entry 없는 항목은 undefined */
  notes: Record<string, LocalizedText>;
  /** items 재정렬 / 항목 제거 후 호출 */
  onItemsChange: (next: string[]) => void;
  /** notes 변경 (entry 추가/수정/삭제) 후 호출 */
  onNotesChange: (next: Record<string, LocalizedText>) => void;
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
  /** chip 라벨 커스텀 렌더 — 기본 `${prefix}${item}`. bilingual chip 등에 사용 (WorksCategoriesEditor). */
  renderItemLabel?: (item: string) => React.ReactNode;
  /** drawer 안 추가 슬롯 — 편집 모드 or entry 존재 시 노출. 이름 인라인 편집 등에 사용. */
  renderDrawerExtra?: (item: string, isEditing: boolean) => React.ReactNode;
  /** chip 라벨 body 클릭 핸들러 — 외부 편집 패널 트리거용 (WorksCategoriesEditor). */
  onItemClick?: (item: string) => void;
  /** 편집 / "+ 설명 추가" 버튼 클릭 핸들러 — 외부 편집 패널로 위임.
   *  제공 시 TagNotesEditor 의 내부 drawer 열림 로직 대신 이 콜백만 발화. */
  onEditClick?: (item: string) => void;
  /** 외부 편집 패널에서 현재 active 인 item — 해당 chip 강조 표시 (active class). */
  activeItem?: string | null;
  /** 제공 시 편집 트리거(chip 편집 버튼)를 Popover 로 감싼다 — 편집 UI 를 해당 chip 옆 팝오버로 띄움.
   *  열림 여부는 activeItem === item (= onEditClick 이 설정한 편집 대상) 로 제어된다.
   *  close 로 팝오버를 닫을 수 있다(편집 취소는 caller 가 onEditClick 재호출로 처리). */
  renderEditPopover?: (item: string, close: () => void) => React.ReactNode;
  /** true 면 drag handle (grip) 숨기고 reorder 비활성. 순서가 의미 없는 목록(태그 등) 에 사용. */
  disableReorder?: boolean;
  /** true 면 chip 들을 1열 strict — 정렬 순서가 위→아래 명확. 기본은 auto-fill multi-col. */
  singleColumn?: boolean;
  /** true 면 chip 앞에 정렬 순서 번호 (1-based) 표시 — 2열 grid 에서 정렬 방향 명확화. */
  showIndex?: boolean;
  /** showIndex 시 시작 번호 — pagination 글로벌 idx 보여주려면 pageStart 전달. 기본 0. */
  startIndex?: number;
  /** indexBadge 표시 번호를 캡슐의 정렬 순서가 아닌 임의 번호로 override.
   *  반환 1-based. 카테고리처럼 "사용자 정의 고정 순서"를 표시하고 싶을 때 사용 (정렬·필터에 무관).
   *  undefined 반환 시 기본 `startIndex + idx + 1` 사용. */
  getDisplayIndex?: (item: string, idx: number) => number | undefined;
  /** indexBadge 의 최소 가로 자릿수 (mono ch 단위). 기본 4 — "#999" 까지. 짧은 list 면 2 추천. */
  indexMinChars?: number;
  /** showIndex 시 indexBadge 클릭으로 위치 변경 가능 — caller 가 새 position(1-based) 받아 reorder 처리.
   *  미지정 시 indexBadge 는 read-only display. */
  onIndexChange?: (item: string, newPosition: number) => void;
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
  removeTitle: _removeTitle = "Remove",
  multiLine = false,
  renderItemLabel,
  renderDrawerExtra,
  onItemClick,
  onEditClick,
  activeItem,
  renderEditPopover,
  disableReorder = false,
  singleColumn = false,
  showIndex = false,
  startIndex = 0,
  getDisplayIndex,
  indexMinChars = 5,
  onIndexChange: _onIndexChange,
}: TagNotesEditorProps) {
  const { language } = useLanguage();
  // 최초 마운트 이후 추가되는 설명만 펼침 애니메이션 — 로드로 이미 있던 설명은 조용히 표시(CollapsibleBody).
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);
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
  const normalizeEntry = useCallback((e: LocalizedText) => {
    const ko = e.ko.split("\n");
    const en = e.en.split("\n");
    const len = Math.max(ko.length, en.length);
    const kept: LocalizedText[] = [];
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
  // dropPos 변화에 따라 indicator rect (top + left + width) 계산 — 2열 grid 에서 한 column 만 차지하도록.
  const [indicatorRect, setIndicatorRect] = useState<{ top: number; left: number; width: number } | null>(null);
  useEffect(() => {
    if (dragIdx === null || dropPos === null) { setIndicatorRect(null); return; }
    const targetItem = items[dropPos.idx];
    const groupEl = groupRefs.current.get(targetItem);
    const sectionEl = sectionRef.current;
    if (!groupEl || !sectionEl) { setIndicatorRect(null); return; }
    // no-op 위치 확인
    let effectiveTo = dropPos.idx + (dropPos.side === "bottom" ? 1 : 0);
    if (dragIdx < effectiveTo) effectiveTo -= 1;
    if (effectiveTo === dragIdx) { setIndicatorRect(null); return; }
    const groupRect = groupEl.getBoundingClientRect();
    const sectionRect = sectionEl.getBoundingClientRect();
    // gap 의 정중앙 — top: group 위쪽 gap 중앙, bottom: group 아래쪽 gap 중앙
    const GAP_HALF = 8;
    const top = dropPos.side === "top"
      ? groupRect.top - sectionRect.top - GAP_HALF
      : groupRect.bottom - sectionRect.top + GAP_HALF;
    // 한 chip 너비만큼만 — multi-col grid 에서 indicator 가 한 column 만 차지
    setIndicatorRect({
      top,
      left: groupRect.left - sectionRect.left,
      width: groupRect.width,
    });
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
      className={`${styles.section} ${singleColumn ? styles.sectionSingleCol : ""}`}
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
      {indicatorRect !== null && (
        <div
          className={styles.dropIndicator}
          style={{ top: indicatorRect.top, left: indicatorRect.left, width: indicatorRect.width }}
        />
      )}
      <AnimatePresence initial={false}>
      {items.map((item, idx) => {
        const entry = notes[item];
        const setEntry = (next: LocalizedText | null) => {
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
        const writePairsForItem = (next: LocalizedText[]) => {
          setEntry({ ko: next.map((p) => p.ko).join("\n"), en: next.map((p) => p.en).join("\n") });
        };
        // 편집 트리거를 팝오버로 감싼다(renderEditPopover 제공 시). 열림은 activeItem 로 제어,
        // 닫힘(outside/ESC)은 편집 대상일 때 onEditClick 재호출로 편집 종료.
        const wrapEdit = (btn: React.ReactNode) =>
          renderEditPopover ? (
            <Popover
              open={activeItem === item}
              onOpenChange={(o) => { if (!o && activeItem === item) onEditClick?.(item); }}
              placement="bottom-end"
              trigger={btn}
              contentClassName={styles.editPopover}
            >
              {({ close }) => renderEditPopover(item, close)}
            </Popover>
          ) : btn;
        // entry 있는 chip 의 편집/취소 토글 (capsuleGroup 안 or 팝오버 트리거).
        const entryEditToggle = wrapEdit(
          <GroupToggleButton
            /* 팝오버 편집이면 트리거는 계속 '편집' 유지 (취소 중복 방지) */
            state={renderEditPopover ? "edit" : ((editingItem === item || activeItem === item) ? "cancel" : "edit")}
            addLabel={addLabel}
            cancelLabel={cancelLabel}
            editLabel={editLabel}
            onClick={() => {
              if (onEditClick) {
                onEditClick(item);
                return;
              }
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
        );
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
              draggable={!disableReorder}
              // mousedown 위치 기반 drag 가능 여부 결정 — button/input/textarea/label/select 영역은
              // drag 비활성화 (click/edit 보존), 그 외 (grip / 텍스트 / 빈 공간) 는 즉시 drag 가능
              onMouseDown={disableReorder ? undefined : (e) => {
                const target = e.target as HTMLElement;
                const isInteractive = !!target.closest("button, a, input, textarea, select, [contenteditable]");
                (e.currentTarget as HTMLElement).setAttribute("draggable", isInteractive ? "false" : "true");
              }}
              // mouseup 시 draggable=true 복원 — cursor 표시 (grab) 가 idle 상태에서 정확히 보임
              onMouseUp={disableReorder ? undefined : (e) => {
                (e.currentTarget as HTMLElement).setAttribute("draggable", "true");
              }}
              onDragStart={disableReorder ? undefined : () => setDragIdx(idx)}
              onDragOver={disableReorder ? undefined : (e) => {
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
              onDrop={disableReorder ? undefined : (e) => { e.preventDefault(); handleDrop(idx); }}
              onDragEnd={disableReorder ? undefined : (e) => {
                // drop 이 안 잡혔으면 (cursor 가 section 밖에서 release) fallback 으로 보정
                if (!droppedRef.current) handleDrop(idx);
                droppedRef.current = false;
                (e.currentTarget as HTMLElement).setAttribute("draggable", "true");
                resetDrag();
              }}
            >
            <div className={styles.header}>
              <span className={styles.tagGroup}>
                {!disableReorder && (
                  <span className={styles.grip} aria-hidden title="드래그로 순서 변경" data-cursor="grab">
                    <GripVertical size={12} strokeWidth={2} />
                  </span>
                )}
                {showIndex && (() => {
                  const override = getDisplayIndex?.(item, idx);
                  const displayNum = override ?? startIndex + idx + 1;
                  return (
                    <span className={styles.indexBadge} aria-hidden style={{ minWidth: `${indexMinChars}ch` }}>
                      #{displayNum}
                    </span>
                  );
                })()}
                <Chip
                  variant="bare"
                  active={activeItem === item}
                  onClick={onItemClick ? () => onItemClick(item) : undefined}
                  onRemove={removeItem}
                  className={styles.chipSlot}
                >
                  <span data-tag-item={item}>{renderItemLabel ? renderItemLabel(item) : `${prefix}${item}`}</span>
                </Chip>
              </span>
              {!entry ? (
                /* 신규 entry — 단일 + 설명 추가 / 외부 편집 중이면 취소 표시 */
                wrapEdit(
                  <GroupToggleButton
                    /* 팝오버 편집이면 트리거는 계속 add(+편집) 유지 — 팝오버가 자체 취소/저장을 가지므로
                       트리거까지 '취소'로 바뀌면 취소 버튼이 두 개로 겹쳐 보인다. */
                    state={renderEditPopover ? "add" : (activeItem === item ? "cancel" : "add")}
                    addLabel={addLabel}
                    cancelLabel={cancelLabel}
                    editLabel={editLabel}
                    onClick={() => {
                      if (onEditClick) {
                        onEditClick(item);
                        return;
                      }
                      // entry + editing 을 같은 렌더에 — body 가 처음부터 input 상태로 mount 돼야
                      // framer 가 최종 height 를 재서 0→full 로 펼침 애니메이션이 제대로 동작한다.
                      setEntry({ ko: "", en: "" });
                      setEditMode("all");
                      setEditingItem(item);
                      focusLastPairInput(item);
                    }}
                  />
                )
              ) : (
                <div className={styles.headerActions}>
                  {/* + 설명 추가 — 편집 모드(editingItem===item)일 때만, 편집 버튼 왼쪽.
                      나타남/사라짐은 width 0↔auto + opacity 로 슬라이드. */}
                  <AnimatePresence initial={false}>
                    {multiLine && editingItem === item && (
                      <motion.button
                        type="button"
                        className={styles.standaloneAddBtn}
                        data-cursor="big"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                        style={{ overflow: "hidden", whiteSpace: "nowrap", flexShrink: 0 }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEntry({
                            ko: entry.ko + "\n",
                            en: entry.en + "\n",
                          });
                          focusLastPairInput(item);
                        }}
                      >
                        <Plus size={10} strokeWidth={2.5} />
                        {addLabel}
                      </motion.button>
                    )}
                  </AnimatePresence>
                  {/* 편집/취소 + 일괄삭제 capsule group.
                      팝오버 편집(renderEditPopover) 이면 capsuleGroup 로 감싸지 않는다 — Popover 의 trigger
                      span 이 끼면 `.capsuleGroup > *` 의 border 제거가 span 에만 걸려 안쪽 toggleBtn 자체
                      테두리가 살아 '버튼 뒤에 버튼'처럼 캡슐이 이중으로 보인다. (이 경우 multiLine=false 라
                      일괄삭제 버튼도 없어 capsuleGroup 자체가 불필요하다.) */}
                  {renderEditPopover ? (
                    entryEditToggle
                  ) : (
                    <div className={styles.capsuleGroup} data-cursor="big">
                      {multiLine && editingItem === item && selectedIdxs.size > 0 && (
                        <Pressable
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
                        </Pressable>
                      )}
                      {entryEditToggle}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* drawer extra slot — 편집 모드 or entry 존재 시 노출 (이름 인라인 편집 등) */}
            {renderDrawerExtra && (entry || editingItem === item) && (
              <div className={styles.drawerExtra}>
                {renderDrawerExtra(item, editingItem === item)}
              </div>
            )}
            {/* readonly + editing body — 통합 ul (li 단위로 input/readonly swap, 깜빡임 방지).
                설명 좌측 여백은 grip 까지만 맞추고 indexBadge 폭은 제외(너무 벌어져서) → 번호 아래쯤에서 시작. */}
            <AnimatePresence initial={false}>
              {entry && (
                <CollapsibleBody key="body" animateEnter={mounted}>
                  <ul
                    className={styles.readonly}
                    style={{
                      paddingLeft: !disableReorder
                        ? "calc(14px + var(--spacing-2xs))"
                        : "var(--spacing-2xs)",
                    }}
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
                    const writePairs = (next: LocalizedText[]) => {
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
                                /* 28px row leading 요소 (체크박스/grip) 와 alignment 위해 sm 유지 */
                                size="sm"
                              />
                            ) : (() => {
                              const koText = pair.ko.trim();
                              const enText = pair.en.trim();
                              /* 현재 언어 우선 — 비어있으면 다른 언어로 fallback. 한 줄만 노출이므로 lang badge 불필요. */
                              const text = language === "ko" ? (koText || enText) : (enText || koText);
                              if (!text) return null;
                              return (
                                <div className={styles.readonlyInlineGroup}>
                                  <div className={styles.readonlyLine}>
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
                                    <span className={styles.readonlyText}>{text}</span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </li>
                      );
                    });
                  })()}
                  </ul>
                </CollapsibleBody>
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
