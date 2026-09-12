"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { getTableGridAbove } from "@platejs/table";
import { someList, someTodoList } from "@platejs/list";
import type { PlateEditor } from "platejs/react";
import type { Descendant, SlateEditor, TElement } from "platejs";
import { findAncestorOfType, findCurrentCell, nodeAtPath } from "./utils";
import { LINE_HEIGHT_PRESETS, ZEBRA_COLOR_DEFAULT } from "./constants";

function isElement(node: Descendant): node is TElement {
  return "children" in node && Array.isArray((node as TElement).children);
}

// ── useOutsideClick ──
function useOutsideClick(
  ref: React.RefObject<HTMLElement | null>,
  active: boolean,
  onOutside: () => void,
) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, active, onOutside]);
}

// ── readEditorMarks: 현재 커서/선택 위치의 마크 정보 ──
function readEditorMarks(editor: SlateEditor) {
  let marks: Record<string, unknown> = {};
  try {
    if (editor.selection) {
      const leafEntry = editor.api.leaf(editor.selection.focus);
      if (leafEntry) {
        const { text: _t, ...leafMarks } = leafEntry[0] as Record<string, unknown>;
        marks = leafMarks;
      }
      // editor.marks 는 Plate 의 pending mark cache — public 타입엔 직접 노출되지 않아 cast
      const pending = (editor as unknown as { marks?: Record<string, unknown> }).marks ?? null;
      if (pending) marks = { ...marks, ...pending };
    }
  } catch { /* selection 일시 무효 */ }

  const hasMark = (key: string) => {
    try { return editor.api.hasMark(key); } catch { return false; }
  };

  const color = (marks.color as string) ?? "";
  const bgColor = (marks.backgroundColor as string) ?? "";
  const fontFamily = (marks.fontFamily as string) ?? "";
  const fontSize = (marks.fontSize as string) || "";
  const letterSpacing = (marks.letterSpacing as string) || "";

  return { marks, hasMark, color, bgColor, fontFamily, fontSize, letterSpacing };
}

// ── readBlockInfo: 현재 블록 타입, align, lineHeight 등 ──
export function readBlockInfo(editor: SlateEditor) {
  type BlockNode = { type?: string; align?: string; lineHeight?: string; listStyleType?: string };
  type EditorBlockApi = {
    block?: () => [BlockNode, unknown] | undefined;
    above?: (opts: { match: { type: string } }) => unknown;
  };
  const api = editor.api as unknown as EditorBlockApi;

  let block: [BlockNode, unknown] | undefined;
  try { block = api.block?.(); } catch { /* ignore */ }

  let blockType = block?.[0]?.type ?? "p";
  const align = (block?.[0]?.align as string) ?? "left";
  const lineHeight = block?.[0]?.lineHeight as string | undefined;

  // 래퍼 블록 감지 (blockquote, code_block 등)
  if (blockType === "p" || blockType === "code_line") {
    try {
      const wrapperTypes = ["blockquote", "code_block", "table"];
      for (const wt of wrapperTypes) {
        const above = api.above?.({ match: { type: wt } });
        if (above) { blockType = wt; break; }
      }
    } catch { /* ignore */ }
  }

  return { block, blockType, align, lineHeight };
}

// ── readComputedStyle: DOM computed style에서 현재값 읽기 ──
function readComputedStyle(): CSSStyleDeclaration | null {
  try {
    const sel = window.getSelection();
    if (!sel || !sel.focusNode) return null;
    const el = sel.focusNode.nodeType === Node.TEXT_NODE ? sel.focusNode.parentElement : sel.focusNode as Element;
    if (!el) return null;
    return window.getComputedStyle(el);
  } catch { return null; }
}

// ── 계산된 스타일에서 글자 크기(px)·줄 간격(프리셋에 맞춘 비율) 읽기 ──
function computedFontSize(computed: CSSStyleDeclaration | null): string {
  return computed ? `${Math.round(parseFloat(computed.fontSize))}px` : "";
}

function computedLineHeight(computed: CSSStyleDeclaration | null): string {
  if (!computed) return "";
  const ratio = parseFloat(computed.lineHeight) / parseFloat(computed.fontSize);
  if (isNaN(ratio)) return "";
  let closest = LINE_HEIGHT_PRESETS[0];
  let minDiff = Math.abs(ratio - parseFloat(closest));
  for (const p of LINE_HEIGHT_PRESETS) {
    const diff = Math.abs(ratio - parseFloat(p));
    if (diff < minDiff) { closest = p; minDiff = diff; }
  }
  // 프리셋에 근접하면 프리셋으로 스냅, 아니면(제목 1.25 등 프리셋에 없는 값) 실제 비율을
  // 소수 둘째자리로 반올림해 그대로 표시 — 이전엔 "" 를 반환해 제목(1.25 등) 줄간격이 감지 안 되던 문제.
  return minDiff < 0.05 ? closest : String(Math.round(ratio * 100) / 100);
}

// ── readToolbarState: 본문 도구 막대가 보여 주는 상태 ──
const TOOLBAR_MARKS = ["bold", "italic", "underline", "strikethrough", "code", "kbd", "superscript", "subscript", "highlight"] as const;
export type ToolbarMark = (typeof TOOLBAR_MARKS)[number];

/**
 * 도구 막대가 보여 주는 편집기 상태(#877). 편집기가 바뀔 때마다 읽되 원시값만 담아, 얕은 비교로 같으면
 * 도구 막대를 다시 그리지 않는다. 예전에는 편집기 변경마다 올라가는 tick 을 받아 한 글자에 막대 전체를 다시 그렸다.
 */
export function readToolbarState(editor: PlateEditor) {
  const { hasMark, color, bgColor, fontFamily, fontSize, letterSpacing } = readEditorMarks(editor);
  const { blockType, align, lineHeight } = readBlockInfo(editor);
  const marks = Object.fromEntries(TOOLBAR_MARKS.map((m) => [m, hasMark(m)])) as Record<ToolbarMark, boolean>;

  let isUL = false, isOL = false, isTodo = false;
  try { isUL = someList(editor, "disc"); } catch { /* ignore */ }
  try { isOL = someList(editor, "decimal"); } catch { /* ignore */ }
  try { isTodo = someTodoList(editor); } catch { /* ignore */ }

  return {
    ...marks,
    color,
    bgColor,
    letterSpacing,
    // 마크·블록에 적힌 값만 둔다. 비어 있으면 도구 막대가 커밋 뒤 DOM 에서 읽은 값(TextStyleStore)으로 채운다
    markFontFamily: fontFamily,
    markFontSize: fontSize,
    // setLineHeight 가 숫자를 저장해 노드 lineHeight 가 런타임엔 number(예: 1.6)일 수 있어 문자열로 맞춘다
    blockLineHeight: lineHeight ? String(lineHeight) : "",
    blockType,
    align,
    isUL,
    isOL,
    isTodo,
    canUndo: (editor.history?.undos?.length ?? 0) > 0,
    canRedo: (editor.history?.redos?.length ?? 0) > 0,
  };
}

// ── 커서 자리의 계산된 글자 스타일 — 편집기 변경이 DOM 에 반영된 뒤 읽는다 ──
/** 마크·블록에 값이 없을 때 도구 막대가 보여 줄 실제 글꼴·크기·줄 간격(DOM 의 계산된 스타일) */
export interface TextStyleFromDom {
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
}

function readTextStyleFromDom(): TextStyleFromDom {
  const computed = readComputedStyle();
  return { fontFamily: computed?.fontFamily ?? "", fontSize: computedFontSize(computed), lineHeight: computedLineHeight(computed) };
}

/**
 * 커서 자리의 계산된 글자 스타일을 들고, 값이 바뀔 때만 알리는 저장소(#895).
 *
 * readToolbarState 는 편집기가 바뀐 순간(Slate onChange)에 불려, 그때 DOM 을 읽으면 React 가 바뀐 블록을 다시 그리기 전이라
 * 이전 블록의 스타일이 나왔다(막대로 H1 을 눌러도 글자 크기 칸이 문단 값). 본문 편집기가 커밋 뒤 layout effect 에서
 * refresh() 를 부르고, 도구 막대는 useSyncExternalStore 로 받는다.
 */
export function createTextStyleStore(read: () => TextStyleFromDom = readTextStyleFromDom) {
  let snapshot: TextStyleFromDom = { fontFamily: "", fontSize: "", lineHeight: "" };
  const listeners = new Set<() => void>();
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getSnapshot: () => snapshot,
    /** DOM 을 다시 읽어, 달라졌으면 새 객체로 바꾸고 알린다. 같으면 객체를 그대로 둬 다시 그리지 않게 한다 */
    refresh() {
      const next = read();
      if (next.fontFamily === snapshot.fontFamily && next.fontSize === snapshot.fontSize && next.lineHeight === snapshot.lineHeight) return;
      snapshot = next;
      listeners.forEach((listener) => listener());
    },
  };
}
export type TextStyleStore = ReturnType<typeof createTextStyleStore>;

// ── useTableInfo: 현재 커서의 테이블/셀 정보 ──
export function useTableInfo(editor: SlateEditor, isInTable: boolean) {
  const currentCell = (() => {
    if (!isInTable) return null;
    return findCurrentCell(editor);
  })();

  const currentTableInfo = (() => {
    if (!isInTable) return null;
    return findAncestorOfType(editor, "table");
  })();

  const cellBg = (currentCell?.background as string) ?? "";
  const cellVAlign = (currentCell?.verticalAlign as string) ?? "";
  const tableCaption = (currentTableInfo?.node?.caption as string) ?? "";

  // Zebra state
  const { isZebraActive, currentZebraColor } = (() => {
    if (!currentTableInfo) return { isZebraActive: false, currentZebraColor: null as string | null };
    const secondRow = currentTableInfo.node.children?.[1];
    if (!secondRow || !isElement(secondRow)) return { isZebraActive: false, currentZebraColor: null };
    const bgCell = secondRow.children.find((c): c is TElement => isElement(c) && !!c.background);
    const bg = (bgCell?.background as string | undefined) ?? null;
    return { isZebraActive: !!bg, currentZebraColor: bg };
  })();

  return {
    currentCell, currentTableInfo,
    cellBg, cellVAlign, tableCaption,
    isZebraActive, currentZebraColor,
  };
}

// ── useBorderPopover: 테두리 팝오버 상태 + 셀 캡처 로직 ──
type CellBorderSide = { style?: string; width?: string; color?: string } | null;
type CellBorders = { top?: CellBorderSide; right?: CellBorderSide; bottom?: CellBorderSide; left?: CellBorderSide };
export type BorderMode = "all" | "none" | "outer" | "inner" | "innerH" | "innerV" | "top" | "bottom" | "left" | "right";

export function useBorderPopover(
  editor: SlateEditor,
  savedSelectionRef: React.RefObject<SlateEditor["selection"]>,
) {
  const [open, setOpen] = useState(false);
  const [style, setStyleRaw] = useState("solid");
  const [width, setWidthRaw] = useState("1px");
  const [color, setColorRaw] = useState("var(--border-color-light)");
  const [selectedPosition, setSelectedPositionState] = useState<BorderMode | null>(null);
  // 선택된 위치의 현재 값이 셀마다 다르면 true → UI 에서 "다중" 표시
  const [mixed, setMixed] = useState<{ style: boolean; width: boolean; color: boolean }>({
    style: false, width: false, color: false,
  });
  const popRef = useRef<HTMLDivElement>(null);
  const cellEntriesRef = useRef<[Record<string, unknown>, number[]][]>([]);
  const [selectionSpan, setSelectionSpan] = useState<{ rows: number; cols: number }>({ rows: 0, cols: 0 });

  useOutsideClick(popRef, open, useCallback(() => setOpen(false), []));

  // td/th 셀 predicate — Plate 의 NodeMatch generic 경계를 dynamic 으로 통과시키기 위해 unknown→any bridge
  const isCell = useCallback((n: unknown) => {
    const node = n as { type?: string };
    return node.type === "td" || node.type === "th";
  }, []);

  const captureCells = useCallback(() => {
    if (!editor) return;
    const updateSpan = (entries: [Record<string, unknown>, number[]][]) => {
      if (entries.length === 0) { setSelectionSpan({ rows: 0, cols: 0 }); return; }
      let minR = Infinity, maxR = -1, minC = Infinity, maxC = -1;
      for (const [, p] of entries) {
        const r = p[p.length - 2], c = p[p.length - 1];
        if (r < minR) minR = r; if (r > maxR) maxR = r;
        if (c < minC) minC = c; if (c > maxC) maxC = c;
      }
      setSelectionSpan({ rows: maxR - minR + 1, cols: maxC - minC + 1 });
    };
    try {
      const grid = getTableGridAbove(editor, { format: "cell" });
      if (grid && grid.length > 0) {
        const entries = grid.map(([node, path]: [unknown, number[]]) => [node as Record<string, unknown>, [...path]]) as [Record<string, unknown>, number[]][];
        cellEntriesRef.current = entries;
        updateSpan(entries);
        return;
      }
    } catch { /* fallback */ }
    const sel = editor.selection;
    if (!sel) return;
    const entries = Array.from(editor.api.nodes({ at: sel, match: isCell })) as [Record<string, unknown>, number[]][];
    if (entries.length > 0) { cellEntriesRef.current = entries; updateSpan(entries); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cellAbove = editor.api.above({ match: isCell as any });
    if (cellAbove) {
      const single = [cellAbove as [Record<string, unknown>, number[]]];
      cellEntriesRef.current = single;
      updateSpan(single);
    }
  }, [editor, isCell]);

  const applyBorders = useCallback((mode: BorderMode, override?: { style?: string; width?: string; color?: string }) => {
    if (!editor) return;
    const bStyle = override?.style ?? style;
    const bWidth = override?.width ?? width;
    const bColor = override?.color ?? color;

    // 1) 캡처된 path에서 최신 노드 읽기
    let freshEntries: [Record<string, unknown>, number[]][] = [];
    for (const [, path] of cellEntriesRef.current) {
      const node = nodeAtPath(editor, path);
      if (node && (node.type === "td" || node.type === "th")) {
        freshEntries.push([node as Record<string, unknown>, path]);
      }
    }

    // 2) 캡처 실패 시 selection 복원
    if (!freshEntries.length) {
      const sel = savedSelectionRef.current ?? editor.selection;
      if (!sel) return;
      freshEntries = Array.from(editor.api.nodes({ at: sel, match: isCell })) as [Record<string, unknown>, number[]][];
    }
    if (!freshEntries.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cellAbove = editor.api.above({ match: isCell as any });
      if (cellAbove) freshEntries = [cellAbove as [Record<string, unknown>, number[]]];
    }
    if (!freshEntries.length) return;

    const sideVal: CellBorderSide = bStyle === "none" ? null : { style: bStyle, width: bWidth, color: bColor };
    const clearVal: CellBorderSide = null;

    let minRow = Infinity, maxRow = -1, minCol = Infinity, maxCol = -1;
    for (const [, path] of freshEntries) {
      const r = path[path.length - 2];
      const c = path[path.length - 1];
      if (r < minRow) minRow = r;
      if (r > maxRow) maxRow = r;
      if (c < minCol) minCol = c;
      if (c > maxCol) maxCol = c;
    }

    for (const [node, path] of freshEntries) {
      const r = path[path.length - 2];
      const c = path[path.length - 1];
      const atTop = r === minRow;
      const atBottom = r === maxRow;
      const atLeft = c === minCol;
      const atRight = c === maxCol;
      const existing = ((node as Record<string, unknown>).cellBorders as CellBorders) || {};

      let result: CellBorders;
      switch (mode) {
        case "all":
          result = { top: sideVal, left: sideVal, bottom: clearVal, right: clearVal };
          if (atBottom) result.bottom = sideVal;
          if (atRight) result.right = sideVal;
          break;
        case "none":
          result = { top: undefined, right: undefined, bottom: undefined, left: undefined };
          break;
        case "outer":
          result = {
            top: atTop ? sideVal : existing.top,
            bottom: atBottom ? sideVal : existing.bottom,
            left: atLeft ? sideVal : existing.left,
            right: atRight ? sideVal : existing.right,
          };
          break;
        case "inner":
          result = { ...existing, top: atTop ? existing.top : sideVal, left: atLeft ? existing.left : sideVal };
          break;
        case "innerH":
          result = { ...existing, top: atTop ? existing.top : sideVal };
          break;
        case "innerV":
          result = { ...existing, left: atLeft ? existing.left : sideVal };
          break;
        case "top":
          result = { ...existing, top: sideVal };
          break;
        case "bottom":
          result = { ...existing, bottom: atBottom ? sideVal : existing.bottom };
          break;
        case "left":
          result = { ...existing, left: sideVal };
          break;
        case "right":
          result = { ...existing, right: atRight ? sideVal : existing.right };
          break;
        default:
          result = existing;
      }
      // cellBorders 는 plugin 정의 dynamic field — Plate setNodes generic 우회 cast 필요
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.tf.setNodes({ cellBorders: result } as any, { at: path, match: isCell });
    }

    // 인접 셀 면 제거
    const needsClear = mode === "outer" || mode === "all" || mode === "top" || mode === "bottom" || mode === "left" || mode === "right";
    if (needsClear) {
      const tablePath = freshEntries[0][1].slice(0, -2);
      const selectedSet = new Set(freshEntries.map(([, p]) => p.join(",")));
      const allCellEntries = Array.from(editor.api.nodes({ at: tablePath, match: isCell })) as [Record<string, unknown>, number[]][];
      const cellMap = new Map<string, [Record<string, unknown>, number[]]>();
      for (const entry of allCellEntries) {
        const p = entry[1];
        cellMap.set(`${p[p.length - 2]},${p[p.length - 1]}`, entry);
      }
      const adjSides = new Map<string, Set<keyof CellBorders>>();
      for (const [, path] of freshEntries) {
        const r = path[path.length - 2];
        const c = path[path.length - 1];
        const add = (ar: number, ac: number, side: keyof CellBorders) => {
          const k = `${ar},${ac}`;
          if (selectedSet.has([...tablePath, ar, ac].join(","))) return;
          if (!cellMap.has(k)) return;
          if (!adjSides.has(k)) adjSides.set(k, new Set());
          adjSides.get(k)!.add(side);
        };
        if (r === minRow && (mode === "outer" || mode === "all" || mode === "top")) add(r - 1, c, "bottom");
        if (r === maxRow && (mode === "outer" || mode === "all" || mode === "bottom")) add(r + 1, c, "top");
        if (c === minCol && (mode === "outer" || mode === "all" || mode === "left")) add(r, c - 1, "right");
        if (c === maxCol && (mode === "outer" || mode === "all" || mode === "right")) add(r, c + 1, "left");
      }
      for (const [rc, sides] of adjSides) {
        const entry = cellMap.get(rc);
        if (!entry) continue;
        const [adjNode, adjPath] = entry;
        const cur = (adjNode.cellBorders as CellBorders) || {};
        const updated: CellBorders = { ...cur };
        for (const s of sides) updated[s] = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (editor as any).apply({ type: "set_node", path: adjPath, properties: { cellBorders: cur }, newProperties: { cellBorders: updated } });
      }
    }
  }, [editor, style, width, color, savedSelectionRef, isCell]);

  // 선택된 position 의 현재 셀 borders 를 읽어 style/width/color state 와 mixed flag 갱신
  const readBordersForPosition = useCallback((mode: BorderMode) => {
    let entries: [Record<string, unknown>, number[]][] = [];
    for (const [, path] of cellEntriesRef.current) {
      const node = nodeAtPath(editor, path);
      if (node && (node.type === "td" || node.type === "th")) entries.push([node as Record<string, unknown>, path]);
    }
    if (!entries.length) {
      const sel = savedSelectionRef.current ?? editor.selection;
      if (sel) entries = Array.from(editor.api.nodes({ at: sel, match: isCell })) as [Record<string, unknown>, number[]][];
    }
    if (!entries.length) return { samples: [], mixedStyle: false, mixedWidth: false, mixedColor: false };

    // mode 별로 어떤 셀의 어떤 side 를 보는지 결정
    let minRow = Infinity, maxRow = -1, minCol = Infinity, maxCol = -1;
    for (const [, path] of entries) {
      const r = path[path.length - 2], c = path[path.length - 1];
      if (r < minRow) minRow = r; if (r > maxRow) maxRow = r;
      if (c < minCol) minCol = c; if (c > maxCol) maxCol = c;
    }
    const sides: { side: keyof CellBorders; node: Record<string, unknown> }[] = [];
    for (const [node, path] of entries) {
      const r = path[path.length - 2], c = path[path.length - 1];
      const collect = (s: keyof CellBorders) => sides.push({ side: s, node });
      switch (mode) {
        case "all": (["top", "right", "bottom", "left"] as const).forEach(collect); break;
        case "outer":
          if (r === minRow) collect("top");
          if (r === maxRow) collect("bottom");
          if (c === minCol) collect("left");
          if (c === maxCol) collect("right");
          break;
        case "inner":
          if (r !== minRow) collect("top");
          if (c !== minCol) collect("left");
          break;
        case "innerH": if (r !== minRow) collect("top"); break;
        case "innerV": if (c !== minCol) collect("left"); break;
        case "top": if (r === minRow) collect("top"); break;
        case "bottom": if (r === maxRow) collect("bottom"); break;
        case "left": if (c === minCol) collect("left"); break;
        case "right": if (c === maxCol) collect("right"); break;
      }
    }
    const samples = sides.map(({ side, node }) => {
      const cb = ((node.cellBorders as CellBorders) || {})[side] as CellBorderSide;
      return cb;
    });
    const definedSamples = samples.filter((s): s is { style: string; width: string; color: string } => s != null);
    if (definedSamples.length === 0) return { samples, mixedStyle: false, mixedWidth: false, mixedColor: false };
    const styles = new Set(definedSamples.map((s) => s.style));
    const widths = new Set(definedSamples.map((s) => s.width));
    const colors = new Set(definedSamples.map((s) => s.color));
    return {
      samples,
      mixedStyle: styles.size > 1,
      mixedWidth: widths.size > 1,
      mixedColor: colors.size > 1,
      first: definedSamples[0],
    };
  }, [editor, isCell, savedSelectionRef]);

  // position 선택 — 셀 borders 읽어서 dropdown 초기값으로 (mixed 면 flag set)
  const setSelectedPosition = useCallback((pos: BorderMode | null) => {
    setSelectedPositionState(pos);
    if (pos === null) {
      setMixed({ style: false, width: false, color: false });
      return;
    }
    const info = readBordersForPosition(pos);
    setMixed({ style: info.mixedStyle, width: info.mixedWidth, color: info.mixedColor });
    if (info.first) {
      if (!info.mixedStyle) setStyleRaw(info.first.style);
      if (!info.mixedWidth) setWidthRaw(info.first.width);
      if (!info.mixedColor) setColorRaw(info.first.color);
    }
  }, [readBordersForPosition]);

  // setter wrappers — 선택된 position 있으면 변경 즉시 apply
  const setStyle = useCallback((v: string) => {
    setStyleRaw(v);
    setMixed((m) => ({ ...m, style: false }));
    if (selectedPosition) applyBorders(selectedPosition, { style: v });
  }, [selectedPosition]); // eslint-disable-line react-hooks/exhaustive-deps
  const setWidth = useCallback((v: string) => {
    setWidthRaw(v);
    setMixed((m) => ({ ...m, width: false }));
    if (selectedPosition) applyBorders(selectedPosition, { width: v });
  }, [selectedPosition]); // eslint-disable-line react-hooks/exhaustive-deps
  const setColor = useCallback((v: string) => {
    setColorRaw(v);
    setMixed((m) => ({ ...m, color: false }));
    if (selectedPosition) applyBorders(selectedPosition, { color: v });
  }, [selectedPosition]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    open, setOpen, style, setStyle, width, setWidth, color, setColor,
    selectedPosition, setSelectedPosition, mixed, selectionSpan,
    popRef, captureCells, applyBorders,
  };
}

// ── useTableActions: 줄무늬, 서식 초기화 등 테이블 관련 콜백 ──
export function useTableActions(editor: SlateEditor) {
  const toggleZebraStripe = useCallback((customColor?: string) => {
    const info = findAncestorOfType(editor, "table");
    if (!info) return;
    const { node: tableNode, path: tablePath } = info;

    let isZebra = false;
    if (!customColor && tableNode.children?.[1]) {
      const secondRow = tableNode.children[1];
      if (isElement(secondRow)) {
        secondRow.children.forEach((cell) => {
          if (isElement(cell) && cell.background) isZebra = true;
        });
      }
    }
    const zebraColor = customColor || ZEBRA_COLOR_DEFAULT;
    tableNode.children?.forEach((rowNode, rowIndex) => {
      if (!isElement(rowNode)) return;
      const targetColor = (!customColor && isZebra) ? null : (rowIndex % 2 === 1 ? zebraColor : null);
      rowNode.children.forEach((cellNode, cellIndex) => {
        if (isElement(cellNode) && (cellNode.type === "td" || cellNode.type === "th")) {
          editor.tf.setNodes({ background: targetColor }, { at: [...tablePath, rowIndex, cellIndex] });
        }
      });
    });
  }, [editor]);

  const reapplyZebraIfActive = useCallback(() => {
    const info = findAncestorOfType(editor, "table");
    if (!info) return;
    const { node: tableNode, path: tablePath } = info;
    const secondRow = tableNode.children?.[1];
    if (!secondRow || !isElement(secondRow)) return;
    const bgCell = secondRow.children.find((c): c is TElement => isElement(c) && !!c.background);
    const zebraColor = bgCell?.background as string | undefined;
    if (!zebraColor) return;
    tableNode.children?.forEach((rowNode, rowIndex) => {
      if (!isElement(rowNode)) return;
      const targetColor = rowIndex % 2 === 1 ? zebraColor : null;
      rowNode.children.forEach((cellNode, cellIndex) => {
        if (isElement(cellNode) && (cellNode.type === "td" || cellNode.type === "th")) {
          editor.tf.setNodes({ background: targetColor }, { at: [...tablePath, rowIndex, cellIndex] });
        }
      });
    });
  }, [editor]);

  const resetTableFormat = useCallback(() => {
    const info = findAncestorOfType(editor, "table");
    if (!info) return;
    const { node: tableNode, path: tablePath } = info;
    tableNode.children?.forEach((rowNode, rowIndex) => {
      if (!isElement(rowNode)) return;
      rowNode.children.forEach((cellNode, cellIndex) => {
        if (isElement(cellNode) && (cellNode.type === "td" || cellNode.type === "th")) {
          editor.tf.setNodes(
            { background: null, colwidth: null, verticalAlign: null, cellBorders: null },
            { at: [...tablePath, rowIndex, cellIndex] },
          );
        }
      });
    });
    editor.tf.setNodes(
      { borderColor: null, borderStyle: null, borderWidth: null },
      { at: tablePath },
    );
  }, [editor]);

  const setCellAttr = useCallback((attr: string, val: unknown) => {
    if (!editor?.selection) return;
    const isCell = (n: unknown) => {
      const node = n as { type?: string };
      return node.type === "td" || node.type === "th";
    };
    editor.tf.setNodes(
      { [attr]: val } as Record<string, unknown>,
      { match: isCell, at: editor.selection },
    );
  }, [editor]);

  return { toggleZebraStripe, reapplyZebraIfActive, resetTableFormat, setCellAttr };
}
