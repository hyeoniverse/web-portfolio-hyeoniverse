"use client";

import * as React from "react";
import { BLOCK_COLORS, BLOCK_HIGHLIGHTS } from "./blockStyleData";
import { useDraggable } from "@platejs/dnd";
import type { DragItemNode, ElementDragItemNode } from "@platejs/dnd";
import type { DropTargetMonitor } from "react-dnd";
import type { TElement } from "platejs";
import type { RenderNodeWrapperProps, RenderNodeWrapperFunction, PlateEditor } from "platejs/react";
import { useEditorRef } from "platejs/react";
import { toggleList } from "@platejs/list";
import { toggleCodeBlock } from "@platejs/code-block";
import {
  GripVertical, Plus, Copy, Trash2, Link2, Palette, Highlighter, WrapText,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Pilcrow, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Code,
  Baseline, AlignLeft, AlignCenter, AlignRight, ChevronDown, ChevronRight, Smile,
} from "@/components/icons";
import Popover, { MenuItem, MenuDivider } from "@/components/ui/Popover";
import Tooltip from "@/components/ui/Tooltip";
import { CALLOUT_BG_PRESETS, COLUMN_DEFAULT_PX, MAX_COLUMNS, fitColumnsForInsert } from "./presets";
import { useLanguage } from "@/providers/LanguageProvider";
import { showToast } from "@/stores/toastStore";
import { _slashOpenTrigger } from "./utils";
import styles from "../RichTextEditor.module.css";

/* eslint-disable @typescript-eslint/no-explicit-any */

// 이 파일 전반에서 다루는 Plate 에디터 인스턴스 타입.
type PlateEd = PlateEditor;
// listStyleType 을 읽기 위한 최소 노드 형태 (리스트 여부 판정).
type MaybeListElement = TElement & { listStyleType?: unknown };

// 전환 가능한 블록 타입 (내용 유지)
const TURN_INTO: { value: string; labelKey: string; icon: React.ReactNode }[] = [
  { value: "p", labelKey: "paragraph", icon: <Pilcrow size={15} /> },
  { value: "h1", labelKey: "heading1", icon: <Heading1 size={15} /> },
  { value: "h2", labelKey: "heading2", icon: <Heading2 size={15} /> },
  { value: "h3", labelKey: "heading3", icon: <Heading3 size={15} /> },
  { value: "bulleted", labelKey: "bulletList", icon: <List size={15} /> },
  { value: "numbered", labelKey: "numberedList", icon: <ListOrdered size={15} /> },
  { value: "blockquote", labelKey: "blockquote", icon: <Quote size={15} /> },
  { value: "code_block", labelKey: "codeBlock", icon: <Code size={15} /> },
];

// 블록 텍스트 색상 스와치 (default = 색 제거)

// 전환/색상(글자색·형광펜) 을 표시할 "텍스트 계열" 블록. 나머지(코드·이미지·표·구분선·영상·토글·열 등)엔 숨김.
const TEXT_LIKE_BLOCKS = new Set(["p", "h1", "h2", "h3", "blockquote", "callout"]);

// 최상위 index 의 블록 + 그 indent 그룹 자식(연속된 더 깊은 블록)을 통째로 클론해 반환.
// 묶인 블록(indent 그룹)은 열 안에서도 한 덩어리로 취급 → 자식까지 같은 열에 넣는다.
// 열 폭 안에서 과한 좌여백을 막고 상대 구조는 유지하도록 그룹 base indent 를 0 으로 정규화.
function topLevelGroupNodes(ed: PlateEd, idx: number): { nodes: TElement[]; span: number } {
  const first = ed.api.node([idx])?.[0];
  if (!first) return { nodes: [], span: 0 };
  let childCount = 0;
  try {
    const gid = (first as { id?: string }).id;
    if (gid != null) childCount = getIndentGroupChildIds(ed, gid).childIds.length;
  } catch { /* noop */ }
  const base = (first as { indent?: number }).indent ?? 0;
  const nodes: TElement[] = [];
  for (let i = 0; i <= childCount; i++) {
    const n = ed.api.node([idx + i])?.[0];
    if (!n) continue;
    const clone = JSON.parse(JSON.stringify(n)) as TElement & { indent?: number };
    if (typeof clone.indent === "number") {
      const ni = clone.indent - base;
      if (ni > 0) clone.indent = ni; else delete clone.indent;
    }
    nodes.push(clone);
  }
  return { nodes, span: childCount };
}

// 최상위 블록을 좌/우로 드롭 → 드래그한 블록과 대상 블록을 2단 column_group 으로 묶는다.
// 각 쪽이 indent 그룹이면 그 그룹 전체가 자기 열로 들어간다(하나의 블록처럼).
export function makeColumnsFromDrop(ed: any, dragIdx: number, targetIdx: number, side: "left" | "right") {
  if (dragIdx === targetIdx) return;
  const dg = topLevelGroupNodes(ed, dragIdx);
  const tg = topLevelGroupNodes(ed, targetIdx);
  if (!dg.nodes.length || !tg.nodes.length) return;
  // 두 그룹 범위가 겹치면(서로의 자식/부모) 열 생성 안 함 — 노드 중복 방지
  if (dragIdx <= targetIdx + tg.span && targetIdx <= dragIdx + dg.span) return;
  const draggedCol = { type: "column", width: "50%", children: dg.nodes };
  const targetCol = { type: "column", width: "50%", children: tg.nodes };
  // side=left → 드래그한 (그룹) 이 왼쪽, side=right → 오른쪽
  const cols = side === "left" ? [draggedCol, targetCol] : [targetCol, draggedCol];
  const group = { type: "column_group", children: cols };
  // 두 그룹의 모든 최상위 index 를 큰 것부터 제거 → path 유지, 최소 index 에 삽입
  const all: number[] = [];
  for (let i = dragIdx; i <= dragIdx + dg.span; i++) all.push(i);
  for (let i = targetIdx; i <= targetIdx + tg.span; i++) all.push(i);
  all.sort((a, b) => b - a);
  const lo = Math.min(dragIdx, targetIdx);
  ed.tf.withoutNormalizing(() => {
    for (const idx of all) ed.tf.removeNodes({ at: [idx] });
    ed.tf.insertNodes(group, { at: [lo] });
  });
}

// 상식 상한 — 폭이 아니라 "말이 안 되는 개수"를 막는 안전장치. 실제 폭은 CSS(min-width+가로스크롤)가 처리.

// 이미 존재하는 column_group 옆에 드롭 → 중첩 대신 그 그룹에 새 열을 추가(3열+).
// 상한 도달 시 false 반환 → 호출부에서 기본 이동으로 폴백.
export function addColumnToGroup(ed: any, dragIdx: number, groupIdx: number, side: "left" | "right"): boolean {
  const group = ed.api.node([groupIdx])?.[0];
  if (!group?.children) return false;
  if (group.children.length >= MAX_COLUMNS) return false; // 상한 초과 → 추가 안 함
  // 드래그한 게 indent 그룹이면 그룹 전체를 새 열의 내용으로(하나의 블록처럼)
  const dg = topLevelGroupNodes(ed, dragIdx);
  if (!dg.nodes.length) return false;
  if (groupIdx >= dragIdx && groupIdx <= dragIdx + dg.span) return false; // 방어: 그룹 범위와 겹치면 취소
  const origCount = group.children.length;
  const colCount = origCount + 1;
  const insertColIdx = side === "left" ? 0 : origCount;
  /* px 로 고정된 블록이면 기존 열 폭을 건드리지 않는다 — 새 열만 기본 폭으로 끼운다.
     새 열에 widthPx 를 안 주면 그 열만 유동(flex: w 1 0)이 되어 남는 공간을 흡수하고,
     결국 총폭이 컨테이너에 묶여 기존 px 폭이 무의미해진다. */
  const hasPx = (group.children as { widthPx?: number }[]).some(
    (c) => typeof c?.widthPx === "number" && c.widthPx > 0,
  );
  const newCol: Record<string, unknown> = { type: "column", width: "50%", children: dg.nodes };
  // 기존 열 폭은 그대로 두고 새 열만 기본 폭으로 붙인다. 단 블록 상한에 여유가 없으면
  // 그때만 기존 열을 비례로 깎아 자리를 낸다 (fitColumnsForInsert 가 두 규칙을 다 안다).
  const curPx = (group.children as { widthPx?: number }[]).map((c) => c?.widthPx || 0);
  const fit = hasPx ? fitColumnsForInsert(curPx, COLUMN_DEFAULT_PX) : null;
  if (fit) newCol.widthPx = fit.added;
  ed.tf.withoutNormalizing(() => {
    for (let i = dragIdx + dg.span; i >= dragIdx; i--) ed.tf.removeNodes({ at: [i] }); // 그룹 전체 제거(큰 index 먼저)
    const gIdx = dragIdx < groupIdx ? groupIdx - (dg.span + 1) : groupIdx; // 제거한 블록 수만큼 index 보정
    ed.tf.insertNodes(newCol, { at: [gIdx, insertColIdx] });
    // 자리를 내주느라 깎인 기존 열 반영. 왼쪽에 끼웠으면 기존 열의 index 가 1 씩 밀린다.
    // px 가 없던(유동) 열은 curPx 가 0 이라 깎이지도 않으므로 그대로 건너뛴다 — 여기서 px 를 주면
    // 유동이던 열이 갑자기 고정으로 바뀐다.
    if (fit) {
      const shift = insertColIdx === 0 ? 1 : 0;
      fit.widths.forEach((w, i) => {
        if (curPx[i] > 0 && w !== curPx[i]) ed.tf.setNodes({ widthPx: w }, { at: [gIdx, i + shift] });
      });
    }
    // width(%) 는 정수 합=100 을 유지해야 한다 (소수면 @platejs/layout normalizer 가 수렴 못 해 무한루프).
    // px 블록에선 이 값이 렌더에 안 쓰이지만(px 가 우선) normalizer 를 만족시키려면 그대로 채워둔다.
    const base = Math.floor(100 / colCount);
    for (let i = 0; i < colCount; i++) {
      const w = i < colCount - 1 ? base : 100 - base * (colCount - 1);
      ed.tf.setNodes({ width: `${w}%` }, { at: [gIdx, i] });
    }
  });
  return true;
}

// 드롭 방향 통합 판정 — 위/아래/좌/우 중 하나만. (좌/우는 세로 중앙대 + 가로 가장자리일 때만,
// 코너에서 위아래·좌우가 겹쳐 보이는 걸 방지). allowSide=false 면 항상 위/아래.
type DropDir = "top" | "bottom" | "left" | "right";
function dropDirAt(rect: DOMRect, x: number, y: number, allowSide: boolean): DropDir {
  const relX = x - rect.left;
  const relY = y - rect.top;
  const zoneX = Math.min(rect.width * 0.3, 140);
  const inMiddleY = relY > rect.height * 0.25 && relY < rect.height * 0.75;
  if (allowSide && inMiddleY) {
    if (relX < zoneX) return "left";
    if (relX > rect.width - zoneX) return "right";
  }
  return relY < rect.height / 2 ? "top" : "bottom";
}

// 공식 @platejs/dnd 기반 블록 드래그 래퍼 (aboveNodes 로 각 블록에 적용).
// 최상위 블록만 핸들 부여 — 표/컬럼/코드라인 내부 등은 제외.
// column_group(n단 블록 전체)은 드래그 허용 — 개별 column 은 레이아웃이라 제외
const NON_DRAGGABLE = new Set(["tr", "td", "th", "column", "code_line", "column-item"]);

export const BlockDraggable = (props: RenderNodeWrapperProps): RenderNodeWrapperFunction => {
  const { editor, element } = props;
  let path: number[] | null = null;
  try {
    const p = editor.api.findPath(element);
    path = p ? Array.from(p) : null;
  } catch {
    /* path 일시 무효 */
  }
  const type = (element as { type?: string }).type ?? "";
  // 최상위 블록 + 탭 패널 직계 자식(중첩 컨테이너 안에서도 블록 이동 가능)
  let enabled = !!path && path.length === 1 && !NON_DRAGGABLE.has(type);
  if (!enabled && path && path.length === 3 && !NON_DRAGGABLE.has(type)) {
    try {
      const parent = editor.api.node(path.slice(0, -1))?.[0] as { type?: string } | undefined;
      if (parent?.type === "tab_panel" || parent?.type === "column") enabled = true;
    } catch { /* path 일시 무효 */ }
  }
  if (!enabled) return undefined;

  return function DraggableWrapper(elementProps) {
    return <DraggableBlock element={element}>{elementProps.children}</DraggableBlock>;
  };
};

const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");

// 드래그한 블록의 "indent 그룹 자식" — 바로 뒤 최상위 블록 중 indent 가 더 깊은 연속 블록들.
// 부모보다 얕거나 같은 indent 를 만나면 중단. (Notion 식: 인접+들여쓴 블록을 부모와 함께 이동)
export function getIndentGroupChildIds(ed: PlateEd, draggedId: string): { childIds: string[]; draggedIndent: number } {
  const de = ed.api.node({ id: draggedId, at: [] });
  if (!de || de[1].length !== 1) return { childIds: [], draggedIndent: 0 };
  const draggedIndent = ((de[0] as { indent?: number }).indent) ?? 0;
  const root = ed.children as Array<TElement & { indent?: number; id?: string }>;
  const childIds: string[] = [];
  for (let i = de[1][0] + 1; i < root.length; i++) {
    const ind = (root[i]?.indent) ?? 0;
    if (ind > draggedIndent) { if (root[i]?.id != null) childIds.push(root[i].id as string); }
    else break;
  }
  return { childIds, draggedIndent };
}

function DraggableBlock({ element, children }: { element: TElement; children: React.ReactNode }) {
  const { t, language } = useLanguage();
  const L = (ko: string, en: string) => (language === "ko" ? ko : en);
  const editor = useEditorRef();
  // 들여쓴 블록 위에 드롭하면 옮긴 블록도 그 들여쓰기(indent)를 물려받게 — "들여쓰기 블록 안에" 넣는 느낌.
  // 기본 이동(onDropNode)은 그대로 두고(return false), 이동 후 indent 만 맞춘다.
  // 드래그가 이 블록 위 어느 방향인지 (통합 드롭 인디케이터용)
  const [dropDir, setDropDir] = React.useState<DropDir | null>(null);

  const onDropHandler = React.useCallback((ed: PlateEd, { id, dragItem, monitor }: {
    id: string;
    dragItem: ElementDragItemNode;
    monitor: DropTargetMonitor<DragItemNode, unknown>;
  }) => {
    setDropDir(null);
    // 자기 자신(또는 자기 자손) 안으로의 드롭 방지 — 예: 열블록(column_group)을 자기 컬럼 위로 드롭.
    // Plate 기본 이동(moveNodes)이 "destination is inside itself"([1]→[1,0,0])로 터지므로 no-op 처리.
    try {
      const draggedId0 = Array.isArray(dragItem.id) ? dragItem.id[0] : dragItem.id;
      const dEntry = ed.api.node({ id: draggedId0, at: [] });
      const tEntry = ed.api.node({ id, at: [] });
      if (dEntry && tEntry) {
        const dPath: number[] = dEntry[1], tPath: number[] = tEntry[1];
        if (dPath.length <= tPath.length && dPath.every((v, i) => v === tPath[i])) return true;
      }
    } catch { /* noop */ }
    // ── 사이드 드롭 → 열블록 생성 (최상위 블록끼리) ──
    try {
      const offset = monitor?.getClientOffset?.();
      const targetEntry0 = ed.api.node({ id, at: [] });
      if (offset && targetEntry0) {
        const [targetNode, targetPath] = targetEntry0;
        if (targetPath.length === 1) {
          const dom = ed.api.toDOMNode(targetNode);
          const rect = dom?.getBoundingClientRect();
          const dir = rect ? dropDirAt(rect, offset.x, offset.y, true) : null;
          const side = dir === "left" || dir === "right" ? dir : null;
          if (side) {
            const draggedId = Array.isArray(dragItem.id) ? dragItem.id[0] : dragItem.id;
            const dragEntry = ed.api.node({ id: draggedId, at: [] });
            const draggedNode = dragEntry?.[0];
            // 드래그한 게 열블록이면 열 안에 넣지 않음(중첩 방지) → 기본 이동
            if (dragEntry && dragEntry[1].length === 1 && (draggedNode as { type?: string } | undefined)?.type !== "column_group") {
              if ((targetNode as { type?: string }).type === "column_group") {
                // 상한 도달 시 false → 기본 이동으로 폴백(열 추가 안 함)
                if (addColumnToGroup(ed, dragEntry[1][0], targetPath[0], side)) return true;
              } else {
                makeColumnsFromDrop(ed, dragEntry[1][0], targetPath[0], side); // 2열 생성
                return true; // 기본 이동 막음
              }
            }
          }
        }
      }
    } catch { /* noop */ }
    // 타겟이 들여쓰기돼 있으면, 드롭한 (그룹) 전체 indent 를 타겟에 맞춰 이동 — 자식은 상대 offset 유지.
    // 그룹 이동 자체는 dragItem.id 배열([부모,...자식])로 @platejs/dnd 가 네이티브 처리(아래 useDraggable item).
    try {
      const targetEntry = ed.api.node({ id, at: [] });
      const targetIndent = targetEntry ? (((targetEntry[0] as { indent?: number }).indent) ?? 0) : 0;
      if (targetIndent > 0) {
        const ids: string[] = Array.isArray(dragItem.id) ? dragItem.id : [dragItem.id];
        setTimeout(() => {
          try {
            const pe = ed.api.node({ id: ids[0], at: [] });
            if (!pe || (pe[0] as MaybeListElement).listStyleType) return; // 리스트는 제외
            const delta = targetIndent - (((pe[0] as { indent?: number }).indent) ?? 0);
            if (delta === 0) return;
            for (const cid of ids) {
              const ce = ed.api.node({ id: cid, at: [] });
              if (!ce || (ce[0] as MaybeListElement).listStyleType) continue;
              ed.tf.setNodes({ indent: Math.max(0, (((ce[0] as { indent?: number }).indent) ?? 0) + delta) }, { at: ce[1] });
            }
          } catch { /* noop */ }
        }, 0);
      }
    } catch { /* noop */ }
    return false;
  }, []);
  // preview.disable → 네이티브 HTML5 drag image 끄고 커스텀 BlockDragLayer 로 대체
  // drag.item → 드래그 시작 시 indent 자식이 있으면 id 를 [부모,...자식] 배열로 만들어
  // @platejs/dnd 가 그룹을 네이티브로 함께 이동(멀티셀렉트 드래그와 동일 경로). 자식 없으면 단일.
  const { isDragging, nodeRef, handleRef } = useDraggable({
    element,
    onDropHandler,
    preview: { disable: true },
    drag: {
      item: () => {
        try {
          const gid = (element as { id?: string }).id;
          if (gid == null) return {};
          const { childIds } = getIndentGroupChildIds(editor, gid);
          if (childIds.length > 0) return { id: [gid, ...childIds] };
        } catch { /* noop */ }
        return {};
      },
    },
  } as any);
  // 핸들 popover 열림 → 현재 블록 배경 강조 (어떤 블록에 대한 도구인지 표시)
  const [toolsOpen, setToolsOpen] = React.useState(false);

  // indent 그룹 하이라이트 — 부모가 핸들active(toolsOpen) 또는 드래그 중이면, 부모 블록 하나에만
  // data-group-parent + 그룹 전체 높이(--group-active-h)를 세팅 → 부모 배경 하나가 그룹 전체를 덮는다.
  // (안쪽 자식 블록엔 개별 accent 를 안 준다. 노션식 — 그룹 = 한 덩어리 배경.)
  React.useEffect(() => {
    // 사이드 드롭(열 생성) 타겟일 때도 그룹 높이를 세팅 → 세로 인디케이터(.blockDropSide)가 묶은 블록 전체를 덮게.
    const sideTarget = dropDir === "left" || dropDir === "right";
    if (!(toolsOpen || isDragging || sideTarget)) return;
    let parentWrapper: HTMLElement | null = null;
    try {
      const gid = (element as { id?: string }).id;
      if (gid != null) {
        const { childIds } = getIndentGroupChildIds(editor, gid);
        if (childIds.length > 0) {
          const wrapperOf = (id: string): HTMLElement | null => {
            const node = editor.api.node({ id, at: [] })?.[0] as TElement;
            const dom = node ? (editor.api.toDOMNode(node) as HTMLElement | null) : null;
            return (dom?.closest(`.${styles.blockDraggable}`) as HTMLElement | null) ?? null;
          };
          parentWrapper = wrapperOf(gid);
          const lastChild = wrapperOf(childIds[childIds.length - 1]);
          if (parentWrapper && lastChild) {
            const h = lastChild.getBoundingClientRect().bottom - parentWrapper.getBoundingClientRect().top;
            parentWrapper.style.setProperty("--group-active-h", `${Math.round(h)}px`);
            // 배경 하이라이트(data-group-parent)는 핸들active/드래그 때만 — 드롭 타겟엔 세로선만 늘린다.
            if (toolsOpen || isDragging) parentWrapper.setAttribute("data-group-parent", "");
          } else {
            parentWrapper = null;
          }
        }
      }
    } catch { /* noop */ }
    return () => {
      if (parentWrapper) { parentWrapper.removeAttribute("data-group-parent"); parentWrapper.style.removeProperty("--group-active-h"); }
    };
  }, [toolsOpen, isDragging, dropDir, editor, element]);

  // 노션식 + 버튼 — 클릭: 아래 / ⌥(Alt)+클릭: 위. 내용 없으면 그 자리에서(전환).
  // focus + 슬래시 메뉴 오픈("/" 텍스트는 넣지 않음).
  const addBlock = React.useCallback((above: boolean) => {
    try {
      const path = editor.api.findPath(element);
      if (!path) return;
      const type = (element as { type?: string }).type ?? "";
      // "그 자리에서 전환"은 빈 '일반 문단(p)'을 아래로 추가할 때만. 코드·표·이미지·구분선·투표 등
      // 텍스트가 없는(api.string 이 "") 블록까지 빈 걸로 오인해 전환되던 문제 → 문단만 전환, 나머진 항상 바로 아래에 추가.
      const empty = type === "p" && ((editor.api.string(path) as string) ?? "") === "";
      const insertNew = !(empty && !above); // 빈 문단 + 아래 = 새 블록 없이 그 문단에서 전환
      let target = path as number[];
      if (insertNew) {
        const parent = path.slice(0, -1);
        const idx = path[path.length - 1];
        target = above ? [...parent, idx] : [...parent, idx + 1];
        editor.tf.insertNodes({ type: "p", children: [{ text: "" }] }, { at: target });
      }
      const start = editor.api.start(target);
      if (start) editor.tf.select(start);
      editor.tf.focus();
      // 새로 만든 빈 블록은, 명령 선택 없이 메뉴를 닫으면(blur/Esc) 다시 제거
      let onCancel: (() => void) | undefined;
      if (insertNew && start) {
        const ref = editor.api.pointRef(start);
        onCancel = () => {
          const pt = ref.unref();
          if (!pt) return;
          try {
            const entry = editor.api.block({ at: pt });
            if (entry && ((editor.api.string(entry[1]) as string) ?? "") === "") {
              editor.tf.removeNodes({ at: entry[1] });
            }
          } catch { /* ignore */ }
        };
      }
      setTimeout(() => _slashOpenTrigger.current?.(onCancel), 0);
    } catch { /* ignore */ }
  }, [editor, element]);

  // 핸들 popover 도구 — 현재 블록 path 기준으로 동작
  const path = () => { try { return editor.api.findPath(element); } catch { return null; } };
  const selectBlockStart = (p: number[]) => { const s = editor.api.start(p); if (s) editor.tf.select(s); };

  const turnInto = (value: string, close: () => void) => {
    const p = path(); if (!p) return;
    selectBlockStart(p);
    // 코드블록에서 전환 — 코드는 자식이 code_line 이라 toggleBlock 으로 바로 못 바꾼다.
    // 먼저 코드블록을 해제(코드라인 → 문단)하고, 필요하면 그 문단을 목표 타입으로 이어서 전환.
    if ((element as { type?: string }).type === "code_block") {
      if (value === "code_block") { close(); return; } // 이미 코드블록
      toggleCodeBlock(editor); // → 문단
      if (value !== "p") {
        const p2 = path(); if (p2) selectBlockStart(p2);
        if (value === "bulleted") toggleList(editor, { listStyleType: "disc" });
        else if (value === "numbered") toggleList(editor, { listStyleType: "decimal" });
        else editor.tf.toggleBlock(value);
      }
      close();
      setTimeout(() => editor.tf.focus(), 0);
      return;
    }
    const cur = (element as any).listStyleType as string | undefined;
    switch (value) {
      case "bulleted": toggleList(editor, { listStyleType: "disc" }); break;
      case "numbered": toggleList(editor, { listStyleType: "decimal" }); break;
      case "code_block": toggleCodeBlock(editor); break;
      case "p":
        if (cur) toggleList(editor, { listStyleType: cur });
        else editor.tf.toggleBlock("p");
        break;
      default: editor.tf.toggleBlock(value);
    }
    close();
    setTimeout(() => editor.tf.focus(), 0);
  };

  const duplicate = (close: () => void) => {
    const p = path(); if (!p) return;
    try {
      const clone = JSON.parse(JSON.stringify(editor.api.node(p)?.[0]));
      editor.tf.insertNodes(clone, { at: [...p.slice(0, -1), p[p.length - 1] + 1] });
    } catch { /* ignore */ }
    close();
  };

  const copyLink = (close: () => void) => {
    const id = (element as any).id;
    const base = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "";
    const url = id ? `${base}#${id}` : base;
    try { navigator.clipboard?.writeText(url); showToast(t("editor.linkCopied"), "success"); } catch { /* ignore */ }
    close();
  };

  const setBlockColor = (value: string | null, close: () => void) => {
    const p = path(); if (!p) return;
    try {
      editor.tf.select({ anchor: editor.api.start(p)!, focus: editor.api.end(p)! });
      if (value) editor.tf.addMark("color", value);
      else editor.tf.removeMark("color");
    } catch { /* ignore */ }
    close();
    setTimeout(() => editor.tf.focus(), 0);
  };

  // 글자 배경색(형광펜) — 블록 전체 텍스트에 backgroundColor 마크 적용/제거
  const setBlockBg = (value: string | null, close: () => void) => {
    const p = path(); if (!p) return;
    try {
      editor.tf.select({ anchor: editor.api.start(p)!, focus: editor.api.end(p)! });
      if (value) editor.tf.addMark("backgroundColor", value);
      else editor.tf.removeMark("backgroundColor");
    } catch { /* ignore */ }
    close();
    setTimeout(() => editor.tf.focus(), 0);
  };

  // ── 코드블록 전용 액션 ──
  const toggleWrapBlock = (close: () => void) => {
    const p = path();
    if (p) { try { editor.tf.setNodes({ wrap: !(element as any).wrap }, { at: p }); } catch { /* ignore */ } }
    close();
  };
  const copyBlockCode = (close: () => void) => {
    try {
      const text = (((element as any).children as Array<{ children?: Array<{ text?: string }> }>) || [])
        .map((line) => (line.children || []).map((leaf) => leaf.text || "").join(""))
        .join("\n");
      navigator.clipboard?.writeText(text);
      showToast(L("코드 복사됨", "Code copied"), "success");
    } catch { /* ignore */ }
    close();
  };

  const removeBlock = (close: () => void) => {
    const p = path(); if (!p) return;
    try { editor.tf.removeNodes({ at: p }); } catch { /* ignore */ }
    close();
  };

  // 최상위 블록을 이전/다음 블록과 좌우 2단(column_group)으로 묶는다 → 열블록 전환
  const columnize = (dir: "prev" | "next") => {
    const p = path(); if (!p || p.length !== 1) return;
    const idx = p[0];
    const otherIdx = dir === "next" ? idx + 1 : idx - 1;
    if (otherIdx < 0 || otherIdx >= (editor.children as unknown[]).length) return;
    const leftIdx = Math.min(idx, otherIdx);
    const rightIdx = Math.max(idx, otherIdx);
    const leftNode = JSON.parse(JSON.stringify(editor.api.node([leftIdx])?.[0]));
    const rightNode = JSON.parse(JSON.stringify(editor.api.node([rightIdx])?.[0]));
    const group = {
      type: "column_group",
      children: [
        { type: "column", width: "50%", children: [leftNode] },
        { type: "column", width: "50%", children: [rightNode] },
      ],
    } as any;
    editor.tf.withoutNormalizing(() => {
      editor.tf.removeNodes({ at: [rightIdx] }); // 큰 index 먼저 → path 유지
      editor.tf.removeNodes({ at: [leftIdx] });
      editor.tf.insertNodes(group, { at: [leftIdx] });
    });
  };

  const parentOf = (pp: number[]) => { try { return editor.api.node(pp.slice(0, -1))?.[0] as any; } catch { return null; } };
  const nodeAt = (pp: number[]) => { try { return editor.api.node(pp)?.[0] as any; } catch { return null; } };

  // 방향별 이동 가능 여부 — 최상위(순서/열전환) + 열 안(순서/열간 이동)
  const cp = path();
  const moveInfo = (() => {
    if (!cp) return { up: false, down: false, left: false, right: false };
    if (cp.length === 1) {
      const i = cp[0]; const len = (editor.children as unknown[]).length;
      return { up: i > 0, down: i < len - 1, left: i > 0, right: i < len - 1 };
    }
    const parent = parentOf(cp);
    if (parent?.type === "column") {
      const blockIdx = cp[cp.length - 1];
      const colIdx = cp[cp.length - 2];
      const colCount = (nodeAt(cp.slice(0, -2))?.children?.length) ?? 0;
      const colLen = parent.children?.length ?? 0;
      return { up: blockIdx > 0, down: blockIdx < colLen - 1, left: colIdx > 0, right: colIdx < colCount - 1 };
    }
    return { up: false, down: false, left: false, right: false };
  })();
  // 열 안 블록만 이동 버튼 노출 — 최상위 블록은 드래그(재정렬·사이드 드롭)로 충분해 중복 제거.
  const inColumn = !!(cp && cp.length > 1 && parentOf(cp)?.type === "column");

  // 블록 종류 — 전환/색상은 텍스트 계열에만. 상단엔 블록별 주요 기능(툴바 핵심) 그룹.
  const blockType = (element as TElement).type as string | undefined;
  const isTextLike = !blockType || TEXT_LIKE_BLOCKS.has(blockType);
  const isCode = blockType === "code_block";
  const isImage = blockType === "img";
  const isToggle = blockType === "toggle";
  const isCallout = blockType === "callout";

  // 현재 블록에 노드 속성 설정 (블록별 주요 기능 공통)
  const setNodeProps = (obj: Record<string, unknown>, close: () => void) => {
    const p = path();
    if (p) { try { editor.tf.setNodes(obj, { at: p }); } catch { /* ignore */ } }
    close();
  };

  // 블록 이동 실행 (위/아래=순서, 좌/우=열전환 또는 열 간 이동)
  const moveBlock = (dir: "up" | "down" | "left" | "right", close: () => void) => {
    const p = path(); if (!p) { close(); return; }
    try {
      if (p.length === 1) {
        const i = p[0]; const len = (editor.children as unknown[]).length;
        if (dir === "up" && i > 0) editor.tf.moveNodes({ at: [i], to: [i - 1] });
        else if (dir === "down" && i < len - 1) editor.tf.moveNodes({ at: [i], to: [i + 1] });
        else if (dir === "left" && i > 0) columnize("prev");
        else if (dir === "right" && i < len - 1) columnize("next");
      } else {
        const parent = parentOf(p);
        if (parent?.type === "column") {
          const blockIdx = p[p.length - 1];
          const colIdx = p[p.length - 2];
          const colPath = p.slice(0, -1);
          const groupPath = p.slice(0, -2);
          const colCount = (nodeAt(groupPath)?.children?.length) ?? 0;
          const colLen = parent.children?.length ?? 0;
          // 인접 열로 이동 — 원본 열이 비면 직접 제거 + 남은 열 정수 너비(소수 재분배 → normalize 무한루프 방지)
          const colMove = (targetColIdx: number) => {
            const target = [...groupPath, targetColIdx];
            const tgtLen = (nodeAt(target)?.children?.length) ?? 0;
            editor.tf.withoutNormalizing(() => {
              editor.tf.moveNodes({ at: p, to: [...target, tgtLen] });
              if (colLen <= 1) {
                editor.tf.removeNodes({ at: [...groupPath, colIdx] });
                const remaining = colCount - 1;
                if (remaining >= 2) {
                  const base = Math.floor(100 / remaining);
                  for (let k = 0; k < remaining; k++) {
                    const w = k < remaining - 1 ? base : 100 - base * (remaining - 1);
                    editor.tf.setNodes({ width: `${w}%` }, { at: [...groupPath, k] });
                  }
                }
              }
            });
          };
          if (dir === "up" && blockIdx > 0) editor.tf.moveNodes({ at: p, to: [...colPath, blockIdx - 1] });
          else if (dir === "down" && blockIdx < colLen - 1) editor.tf.moveNodes({ at: p, to: [...colPath, blockIdx + 1] });
          else if (dir === "left" && colIdx > 0) colMove(colIdx - 1);
          else if (dir === "right" && colIdx < colCount - 1) colMove(colIdx + 1);
        }
      }
    } catch { /* ignore */ }
    close();
  };

  // 들여쓰기(indent) 만큼 핸들 거터도 우측으로 — 콘텐츠 왼쪽에 붙어있게.
  const indentLvl = (element as any).indent as number | undefined;
  const indentPx = indentLvl
    ? ((element as any).listStyleType ? Math.max(0, indentLvl - 1) : indentLvl) * 24
    : 0;

  // 열블록 전체(column_group)는 핸들 숨김 — 안쪽 블록 핸들과 겹치므로. (드롭 대상으로는 유지)
  const isColumnGroup = (element as any).type === "column_group";

  return (
    <div
      ref={nodeRef}
      className={`${styles.blockDraggable}${toolsOpen ? ` ${styles.blockDraggableActive}` : ""}${isDragging ? ` ${styles.blockDragging}` : ""}`}
      style={{
        ...(indentPx ? ({ ["--block-indent"]: `${indentPx}px` } as React.CSSProperties) : {}),
      }}
      // 드롭 방향(상/하/좌/우)을 이 블록에서 통합 판정 → 인디케이터 하나만 표시
      onDragOver={(e) => {
        if (isDragging) { if (dropDir) setDropDir(null); return; } // 자기 자신 위는 제외
        // 이벤트가 더 깊은(중첩) 블록에서 올라온 경우 — 그 블록이 인디케이터 소유. 이 래퍼는 표시 안 함
        const deepest = (e.target as HTMLElement).closest(`.${styles.blockDraggable}`);
        if (deepest && deepest !== e.currentTarget) { if (dropDir) setDropDir(null); return; }
        const p = path();
        // 이미 상한(MAX_COLUMNS)인 열그룹엔 좌/우(열 추가) 불가 → 상/하만
        const cap = (element as any)?.type === "column_group" && ((element as any)?.children?.length ?? 0) >= MAX_COLUMNS;
        const allowSide = !!(p && p.length === 1) && !cap;
        const dir = dropDirAt(e.currentTarget.getBoundingClientRect(), e.clientX, e.clientY, allowSide);
        setDropDir((prev) => (prev === dir ? prev : dir));
      }}
      onDragLeave={(e) => {
        // 자식으로 이동한 경우 제외
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        if (dropDir) setDropDir(null);
      }}
    >
      {!isColumnGroup && (
      <div className={styles.blockDragGutter} contentEditable={false}>
        <button
          type="button"
          className={styles.blockAddBtn}
          aria-label={t("editor.addBlock")}
          title={IS_MAC ? `${t("editor.addBlockBelow")} · ⌥+${t("editor.addBlockAbove")}` : `${t("editor.addBlockBelow")} · Alt+${t("editor.addBlockAbove")}`}
          data-no-drag
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => addBlock(e.altKey)}
        >
          <Plus size={14} />
        </button>
        <Popover
          placement="bottom-start"
          contentClassName={styles.blockToolsMenu}
          onOpenChange={setToolsOpen}
          trigger={
            <button
              type="button"
              ref={handleRef as unknown as React.Ref<HTMLButtonElement>}
              className={styles.blockDragHandleBtn}
              aria-label={t("editor.blockTools")}
              title={t("editor.blockTools")}
              data-no-drag
            >
              <GripVertical size={14} />
            </button>
          }
        >
          {({ close }) => (
            <div onMouseDown={(e) => e.preventDefault()}>
              {/* 블록별 주요 기능 (해당 블록 툴바의 핵심 기능 중복) — 상단 별도 그룹 */}
              {isCode && (
                <>
                  <div className={styles.blockToolsLabel}>{L("코드", "Code")}</div>
                  <MenuItem icon={<WrapText size={15} />} label={L("줄바꿈", "Wrap")} onClick={() => toggleWrapBlock(close)} />
                  <MenuItem icon={<Copy size={15} />} label={L("코드 복사", "Copy code")} onClick={() => copyBlockCode(close)} />
                  <MenuDivider />
                </>
              )}
              {isImage && (() => {
                const cur = ((element as any).layout as string) || "inline";
                const opts = [
                  { v: "inline", icon: <Baseline size={15} />, tip: L("인라인", "Inline") },
                  { v: "block", icon: <AlignCenter size={15} />, tip: L("가운데", "Center") },
                  { v: "float-left", icon: <AlignLeft size={15} />, tip: L("좌측", "Left") },
                  { v: "float-right", icon: <AlignRight size={15} />, tip: L("우측", "Right") },
                ];
                return (
                  <>
                    <div className={styles.blockToolsLabel}>{L("이미지 정렬", "Image align")}</div>
                    <div className={styles.blockToolsTurn}>
                      {opts.map((o) => (
                        <Tooltip key={o.v} content={o.tip} placement="top" delay={200}>
                          <button type="button" className={`${styles.blockToolsTurnBtn}${cur === o.v ? ` ${styles.blockToolsTurnBtnActive}` : ""}`} onClick={() => setNodeProps({ layout: o.v }, close)}>
                            {o.icon}
                          </button>
                        </Tooltip>
                      ))}
                    </div>
                    <MenuDivider />
                  </>
                );
              })()}
              {isToggle && (() => {
                const open = (element as any).open !== false;
                return (
                  <>
                    <div className={styles.blockToolsLabel}>{L("토글", "Toggle")}</div>
                    <div className={styles.blockToolsTurn}>
                      <Tooltip content={L("펼침", "Expanded")} placement="top" delay={200}>
                        <button type="button" className={`${styles.blockToolsTurnBtn}${open ? ` ${styles.blockToolsTurnBtnActive}` : ""}`} onClick={() => setNodeProps({ open: true }, close)}>
                          <ChevronDown size={15} />
                        </button>
                      </Tooltip>
                      <Tooltip content={L("접힘", "Collapsed")} placement="top" delay={200}>
                        <button type="button" className={`${styles.blockToolsTurnBtn}${!open ? ` ${styles.blockToolsTurnBtnActive}` : ""}`} onClick={() => setNodeProps({ open: false }, close)}>
                          <ChevronRight size={15} />
                        </button>
                      </Tooltip>
                    </div>
                    <MenuDivider />
                  </>
                );
              })()}
              {isCallout && (() => {
                const hasIcon = !!(element as any).icon;
                const curBg = (element as any).bg;
                return (
                  <>
                    <div className={styles.blockToolsLabel}>{L("콜아웃 배경", "Callout background")}</div>
                    <div className={styles.blockToolsSwatches}>
                      {CALLOUT_BG_PRESETS.slice(0, 7).map((pr, i) => (
                        <Tooltip key={i} content={pr.color} placement="top" delay={200}>
                          <button type="button" className={`${styles.blockToolsSwatch}${curBg === pr.color ? ` ${styles.blockToolsSwatchActive}` : ""}`} style={{ background: pr.color }} onClick={() => setNodeProps({ bg: pr.color }, close)} />
                        </Tooltip>
                      ))}
                    </div>
                    <MenuItem icon={<Smile size={15} />} label={hasIcon ? L("이모지 제거", "Remove emoji") : L("이모지 추가", "Add emoji")} onClick={() => setNodeProps({ icon: hasIcon ? undefined : "💡" }, close)} />
                    <MenuDivider />
                  </>
                );
              })()}
              {/* 전환 — 텍스트 계열 + 코드블록(코드로 자동 변환된 걸 텍스트 등으로 되돌릴 수 있게) */}
              {(isTextLike || isCode) && (
                <>
                  <div className={styles.blockToolsLabel}>{t("editor.turnInto")}</div>
                  <div className={styles.blockToolsTurn}>
                    {TURN_INTO.map((o) => (
                      <Tooltip key={o.value} content={t(`editor.${o.labelKey}`)} placement="top" delay={200}>
                        <button type="button" className={`${styles.blockToolsTurnBtn}${isCode && o.value === "code_block" ? ` ${styles.blockToolsTurnBtnActive}` : ""}`} onClick={() => turnInto(o.value, close)}>
                          {o.icon}
                        </button>
                      </Tooltip>
                    ))}
                  </div>
                  <MenuDivider />
                </>
              )}
              <MenuItem icon={<Copy size={15} />} label={t("editor.duplicate")} onClick={() => duplicate(close)} />
              <MenuItem icon={<Link2 size={15} />} label={t("editor.copyLink")} onClick={() => copyLink(close)} />
              {/* 이동 — 열 안 블록만 (최상위는 드래그로). ↑↓ 열 안 순서 · ←→ 열 간 이동 */}
              {inColumn && (
                <>
                  <MenuDivider />
                  <div className={styles.blockToolsLabel}>{L("열 안에서 이동", "Move within columns")}</div>
                  <div className={styles.blockToolsTurn}>
                    {([
                      { dir: "up" as const, icon: <ArrowUp size={15} />, tip: L("위로", "Up"), on: moveInfo.up },
                      { dir: "down" as const, icon: <ArrowDown size={15} />, tip: L("아래로", "Down"), on: moveInfo.down },
                      { dir: "left" as const, icon: <ArrowLeft size={15} />, tip: L("왼쪽 열로", "To left column"), on: moveInfo.left },
                      { dir: "right" as const, icon: <ArrowRight size={15} />, tip: L("오른쪽 열로", "To right column"), on: moveInfo.right },
                    ]).map((m) => (
                      // 비활성 방향엔 tooltip 을 붙이지 않음 — disabled <button> 은 mouseleave 를 삼켜
                      // tooltip 이 안 꺼지고(stuck) 인접 버튼 사이에서 깜빡임. pointer-events:none 으로 이벤트도 통과.
                      <Tooltip key={m.dir} content={m.tip} placement="top" delay={200} disabled={!m.on}>
                        <button type="button" className={styles.blockToolsTurnBtn}
                          disabled={!m.on} style={!m.on ? { opacity: 0.35, cursor: "default", pointerEvents: "none" } : undefined}
                          onClick={() => moveBlock(m.dir, close)}>
                          {m.icon}
                        </button>
                      </Tooltip>
                    ))}
                  </div>
                </>
              )}
              {/* 색상 — 텍스트 계열 블록만 (글자색 + 글자 배경색/형광펜) */}
              {isTextLike && (
                <>
                  <MenuDivider />
                  <div className={styles.blockToolsLabel}><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Palette size={13} />{t("editor.textColor")}</span></div>
                  <div className={styles.blockToolsSwatches}>
                    {BLOCK_COLORS.map((c) => (
                      <Tooltip key={c.key} content={t(`editor.color_${c.key}`)} placement="top" delay={200}>
                        <button
                          type="button"
                          className={`${styles.blockToolsSwatch}${c.value ? "" : ` ${styles.blockToolsSwatchNone}`}`}
                          style={c.value ? { background: c.value } : undefined}
                          onClick={() => setBlockColor(c.value, close)}
                        />
                      </Tooltip>
                    ))}
                  </div>
                  <div className={styles.blockToolsLabel}><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Highlighter size={13} />{L("글자 배경색", "Highlight")}</span></div>
                  <div className={styles.blockToolsSwatches}>
                    {BLOCK_HIGHLIGHTS.map((c) => (
                      <Tooltip key={c.key} content={t(`editor.color_${c.key}`)} placement="top" delay={200}>
                        <button
                          type="button"
                          className={`${styles.blockToolsSwatch}${c.value ? "" : ` ${styles.blockToolsSwatchNone}`}`}
                          style={c.value ? { background: c.value } : undefined}
                          onClick={() => setBlockBg(c.value, close)}
                        />
                      </Tooltip>
                    ))}
                  </div>
                </>
              )}
              <MenuDivider />
              <MenuItem icon={<Trash2 size={15} />} label={t("editor.deleteBlock")} className={styles.blockToolsDanger} onClick={() => removeBlock(close)} />
            </div>
          )}
        </Popover>
      </div>
      )}
      {/* 열그룹 전체 이동 grip — 그룹 상단(안쪽 좌측 핸들과 위치 분리). 드래그=이동, 클릭=메뉴 */}
      {isColumnGroup && (
        <div className={styles.blockGroupHandleWrap} contentEditable={false}>
          <Popover
            placement="bottom-start"
            contentClassName={styles.blockToolsMenu}
            onOpenChange={setToolsOpen}
            trigger={
              <button
                type="button"
                ref={handleRef as unknown as React.Ref<HTMLButtonElement>}
                className={styles.blockGroupHandle}
                aria-label={L("열 레이아웃 이동", "Move columns")}
                title={L("드래그: 이동 · 클릭: 메뉴", "Drag: move · click: menu")}
                data-no-drag
              >
                <GripVertical size={13} />
              </button>
            }
          >
            {({ close }) => (
              <div onMouseDown={(e) => e.preventDefault()}>
                <MenuItem icon={<Copy size={15} />} label={t("editor.duplicate")} onClick={() => duplicate(close)} />
                <MenuItem icon={<Link2 size={15} />} label={t("editor.copyLink")} onClick={() => copyLink(close)} />
                <MenuDivider />
                <MenuItem icon={<Trash2 size={15} />} label={L("열블록 삭제", "Delete columns")} className={styles.blockToolsDanger} onClick={() => removeBlock(close)} />
              </div>
            )}
          </Popover>
        </div>
      )}
      {children}
      {/* 통합 드롭 인디케이터 — 상/하 가로선 또는 좌/우(열 생성) 세로선 중 하나만 */}
      {(dropDir === "left" || dropDir === "right") && (
        <div contentEditable={false} className={`${styles.blockDropSide} ${dropDir === "left" ? styles.blockDropSideLeft : styles.blockDropSideRight}`} />
      )}
      {(dropDir === "top" || dropDir === "bottom") && (
        <div contentEditable={false} className={`${styles.blockDropLine} ${dropDir === "bottom" ? styles.blockDropLineBottom : styles.blockDropLineTop}`} />
      )}
    </div>
  );
}
