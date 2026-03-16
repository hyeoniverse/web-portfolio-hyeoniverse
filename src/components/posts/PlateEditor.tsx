"use client";

import React, { useState, useCallback, useEffect, useRef, useImperativeHandle } from "react";
import {
  Plate,
  PlateContent,
  usePlateEditor,
} from "platejs/react";
import { setAlign, setLineHeight } from "@platejs/basic-styles";
import {
  insertTable,
  insertTableMergeRow,
  insertTableMergeColumn,
  deleteTable,
  deleteTableMergeRow,
  deleteTableMergeColumn,
  mergeTableCells,
  splitTableCell,
  getTableGridAbove,
} from "@platejs/table";
import { insertImage, insertMediaEmbed } from "@platejs/media";
import { toggleCodeBlock } from "@platejs/code-block";
import { upsertLink, unwrapLink } from "@platejs/link";
import { toggleList, someList, someTodoList } from "@platejs/list";
import { indent, outdent } from "@platejs/indent";
import "katex/dist/katex.min.css";
import { slateToHtml, setWrapLabel, setScrollLabel, type SlateNode } from "./plateSerializer";
import { loadGoogleFont } from "@/lib/loadGoogleFont";
import { useTheme } from "@/providers/ThemeProvider";
import { useLanguage } from "@/providers/LanguageProvider";
// useModalStore no longer needed — link/embed inline
import Tooltip from "@/components/ui/Tooltip";
import styles from "./RichTextEditor.module.css";

// ── plate/ submodules ──
import type { PlateEditorProps } from "./plate/types";
export type { EditorImageInfo, PlateEditorHandle } from "./plate/types";
import {
  FONT_GROUPS,
  FONT_FAMILIES_FLAT,
  FONT_SIZE_PRESETS,
  LINE_HEIGHT_PRESETS,
  LETTER_SPACING_PRESETS,
  PRESET_COLORS,
  TABLE_BG_PRESETS,
  TABLE_BORDER_STYLES,
  TABLE_BORDER_WIDTHS,
  TABLE_BORDER_COLORS,
  ZEBRA_COLOR_DEFAULT,
  IMG_ALIGNS,
  IMG_ALIGN_ICONS,
  IMG_FILTERS,
  MATH_TOOLS,
} from "./plate/constants";
import { isInAncestor, getEditorText, _mathSymbolInsert, _mathEditingSet } from "./plate/utils";
import {
  AlignIcon,
  TblRowBefore,
  TblRowAfter,
  TblRowRemove,
  TblColBefore,
  TblColAfter,
  TblColRemove,
  TblMergeCells,
  TblSplitCell,
  TblTrash,
  TblCellColorIcon,
  TblVAlignTop,
  TblVAlignMiddle,
  TblVAlignBottom,
  TblZebra,
  TblResetFormat,
  BorderAll,
  BorderOuter,
  BorderNone,
  BorderTop,
  BorderBottom,
  BorderLeft,
  BorderRight,
  BorderInnerH,
  BorderInnerV,
  BorderInnerAll,
  LockIcon,
  UnlockIcon,
} from "./plate/icons";
import TBtn from "./plate/TBtn";
// modals.tsx no longer used — link/embed now inline
import { plugins } from "./plate/plugins";
import { recomputeTableIndices, fixZeroColSizes } from "./plate/TableElements";

// Re-export ImagePanel for backward compatibility
export { ImagePanel } from "./plate/ImagePanel";

// ── Main component ──
export default function PlateEditor({
  value,
  onChange,
  onImageUpload,
  editorRef,
}: PlateEditorProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  setWrapLabel(`↩ ${t("common.codeWrap")}`);
  setScrollLabel(`↔ ${t("common.codeScroll")}`);
  // modal removed — link/embed inline
  const isInternalUpdate = useRef(false);
  const prevValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const lastSlateValueRef = useRef<SlateNode[] | undefined>(undefined);
  const [, setTick] = useState(0);
  const [isMac, setIsMac] = useState(false);
  useEffect(() => { setIsMac(/Mac|iPhone|iPad/.test(navigator.platform)); }, []);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkInputValue, setLinkInputValue] = useState("");
  const [showEmbedInput, setShowEmbedInput] = useState(false);
  // ── Cell border popover state ──
  const [borderPopoverOpen, setBorderPopoverOpen] = useState(false);
  const [borderPopStyle, setBorderPopStyle] = useState("solid");
  const [borderPopWidth, setBorderPopWidth] = useState("1px");
  const [borderPopColor, setBorderPopColor] = useState("var(--border-light-color)");
  const borderPopRef = useRef<HTMLDivElement>(null);
  const borderCellEntriesRef = useRef<[Record<string, unknown>, number[]][]>([]);
  const [htmlMode, setHtmlMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState("");
  const [embedInputValue, setEmbedInputValue] = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);
  const linkToolbarRef = useRef<HTMLDivElement>(null);
  const embedInputRef = useRef<HTMLInputElement>(null);
  const embedToolbarRef = useRef<HTMLDivElement>(null);
  const kb = (mac: string) => {
    if (isMac) return mac;
    return mac.replace(/⌘/g, "Ctrl+").replace(/⌥/g, "Alt+").replace(/⇧/g, "Shift+");
  };

  // 테두리 팝오버 바깥 클릭 감지
  useEffect(() => {
    if (!borderPopoverOpen) return;
    const handler = (e: MouseEvent) => {
      if (borderPopRef.current && !borderPopRef.current.contains(e.target as Node)) {
        setBorderPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [borderPopoverOpen]);

  // Link/Embed 툴바 바깥 클릭 시 닫기
  useEffect(() => {
    if (!showLinkInput && !showEmbedInput) return;
    const handler = (e: MouseEvent) => {
      if (showLinkInput && linkToolbarRef.current && !linkToolbarRef.current.contains(e.target as Node)) {
        setShowLinkInput(false);
        setLinkInputValue("");
      }
      if (showEmbedInput && embedToolbarRef.current && !embedToolbarRef.current.contains(e.target as Node)) {
        setShowEmbedInput(false);
        setEmbedInputValue("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showLinkInput, showEmbedInput]);

  const editor = usePlateEditor({
    plugins,
    value: value || "<p></p>",
  });

  // void 블록(embed, hr) 전후에 빈 paragraph 보장
  useEffect(() => {
    if (!editor) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orig = (editor as any).normalizeNode;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (editor as any).normalizeNode = (entry: any, options: any) => {
      const [node, path] = entry;
      if (path.length === 1) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const type = (node as any).type;
        if (type === "media_embed" || type === "hr") {
          const idx = path[0];
          if (idx === 0) {
            editor.tf.insertNodes(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              { type: "p", children: [{ text: "" }] } as any,
              { at: [0] },
            );
            return;
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const prev = editor.children[idx - 1] as any;
          if (prev && (prev.type === "media_embed" || prev.type === "hr")) {
            editor.tf.insertNodes(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              { type: "p", children: [{ text: "" }] } as any,
              { at: [idx] },
            );
            return;
          }
          if (idx === editor.children.length - 1) {
            editor.tf.insertNodes(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              { type: "p", children: [{ text: "" }] } as any,
              { at: [idx + 1] },
            );
            return;
          }
        }
      }
      orig(entry, options);
    };
  }, [editor]);

  // 외부에서 value가 바뀔 때(draft 복원, revert 등) 에디터 내용 동기화
  useEffect(() => {
    if (!editor) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      prevValueRef.current = value;
      return;
    }
    if (value === prevValueRef.current) return;
    prevValueRef.current = value;
    try {
      const nodes = editor.api.html.deserialize({ element: value || "<p></p>" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.tf.setValue(nodes as any);
    } catch {
      editor.tf.setValue(value || "<p></p>");
    }
  }, [value, editor]);

  // onChange: Slate JSON → HTML (+ tick for toolbar re-render)
  const handleChange = useCallback(
    ({ value: slateValue }: { value: SlateNode[] }) => {
      setTick((t) => t + 1);
      if (slateValue !== lastSlateValueRef.current) {
        lastSlateValueRef.current = slateValue;
        isInternalUpdate.current = true;
        const html = slateToHtml(slateValue);
        prevValueRef.current = html;
        onChangeRef.current(html);
      }
    },
    [],
  );

  const addImage = useCallback(async () => {
    if (!onImageUpload || !editor) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = await onImageUpload(file);
      insertImage(editor, url);
    };
    input.click();
  }, [editor, onImageUpload]);

  // Selection 저장 (모달 열기 전 호출)
  const savedSelectionRef = useRef<typeof editor.selection>(null);
  const saveSelection = useCallback(() => {
    savedSelectionRef.current = editor.selection ? JSON.parse(JSON.stringify(editor.selection)) : null;
  }, [editor]);
  const restoreSelection = useCallback(() => {
    if (savedSelectionRef.current) {
      editor.tf.select(savedSelectionRef.current);
      editor.tf.focus();
    }
  }, [editor]);

  const doInsertLink = useCallback((rawUrl: string) => {
    if (!editor || !rawUrl) return;
    // https:// 생략 시 자동 추가
    let url = rawUrl;
    if (!/^https?:\/\//i.test(url) && !url.startsWith("mailto:") && !url.startsWith("tel:")) {
      url = `https://${url}`;
    }
    restoreSelection();
    // 선택 텍스트를 미리 캡처 — setTimeout 전에
    const sel = editor.selection;
    let selectedText: string | undefined;
    if (sel && !editor.api.isCollapsed()) {
      selectedText = editor.api.string(sel);
    }
    setTimeout(() => {
      try {
        upsertLink(editor, { url, target: "_blank", text: selectedText });
      } catch {
        editor.tf.insertNodes({
          type: "a",
          url,
          target: "_blank",
          children: [{ text: selectedText || url }],
        });
      }
    }, 0);
  }, [editor, restoreSelection]);

  const doInsertEmbed = useCallback((url: string) => {
    if (!editor || !url) return;
    restoreSelection();
    setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const embedNode = { type: "media_embed", url, children: [{ text: "" }] } as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emptyP = { type: "p", children: [{ text: "" }] } as any;
      try {
        if (!editor.selection) {
          const end = [editor.children.length];
          editor.tf.insertNodes([embedNode, emptyP], { at: end });
          return;
        }
        insertMediaEmbed(editor, { url });
      } catch {
        try {
          editor.tf.insertNodes([embedNode, emptyP]);
        } catch {
          try {
            upsertLink(editor, { url, target: "_blank" });
          } catch {
            editor.tf.insertNodes({
              type: "a", url, target: "_blank",
              children: [{ text: url }],
            });
          }
        }
      }
      // embed 뒤에 빈 paragraph가 없으면 추가
      try {
        if (editor.selection) {
          const path = editor.selection.anchor.path;
          // embed 노드의 루트 path 찾기
          for (let i = 0; i < path.length; i++) {
            const node = editor.api.node([...path.slice(0, i + 1)]);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (node && (node[0] as any).type === "media_embed") {
              const nextPath = [...path.slice(0, i), path[i] + 1];
              const next = editor.api.node(nextPath);
              if (!next) {
                editor.tf.insertNodes(emptyP, { at: nextPath });
              }
              // 커서를 다음 paragraph로 이동
              const targetPath = nextPath;
              editor.tf.select({ anchor: { path: [...targetPath, 0], offset: 0 }, focus: { path: [...targetPath, 0], offset: 0 } });
              break;
            }
          }
        }
      } catch { /* ignore */ }
    }, 0);
  }, [editor, restoreSelection]);


  // 수식 편집 중 심볼 삽입 콜백
  const [mathEditing, setMathEditing] = useState(false);
  _mathEditingSet.current = setMathEditing;

  const doInsertMath = useCallback((latex: string, mode: "inline" | "block") => {
    if (!editor) return;
    restoreSelection();
    if (mode === "inline") {
      editor.tf.insertNodes({
        type: "inline_equation",
        texExpression: latex,
        children: [{ text: "" }],
      });
    } else {
      editor.tf.insertNodes({
        type: "equation",
        texExpression: latex,
        children: [{ text: "" }],
      });
    }
  }, [editor, restoreSelection]);

  // ── Table-level attribute helper ──
  // ── Table cell attribute helpers ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setCellAttr = useCallback((attr: string, val: unknown) => {
    if (!editor?.selection) return;
    editor.tf.setNodes(
      { [attr]: val } as Record<string, unknown>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { match: (n: any) => n.type === "td" || n.type === "th", at: editor.selection },
    );
  }, [editor]);

  /** 팝오버 열 때 선택된 셀들을 캡처 */
  const captureBorderCells = useCallback(() => {
    if (!editor) return;

    // 방법 1: getTableGridAbove — 다중 셀 선택 시 확장된 selection range 기반
    try {
      const grid = getTableGridAbove(editor, { format: "cell" });
      if (grid && grid.length > 0) {
        // grid는 [node, path][] 형태. path만 저장 (노드는 적용 시 다시 읽음)
        borderCellEntriesRef.current = grid.map(([node, path]: [unknown, number[]]) => [node as Record<string, unknown>, [...path]]);
        return;
      }
    } catch { /* fallback */ }

    // 방법 2: editor.selection 에서 직접 셀 찾기
    const sel = editor.selection;
    if (!sel) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isCell = (n: any) => n.type === "td" || n.type === "th";
    const entries = Array.from(editor.api.nodes({ at: sel, match: isCell })) as [Record<string, unknown>, number[]][];
    if (entries.length > 0) {
      borderCellEntriesRef.current = entries;
      return;
    }

    // 방법 3: 커서가 셀 안에 있지만 nodes()로 못 찾는 경우 — above로 현재 셀 하나라도 캡처
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cellAbove = editor.api.above({ match: isCell as any });
    if (cellAbove) {
      borderCellEntriesRef.current = [cellAbove as [Record<string, unknown>, number[]]];
    }
  }, [editor]);

  /** 셀 테두리를 모드별로 위치 인식해서 적용 */
  type CellBorderSide = { style?: string; width?: string; color?: string } | null;
  type CellBorders = { top?: CellBorderSide; right?: CellBorderSide; bottom?: CellBorderSide; left?: CellBorderSide };
  type BorderMode = "all" | "none" | "outer" | "inner" | "innerH" | "innerV" | "top" | "bottom" | "left" | "right";

  const applyCellBorders = useCallback((mode: BorderMode, bStyle: string, bWidth: string, bColor: string) => {
    if (!editor) return;

    // 1) 캡처된 path에서 최신 노드 읽기
    const cellEntries = borderCellEntriesRef.current;
    let freshEntries: [Record<string, unknown>, number[]][] = [];

    if (cellEntries.length > 0) {
      for (const [, path] of cellEntries) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let node: any = { children: editor.children };
          for (const idx of path) {
            node = node?.children?.[idx];
            if (!node) break;
          }
          if (node && (node.type === "td" || node.type === "th")) {
            freshEntries.push([node as Record<string, unknown>, path]);
          }
        } catch { /* skip */ }
      }
    }

    // 2) 캡처 실패 시 selection 복원 후 재시도
    if (!freshEntries.length) {
      const sel = savedSelectionRef.current ?? editor.selection;
      if (!sel) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isCell = (n: any) => n.type === "td" || n.type === "th";
      freshEntries = Array.from(editor.api.nodes({ at: sel, match: isCell })) as [Record<string, unknown>, number[]][];
    }

    // 3) 그래도 없으면 above로 현재 셀 하나라도
    if (!freshEntries.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cellAbove = editor.api.above({ match: (n: any) => n.type === "td" || n.type === "th" });
      if (cellAbove) freshEntries = [cellAbove as [Record<string, unknown>, number[]]];
    }

    if (!freshEntries.length) return;

    const sideVal: CellBorderSide = bStyle === "none" ? null : { style: bStyle, width: bWidth, color: bColor };
    const clearVal: CellBorderSide = null;

    // 선택 영역의 bounding box (path 기반 row/col index)
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
        // ── 전체 덮어쓰기: 4면 모두 새로 지정 ──
        case "all":
          result = { top: sideVal, left: sideVal, bottom: clearVal, right: clearVal };
          if (atBottom) result.bottom = sideVal;
          if (atRight) result.right = sideVal;
          break;
        case "none":
          result = { top: undefined, right: undefined, bottom: undefined, left: undefined };
          break;
        case "outer":
          // 바깥 면만 스타일 적용, 안쪽 면은 기존 유지
          result = {
            top: atTop ? sideVal : existing.top,
            bottom: atBottom ? sideVal : existing.bottom,
            left: atLeft ? sideVal : existing.left,
            right: atRight ? sideVal : existing.right,
          };
          break;
        case "inner":
          // 안쪽선 = top+left만 사용 (bottom/right은 인접 셀의 top/left과 겹침)
          result = {
            ...existing,
            top: atTop ? existing.top : sideVal,
            left: atLeft ? existing.left : sideVal,
          };
          break;

        // ── 부분 수정: 해당 면만 변경, 나머지 기존 유지 ──
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.tf.setNodes({ cellBorders: result } as any, { at: path, match: (n: any) => (n as any).type === "td" || (n as any).type === "th" });
    }

    // ── 인접 셀의 맞닿는 면 제거 ──
    const needsClear = mode === "outer" || mode === "all" || mode === "top" || mode === "bottom" || mode === "left" || mode === "right";
    if (needsClear) {
      const tablePath = freshEntries[0][1].slice(0, -2);
      const selectedSet = new Set(freshEntries.map(([, p]) => p.join(",")));

      // 테이블 내 모든 셀을 가져와서 row,col → [node, path] 맵 생성
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isCell = (n: any) => n.type === "td" || n.type === "th";
      const allCellEntries = Array.from(
        editor.api.nodes({ at: tablePath, match: isCell }),
      ) as [Record<string, unknown>, number[]][];

      const cellMap = new Map<string, [Record<string, unknown>, number[]]>();
      for (const entry of allCellEntries) {
        const p = entry[1];
        const key = `${p[p.length - 2]},${p[p.length - 1]}`;
        cellMap.set(key, entry);
      }

      // 인접 셀별 제거할 면 수집
      const adjSides = new Map<string, Set<keyof CellBorders>>();
      for (const [, path] of freshEntries) {
        const r = path[path.length - 2];
        const c = path[path.length - 1];
        const add = (ar: number, ac: number, side: keyof CellBorders) => {
          const k = `${ar},${ac}`;
          if (selectedSet.has([...tablePath, ar, ac].join(","))) return;
          if (!cellMap.has(k)) return; // 범위 밖
          if (!adjSides.has(k)) adjSides.set(k, new Set());
          adjSides.get(k)!.add(side);
        };
        if (r === minRow && (mode === "outer" || mode === "all" || mode === "top"))
          add(r - 1, c, "bottom");
        if (r === maxRow && (mode === "outer" || mode === "all" || mode === "bottom"))
          add(r + 1, c, "top");
        if (c === minCol && (mode === "outer" || mode === "all" || mode === "left"))
          add(r, c - 1, "right");
        if (c === maxCol && (mode === "outer" || mode === "all" || mode === "right"))
          add(r, c + 1, "left");
      }

      // 인접 셀에 null 적용 — set_node op 직접 적용 (setNodes match/mode 문제 우회)
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
  }, [editor]);



  // Toggle zebra stripe (customColor가 주어지면 해당 색으로, 없으면 기본색 / 해제)
  const toggleZebraStripe = useCallback((customColor?: string) => {
    if (!editor?.selection) return;
    const path = editor.selection.anchor.path;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tableNode: any = null;
    let tablePath: number[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let node: any = { children: editor.children };
    for (let i = 0; i < path.length; i++) {
      if (!node?.children?.[path[i]]) break;
      node = node.children[path[i]];
      if (node.type === "table") {
        tableNode = node;
        tablePath = path.slice(0, i + 1);
        break;
      }
    }
    if (!tableNode) return;

    // customColor가 없으면 토글 모드: 이미 줄무늬면 해제, 아니면 기본색 적용
    let isZebra = false;
    if (!customColor && tableNode.children?.[1]) {
      const secondRow = tableNode.children[1];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      secondRow.children?.forEach((cell: any) => {
        if (cell.background) isZebra = true;
      });
    }

    const zebraColor = customColor || ZEBRA_COLOR_DEFAULT;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tableNode.children?.forEach((rowNode: any, rowIndex: number) => {
      const targetColor = (!customColor && isZebra) ? null : (rowIndex % 2 === 1 ? zebraColor : null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rowNode.children?.forEach((cellNode: any, cellIndex: number) => {
        if (cellNode.type === "td" || cellNode.type === "th") {
          editor.tf.setNodes(
            { background: targetColor },
            { at: [...tablePath, rowIndex, cellIndex] },
          );
        }
      });
    });
  }, [editor, theme]);

  // 줄무늬 활성 상태면 재적용 (행 추가/삭제 후 호출)
  const reapplyZebraIfActive = useCallback(() => {
    if (!editor?.selection) return;
    const path = editor.selection.anchor.path;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tableNode: any = null;
    let tablePath: number[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let node: any = { children: editor.children };
    for (let i = 0; i < path.length; i++) {
      if (!node?.children?.[path[i]]) break;
      node = node.children[path[i]];
      if (node.type === "table") { tableNode = node; tablePath = path.slice(0, i + 1); break; }
    }
    if (!tableNode) return;
    // 두 번째 행에서 줄무늬 색상 감지
    const secondRow = tableNode.children?.[1];
    if (!secondRow) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const zebraColor = secondRow.children?.find((c: any) => !!c.background)?.background;
    if (!zebraColor) return; // 줄무늬 비활성
    // 모든 행에 홀짝 규칙 재적용
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tableNode.children?.forEach((rowNode: any, rowIndex: number) => {
      const targetColor = rowIndex % 2 === 1 ? zebraColor : null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rowNode.children?.forEach((cellNode: any, cellIndex: number) => {
        if (cellNode.type === "td" || cellNode.type === "th") {
          editor.tf.setNodes({ background: targetColor }, { at: [...tablePath, rowIndex, cellIndex] });
        }
      });
    });
  }, [editor]);

  // Reset all table formatting
  const resetTableFormat = useCallback(() => {
    if (!editor?.selection) return;
    const path = editor.selection.anchor.path;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tableNode: any = null;
    let tablePath: number[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let node: any = { children: editor.children };
    for (let i = 0; i < path.length; i++) {
      if (!node?.children?.[path[i]]) break;
      node = node.children[path[i]];
      if (node.type === "table") {
        tableNode = node;
        tablePath = path.slice(0, i + 1);
        break;
      }
    }
    if (!tableNode) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tableNode.children?.forEach((rowNode: any, rowIndex: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rowNode.children?.forEach((cellNode: any, cellIndex: number) => {
        if (cellNode.type === "td" || cellNode.type === "th") {
          editor.tf.setNodes(
            { background: null, colwidth: null, verticalAlign: null, cellBorders: null },
            { at: [...tablePath, rowIndex, cellIndex] },
          );
        }
      });
    });
    // 테이블 수준 속성(border 등)도 초기화
    editor.tf.setNodes(
      { borderColor: null, borderStyle: null, borderWidth: null },
      { at: tablePath },
    );
  }, [editor]);

  const setImageAttr = useCallback((attr: string, val: unknown) => {
    if (!editor?.selection) return;
    try {
      const entry = editor.api.above({ match: { type: "img" } });
      if (entry) editor.tf.setNodes({ [attr]: val }, { at: entry[1] });
    } catch { /* ignore */ }
  }, [editor]);

  // 이미지 노드 이동 (위/아래)
  const moveImage = useCallback((direction: "up" | "down") => {
    if (!editor?.selection) return;
    try {
      const entry = editor.api.above({ match: { type: "img" } });
      if (!entry) return;
      const path = entry[1];
      const idx = path[path.length - 1];
      const parentPath = path.slice(0, -1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parent = (editor as any).api.node(parentPath)?.[0] as { children?: unknown[] } | undefined;
      const siblingCount = parent?.children?.length ?? 0;
      if (direction === "up" && idx > 0) {
        editor.tf.moveNodes({ at: path, to: [...parentPath, idx - 1] });
      } else if (direction === "down" && idx < siblingCount - 1) {
        editor.tf.moveNodes({ at: path, to: [...parentPath, idx + 1] });
      }
    } catch { /* ignore */ }
  }, [editor]);

  // 에디터 내 모든 이미지 노드 수집
  const allImages = React.useMemo(() => {
    const imgs: { url: string; path: number[] }[] = [];
    const walk = (nodes: unknown[], path: number[]) => {
      if (!Array.isArray(nodes)) return;
      nodes.forEach((node, i) => {
        const n = node as Record<string, unknown>;
        if (n.type === "img" && n.url) {
          imgs.push({ url: n.url as string, path: [...path, i] });
        }
        if (n.children) walk(n.children as unknown[], [...path, i]);
      });
    };
    walk(editor.children as unknown[], []);
    return imgs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, editor.children]);

  // 패널에서 이미지 클릭 → 에디터에서 해당 노드 선택
  const selectImageAt = useCallback((path: number[]) => {
    try {
      editor.tf.select(path);
      editor.tf.focus();
      requestAnimationFrame(() => {
        const domNode = editor.api.toDOMNode(editor.api.node(path)?.[0] as never);
        if (domNode) domNode.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    } catch { /* ignore */ }
  }, [editor]);

  // 패널에서 이미지 제거
  const removeImage = useCallback((path: number[]) => {
    try {
      editor.tf.removeNodes({ at: path });
    } catch { /* ignore */ }
  }, [editor]);

  // 패널에서 이미지 순서 변경 (DnD)
  const reorderImage = useCallback((fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const fromImg = allImages[fromIdx];
    const toImg = allImages[toIdx];
    if (!fromImg || !toImg) return;
    try {
      editor.tf.moveNodes({ at: fromImg.path, to: toImg.path });
    } catch { /* ignore */ }
  }, [editor, allImages]);

  // ref로 이미지 관련 함수 외부 노출
  useImperativeHandle(editorRef, () => ({
    getImages: () => allImages,
    selectImageAt,
    reorderImage,
    removeImage,
  }), [allImages, selectImageAt, reorderImage, removeImage]);

  if (!editor) return null;

  // ── Derived state for toolbar ──
  // 현재 커서/선택 위치의 leaf marks를 읽어 툴바에 반영
  let marks: Record<string, unknown> = {};
  try {
    if (editor.selection) {
      // 1) focus 위치의 leaf node에서 marks 직접 읽기 (가장 안정적)
      const leafEntry = editor.api.leaf(editor.selection.focus);
      if (leafEntry) {
        const { text: _t, ...leafMarks } = leafEntry[0] as Record<string, unknown>;
        marks = leafMarks;
      }
      // 2) pending marks (addMark 직후)가 있으면 override
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pending = (editor as any).marks as Record<string, unknown> | null;
      if (pending) marks = { ...marks, ...pending };
    }
  } catch { /* selection이 일시적으로 유효하지 않을 수 있음 */ }
  const hasMark = (key: string) => { try { return editor.api.hasMark(key); } catch { return false; } };
  let block: [{ type?: string; align?: string; lineHeight?: string; listStyleType?: string }, unknown] | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  try { block = (editor.api as any).block?.() as typeof block; } catch { /* ignore */ }
  const blockType = block?.[0]?.type ?? "p";
  const isInTable = isInAncestor(editor, "table");

  // 이미지 선택 상태
  const selectedImage = (() => {
    if (!editor.selection) return null;
    try {
      const entry = editor.api.above({ match: { type: "img" } });
      return entry ? (entry[0] as Record<string, unknown>) : null;
    } catch { return null; }
  })();
  const isInImage = !!selectedImage;

  // Current mark values
  const currentColor = (marks.color as string) ?? "";
  const currentBgColor = (marks.backgroundColor as string) ?? "";
  const currentFontFamily = (marks.fontFamily as string) ?? "";

  // mark가 없으면 DOM computed style에서 현재값 읽기
  const computed = (() => {
    try {
      const sel = window.getSelection();
      if (!sel || !sel.focusNode) return null;
      const el = sel.focusNode.nodeType === Node.TEXT_NODE ? sel.focusNode.parentElement : sel.focusNode as Element;
      if (!el) return null;
      return window.getComputedStyle(el);
    } catch { return null; }
  })();

  const currentFontSize = (marks.fontSize as string) || (computed ? `${Math.round(parseFloat(computed.fontSize))}px` : "");
  const currentFontSizeNum = currentFontSize.replace("px", "");
  const currentLetterSpacing = (marks.letterSpacing as string) || "";

  // Block-level values
  const currentAlign = (block?.[0]?.align as string) ?? "left";
  const currentLineHeight = (block?.[0]?.lineHeight as string) || (() => {
    if (!computed) return "";
    const ratio = parseFloat(computed.lineHeight) / parseFloat(computed.fontSize);
    if (isNaN(ratio)) return "";
    // 프리셋 중 가장 가까운 값 매칭
    let closest = LINE_HEIGHT_PRESETS[0];
    let minDiff = Math.abs(ratio - parseFloat(closest));
    for (const p of LINE_HEIGHT_PRESETS) {
      const diff = Math.abs(ratio - parseFloat(p));
      if (diff < minDiff) { closest = p; minDiff = diff; }
    }
    return minDiff < 0.05 ? closest : "";
  })();

  // List active state
  let isUL = false;
  let isOL = false;
  let isTodo = false;
  try { isUL = someList(editor, "disc"); } catch { /* ignore */ }
  try { isOL = someList(editor, "decimal"); } catch { /* ignore */ }
  try { isTodo = someTodoList(editor); } catch { /* ignore */ }

  // Character count
  const text = getEditorText(editor);
  const charCount = text.length;
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // Can undo/redo
  const canUndo = (editor.history?.undos?.length ?? 0) > 0;
  const canRedo = (editor.history?.redos?.length ?? 0) > 0;

  // Current cell attrs (for table toolbar)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentCell = (() => {
    if (!isInTable || !editor.selection) return null;
    const path = editor.selection.anchor.path;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let node: any = { children: editor.children };
    for (const idx of path) {
      if (!node?.children?.[idx]) return null;
      node = node.children[idx];
      if (node.type === "td" || node.type === "th") return node;
    }
    return null;
  })();
  const currentCellBg = (currentCell?.background as string) ?? "";
  const currentCellVAlign = (currentCell?.verticalAlign as string) ?? "";

  // 현재 테이블 노드 + path
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentTableInfo = (() => {
    if (!isInTable || !editor.selection) return null;
    const path = editor.selection.anchor.path;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let node: any = { children: editor.children };
    for (let i = 0; i < path.length; i++) {
      if (!node?.children?.[path[i]]) return null;
      node = node.children[path[i]];
      if (node.type === "table") return { node, path: path.slice(0, i + 1) };
    }
    return null;
  })();
  const currentTableCaption = (currentTableInfo?.node?.caption as string) ?? "";


  // Zebra active check + current color
  const { isZebraActive, currentZebraColor } = (() => {
    if (!isInTable || !editor.selection) return { isZebraActive: false, currentZebraColor: null as string | null };
    const path = editor.selection.anchor.path;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let node: any = { children: editor.children };
    for (let i = 0; i < path.length; i++) {
      if (!node?.children?.[path[i]]) return { isZebraActive: false, currentZebraColor: null };
      node = node.children[path[i]];
      if (node.type === "table") {
        const secondRow = node.children?.[1];
        if (!secondRow) return { isZebraActive: false, currentZebraColor: null };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bg = secondRow.children?.find((c: any) => !!c.background)?.background ?? null;
        return { isZebraActive: !!bg, currentZebraColor: bg };
      }
    }
    return { isZebraActive: false, currentZebraColor: null };
  })();

  return (
    <div className={styles.wrapper} data-theme={theme}>
      <Plate editor={editor} onChange={handleChange}>

        {/* ── Main Toolbar ── */}
        <div className={styles.toolbar}>

          {/* Undo / Redo */}
          <TBtn onClick={() => editor.undo()} disabled={!canUndo} tooltip={`실행 취소\n${kb("⌘Z")}`}>↩</TBtn>
          <TBtn onClick={() => editor.redo()} disabled={!canRedo} tooltip={`다시 실행\n${kb("⌘⇧Z")}`}>↪</TBtn>

          <div className={styles.divider} />

          {/* Text formatting */}
          <TBtn active={hasMark("bold")} onClick={() => editor.tf.toggleMark("bold")} tooltip={`굵게\n${kb("⌘B")}`}>B</TBtn>
          <TBtn active={hasMark("italic")} onClick={() => editor.tf.toggleMark("italic")} style={{ fontStyle: "italic" }} tooltip={`기울임\n${kb("⌘I")}`}>I</TBtn>
          <TBtn active={hasMark("underline")} onClick={() => editor.tf.toggleMark("underline")} style={{ textDecoration: "underline" }} tooltip={`밑줄\n${kb("⌘U")}`}>U</TBtn>
          <TBtn active={hasMark("strikethrough")} onClick={() => editor.tf.toggleMark("strikethrough")} style={{ textDecoration: "line-through" }} tooltip="취소선">S</TBtn>
          <TBtn active={hasMark("code")} onClick={() => editor.tf.toggleMark("code")} tooltip={`인라인 코드\n${kb("⌘E")}`}>{"<>"}</TBtn>

          <div className={styles.divider} />

          {/* Superscript / Subscript */}
          <TBtn active={hasMark("superscript")} onClick={() => editor.tf.toggleMark("superscript")} tooltip="위 첨자">x²</TBtn>
          <TBtn active={hasMark("subscript")} onClick={() => editor.tf.toggleMark("subscript")} tooltip="아래 첨자">x₂</TBtn>

          <div className={styles.divider} />

          {/* Font family */}
          <div className={styles.selectWrap}>
            <select
              className={styles.fontSelect}
              value={FONT_FAMILIES_FLAT.find((f) => f.value === currentFontFamily)?.value ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  const entry = FONT_FAMILIES_FLAT.find((f) => f.value === val);
                  if (entry?.googleName) loadGoogleFont(entry.googleName);
                  editor.tf.addMarks({ fontFamily: val });
                } else {
                  editor.tf.removeMarks(["fontFamily"]);
                }
                setTimeout(() => editor.tf.focus(), 0);
              }}
            >
              <option value="">Default</option>
              {FONT_GROUPS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.fonts.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Font size */}
          <div className={styles.selectWrap}>
            <select
              className={`${styles.fontSelect} ${styles.fontSizeSelect}`}
              value={currentFontSizeNum}
              onChange={(e) => {
                const val = e.target.value;
                if (val) editor.tf.addMarks({ fontSize: `${val}px` });
                else editor.tf.removeMarks(["fontSize"]);
                setTimeout(() => editor.tf.focus(), 0);
              }}
            >
              {!currentFontSizeNum && <option value="">크기</option>}
              {FONT_SIZE_PRESETS.map((s) => <option key={s} value={String(s)}>{s}px</option>)}
            </select>
          </div>

          {/* Line height */}
          <div className={styles.selectWrap}>
            <select
              className={`${styles.fontSelect} ${styles.lhSelect}`}
              value={currentLineHeight}
              onChange={(e) => {
                const val = e.target.value || undefined;
                setLineHeight(editor, val ? Number(val) : 0);
                setTimeout(() => editor.tf.focus(), 0);
              }}
            >
              {!currentLineHeight && <option value="">행간</option>}
              {LINE_HEIGHT_PRESETS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {/* Letter spacing */}
          <div className={styles.selectWrap}>
            <select
              className={`${styles.fontSelect} ${styles.lsSelect}`}
              value={currentLetterSpacing || "0em"}
              onChange={(e) => {
                const val = e.target.value;
                if (!val || val === "0em") editor.tf.removeMarks(["letterSpacing"]);
                else editor.tf.addMarks({ letterSpacing: val });
                setTimeout(() => editor.tf.focus(), 0);
              }}
            >
              {!currentLetterSpacing && <option value="">자간</option>}
              {LETTER_SPACING_PRESETS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div className={styles.divider} />

          {/* Text alignment */}
          {(["left", "center", "right", "justify"] as const).map((align) => {
            const alignLabels = { left: `왼쪽 정렬\n${kb("⌘⇧L")}`, center: `가운데 정렬\n${kb("⌘⇧E")}`, right: `오른쪽 정렬\n${kb("⌘⇧R")}`, justify: `양쪽 정렬\n${kb("⌘⇧J")}` };
            return (
              <TBtn
                key={align}
                active={currentAlign === align}
                onClick={() => setAlign(editor, align)}
                tooltip={alignLabels[align]}
              >
                <AlignIcon align={align} />
              </TBtn>
            );
          })}

          <div className={styles.divider} />

          {/* Text color */}
          <div className={styles.colorGroup}>
            <span className={styles.colorLabel}>A</span>
            <div className={styles.colorIndicator} style={{ background: currentColor || "var(--text-primary)" }} />
            <input
              type="color"
              className={styles.colorInput}
              value={currentColor || "#000000"}
              onChange={(e) => editor.tf.addMarks({ color: e.target.value })}
              title="Text color"
            />
          </div>

          {/* Highlight / BG color */}
          <div className={styles.colorGroup}>
            <span className={styles.colorLabel}>BG</span>
            <div className={styles.colorIndicator} style={{ background: currentBgColor || "transparent" }} />
            <input
              type="color"
              className={styles.colorInput}
              value={currentBgColor || "#ffff00"}
              onChange={(e) => editor.tf.addMarks({ backgroundColor: e.target.value })}
              title="Highlight color"
            />
          </div>

          {/* Color presets */}
          <div className={styles.presetColors}>
            {PRESET_COLORS.map((color) => (
              <Tooltip key={color} content={color} delay={200} placement="top">
                <button type="button" className={`${styles.presetDot} ${currentColor === color ? styles.presetDotActive : ""}`} style={{ background: color }} onClick={() => editor.tf.addMarks({ color })} />
              </Tooltip>
            ))}
          </div>

          {/* Clear formatting */}
          <TBtn
            onClick={() => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const m = (editor as any).getMarks();
              if (m) {
                const keys = Object.keys(m);
                if (keys.length > 0) editor.tf.removeMarks(keys);
              }
            }}
            tooltip="서식 초기화"
          >
            Clear
          </TBtn>

          <div className={styles.divider} />

          {/* Headings */}
          <TBtn active={blockType === "h1"} onClick={() => editor.tf.toggleBlock("h1")} tooltip={`제목 1\n${kb("⌘⌥1")}`}>H1</TBtn>
          <TBtn active={blockType === "h2"} onClick={() => editor.tf.toggleBlock("h2")} tooltip={`제목 2\n${kb("⌘⌥2")}`}>H2</TBtn>
          <TBtn active={blockType === "h3"} onClick={() => editor.tf.toggleBlock("h3")} tooltip={`제목 3\n${kb("⌘⌥3")}`}>H3</TBtn>

          <div className={styles.divider} />

          {/* Lists & blocks */}
          <div className={styles.selectWrap}>
            <select
              className={styles.fontSelect}
              style={{ width: 76 }}
              value={isUL ? "disc" : ""}
              onChange={(e) => {
                if (e.target.value) toggleList(editor, { listStyleType: e.target.value });
                setTimeout(() => editor.tf.focus(), 0);
              }}
            >
              <option value="">● UL</option>
              <option value="disc">● 원형</option>
              <option value="circle">○ 빈원</option>
              <option value="square">■ 사각</option>
              <option value="'- '">– 대시</option>
              <option value="'✓ '">✓ 체크</option>
              <option value="'→ '">→ 화살표</option>
              <option value="'★ '">★ 별</option>
              <option value="disclosure-open">▽ 삼각</option>
              <option value="disclosure-closed">▷ 삼각(닫힘)</option>
            </select>
          </div>
          <div className={styles.selectWrap}>
            <select
              className={styles.fontSelect}
              style={{ width: 82 }}
              value={isOL ? "decimal" : ""}
              onChange={(e) => {
                if (e.target.value) toggleList(editor, { listStyleType: e.target.value });
                setTimeout(() => editor.tf.focus(), 0);
              }}
            >
              <option value="">1. OL</option>
              <option value="decimal">1, 2, 3</option>
              <option value="decimal-leading-zero">01, 02, 03</option>
              <option value="lower-alpha">a, b, c</option>
              <option value="upper-alpha">A, B, C</option>
              <option value="lower-roman">i, ii, iii</option>
              <option value="upper-roman">I, II, III</option>
              <option value="lower-greek">α, β, γ</option>
              <option value="korean-hangul-formal">가, 나, 다</option>
              <option value="cjk-ideographic">一, 二, 三</option>
            </select>
          </div>
          <TBtn active={isTodo} onClick={() => {
            const entry = editor.api.block();
            if (!entry) return;
            const [node, path] = entry;
            const el = node as Record<string, unknown>;
            if (Object.hasOwn(el, "checked")) {
              editor.tf.unsetNodes(["checked", "listStyleType"], { at: path });
            } else {
              editor.tf.setNodes({ checked: false, listStyleType: "todo" }, { at: path });
            }
          }} tooltip="할 일 목록">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1.5" y="1.5" width="13" height="13" rx="2" />
              <polyline points="4.5 8.5 7 11 11.5 5.5" />
            </svg>
          </TBtn>
          <TBtn active={blockType === "blockquote"} onClick={() => editor.tf.toggleBlock("blockquote")} tooltip={`인용구\n${kb("⌘⇧B")}`}>Quote</TBtn>
          <TBtn active={blockType === "code_block"} onClick={() => toggleCodeBlock(editor)} tooltip={`코드 블록\n${kb("⌘⌥C")}`}>Code</TBtn>

          <div className={styles.divider} />

          {/* 들여쓰기 */}
          <TBtn onClick={() => indent(editor)} tooltip="들여쓰기 (Tab)">→|</TBtn>
          <TBtn onClick={() => outdent(editor)} tooltip="내어쓰기 (Shift+Tab)">|←</TBtn>

          <div className={styles.divider} />

          {/* Insert */}
          <TBtn
            active={showLinkInput}
            onClick={() => {
              if (showLinkInput) { setShowLinkInput(false); setLinkInputValue(""); return; }
              saveSelection();
              setShowEmbedInput(false);
              setShowLinkInput(true);
              setLinkInputValue("");
              setTimeout(() => linkInputRef.current?.focus(), 30);
            }}
            tooltip={`링크 삽입\n${kb("⌘K")}`}
          >
            Link
          </TBtn>
          <TBtn onClick={addImage} tooltip="이미지 삽입">Image</TBtn>
          <TBtn onClick={() => {
            editor.tf.withMerging(() => {
              insertTable(editor, { colCount: 3, rowCount: 3, header: true });
            });
          }} tooltip="표 삽입">Table</TBtn>
          <TBtn onClick={() => editor.tf.insertNodes({ type: "hr", children: [{ text: "" }] })} tooltip="구분선">HR</TBtn>
          <TBtn
            active={showEmbedInput}
            onClick={() => {
              if (showEmbedInput) { setShowEmbedInput(false); setEmbedInputValue(""); return; }
              saveSelection();
              setShowLinkInput(false);
              setShowEmbedInput(true);
              setEmbedInputValue("");
              setTimeout(() => embedInputRef.current?.focus(), 30);
            }}
            tooltip={"미디어 삽입\nYouTube · Spotify · X"}
          >
            Embed
          </TBtn>
          <TBtn
            tooltip={"수식 삽입"}
            onClick={() => doInsertMath("", "block")}
          >
            ∑
          </TBtn>

          <div className={styles.divider} />

          <TBtn
            active={htmlMode}
            onClick={() => {
              if (!htmlMode) {
                // 리치 → HTML: 현재 내용을 HTML로
                const html = slateToHtml(editor.children as SlateNode[]);
                setHtmlSource(html);
              } else {
                // HTML → 리치: HTML을 에디터에 반영
                try {
                  const nodes = editor.api.html.deserialize({ element: htmlSource || "<p></p>" });
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  editor.tf.setValue(nodes as any);
                  isInternalUpdate.current = true;
                  prevValueRef.current = htmlSource;
                  onChangeRef.current(htmlSource);
                } catch { /* ignore */ }
              }
              setHtmlMode(!htmlMode);
            }}
            tooltip={htmlMode ? "리치 에디터로 전환" : "HTML 소스 보기/편집"}
          >
            {"</>"}
          </TBtn>

        </div>

        {/* ── Table Toolbar (표 안에 있을 때만 표시) ── */}
        <div className={`${styles.editorContainer} ${isInTable && !showLinkInput && !showEmbedInput ? styles.editorContainerActive : ""}`}>
          <div className={`${styles.tableToolbar} ${styles.tableToolbarFull} ${!isInTable || showLinkInput || showEmbedInput ? styles.tableToolbarHidden : ""}`}>
            {/* Row 1: 구조 */}
            <div className={styles.tableToolbarRow}>
              <span className={styles.tableToolbarLabel}>TABLE</span>
              <div className={styles.tableGroup}>
                <span className={styles.tableGroupLabel}>행</span>
                <TBtn onClick={() => { recomputeTableIndices(editor); insertTableMergeRow(editor, { before: true }); setTimeout(reapplyZebraIfActive, 0); }} tooltip="위에 행 추가"><TblRowBefore /></TBtn>
                <TBtn onClick={() => { recomputeTableIndices(editor); insertTableMergeRow(editor); setTimeout(reapplyZebraIfActive, 0); }} tooltip="아래에 행 추가"><TblRowAfter /></TBtn>
                <TBtn onClick={() => { recomputeTableIndices(editor); deleteTableMergeRow(editor); setTimeout(reapplyZebraIfActive, 0); }} tooltip="현재 행 삭제"><TblRowRemove /></TBtn>
              </div>
              <div className={styles.tableGroup}>
                <span className={styles.tableGroupLabel}>열</span>
                <TBtn onClick={() => { recomputeTableIndices(editor); insertTableMergeColumn(editor, { before: true }); fixZeroColSizes(editor); }} tooltip="왼쪽에 열 추가"><TblColBefore /></TBtn>
                <TBtn onClick={() => { recomputeTableIndices(editor); insertTableMergeColumn(editor); fixZeroColSizes(editor); }} tooltip="오른쪽에 열 추가"><TblColAfter /></TBtn>
                <TBtn onClick={() => { recomputeTableIndices(editor); deleteTableMergeColumn(editor); }} tooltip="현재 열 삭제"><TblColRemove /></TBtn>
              </div>
              <div className={styles.tableGroup}>
                <span className={styles.tableGroupLabel}>셀</span>
                <TBtn onClick={() => { recomputeTableIndices(editor); mergeTableCells(editor); }} tooltip={"셀 병합\n여러 셀 선택 후 클릭"}><TblMergeCells /></TBtn>
                <TBtn onClick={() => { recomputeTableIndices(editor); splitTableCell(editor); }} tooltip="셀 분리"><TblSplitCell /></TBtn>
              </div>
              <div className={styles.tableGroup}>
                <span className={styles.tableGroupLabel}>수직</span>
                <TBtn active={!currentCellVAlign || currentCellVAlign === "top"} onClick={() => setCellAttr("verticalAlign", "top")} tooltip="위쪽 정렬"><TblVAlignTop /></TBtn>
                <TBtn active={currentCellVAlign === "middle"} onClick={() => setCellAttr("verticalAlign", "middle")} tooltip="가운데 정렬"><TblVAlignMiddle /></TBtn>
                <TBtn active={currentCellVAlign === "bottom"} onClick={() => setCellAttr("verticalAlign", "bottom")} tooltip="아래쪽 정렬"><TblVAlignBottom /></TBtn>
              </div>
              <div className={styles.tableToolbarActions}>
                <TBtn onClick={resetTableFormat} tooltip={"표 서식 초기화\n배경색·크기 모두 제거"}><TblResetFormat /></TBtn>
                <TBtn className={styles.tableDangerBtn} onClick={() => deleteTable(editor)} tooltip="표 삭제"><TblTrash /></TBtn>
              </div>
            </div>

            {/* Row 2: 스타일 */}
            <div className={styles.tableToolbarRow}>
              <span className={styles.tableToolbarLabel}>STYLE</span>

              {/* 줄무늬 */}
              <div className={styles.tableGroup}>
                <span className={styles.tableGroupLabel}>줄무늬</span>
                <TBtn active={isZebraActive} onClick={() => toggleZebraStripe()} tooltip={"줄무늬 행\n짝수 행 배경색 교차"}><TblZebra /></TBtn>
                <div className={styles.colorPickerCell}>
                  <div className={styles.colorDot} style={{ background: currentZebraColor || "var(--bg-tertiary)" }} />
                  <input
                    type="color"
                    className={styles.colorInput}
                    value="#888888"
                    onChange={(e) => toggleZebraStripe(e.target.value)}
                    title="줄무늬 색상 선택"
                  />
                </div>
                {TABLE_BG_PRESETS.slice(0, 5).map((color) => (
                  <Tooltip key={color} content={color} delay={300} placement="top">
                    <button
                      type="button"
                      className={`${styles.presetDotInline} ${currentZebraColor === color ? styles.presetDotActive : ""}`}
                      style={{ background: color }}
                      onClick={() => toggleZebraStripe(color)}
                    />
                  </Tooltip>
                ))}
              </div>

              <div className={styles.divider} />
              {/* 셀 배경색 */}
              <div className={styles.tableGroup}>
                <span className={styles.tableGroupLabel}>배경</span>
                <div className={styles.colorPickerCell}>
                  <TblCellColorIcon />
                  <div className={styles.colorDot} style={{ background: currentCellBg || "transparent", border: currentCellBg ? "none" : "1px solid var(--border-light-color)" }} />
                  <input
                    type="color"
                    className={styles.colorInput}
                    value={currentCellBg || "#ffffff"}
                    onChange={(e) => setCellAttr("background", e.target.value)}
                    title="셀 배경색"
                  />
                </div>
                {TABLE_BG_PRESETS.map((color) => (
                  <Tooltip key={color} content={color} delay={300} placement="top">
                    <button
                      type="button"
                      className={`${styles.presetDotInline} ${currentCellBg === color ? styles.presetDotActive : ""}`}
                      style={{ background: color }}
                      onClick={() => setCellAttr("background", color)}
                    />
                  </Tooltip>
                ))}
                {currentCellBg && (
                  <TBtn onClick={() => setCellAttr("background", null)} tooltip="배경색 제거" style={{ marginLeft: 2 }}>×</TBtn>
                )}
              </div>

              {/* 셀 테두리 (팝오버) */}
              <div className={styles.tableGroup} style={{ position: "relative", overflow: "visible" }}>
                <span className={styles.tableGroupLabel}>테두리</span>
                <TBtn
                  active={borderPopoverOpen}
                  onClick={() => {
                    if (!borderPopoverOpen) {
                      saveSelection();
                      captureBorderCells();
                    }
                    setBorderPopoverOpen((v) => !v);
                  }}
                  tooltip={"셀 테두리\n상하좌우 개별 설정"}
                >
                  <BorderAll />
                </TBtn>
                {borderPopoverOpen && (
                  <div ref={borderPopRef} className={styles.borderPopover}>
                    <div className={styles.borderPopSection}>
                      <span className={styles.borderPopLabel}>적용 위치</span>
                      <div className={styles.borderGrid}>
                        {([
                          { mode: "all" as BorderMode, icon: <BorderAll />, tip: "모두" },
                          { mode: "none" as BorderMode, icon: <BorderNone />, tip: "제거" },
                          { mode: "outer" as BorderMode, icon: <BorderOuter />, tip: "바깥선" },
                          { mode: "inner" as BorderMode, icon: <BorderInnerAll />, tip: "안쪽선" },
                          { mode: "innerH" as BorderMode, icon: <BorderInnerH />, tip: "가로 안쪽선" },
                          { mode: "innerV" as BorderMode, icon: <BorderInnerV />, tip: "세로 안쪽선" },
                          { mode: "top" as BorderMode, icon: <BorderTop />, tip: "위" },
                          { mode: "bottom" as BorderMode, icon: <BorderBottom />, tip: "아래" },
                          { mode: "left" as BorderMode, icon: <BorderLeft />, tip: "왼쪽" },
                          { mode: "right" as BorderMode, icon: <BorderRight />, tip: "오른쪽" },
                        ]).map((item) => (
                          <Tooltip key={item.mode} content={item.tip} delay={200} placement="top">
                            <button
                              type="button"
                              className={styles.borderGridBtn}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                applyCellBorders(item.mode, borderPopStyle, borderPopWidth, borderPopColor);
                              }}
                            >
                              {item.icon}
                            </button>
                          </Tooltip>
                        ))}
                      </div>
                    </div>

                    <div className={styles.borderPopSection}>
                      <span className={styles.borderPopLabel}>스타일</span>
                      <select
                        value={borderPopStyle}
                        onChange={(e) => setBorderPopStyle(e.target.value)}
                        className={styles.borderPopSelect}
                      >
                        {TABLE_BORDER_STYLES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.value === "solid" ? "───  실선" : s.value === "dotted" ? "· · ·  점선" : s.value === "dashed" ? "- - -  파선" : s.value === "double" ? "═══  이중선" : "✕  선없음"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.borderPopSection}>
                      <span className={styles.borderPopLabel}>두께</span>
                      <div className={styles.borderWidthCapsule}>
                        {TABLE_BORDER_WIDTHS.map((w) => (
                          <button
                            key={w}
                            type="button"
                            className={`${styles.borderWidthBtn} ${borderPopWidth === w ? styles.borderWidthBtnActive : ""}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => setBorderPopWidth(w)}
                          >{w}</button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.borderPopSection}>
                      <span className={styles.borderPopLabel}>색상</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <div className={styles.colorPickerCell} style={{ borderLeft: "none", padding: 0 }}>
                          <div className={styles.colorDot} style={{ background: borderPopColor }} />
                          <input
                            type="color"
                            className={styles.colorInput}
                            value={borderPopColor.startsWith("var(") ? "#d1d5db" : borderPopColor}
                            onChange={(e) => setBorderPopColor(e.target.value)}
                          />
                        </div>
                        {TABLE_BORDER_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`${styles.presetDotInline} ${borderPopColor === color ? styles.presetDotActive : ""}`}
                            style={{ background: color }}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => setBorderPopColor(color)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 캡션 */}
              <div className={styles.tableGroup}>
                <span className={styles.tableGroupLabel}>캡션</span>
                <input
                  type="text"
                  value={currentTableCaption.trim()}
                  placeholder="캡션 입력..."
                  onChange={(e) => {
                    if (!currentTableInfo) return;
                    editor.tf.setNodes({ caption: e.target.value }, { at: currentTableInfo.path });
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  className={styles.fontSelect}
                  style={{ width: 160 }}
                />
                <TBtn
                  onClick={() => {
                    if (!currentTableInfo) return;
                    editor.tf.setNodes({ caption: undefined }, { at: currentTableInfo.path });
                  }}
                  tooltip="캡션 제거"
                  style={{ visibility: currentTableCaption.trim() ? "visible" : "hidden" }}
                >×</TBtn>
              </div>
            </div>
          </div>

          {/* ── Image toolbar ── */}
          <div className={`${styles.tableToolbar} ${styles.tableToolbarFull} ${!isInImage || showLinkInput || showEmbedInput ? styles.tableToolbarHidden : ""}`}>
           <div className={styles.tableToolbarRow}>
            <span className={styles.tableToolbarLabel}>IMAGE</span>
            <div className={styles.divider} />

            {/* 비율 고정 토글 */}
            <div className={styles.tableGroup}>
              <span className={styles.tableGroupLabel}>크기</span>
              <TBtn
                active={selectedImage ? (selectedImage.lockAspect as boolean) ?? true : true}
                onClick={() => setImageAttr("lockAspect", !((selectedImage?.lockAspect as boolean) ?? true))}
                tooltip={((selectedImage?.lockAspect as boolean) ?? true) ? "비율 고정 중 (클릭해서 해제)" : "비율 자유 (클릭해서 고정)"}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 9 }}>
                  <span style={{ display: "flex", transform: "scale(0.8)" }}>{((selectedImage?.lockAspect as boolean) ?? true) ? <LockIcon /> : <UnlockIcon />}</span>
                  비율
                </span>
              </TBtn>
              {selectedImage && (selectedImage.width as number) > 0 && (
                <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap", padding: "0 2px" }}>
                  {selectedImage.width as number}×{(selectedImage.height as number) || "auto"}
                </span>
              )}
              <TBtn
                onClick={() => { setImageAttr("width", 0); setImageAttr("height", 0); }}
                tooltip="원본 크기로 복원"
              >
                ↺
              </TBtn>
            </div>

            <div className={styles.divider} />

            {/* 정렬 */}
            <div className={styles.tableGroup}>
              <span className={styles.tableGroupLabel}>정렬</span>
              {IMG_ALIGNS.map((a) => (
                <TBtn
                  key={a}
                  active={selectedImage ? (selectedImage.align as string || "center") === a : false}
                  onClick={() => setImageAttr("align", a)}
                  tooltip={a === "left" ? "왼쪽" : a === "center" ? "가운데" : "오른쪽"}
                >
                  {IMG_ALIGN_ICONS[a]}
                </TBtn>
              ))}
            </div>

            <div className={styles.divider} />

            {/* 캡션 */}
            <div className={styles.tableGroup}>
              <span className={styles.tableGroupLabel}>캡션</span>
              <input
                type="text"
                value={selectedImage ? (selectedImage.caption as string || "") : ""}
                placeholder="캡션 입력..."
                onChange={(e) => setImageAttr("caption", e.target.value)}
                className={styles.fontSelect}
                style={{ width: 160 }}
              />
              <TBtn
                onClick={() => setImageAttr("caption", "")}
                tooltip="캡션 제거"
                style={{ visibility: selectedImage?.caption ? "visible" : "hidden" }}
              >×</TBtn>
            </div>

            <div className={styles.divider} />

            {/* 색조 */}
            <div className={styles.tableGroup}>
              <span className={styles.tableGroupLabel}>색조</span>
              <div className={styles.selectWrap}>
                <select
                  value={selectedImage ? (selectedImage.filter as string || "") : ""}
                  onChange={(e) => { setImageAttr("filter", e.target.value); setTimeout(() => editor.tf.focus(), 0); }}
                  className={styles.fontSelect}
                  style={{ width: 80 }}
                >
                  {IMG_FILTERS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.divider} />

            {/* 순서 */}
            <div className={styles.tableGroup}>
              <span className={styles.tableGroupLabel}>순서</span>
              <TBtn onClick={() => moveImage("up")} tooltip="위로 이동">↑</TBtn>
              <TBtn onClick={() => moveImage("down")} tooltip="아래로 이동">↓</TBtn>
            </div>

            <div style={{ marginLeft: "auto" }} />

            {/* 삭제 */}
            <TBtn
              className={styles.tableDangerBtn}
              onClick={() => {
                try {
                  const entry = editor.api.above({ match: { type: "img" } });
                  if (entry) editor.tf.removeNodes({ at: entry[1] });
                } catch { /* ignore */ }
              }}
              tooltip="이미지 삭제"
            >
              <TblTrash />
            </TBtn>
           </div>
          </div>

          {/* ── Math Toolbar (수식 편집 중일 때 표시) ── */}
          <div className={`${styles.tableToolbar} ${!mathEditing || showLinkInput || showEmbedInput ? styles.tableToolbarHidden : ""}`} data-math-symbols>
            <span className={styles.tableToolbarLabel}>MATH</span>
            <div className={styles.divider} />
            {MATH_TOOLS.map((cat) => (
              <div key={cat.category} className={styles.tableGroup}>
                <span className={styles.tableGroupLabel}>{cat.category}</span>
                {cat.items.map((item) => (
                  <TBtn key={item.latex} tooltip={`${item.tip || item.label}\n${item.latex.trim()}`}
                    onMouseDown={(e: React.MouseEvent) => { e.preventDefault(); _mathSymbolInsert.current?.(item.latex); }}
                  >{item.label}</TBtn>
                ))}
              </div>
            ))}
          </div>

          {/* ── Link toolbar ── */}
          <div
            ref={linkToolbarRef}
            className={`${styles.tableToolbar} ${!showLinkInput ? styles.tableToolbarHidden : ""}`}
          >
            <div className={styles.tableToolbarRow}>
              <span className={styles.tableToolbarLabel}>LINK</span>
              <div className={styles.linkInputWrap}>
                <input
                  ref={linkInputRef}
                  type="text"
                  className={styles.linkInput}
                  placeholder="URL (https:// 생략 가능)"
                  value={linkInputValue}
                  onChange={(e) => setLinkInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && linkInputValue.trim()) {
                      doInsertLink(linkInputValue.trim());
                      setShowLinkInput(false);
                      setLinkInputValue("");
                    } else if (e.key === "Escape") {
                      setShowLinkInput(false);
                      setLinkInputValue("");
                    }
                  }}
                />
                <TBtn
                  onClick={() => {
                    if (linkInputValue.trim()) {
                      doInsertLink(linkInputValue.trim());
                      setShowLinkInput(false);
                      setLinkInputValue("");
                    }
                  }}
                  tooltip="삽입"
                >
                  ✓
                </TBtn>
                <TBtn onClick={() => { setShowLinkInput(false); setLinkInputValue(""); }} tooltip="취소">×</TBtn>
              </div>
            </div>
          </div>

          {/* ── Embed toolbar ── */}
          <div
            ref={embedToolbarRef}
            className={`${styles.tableToolbar} ${!showEmbedInput ? styles.tableToolbarHidden : ""}`}
          >
            <div className={styles.tableToolbarRow}>
              <span className={styles.tableToolbarLabel}>EMBED</span>
              <div className={styles.linkInputWrap}>
                <input
                  ref={embedInputRef}
                  type="url"
                  className={styles.linkInput}
                  placeholder="YouTube · Spotify · X ..."
                  value={embedInputValue}
                  onChange={(e) => setEmbedInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && embedInputValue.trim()) {
                      doInsertEmbed(embedInputValue.trim());
                      setShowEmbedInput(false);
                      setEmbedInputValue("");
                    } else if (e.key === "Escape") {
                      setShowEmbedInput(false);
                      setEmbedInputValue("");
                    }
                  }}
                />
                <TBtn
                  onClick={() => {
                    if (embedInputValue.trim()) {
                      doInsertEmbed(embedInputValue.trim());
                      setShowEmbedInput(false);
                      setEmbedInputValue("");
                    }
                  }}
                  tooltip="삽입"
                >
                  ✓
                </TBtn>
                <TBtn onClick={() => { setShowEmbedInput(false); setEmbedInputValue(""); }} tooltip="취소">×</TBtn>
              </div>
            </div>
          </div>

          {htmlMode ? (
            <textarea
              className={styles.editorContent}
              value={htmlSource}
              onChange={(e) => {
                setHtmlSource(e.target.value);
                isInternalUpdate.current = true;
                prevValueRef.current = e.target.value;
                onChangeRef.current(e.target.value);
              }}
              style={{
                minHeight: 300,
                width: "100%",
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                lineHeight: 1.6,
                padding: "var(--spacing-sm)",
                border: "none",
                outline: "none",
                resize: "vertical",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
              data-lenis-prevent
              spellCheck={false}
            />
          ) : (
            <PlateContent
              className={styles.editorContent}
              placeholder="Write your content..."
              style={{ minHeight: 300 }}
              data-lenis-prevent
              onKeyDown={(e) => {
                // 링크 끝에서 Backspace → 글자 삭제 대신 링크 해제
                if (e.key === "Backspace" && editor.selection && editor.api.isCollapsed()) {
                  const { anchor } = editor.selection;
                  const anchorPath = anchor.path;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  let cur: any = { children: editor.children };
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  let linkNode: any = null;
                  let linkDepth = -1;
                  for (let i = 0; i < anchorPath.length; i++) {
                    cur = cur?.children?.[anchorPath[i]];
                    if (!cur) break;
                    if (cur.type === "a") { linkNode = cur; linkDepth = i; break; }
                  }
                  if (linkNode) {
                    // 링크 내 마지막 텍스트 노드의 끝에 커서가 있는지 확인
                    const children = linkNode.children as { text: string }[];
                    const lastChild = children[children.length - 1];
                    const lastChildIdx = children.length - 1;
                    const isAtEnd = anchorPath[linkDepth + 1] === lastChildIdx && anchor.offset === (lastChild?.text?.length ?? 0);
                    if (isAtEnd) {
                      e.preventDefault();
                      unwrapLink(editor);
                    }
                  }
                }
              }}
            />
          )}
        </div>

        {/* ── Status bar ── */}
        <div className={styles.statusBar}>
          <span>{charCount.toLocaleString()}자</span>
          <span>·</span>
          <span>{wordCount.toLocaleString()}단어</span>
        </div>

      </Plate>
    </div>
  );
}
