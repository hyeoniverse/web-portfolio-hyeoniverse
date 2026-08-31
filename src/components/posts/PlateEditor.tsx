"use client";

// React Flow(다이어그램 블록) core 스타일 — 에디터 루트에서 전역 로드(pane/handle/edge 동작에 필수)
import "@xyflow/react/dist/style.css";
import React, { useState, useCallback, useEffect, useRef, useImperativeHandle, useMemo } from "react";
import type { LocalizedText } from "@/types/common";
import {
  Plate,
  PlateContent,
  usePlateEditor,
} from "platejs/react";
import type { PlateEditor } from "platejs/react";
import { ReactEditor, defaultScrollSelectionIntoView } from "slate-react";
import { insertMediaEmbed } from "@platejs/media";
import { upsertLink, unwrapLink } from "@platejs/link";
import { toggleList } from "@platejs/list";
import { outdent } from "@platejs/indent";
import { setColumns } from "@platejs/layout";
import "katex/dist/katex.min.css";
import { slateToHtml, setWrapLabel, setScrollLabel, type SlateNode } from "./plateSerializer";
import { detectCodeLanguage } from "./plate/lowlightInstance";
import { useRecentColors } from "./plate/useRecentColors";
import { makeColumnsFromDrop, addColumnToGroup, getIndentGroupChildIds } from "./plate/BlockDraggable";
import NumberInput from "@/components/ui/NumberInput";
import { _dndScrollContainer } from "./plate/utils";
import { useTheme } from "@/providers/ThemeProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import { ModalAlert } from "@/components/ui/ModalTemplates";
import styles from "./RichTextEditor.module.css";

// ── plate/ submodules ──
import type { PlateEditorProps } from "./plate/types";
export type { EditorImageInfo, PlateEditorHandle } from "./plate/types";
import { isInAncestor, getEditorText, _mathEditingSet, _imageUploadFn, _uploadErrorFn, findTextMatches } from "./plate/utils";
import { columnHasContent, insertColumnAfter, removeColumnAt } from "./plate/columnOps";
import { CHECKER_BG, COLUMN_DEFAULT_BG, COLUMN_DEFAULT_PX, COLUMN_MIN_PX, COLUMN_MAX_PX, COLUMN_GROUP_MAX_PX, COLUMN_BG_NAMED, COLUMN_LINE_NAMED, CALLOUT_BG_PRESETS, MIN_COLUMNS, MAX_COLUMNS, fitColumnsForInsert, distributeInts } from "./plate/presets";
import { ColorMenu } from "./plate/ColorMenu";
import { EditorKit } from "./plate/editor-kit";
import { showToast } from "@/stores/toastStore";

// ── hooks ──
import {
  useTableInfo,
  useBorderPopover,
  useTableActions,
} from "./plate/hooks";

// ── toolbar components ──
import MainToolbar from "./plate/toolbars/MainToolbar";
import TableToolbar from "./plate/toolbars/TableToolbar";
import ImageToolbar from "./plate/toolbars/ImageToolbar";
import VideoToolbar from "./plate/toolbars/VideoToolbar";
import FloatingBar, { FindBarRectContext } from "./plate/toolbars/FloatingBar";
import MathToolbar from "./plate/toolbars/MathToolbar";
import InlineInputToolbar from "./plate/toolbars/InlineInputToolbar";
import FloatingToolbar from "./plate/toolbars/FloatingToolbar";
import SlashMenu from "./plate/toolbars/SlashMenu";
import EmojiMenu from "./plate/toolbars/EmojiMenu";
import DateMentionMenu from "./plate/toolbars/DateMentionMenu";
import PostLinkMenu from "./plate/toolbars/PostLinkMenu";
import TBtn from "./plate/TBtn";
import { TblTrash } from "./plate/icons";
import { ListTodo, Check, ChevronUp, ChevronDown, ChevronRight, Replace, ReplaceAll, ExternalLink, Copy, Columns3, AlignHorizontalSpaceAround, CaseSensitive, CaseUpper, WholeWord, Regex, TextSelect, StretchHorizontal, Sparkles, Type, Eraser, BetweenHorizontalStart, Trash2 } from "@/components/icons";
import Popover, { MenuItem, MenuDivider } from "@/components/ui/Popover";
import Select from "@/components/ui/Select";
import CloseButton from "@/components/ui/CloseButton";
import Pressable from "@/components/ui/Pressable";

// Re-export ImagePanel for backward compatibility
export { ImagePanel } from "./plate/ImagePanel";

// ── Find highlight leaf renderer (stable reference) ──
// Plate 의 RenderLeafFn 시그니처를 따르되 leaf 의 동적 hl 필드는 narrow 한 record 로 캐스팅
type FindLeafExtras = { findHighlight?: boolean; findCurrent?: boolean };

// ── Find & Replace 순수 헬퍼 ──
type EditorPoint = { path: number[]; offset: number };
const cmpPath = (p: number[], q: number[]): number => {
  const n = Math.min(p.length, q.length);
  for (let i = 0; i < n; i++) if (p[i] !== q[i]) return p[i] < q[i] ? -1 : 1;
  return p.length - q.length;
};
const cmpPoint = (a: EditorPoint, b: EditorPoint): number => {
  const c = cmpPath(a.path, b.path);
  return c !== 0 ? c : a.offset - b.offset;
};
// scope(선택 영역) 안에 매치가 완전히 포함되는가
const inScope = (m: { path: number[]; offset: number; length: number }, scope: { start: EditorPoint; end: EditorPoint }): boolean =>
  cmpPoint({ path: m.path, offset: m.offset }, scope.start) >= 0 && cmpPoint({ path: m.path, offset: m.offset + m.length }, scope.end) <= 0;
// 원본 대소문자 패턴을 치환어에 이식(preserve case): ALLCAPS / Capitalized / lowercase
const applyCase = (found: string, repl: string): string => {
  if (!repl || !found) return repl;
  if (found === found.toUpperCase() && found !== found.toLowerCase()) return repl.toUpperCase();
  if (found === found.toLowerCase()) return repl.toLowerCase();
  if (found[0] === found[0].toUpperCase() && found.slice(1) === found.slice(1).toLowerCase())
    return repl.charAt(0).toUpperCase() + repl.slice(1).toLowerCase();
  return repl;
};

const renderFindLeaf = (props: import("platejs").RenderLeafProps) => {
  const { children, attributes } = props;
  const leaf = props.leaf as typeof props.leaf & FindLeafExtras;
  if (leaf.findHighlight) {
    const isCurrent = leaf.findCurrent;
    return <span {...attributes} style={{
      backgroundColor: isCurrent ? "var(--color-info, #3b82f6)" : "var(--color-neutral-alpha-10)",
      borderRadius: 2,
      color: isCurrent ? "#fff" : undefined,
      outline: isCurrent ? undefined : "1px solid var(--color-neutral-alpha-20)",
    }}>{children}</span>;
  }
  return <span {...attributes}>{children}</span>;
};

// float/block 이미지가 텍스트와 한 문단에 섞여 있으면 [전][이미지][후] 문단으로 분리.
// 이미지는 inline void 라 같은 문단에 섞일 수 있는데, 그러면 블록 드래그 시 통째로 이동된다.
// 콘텐츠 로드(deserialize) 직후 1회 적용 — 노드 배열만 가공(순수 함수)해 normalize 타이밍 의존 X.
function isolateFloatImageBlocks(nodes: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const isFloatImg = (c: Record<string, unknown>) =>
    c?.type === "img" && (c.layout === "block" || (typeof c.layout === "string" && (c.layout as string).startsWith("float")));
  const meaningful = (c: Record<string, unknown>) =>
    typeof c.text === "string" ? (c.text as string).replace(/[​‌‍﻿\s]/g, "").length > 0 : true;
  const pad = (a: Array<Record<string, unknown>>) => {
    const arr = [...a];
    if (!arr.length || typeof arr[0]?.text !== "string") arr.unshift({ text: "" });
    if (typeof arr[arr.length - 1]?.text !== "string") arr.push({ text: "" });
    return arr;
  };
  const out: Array<Record<string, unknown>> = [];
  for (const block of nodes) {
    const kids = block?.children as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(kids)) { out.push(block); continue; }
    const imgIdx = kids.findIndex(isFloatImg);
    if (imgIdx === -1) { out.push(block); continue; }
    const before = kids.slice(0, imgIdx);
    const after = kids.slice(imgIdx + 1);
    const hasBefore = before.some(meaningful);
    const hasAfter = after.some(meaningful);
    if (!hasBefore && !hasAfter) { out.push(block); continue; }
    const blockType = typeof block.type === "string" ? block.type : "p";
    if (hasBefore) out.push({ ...block, type: blockType, children: pad(before) });
    out.push({ type: "p", children: [{ text: "" }, kids[imgIdx], { text: "" }] });
    // 뒤쪽에 또 float 이미지가 있을 수 있으니 재귀
    if (hasAfter) out.push(...isolateFloatImageBlocks([{ ...block, type: blockType, children: pad(after) }]));
  }
  return out;
}

// Plate deserialize 는 블록의 margin-left(들여쓰기)를 버린다 → 저장 HTML 의 margin-left 를 읽어 indent 복원.
// 최상위 블록 element ↔ 노드를 순서+타입으로 대응(불일치 시 스킵해 안전). 리스트(li+data-indent)는 자체 경로라 제외.
const INDENT_TAG_TYPE: Record<string, string> = { P: "p", H1: "h1", H2: "h2", H3: "h3", H4: "h4", H5: "h5", H6: "h6", BLOCKQUOTE: "blockquote" };
function restoreBlockIndent(html: string, nodes: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  if (typeof window === "undefined" || !html) return nodes;
  try {
    // el.children ↔ node.children 를 병렬로 재귀 순회 → 최상위뿐 아니라 열/탭 등 컨테이너 "안쪽"
    // 블록의 indent 도 복원. (안 하면 열에 넣은 묶인 블록/들여쓴 블록이 로드 시 풀린다.)
    const walk = (els: Element[], nodeList: Array<Record<string, unknown>>) => {
      for (let i = 0; i < Math.min(els.length, nodeList.length); i++) {
        const el = els[i] as HTMLElement;
        const node = nodeList[i];
        if (!el || !node) continue;
        const t = INDENT_TAG_TYPE[el.tagName];
        if (t && node.type === t && !node.listStyleType) {
          const ml = parseInt(el.style.marginLeft || "", 10);
          if (ml > 0) node.indent = Math.round(ml / 24);
        }
        // 컨테이너(열/탭/토글/콜아웃…) 내부로 재귀. 텍스트 리프는 children 이 없어 자동 종료.
        if (Array.isArray(node.children) && el.children.length) {
          walk(Array.from(el.children), node.children as Array<Record<string, unknown>>);
        }
      }
    };
    walk(Array.from(new DOMParser().parseFromString(html, "text/html").body.children), nodes);
  } catch { /* noop */ }
  return nodes;
}

// ── detached(본문에서 제거된) 미디어를 저장 HTML 에 숨김 div 로 round-trip ──
// 본문엔 안 보이지만 저장/로드 시 패널의 "삭제됨" 목록을 유지하기 위함.
// detached 가 없으면 빈 문자열 → 일반 글의 저장 HTML 은 그대로(영향 0).
function serializeDetachedMedia(items: { url: string; mediaType?: string }[]): string {
  if (!items.length) return "";
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<div data-detached-media="1" style="display:none">${items
    .map((d) => `<img src="${esc(d.url)}" data-detached-type="${esc(d.mediaType || "")}" />`)
    .join("")}</div>`;
}
function stripDetachedMedia(html: string): string {
  return html.replace(/<div data-detached-media="1"[\s\S]*?<\/div>/g, "");
}
function extractDetachedMedia(html: string): { url: string; mediaType?: string }[] {
  const block = html.match(/<div data-detached-media="1"[\s\S]*?<\/div>/);
  if (!block) return [];
  const out: { url: string; mediaType?: string }[] = [];
  const re = /<img\s[^>]*?src="([^"]*)"[^>]*?>/g;
  const unesc = (s: string) => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  let im: RegExpExecArray | null;
  while ((im = re.exec(block[0])) !== null) {
    const url = unesc(im[1]);
    const tm = im[0].match(/data-detached-type="([^"]*)"/);
    out.push({ url, mediaType: tm && tm[1] ? unesc(tm[1]) : undefined });
  }
  return out;
}

// 열 너비를 정수 %로 균등 분배(합=정확히 100). @platejs/layout normalizer 는 열 너비 합이
// 100 이 아니면 소수 보정을 반복 → 부동소수점 때문에 수렴 못 하고 normalize 무한루프.
// 항상 정수 합 100 을 보장해 normalizer 가 손대지 않게 한다.
function equalColWidths(n: number): string[] {
  const base = Math.floor(100 / n);
  return Array.from({ length: n }, (_, i) => `${i < n - 1 ? base : 100 - base * (n - 1)}%`);
}

// weights → 정수 %(각 ≥1, 합 = total). @platejs/layout normalizer 는 열 width 합이 정확히 100 이 아니면
// 매 dirty 마다 재분배해 무한 normalize 루프(Slate throw)를 유발하므로, 모든 % 지정은 반드시 이걸 통과시킨다.
// total ≥ weights.length 필요 — 열 ≤ 12, total=100 이면 항상 성립. (largest-remainder 라운딩)

// 각 열의 **실제 렌더 폭**(px) — px/%/드래그 무엇이든 현재 값을 그대로 반영한다.
// (px 렌더는 flex: 0 0 <px> 라 measured === widthPx)
// 모듈 레벨인 이유: 열 레이아웃 popover 의 label 라인(총 너비)과 아래 ColumnWidthControls 가
// 반드시 같은 수를 봐야 해서 — 각자 재면 반올림이 갈려 라벨과 % 칸이 서로 안 맞는다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function measureColumnPxs(editor: any, activePath: number[], count: number): number[] {
  return Array.from({ length: count }, (_, i) => {
    try {
      const entry = editor.api.node([...activePath, i]);
      if (!entry) return 0;
      const dom = editor.api.toDOMNode(entry[0]) as HTMLElement | null;
      return Math.round(dom?.getBoundingClientRect().width ?? 0);
    } catch { return 0; }
  }).map((w) => w || 1);
}

// ── Column width — 열마다 % 칸 + px 칸(둘 다 항상 활성, 토글 없음). ──
// %: 페이지 폭에 맞춰(합 100) 재분배 + px 고정 해제. px: 그 열만 정확한 px(합이 넘치면 가로 스크롤 = 화면보다 넓게).
function ColumnWidthControls({ colChildren, colCount, activePath, editor, language, tGroupMax }: {
  colChildren: { width?: string; widthPx?: number }[];
  colCount: number;
  activePath: number[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any;
  language: string;
  /** editor.columnGroupMaxWidth 문구 — "{{max}}" 치환용 (드래그(elements.tsx)와 같은 문구를 공유) */
  tGroupMax: string;
}) {
  const L = (ko: string, en: string) => (language === "ko" ? ko : en);
  const clampPx = (w: number) => Math.min(COLUMN_MAX_PX, Math.max(COLUMN_MIN_PX, Math.round(w)));
  const pxs = measureColumnPxs(editor, activePath, colChildren.length);
  const totalPx = pxs.reduce((a, b) => a + b, 0) || 1;
  const hasPx = colChildren.some((c) => typeof c.widthPx === "number" && c.widthPx > 0);
  // % 입력 → "블록 너비 기준" 재비율(페이지에 강제로 안 맞춤). 모드 보존:
  //  · px 블록(폭 고정/오버플로): 블록 총폭 유지한 채 그 열을 v%, 나머지는 현재 비율로 px 재분배.
  //  · fill 블록(유동): 정수 %(합 100, 크래시 방지) 재분배 — 유동 채움 유지.
  const applyPercent = (idx: number, v: number) => {
    const n = colCount;
    if (hasPx) {
      const clampedV = Math.max(1, Math.min(99, Math.round(v)));
      const targetPx = Math.max(COLUMN_MIN_PX, Math.round((totalPx * clampedV) / 100));
      const otherIdxs = pxs.map((_, i) => i).filter((i) => i !== idx);
      const otherTotal = otherIdxs.reduce((a, i) => a + pxs[i], 0) || 1;
      const remaining = Math.max(0, totalPx - targetPx);
      editor.tf.withoutNormalizing(() => {
        editor.tf.setNodes({ widthPx: clampPx(targetPx) }, { at: [...activePath, idx] });
        otherIdxs.forEach((i) => editor.tf.setNodes({ widthPx: clampPx((remaining * pxs[i]) / otherTotal) }, { at: [...activePath, i] }));
      });
      return;
    }
    const clampedV = Math.max(1, Math.min(100 - (n - 1), Math.round(v))); // 나머지 열이 각 ≥1 되도록 상한 제한
    const otherIdxs = pxs.map((_, i) => i).filter((i) => i !== idx);
    const others = distributeInts(100 - clampedV, otherIdxs.map((i) => pxs[i])); // n-1 개, 합 = 100-clampedV
    const result = pxs.map(() => 0);
    result[idx] = clampedV;
    otherIdxs.forEach((i, k) => { result[i] = others[k]; });
    editor.tf.withoutNormalizing(() => {
      result.forEach((wv, j) => editor.tf.setNodes({ width: `${wv}%`, widthPx: null }, { at: [...activePath, j] }));
    });
  };
  /* px 입력 → 그 열을 정확한 px 로 고정. width(%) 는 그대로 둔다(normalizer 가 합 100 유지 → 루프 방지).

     한 열만 px 로 바꾸면 안 된다: 나머지 열은 유동(flex: weight 1 0)이라 남는 공간을 **흡수**해서
     총폭이 컨테이너(=화면) 폭에 묶인다 — 열을 넓혀도 다른 열이 줄어들 뿐 블록이 안 커진다.
     그래서 px 를 지정하는 순간, 아직 유동인 열들도 지금 렌더 폭 그대로 px 로 고정한다.
     그러면 총폭 = px 들의 합이 되어 화면보다 넓어질 수 있고, 넘치면 그룹이 가로 스크롤한다. */
  const setPxWidth = (idx: number, v: number) => {
    /* 열 하나 상한(COLUMN_MAX_PX) 안내는 공통 NumberInput 이 이미 띄우고 clamp 까지 한다 — 여기서 중복 안내 안 함.
       하지만 **블록 전체 상한**은 NumberInput 이 모른다(자기 max 는 열 하나 기준). 그래서 여기서 본다. */
    const othersSum = pxs.reduce((sum, w, i) => (i === idx ? sum : sum + w), 0);
    const groupRoom = COLUMN_GROUP_MAX_PX - othersSum;
    let applied = v;
    if (v > groupRoom) {
      applied = Math.max(COLUMN_MIN_PX, groupRoom);
      showToast(tGroupMax.replace("{{max}}", String(COLUMN_GROUP_MAX_PX)), "info");
    }
    editor.tf.withoutNormalizing(() => {
      colChildren.forEach((c, i) => {
        if (i === idx) return;
        if (typeof c?.widthPx === "number" && c.widthPx > 0) return; // 이미 px 고정
        editor.tf.setNodes({ widthPx: clampPx(pxs[i]) }, { at: [...activePath, i] });
      });
      editor.tf.setNodes({ widthPx: clampPx(applied) }, { at: [...activePath, idx] });
    });
  };
  return (
    <div className={styles.colWidthList}>
      {colChildren.map((_, i) => (
        <div key={i} className={styles.colWidthRow}>
          <span className={styles.colWidthIdx}>{i + 1}</span>
          <NumberInput value={Math.max(1, Math.round((pxs[i] / totalPx) * 100))} onCommit={(n) => applyPercent(i, n)} min={1} max={99} step={1} unit="%" width={26} height={24} ariaLabel={L(`열 ${i + 1} 너비 %`, `Column ${i + 1} width %`)} />
          <NumberInput value={clampPx(pxs[i])} onCommit={(n) => setPxWidth(i, n)} min={COLUMN_MIN_PX} max={COLUMN_MAX_PX} step={10} unit="px" width={40} height={24} ariaLabel={L(`열 ${i + 1} 너비 px`, `Column ${i + 1} width px`)} />
        </div>
      ))}
    </div>
  );
}

// 다중 블록 선택 시 — 텍스트 하이라이트 대신 블록 전체에 배경 표시.
// selection 이 두 개 이상의 top-level 블록에 걸치면 해당 블록 DOM 에 data-block-selected 부여.
function MultiBlockHighlight({ editor }: { editor: PlateEditor }) {
  useEffect(() => {
    const root = document.querySelector('[data-slate-editor="true"]') as HTMLElement | null;
    if (!root) return;
    const CLIP_VARS = ["--a-l", "--a-t", "--a-w", "--a-h", "--b-l", "--b-t", "--b-w", "--b-h"];
    const clearClip = (el: HTMLElement) => { el.removeAttribute("data-float-clip"); CLIP_VARS.forEach((v) => el.style.removeProperty(v)); };
    const TBL_VARS = ["--tbl-l", "--tbl-t", "--tbl-w", "--tbl-h"];
    const clearTbl = (el: HTMLElement) => { el.removeAttribute("data-tbl-tint"); TBL_VARS.forEach((v) => el.style.removeProperty(v)); };
    const clear = () => root.querySelectorAll("[data-block-selected]").forEach((el) => {
      el.removeAttribute("data-block-selected");
      el.removeAttribute("data-sel-merge-up");
      el.removeAttribute("data-sel-merge-down");
      clearClip(el as HTMLElement);
      clearTbl(el as HTMLElement);
    });
    // 표 블록 tint — 래퍼(.blockDraggable)는 스크롤 패딩·행밴드·풀폭까지 포함해 표보다 크므로,
    // 실제 <table> rect 를 재서 tint 를 표에 딱 맞춘다(사방 --tint-inset=6px). float-clip 과 동일 패턴.
    const applyTableTint = (block: HTMLElement) => {
      const tbl = block.querySelector("table");
      if (!tbl) { clearTbl(block); return false; }
      const cr = block.getBoundingClientRect();
      const tr = tbl.getBoundingClientRect();
      // 가로 스크롤(넓은 표)일 때 표 좌/우가 스크롤 뷰포트 밖으로 나가면 tint 가 넘치므로 뷰포트로 클램프.
      const scroll = block.querySelector("[data-tbl-scroll]") as HTMLElement | null;
      const sr = scroll ? scroll.getBoundingClientRect() : null;
      const left = sr ? Math.max(tr.left, sr.left) : tr.left;
      const right = sr ? Math.min(tr.right, sr.right) : tr.right;
      const INSET = 6;
      block.style.setProperty("--tbl-l", `${left - cr.left - INSET}px`);
      block.style.setProperty("--tbl-t", `${tr.top - cr.top - INSET}px`);
      block.style.setProperty("--tbl-w", `${Math.max(0, right - left) + 2 * INSET}px`);
      block.style.setProperty("--tbl-h", `${tr.height + 2 * INSET}px`);
      block.setAttribute("data-tbl-tint", "");
      return true;
    };
    // 블록 래퍼의 indent(px) — 실제 여백은 안쪽 slate element 의 margin-left 에 있다(래퍼는 full-width).
    // 양수 margin(24·48…)만 indent 로 취급. 열블록 컨테이너의 marginLeft:-40(핸들 공간용 레이아웃 hack) 같은
    // 음수/0 은 indent 가 아니므로 0 으로 — 안 그러면 열블록 아래 블록이 "더 들여썼다"고 잘못 판정돼 merge 됨.
    const indentPx = (el: HTMLElement) => {
      const inner = el.querySelector('[data-slate-node="element"]') as HTMLElement | null;
      const ml = inner ? parseFloat(inner.style.marginLeft) : 0;
      return Number.isFinite(ml) && ml > 0 ? ml : 0;
    };
    // float 이미지가 겹치는 블록은 선택 배경을 2조각(이미지 옆 ::before / 아래 ::after)으로 나눠 이미지 영역을 비움
    const applyClip = (block: HTMLElement, floats: HTMLElement[]) => {
      const br = block.getBoundingClientRect();
      const f = floats.find((fi) => {
        const fr = fi.getBoundingClientRect();
        return fr.right > br.left + 1 && fr.left < br.right - 1 && fr.bottom > br.top + 1 && fr.top < br.bottom - 1;
      });
      if (!f) { clearClip(block); return; }
      const fr = f.getBoundingClientRect();
      const bw = br.width, bh = br.height;
      const GAP = 10; // 이미지와 배경 조각 사이 간격
      const ih = Math.max(0, Math.min(fr.bottom - br.top, bh)); // 이미지 하단(블록 기준)
      const side = f.getAttribute("data-float-side") || "left";
      // ::before = 이미지 옆(전체 높이), ::after = 이미지 아래(이미지 폭까지만) — 서로 안 겹치게(반투명 중첩 방지)
      if (side === "left") {
        const iw = Math.max(0, Math.min(fr.right - br.left, bw)); // 이미지 우측
        block.style.setProperty("--a-l", `${iw + GAP}px`);
        block.style.setProperty("--a-w", `${Math.max(0, bw - iw - GAP + 8)}px`);
        block.style.setProperty("--b-l", `-8px`);
        block.style.setProperty("--b-w", `${iw + GAP + 8}px`);
      } else {
        const il = Math.max(0, Math.min(fr.left - br.left, bw)); // 이미지 좌측
        block.style.setProperty("--a-l", `-8px`);
        block.style.setProperty("--a-w", `${Math.max(0, il - GAP + 8)}px`);
        block.style.setProperty("--b-l", `${il - GAP}px`);
        block.style.setProperty("--b-w", `${Math.max(0, bw - il + GAP + 8)}px`);
      }
      block.style.setProperty("--a-t", `-2px`);
      block.style.setProperty("--a-h", `${bh + 4}px`);
      block.style.setProperty("--b-t", `${ih + GAP}px`);
      block.style.setProperty("--b-h", `${Math.max(0, bh - ih - GAP + 2)}px`);
      block.setAttribute("data-float-clip", side);
    };
    // 블록 래퍼 찾기 — 루트 또는 data-block-container(탭 패널·컬럼 등) 의 직속 자식까지 올라간다.
    // → top-level 뿐 아니라 중첩 컨테이너 안의 멀티블록 선택도 같은 부모 형제로 잡힘.
    const isBoundary = (p: HTMLElement | null) => !!p && (p === root || p.hasAttribute("data-block-container"));
    const blockOf = (node: Node | null): HTMLElement | null => {
      let el: HTMLElement | null = node ? (node.nodeType === 3 ? node.parentElement : (node as HTMLElement)) : null;
      while (el && el.parentElement && !isBoundary(el.parentElement)) el = el.parentElement;
      return el && isBoundary(el.parentElement) ? el : null;
    };
    // DOM selection 을 직접 읽어 selectionchange 에 즉시 토글 — slate 의 raf 갱신 지연/리렌더를 안 거쳐 깜빡임 없음
    const apply = () => {
      clear();
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !root.contains(sel.anchorNode) || !root.contains(sel.focusNode)) {
        root.removeAttribute("data-multiblock");
        return;
      }
      const aB = blockOf(sel.anchorNode);
      const fB = blockOf(sel.focusNode);
      if (!aB || !fB) { root.removeAttribute("data-multiblock"); return; }
      // 단일 블록이면 "통째로"(블록 처음~끝) 선택된 경우만 블록 tint — 부분 텍스트 선택은 그대로 텍스트 하이라이트.
      // (경계 클릭·블록 전체선택은 start~end 로 선택). slate selection 으로 판정(gutter chrome 영향 없게).
      if (aB === fB) {
        let coversFull = false;
        try {
          const s = editor.selection;
          if (s && !editor.api.isCollapsed()) {
            const topPath = [s.anchor.path[0]];
            const [pStart, pEnd] = editor.api.edges(s)!;
            coversFull = !!editor.api.isStart(pStart, topPath) && !!editor.api.isEnd(pEnd, topPath);
          }
        } catch { /* noop */ }
        if (!coversFull) { root.removeAttribute("data-multiblock"); return; }
      }
      root.setAttribute("data-multiblock", "");
      const floats = Array.from(root.querySelectorAll("[data-float-side]")) as HTMLElement[];
      let start = aB, end = fB;
      if (aB.compareDocumentPosition(fB) & Node.DOCUMENT_POSITION_PRECEDING) { start = fB; end = aB; }
      let cur: HTMLElement | null = start;
      const selBlocks: HTMLElement[] = [];
      while (cur) {
        cur.setAttribute("data-block-selected", "");
        // 표 블록은 실제 표 rect 로 tint 맞춤(float-clip 대신). 나머지는 기존 float-clip.
        if (applyTableTint(cur)) clearClip(cur);
        else if (floats.length) applyClip(cur, floats);
        else clearClip(cur);
        selBlocks.push(cur);
        if (cur === end) break;
        cur = cur.nextElementSibling as HTMLElement | null;
      }
      // "묶인 블록"(indent 그룹 — 부모 + 더 깊게 들여쓴 자식들)끼리만 배경을 이어붙인다.
      // merge-down: 아래 블록과 이어짐 / merge-up: 위 블록과 이어짐. 무관한 top-level 블록은 각자 박스로 남긴다.
      let rootIndent = indentPx(selBlocks[0]);
      for (let i = 1; i < selBlocks.length; i++) {
        const ind = indentPx(selBlocks[i]);
        const prevInd = indentPx(selBlocks[i - 1]);
        if (ind > rootIndent || (ind === prevInd && ind > 0)) {
          selBlocks[i].setAttribute("data-sel-merge-up", "");
          selBlocks[i - 1].setAttribute("data-sel-merge-down", "");
        } else {
          rootIndent = ind; // 들여쓰기가 그룹 기준선 이하로 내려오면 새 그룹 시작
        }
      }
    };
    // tint 좌표(표 rect·float-clip)는 고정 px 라, 리사이즈·스크롤·레이아웃 변경 시 재측정해야 안 어긋난다.
    // rAF 로 프레임당 1회로 throttle. selection 없으면 apply 가 즉시 early-return 이라 유휴 비용 없음.
    let raf = 0;
    const schedule = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; apply(); }); };
    document.addEventListener("selectionchange", apply);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true); // capture — 에디터/표 등 어떤 스크롤 컨테이너든
    const ro = new ResizeObserver(schedule);
    ro.observe(root);
    return () => {
      document.removeEventListener("selectionchange", apply);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
      root.removeAttribute("data-multiblock");
      clear();
    };
  }, [editor]);
  return null;
}

// float-left 이미지 옆 블록에 --float-edge(이미지 우측+gap) 설정 → 핸들·placeholder 를 이미지 옆으로.
// 실제론 float-wrap 이지만 핸들/placeholder 가 이미지 영역을 피해 flow-root 처럼 보이게.
function FloatEdgeAdjust() {
  useEffect(() => {
    const root = document.querySelector('[data-slate-editor="true"]') as HTMLElement | null;
    if (!root) return;
    const MARGIN = 20; // float 이미지 margin-right — 텍스트 입력 시작 위치와 일치
    const update = () => {
      const blocks = Array.from(root.children) as HTMLElement[];
      blocks.forEach((b) => b.style.removeProperty("--float-edge"));
      const floats = Array.from(root.querySelectorAll('[data-float-side="left"]')) as HTMLElement[];
      if (!floats.length) return;
      for (const f of floats) {
        const fr = f.getBoundingClientRect();
        for (const b of blocks) {
          const br = b.getBoundingClientRect();
          if (fr.right > br.left && fr.left < br.right && fr.bottom > br.top + 2 && fr.top < br.bottom - 2) {
            const edge = Math.max(0, fr.right - br.left) + MARGIN;
            const prev = parseFloat(b.style.getPropertyValue("--float-edge")) || 0;
            if (edge > prev) b.style.setProperty("--float-edge", `${edge}px`);
          }
        }
      }
    };
    update();
    // 레이아웃 변화(리사이즈/이미지 로드)·구조 변화(블록 추가삭제) 시 갱신.
    // (style 변경은 attributeFilter 에서 제외 → --float-edge 설정이 무한 루프 안 일으킴)
    const ro = new ResizeObserver(update);
    ro.observe(root);
    const mo = new MutationObserver(update);
    mo.observe(root, { childList: true, subtree: true });
    const onLoad = () => update();
    root.querySelectorAll("img").forEach((img) => img.addEventListener("load", onLoad));
    return () => { ro.disconnect(); mo.disconnect(); root.querySelectorAll("img").forEach((img) => img.removeEventListener("load", onLoad)); };
  }, []);
  return null;
}

// ── Main component ──
export default function PlateEditor({
  value,
  onChange,
  onImageUpload,
  editorRef,
  postLang,
  onHtmlModeChange,
}: PlateEditorProps) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { openModal } = useModalStore();

  // 업로드 실패 — 상세 사유 모달. 서버가 사유를 주면 그대로, 상태코드만/빈 사유면 힌트 추가.
  // (ImagePanel.showUploadError 와 동일 규칙 — 모든 삽입 진입점이 공유)
  const showMediaError = useCallback((err: unknown) => {
    const raw = err instanceof Error ? err.message : "";
    const generic = !raw || /\(\d{3}\)/.test(raw);
    const desc = generic ? `${raw || t("editor.uploadFail")}\n\n${t("editor.uploadFailHint")}` : raw;
    openModal(
      <ModalAlert desc={desc} />,
      { id: "media-upload-error", header: { title: t("editor.uploadFail") }, closeButton: true, width: "400px" },
    );
  }, [openModal, t]);

  const isInternalUpdate = useRef(false);
  const prevValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  _imageUploadFn.current = onImageUpload || null;
  _uploadErrorFn.current = showMediaError;
  const lastSlateValueRef = useRef<SlateNode[] | undefined>(undefined);
  const [tick, setTick] = useState(0);
  const [isMac, setIsMac] = useState(false);
  useEffect(() => { setIsMac(/Mac|iPhone|iPad/.test(navigator.platform)); }, []);



  // ── Labels (language 변경 시에만 재설정) ──
  useEffect(() => {
    setWrapLabel(`↩ ${t("common.codeWrap")}`);
    setScrollLabel(`↔ ${t("common.codeScroll")}`);
  }, [t]);

  // ── Inline input states ──
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const [linkForm, setLinkForm] = useState({ url: "", text: "", protocol: "https://" as string, target: "_blank" as string });
  const [showEmbedInput, setShowEmbedInput] = useState(false);
  const [embedInputValue, setEmbedInputValue] = useState("");
  const linkUrlRef = useRef<HTMLInputElement>(null);
  const embedInputRef = useRef<HTMLInputElement>(null);

  // ── HTML mode ──
  const [htmlMode, setHtmlMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState("");

  // ── Find & Replace ──
  const [findOpen, setFindOpen] = useState(false);
  const [findReplace, setFindReplace] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [findCase, setFindCase] = useState(false);
  const [findWord, setFindWord] = useState(false);
  const [findRegex, setFindRegex] = useState(false);
  const [findIdx, setFindIdx] = useState(0);
  const findInputRef = useRef<HTMLInputElement>(null);
  // 선택 영역에서 찾기(≡) — 켤 때 현재 선택 범위를 scope 로 캡처, 매치/하이라이트를 그 안으로 한정.
  const [findInSel, setFindInSel] = useState(false);
  const [findSelScope, setFindSelScope] = useState<{ start: EditorPoint; end: EditorPoint } | null>(null);
  // 바꿀 때 원본 대소문자 유지(AB)
  const [preserveCase, setPreserveCase] = useState(false);
  // 검색 기록(⇅) — 입력창에서 ↑/↓ 로 이전 검색어 순환. 세션 메모리(ref)라 재렌더 유발 안 함.
  const findHistoryRef = useRef<string[]>([]);
  const histIdxRef = useRef(-1);
  // Find 바가 스스로 보고하는 화면 rect — 컨텍스트 바가 이걸 피해 clamp(FindBarRectContext 로 공유).
  const [findBarRect, setFindBarRect] = useState<{ top: number; bottom: number; left: number; right: number } | null>(null);

  // ── Math editing ──
  const [mathEditing, setMathEditing] = useState(false);
  _mathEditingSet.current = setMathEditing;

  const editor = usePlateEditor({
    plugins: EditorKit,
    value: stripDetachedMedia(value || "<p></p>"),
  });

  // 현재 블록을 dir 로 이동 (상/하: 순서, 좌/우: 열 이동·생성). 편집모드(Alt+Shift)·블록모드 공용.
  const moveBlockDir = useCallback((dir: "up" | "down" | "left" | "right"): boolean => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeAt = (p: number[]) => { try { return editor.api.node(p)?.[0] as any; } catch { return null; } };
    try {
      const entry = editor.api.block();
      if (!entry) return false;
      const path = entry[1] as number[];
      const parent = path.length > 1 ? nodeAt(path.slice(0, -1)) : null;
      const isTop = path.length === 1;
      const inColumn = parent?.type === "column";
      if (!isTop && !inColumn) return false;
      if (isTop) {
        const i = path[0]; const len = (editor.children as unknown[]).length;
        if (nodeAt([i])?.type === "column_group") return false; // 열블록 자체는 이동 X (중첩 방지)
        if (dir === "up" && i > 0) editor.tf.moveNodes({ at: [i], to: [i - 1] });
        else if (dir === "down" && i < len - 1) editor.tf.moveNodes({ at: [i], to: [i + 1] });
        else if (dir === "left" && i > 0) {
          // 왼쪽으로 = (그룹이) 오른쪽 열, 위 블록(i-1)이 왼쪽 열
          if (nodeAt([i - 1])?.type === "column_group") addColumnToGroup(editor, i, i - 1, "right");
          else makeColumnsFromDrop(editor, i, i - 1, "right");
        } else if (dir === "right") {
          // 오른쪽으로 = (그룹이) 왼쪽 열, 그룹 "다음" 블록이 오른쪽 열.
          // 묶인 블록이면 i+1 은 자기 자식이므로 그룹 span 만큼 건너뛴 블록을 대상으로.
          let span = 0;
          try { const gid = nodeAt([i])?.id; if (gid != null) span = getIndentGroupChildIds(editor, gid).childIds.length; } catch { /* noop */ }
          const t = i + span + 1;
          if (t > len - 1) return false;
          if (nodeAt([t])?.type === "column_group") addColumnToGroup(editor, i, t, "left");
          else makeColumnsFromDrop(editor, i, t, "left");
        } else return false;
        return true;
      }
      // 열 안 블록 — 상/하: 열 내 순서, 좌/우: 인접 열로
      const bIdx = path[path.length - 1], colIdx = path[path.length - 2];
      const colPath = path.slice(0, -1), groupPath = path.slice(0, -2);
      const colCount = nodeAt(groupPath)?.children?.length ?? 0;
      const colLen = parent.children?.length ?? 0;
      const colMove = (targetColIdx: number) => {
        const tgt = [...groupPath, targetColIdx];
        const tgtLen = nodeAt(tgt)?.children?.length ?? 0;
        editor.tf.withoutNormalizing(() => {
          editor.tf.moveNodes({ at: path, to: [...tgt, tgtLen] });
          if (colLen <= 1) {
            editor.tf.removeNodes({ at: [...groupPath, colIdx] });
            const remaining = colCount - 1;
            if (remaining >= 2) {
              const ws = equalColWidths(remaining);
              for (let k = 0; k < remaining; k++) editor.tf.setNodes({ width: ws[k] }, { at: [...groupPath, k] });
            }
          }
        });
      };
      if (dir === "up" && bIdx > 0) editor.tf.moveNodes({ at: path, to: [...colPath, bIdx - 1] });
      else if (dir === "down" && bIdx < colLen - 1) editor.tf.moveNodes({ at: path, to: [...colPath, bIdx + 1] });
      else if (dir === "left" && colIdx > 0) colMove(colIdx - 1);
      else if (dir === "right" && colIdx < colCount - 1) colMove(colIdx + 1);
      else return false;
      return true;
    } catch { return false; }
  }, [editor]);

  // 코드블록에 붙여넣을 때 언어 자동감지 — 네이티브 paste 리스너(React 합성 이벤트가 Plate 에
  // 가로채여 안 잡히는 경우가 있어 DOM 레벨로 확실히 잡는다). 아직 언어 미지정/plaintext 일 때만.
  useEffect(() => {
    if (!editor) return;
    let el: HTMLElement | null = null;
    const onPaste = (e: ClipboardEvent) => {
      try {
        const cb = editor.api.above({ match: { type: "code_block" } });
        if (!cb) return;
        const [node, path] = cb as [{ lang?: string }, number[]];
        if (node.lang && node.lang !== "plaintext") return;
        const detected = detectCodeLanguage(e.clipboardData?.getData("text/plain") ?? "");
        if (!detected) return;
        setTimeout(() => {
          try { editor.tf.setNodes({ lang: detected }, { at: path }); } catch { /* noop */ }
        }, 0);
      } catch { /* noop */ }
    };
    const id = window.setTimeout(() => {
      el = document.querySelector('[data-slate-editor="true"]') as HTMLElement | null;
      el?.addEventListener("paste", onPaste);
    }, 0);
    return () => {
      window.clearTimeout(id);
      el?.removeEventListener("paste", onPaste);
    };
  }, [editor]);

  // ── 한글 IME composition 트래킹 ──
  // composition 중에 click 하면 slate-react 가 selection 업데이트를 skip 해서
  // cursor 가 안 옮겨감. compositionend 후 저장된 좌표로 직접 select.
  const composingRef = useRef(false);
  const pendingClickRef = useRef<{ x: number; y: number } | null>(null);
  // slate-react 의 isComposing React state 가 비동기 업데이트라
  // compositionend 직후 잠시 동안 (수~수십 ms) 여전히 composing 으로 인식됨.
  const lastCompositionEndRef = useRef(0);

  // capture phase 로 editor DOM 에 직접 listener 부착 — slate-react 의 자체 핸들러보다
  // 먼저 실행되어야 mousedown 좌표를 신뢰성 있게 잡을 수 있음.
  useEffect(() => {
    if (!editor) return;
    let editorEl: HTMLElement | null = null;
    // editor mount 후 잡힘 — 1프레임 대기
    const setup = () => {
      editorEl = document.querySelector('[data-slate-editor="true"]') as HTMLElement | null;
      if (!editorEl) return;

      // DOM Selection 을 직접 조작 → slate-react 의 selectionchange handler 가 sync.
      // ReactEditor.toSlateRange 변환 안 거치고 native DOM API 만 사용 → 변환 에러 회피.
      const setDomCaret = (x: number, y: number) => {
        type CaretFromPointDoc = Document & {
          caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
          caretRangeFromPoint?: (x: number, y: number) => Range | null;
        };
        const doc = document as CaretFromPointDoc;
        const pos = doc.caretPositionFromPoint?.(x, y);
        let range: Range | null = null;
        if (pos) {
          try {
            // offsetNode 가 element 면 offset 이 자식 수를 넘을 수 있음(IndexSizeError) → try/catch 로 막고 fallback
            range = document.createRange();
            range.setStart(pos.offsetNode, pos.offset);
            range.collapse(true);
          } catch {
            range = doc.caretRangeFromPoint?.(x, y) ?? null;
          }
        } else {
          range = doc.caretRangeFromPoint?.(x, y) ?? null;
        }
        if (!range) return;
        const sel = window.getSelection();
        if (!sel) return;
        sel.removeAllRanges();
        sel.addRange(range);
      };
      // slate-react 가 snap-back 시도하면 우리가 즉시 다시 적용 → 깜빡임 최소화.
      // 첫 적용은 매우 빠르게 (다음 frame), 그 다음 250ms 동안 매 frame 마다 재적용.
      const forceCaret = (x: number, y: number) => {
        let attempts = 0;
        const maxAttempts = 16; // 약 250ms (16 * 16ms ≈ 256ms)
        const tick = () => {
          if (attempts++ >= maxAttempts) return;
          setDomCaret(x, y);
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      };
      const onCompStart = () => { composingRef.current = true; editorEl?.setAttribute("data-composing", ""); };
      const onCompEnd = () => {
        composingRef.current = false;
        editorEl?.removeAttribute("data-composing");
        lastCompositionEndRef.current = Date.now();
        const pending = pendingClickRef.current;
        pendingClickRef.current = null;
        if (pending) forceCaret(pending.x, pending.y);
      };
      const onMouseDown = (e: MouseEvent) => {
        // 이미지(inline void) 클릭 — float 등 흐름 밖 상태에서 slate 가 caret 을 인접 문단으로
        // 보내는 문제. capture 단계에서 가로채 기본 동작을 막고 이미지 노드를 직접 선택.
        // 클릭 지점을 감싸는 element wrapper 가 img 면 선택(이미지·핸들·내부 span 어디든).
        // 단 캡션 입력란 클릭은 편집해야 하므로 제외.
        const tgt = e.target as HTMLElement;
        // ── 블록 경계(왼쪽 gutter = 텍스트 왼쪽 여백) 클릭 → 그 블록 통째로 선택(블록 tint) ──
        // 버튼/핸들 등 인터랙티브 요소는 제외. 좌클릭만.
        const eEl = editorEl;
        if (e.button === 0 && eEl && tgt && !tgt.closest("button, a, input, textarea, select, [data-no-drag]")) {
          const rootEl = document.querySelector('[data-slate-editor="true"]') as HTMLElement | null;
          const er = eEl.getBoundingClientRect();
          const cs = getComputedStyle(eEl);
          const padL = parseFloat(cs.paddingLeft || "0");
          const padR = parseFloat(cs.paddingRight || "0");
          // 텍스트 밖 좌우 여백(왼쪽 gutter[핸들 제외] / 오른쪽 패딩) = 블록 경계 → 그 블록 통째 선택
          const inLeftGutter = e.clientX > er.left && e.clientX < er.left + padL;
          const inRightPad = e.clientX < er.right && e.clientX > er.right - padR;
          if (rootEl && (inLeftGutter || inRightPad)) {
            const child = Array.from(rootEl.children).find((c) => {
              const r = (c as HTMLElement).getBoundingClientRect();
              return e.clientY >= r.top && e.clientY <= r.bottom;
            }) as HTMLElement | undefined;
            const slateEl = child?.matches('[data-slate-node="element"]')
              ? child
              : (child?.querySelector('[data-slate-node="element"]') as HTMLElement | null);
            if (slateEl) {
              try {
                const node = ReactEditor.toSlateNode(editor as unknown as ReactEditor, slateEl);
                const path = node ? ReactEditor.findPath(editor as unknown as ReactEditor, node) : null;
                const anchor = path ? editor.api.start(path) : null;
                const focus = path ? editor.api.end(path) : null;
                if (anchor && focus) {
                  e.preventDefault();
                  e.stopImmediatePropagation();
                  editor.tf.focus();
                  editor.tf.select({ anchor, focus });
                  return;
                }
              } catch { /* ignore */ }
            }
          }
        }
        // float 이미지는 흐름 밖이라 e.target 이 뒤에 깔린 요소(LI 등)로 잡힘 →
        // 클릭 좌표의 모든 요소 중 <img> 를 찾아 그 이미지 노드를 선택 (stacking 무관).
        if (tgt && !tgt.closest("[data-img-caption]")) {
          const stack = document.elementsFromPoint(e.clientX, e.clientY);
          const imgDom = stack.find((el) => el.tagName === "IMG") as HTMLElement | undefined;
          if (imgDom) {
            const elDom = imgDom.closest('[data-slate-node="element"]') as HTMLElement | null;
            if (elDom) {
              try {
                const node = ReactEditor.toSlateNode(editor as unknown as ReactEditor, elDom);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (node && (node as any).type === "img") {
                  const path = ReactEditor.findPath(editor as unknown as ReactEditor, node);
                  if (path) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    const anchor = editor.api.start(path);
                    const focus = editor.api.end(path);
                    // focus/select 시 브라우저가 selection 으로 스크롤 점프 → 위치 보존 후 복원
                    const sc = editorEl;
                    const prevTop = sc ? sc.scrollTop : 0;
                    editor.tf.focus();
                    editor.tf.select(anchor && focus ? { anchor, focus } : path);
                    if (sc) {
                      const restore = () => { sc.scrollTop = prevTop; };
                      restore();
                      requestAnimationFrame(restore);
                    }
                    return;
                  }
                }
              } catch { /* ignore */ }
            }
          }
          // 이미지 위가 아니라 이미지 전용 블록의 빈 영역(ZWSP)을 클릭한 경우 →
          // 빈자리에 커서를 두지 않고 이미지를 선택 (빈 줄 클릭 방지)
          const blockDom = tgt.closest('[data-slate-node="element"]') as HTMLElement | null;
          if (blockDom) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const bnode = ReactEditor.toSlateNode(editor as unknown as ReactEditor, blockDom) as any;
              const bkids = bnode?.children;
              if (Array.isArray(bkids)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const fb = (c: any) => c?.type === "img" && (c.layout === "block" || (typeof c.layout === "string" && (c.layout as string).startsWith("float")));
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const blnk = (c: any) => typeof c?.text === "string" && (c.text as string).replace(/[​‌‍﻿\s]/g, "") === "";
                const ii = bkids.findIndex(fb);
                if (ii >= 0 && bkids.every((c: Record<string, unknown>, k: number) => k === ii || blnk(c))) {
                  const bpath = ReactEditor.findPath(editor as unknown as ReactEditor, bnode);
                  if (bpath) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    const imgPath = [...bpath, ii];
                    const a = editor.api.start(imgPath);
                    const f = editor.api.end(imgPath);
                    const sc = editorEl;
                    const prevTop = sc ? sc.scrollTop : 0;
                    editor.tf.focus();
                    editor.tf.select(a && f ? { anchor: a, focus: f } : imgPath);
                    if (sc) { const r = () => { sc.scrollTop = prevTop; }; r(); requestAnimationFrame(r); }
                    return;
                  }
                }
              }
            } catch { /* ignore */ }
          }
        }
        if (composingRef.current) {
          pendingClickRef.current = { x: e.clientX, y: e.clientY };
          return;
        }
        if (Date.now() - lastCompositionEndRef.current < 200) {
          forceCaret(e.clientX, e.clientY);
        }
      };

      // 커서가 float/block 이미지 위에 있을 때 ←/→ 의 Slate 기본 이동(빈 ZWSP 자리로 1프레임 떨어짐)을
      // capture 단계에서 미리 차단 → 빈자리 안 거침(깜빡임 제거). 실제 이동은 handleContentKeyDown(버블)이 처리.
      const onKeyDownCapture = (ev: KeyboardEvent) => {
        const k = ev.key;
        // 블록 단축키가 쓰는 조합(Alt+Shift+화살표 = 이동, Alt+↑/↓ = 점프)은 이 이미지 네비 캡처가 가로채지 않게 skip
        if (ev.altKey && (ev.shiftKey || k === "ArrowUp" || k === "ArrowDown")) return;
        if ((k !== "ArrowLeft" && k !== "ArrowRight" && k !== "ArrowUp" && k !== "ArrowDown") || !editor.selection || !editor.api.isCollapsed()) return;
        try {
          const prevDir = k === "ArrowLeft" || k === "ArrowUp"; // 이전 블록 방향
          const point = editor.selection.anchor;
          const p = point.path;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fb = (c: any) => c?.type === "img" && (c.layout === "block" || (typeof c.layout === "string" && (c.layout as string).startsWith("float")));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const blnk = (c: any) => typeof c?.text === "string" && (c.text as string).replace(/[​‌‍﻿\s]/g, "") === "";
          const selectImageBlock = (adj: number, ii: number) => {
            ev.preventDefault();
            ev.stopImmediatePropagation();
            const imgPath = [adj, ii];
            const a = editor.api.start(imgPath);
            const f = editor.api.end(imgPath);
            imgPathRef.current = imgPath;
            arrowSelectImgRef.current = true;
            editor.tf.select(a && f ? { anchor: a, focus: f } : imgPath);
            prevAnchorRef.current = { path: [...imgPath, 0], offset: 0 };
          };
          const moveToAdjBlock = (adj: number) => {
            ev.preventDefault();
            ev.stopImmediatePropagation();
            const t = prevDir ? editor.api.end([adj]) : editor.api.start([adj]);
            if (t) {
              skipImgRef.current = true;
              editor.tf.select(t);
              prevAnchorRef.current = { path: [...t.path], offset: t.offset };
              requestAnimationFrame(() => { try { editor.tf.select(t); } catch { /* ignore */ } skipImgRef.current = false; });
            }
          };
          // (a) 커서가 float/block 이미지 위 → 인접 블록으로 (빈자리 안 거침). inline 이미지는 제외.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parent = editor.api.node(p.slice(0, -1))?.[0] as any;
          if (fb(parent)) {
            const adj = p[0] + (prevDir ? -1 : 1);
            if (adj >= 0 && adj < editor.children.length) moveToAdjBlock(adj);
            else ev.preventDefault();
            return;
          }
          // (b) 블록 가장자리에서 진행 방향 인접이 이미지 전용 블록 → 이미지 선택
          if (p.length === 2) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const leaf = editor.api.node(p)?.[0] as any;
            const leafLen = typeof leaf?.text === "string" ? (leaf.text as string).length : 0;
            const idx = p[1];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pkids = ((editor.api.node([p[0]])?.[0] as any)?.children ?? []) as any[];
            const atEdge = prevDir ? (point.offset <= 0 && idx <= 0) : (point.offset >= leafLen && idx >= pkids.length - 1);
            const adjIdx = p[0] + (prevDir ? -1 : 1);
            if (atEdge && adjIdx >= 0 && adjIdx < editor.children.length) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const ak = ((editor.children[adjIdx] as any)?.children ?? []) as any[];
              const ii = ak.findIndex(fb);
              if (ii >= 0 && ak.every((c, kk) => kk === ii || blnk(c))) selectImageBlock(adjIdx, ii);
            }
          }
        } catch { /* ignore */ }
      };

      editorEl.addEventListener("compositionstart", onCompStart, true);
      editorEl.addEventListener("compositionend", onCompEnd, true);
      editorEl.addEventListener("mousedown", onMouseDown, true);
      editorEl.addEventListener("keydown", onKeyDownCapture, true);

      return () => {
        editorEl?.removeEventListener("compositionstart", onCompStart, true);
        editorEl?.removeEventListener("compositionend", onCompEnd, true);
        editorEl?.removeEventListener("mousedown", onMouseDown, true);
        editorEl?.removeEventListener("keydown", onKeyDownCapture, true);
      };
    };

    let cleanup: (() => void) | undefined;
    const rafId = requestAnimationFrame(() => { cleanup = setup(); });
    return () => {
      cancelAnimationFrame(rafId);
      cleanup?.();
    };
  }, [editor]);


  // ── Find & Replace helpers (editor 필요) ──
  const findMatches = useCallback(() => {
    if (!findQuery || !editor) return [];
    const all = findTextMatches(editor.children as unknown[], findQuery, {
      caseSensitive: findCase,
      wholeWord: findWord,
      useRegex: findRegex,
    });
    return findInSel && findSelScope ? all.filter((m) => inScope(m, findSelScope)) : all;
  }, [findQuery, findCase, findWord, findRegex, findInSel, findSelScope, editor]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const matches = useMemo(() => findOpen ? findMatches() : [], [findOpen, findQuery, findCase, findWord, findRegex, findInSel, findSelScope, editor]);

  const decorate = useCallback(({ entry }: { entry: [Record<string, unknown>, number[]] }) => {
    const [node, path] = entry;
    const ranges: { anchor: { path: number[]; offset: number }; focus: { path: number[]; offset: number }; findHighlight?: boolean; findCurrent?: boolean }[] = [];
    if (!findOpen || !findQuery || typeof node.text !== "string") return ranges;
    let regex: RegExp;
    try {
      if (findRegex) {
        regex = new RegExp(findQuery, findCase ? "g" : "gi");
      } else {
        const escaped = findQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pattern = findWord ? `\\b${escaped}\\b` : escaped;
        regex = new RegExp(pattern, findCase ? "g" : "gi");
      }
    } catch { return ranges; }
    let m: RegExpExecArray | null;
    regex.lastIndex = 0;
    while ((m = regex.exec(node.text)) !== null) {
      const len = m[0].length;
      // 선택 영역에서 찾기: scope 밖 매치는 하이라이트 제외
      if (findInSel && findSelScope && !inScope({ path, offset: m.index, length: len }, findSelScope)) {
        if (len === 0) regex.lastIndex++;
        continue;
      }
      const isCurrent = matches.length > 0 && findIdx < matches.length &&
        matches[findIdx].path.join(",") === path.join(",") && matches[findIdx].offset === m.index;
      ranges.push({
        anchor: { path, offset: m.index },
        focus: { path, offset: m.index + len },
        findHighlight: true,
        findCurrent: isCurrent,
      });
      if (len === 0) regex.lastIndex++;
    }
    return ranges;
  }, [findOpen, findQuery, findCase, findWord, findRegex, findInSel, findSelScope, findIdx, matches]);

  const selectAndScroll = useCallback((match: { path: number[]; offset: number; length: number }) => {
    editor.tf.select({
      anchor: { path: match.path, offset: match.offset },
      focus: { path: match.path, offset: match.offset + match.length },
    });
    setTimeout(() => {
      try {
        const nodeEntry = editor.api.node(match.path.slice(0, -1));
        if (!nodeEntry) return;
        const domNode = editor.api.toDOMNode(nodeEntry[0]);
        if (!(domNode instanceof HTMLElement)) return;
        domNode.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } catch { /* ignore */ }
    }, 0);
  }, [editor]);

  const doFindNext = useCallback(() => {
    const m = findMatches();
    if (m.length === 0) return;
    const next = (findIdx + 1) % m.length;
    setFindIdx(next);
    selectAndScroll(m[next]);
  }, [findMatches, findIdx, selectAndScroll]);

  const doFindPrev = useCallback(() => {
    const m = findMatches();
    if (m.length === 0) return;
    const prev = (findIdx - 1 + m.length) % m.length;
    setFindIdx(prev);
    selectAndScroll(m[prev]);
  }, [findMatches, findIdx, selectAndScroll]);

  const doReplace = useCallback(() => {
    const m = findMatches();
    if (m.length === 0) return;
    const idx = Math.min(findIdx, m.length - 1);
    const match = m[idx];
    const range = {
      anchor: { path: match.path, offset: match.offset },
      focus: { path: match.path, offset: match.offset + match.length },
    };
    const repl = preserveCase ? applyCase(editor.api.string(range), replaceQuery) : replaceQuery;
    editor.tf.select(range);
    editor.tf.insertText(repl);
  }, [findMatches, findIdx, replaceQuery, preserveCase, editor]);

  const doReplaceAll = useCallback(() => {
    const m = findMatches();
    if (m.length === 0) return;
    editor.tf.withoutNormalizing(() => {
      for (let i = m.length - 1; i >= 0; i--) {
        const match = m[i];
        const range = {
          anchor: { path: match.path, offset: match.offset },
          focus: { path: match.path, offset: match.offset + match.length },
        };
        const repl = preserveCase ? applyCase(editor.api.string(range), replaceQuery) : replaceQuery;
        editor.tf.select(range);
        editor.tf.insertText(repl);
      }
    });
    setFindIdx(0);
  }, [findMatches, replaceQuery, preserveCase, editor]);

  // 선택 영역에서 찾기(≡) 토글 — 켤 때 현재 확장된 선택 범위를 scope 로 캡처
  const toggleFindInSel = useCallback(() => {
    if (findInSel) { setFindInSel(false); setFindSelScope(null); return; }
    const sel = editor.selection;
    if (!sel) return;
    const { anchor: a, focus: f } = sel;
    if (a.path.join() === f.path.join() && a.offset === f.offset) return; // collapsed → 무시
    const forward = cmpPoint(a, f) <= 0;
    const start = forward ? a : f;
    const end = forward ? f : a;
    setFindSelScope({ start: { path: [...start.path], offset: start.offset }, end: { path: [...end.path], offset: end.offset } });
    setFindInSel(true);
    setFindIdx(0);
  }, [findInSel, editor]);

  // 검색 기록(⇅) — Enter 로 검색을 확정할 때 기록에 push(중복/공백 제거, 최신순, 30개)
  const commitHistory = useCallback(() => {
    const q = findQuery.trim();
    if (!q) return;
    const h = findHistoryRef.current;
    findHistoryRef.current = h[0] === q ? h : [q, ...h.filter((x) => x !== q)].slice(0, 30);
    histIdxRef.current = -1;
  }, [findQuery]);
  // ↑(older) / ↓(newer) 로 기록 순환. -1 = 지금 입력값(빈 문자열)
  const navHistory = useCallback((dir: 1 | -1) => {
    const h = findHistoryRef.current;
    if (h.length === 0) return;
    const idx = Math.max(-1, Math.min(h.length - 1, histIdxRef.current + dir));
    histIdxRef.current = idx;
    setFindQuery(idx === -1 ? "" : h[idx]);
    setFindIdx(0);
  }, []);

  // ── callout/toggle 안에서 Enter → container split 방지 ──
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ed = editor as any;
    if (ed._breakOverridden) return;
    ed._breakOverridden = true;
    const orig = ed.insertBreak.bind(ed);
    ed.insertBreak = () => {
      if (!ed.selection) { orig(); return; }
      const { anchor } = ed.selection;
      // path를 순회하며 callout/toggle 찾기
      let containerPath: number[] | null = null;
      for (let i = 0; i < anchor.path.length; i++) {
        try {
          const node = ed.children[anchor.path[0]];
          if (i === 0 && (node?.type === "callout" || node?.type === "toggle")) {
            containerPath = [anchor.path[0]];
            break;
          }
          // 더 깊은 nesting은 현재 미지원
        } catch { break; }
      }
      if (!containerPath) { orig(); return; }
      const containerNode = ed.children[containerPath[0]];
      const childIdx = anchor.path[containerPath.length] ?? 0;

      // 토글이 접혀있으면 다음 블록으로 이동 (없으면 생성)
      if (containerNode?.type === "toggle" && containerNode?.open === false) {
        const nextPath = [containerPath[0] + 1];
        const nextNode = ed.children[nextPath[0]];
        if (nextNode) {
          const point = ed.api.start(nextPath);
          if (point) ed.tf.select(point);
        } else {
          ed.tf.insertNodes({ type: "p", children: [{ text: "" }] }, { at: nextPath });
          ed.tf.select({ anchor: { path: [...nextPath, 0], offset: 0 }, focus: { path: [...nextPath, 0], offset: 0 } });
        }
        return;
      }

      if (childIdx > 0) {
        // 내용 영역 — 현재 블록이 목록이면 기본 동작, 아니면 빈 p 삽입
        try {
          const block = ed.api.block();
          const blockNode = block?.[0];
          if (blockNode?.listStyleType || blockNode?.checked !== undefined) {
            // 목록/todo 안 → 기본 insertBreak (목록 항목 추가)
            orig();
            return;
          }
        } catch { /* ignore */ }
        // 일반 p → 빈 p 삽입 (container split 방지)
        const insertAt = [...containerPath, childIdx + 1];
        ed.tf.withoutNormalizing(() => {
          ed.tf.insertNodes({ type: "p", children: [{ text: "" }] }, { at: insertAt });
          ed.tf.select({ anchor: { path: [...insertAt, 0], offset: 0 }, focus: { path: [...insertAt, 0], offset: 0 } });
        });
        return;
      }

      // 제목(childIdx === 0) — container split 방지, 본문으로 커서 이동
      const bodyChildren = containerNode.children?.slice(1) || [];
      if (bodyChildren.length > 0) {
        // 본문이 이미 있으면 첫 번째 본문 노드로 커서 이동
        const firstBodyPath = [...containerPath, 1, 0];
        ed.tf.select({ anchor: { path: firstBodyPath, offset: 0 }, focus: { path: firstBodyPath, offset: 0 } });
      } else {
        // 본문이 없으면 빈 p 삽입
        const insertAt = [...containerPath, 1];
        ed.tf.withoutNormalizing(() => {
          ed.tf.insertNodes({ type: "p", children: [{ text: "" }] }, { at: insertAt });
          ed.tf.select({ anchor: { path: [...insertAt, 0], offset: 0 }, focus: { path: [...insertAt, 0], offset: 0 } });
        });
      }
    };
  }, [editor]);

  // ── kbd/code: Enter 시 mark 해제 + 내부에 다른 mark 금지 ──
  useEffect(() => {
    if (!editor) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ed = editor as any;


    // kbd/code 안에서 다른 mark 적용 금지
    const prevToggleMark = ed.tf.toggleMark.bind(ed.tf);
    ed.tf.toggleMark = (key: string, ...args: unknown[]) => {
      const marks = ed.api.marks();
      // kbd 안에서는 kbd 해제만 허용, 다른 mark 금지
      if (marks?.kbd && key !== "kbd") return;
      // code 안에서는 code 해제만 허용, 다른 mark 금지
      if (marks?.code && key !== "code") return;
      // kbd/code 적용 시 다른 mark가 있으면 먼저 해제
      if (key === "kbd" || key === "code") {
        const exclusive = ["bold", "italic", "underline", "strikethrough", "superscript", "subscript", "highlight", "kbd", "code"];
        exclusive.forEach((m) => { if (m !== key && marks?.[m]) prevToggleMark(m); });
      }
      prevToggleMark(key, ...args);
    };
  }, [editor]);

  // ── Selection save/restore ──
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

  // ── Hooks for derived state ──
  const currentLinkKey = (() => {
    try {
      if (!editor.selection) return "";
      const entry = editor.api.above({ match: { type: "a" } });
      if (!entry) return "";
      // path를 key로 사용하여 링크마다 구분
      return entry[1].join(",");
    } catch { return ""; }
  })();
  const isInTable = isInAncestor(editor, "table");
  const isInColumnRaw = isInAncestor(editor, "column_group");
  const columnGroupNode = (() => {
    if (!isInColumnRaw || !editor.selection) return null;
    try {
      const entry = editor.api.above({ match: { type: "column_group" } });
      return entry ? { node: entry[0] as Record<string, unknown>, path: Array.from(entry[1]) } : null;
    } catch { return null; }
  })();
  // debounce: isInColumn이 false→true 깜빡임 방지 (열간 이동 시)
  const [isInColumn, setIsInColumn] = useState(isInColumnRaw);
  const colDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (isInColumnRaw) {
      clearTimeout(colDebounceRef.current);
      setIsInColumn(true);
    } else {
      colDebounceRef.current = setTimeout(() => setIsInColumn(false), 150);
    }
    return () => clearTimeout(colDebounceRef.current);
  }, [isInColumnRaw]);
  // 선택 커서가 들어있는 열의 index — 열 추가/삭제 버튼이 "어느 열 기준인지" 아는 유일한 근거.
  // 위 columnGroupNode 와 **같은 render 에서 같은 selection 으로** 뽑아야 둘이 어긋나지 않는다.
  const activeColIdxRaw = (() => {
    if (!isInColumnRaw || !editor.selection) return null;
    try {
      const entry = editor.api.above({ match: { type: "column" } });
      return entry ? (Array.from(entry[1]).pop() as number) : null;
    } catch { return null; }
  })();
  // 닫힘 애니메이션용 캐시
  const cachedColumnGroupRef = useRef(columnGroupNode);
  if (columnGroupNode) cachedColumnGroupRef.current = columnGroupNode;
  const columnGroupForRender = columnGroupNode || cachedColumnGroupRef.current;
  // 열 index 도 같이 캐시 — 그룹 캐시와 항상 짝이 맞아야 한다(둘 다 같은 조건에서 갱신/보존).
  const cachedColIdxRef = useRef(activeColIdxRaw);
  if (activeColIdxRaw != null) cachedColIdxRef.current = activeColIdxRaw;
  const activeColIdx = activeColIdxRaw ?? cachedColIdxRef.current ?? 0;
  // 최근색 — 공통 useRecentColors hook 으로 통일. 저장은 ColorPicker 의 onChangeComplete(=드래그 뗄 때) 에서만.
  const recentColBg = useRecentColors("col-bg");
  const recentColLine = useRecentColors("col-line");
  const recentCallout = useRecentColors("callout");
  // ── 탭 블록 ── (열/토글과 같은 패턴)
  const isInTabsRaw = isInAncestor(editor, "tabs");
  const tabsNode = (() => {
    if (!isInTabsRaw || !editor.selection) return null;
    try {
      const entry = editor.api.above({ match: { type: "tabs" } });
      return entry ? { node: entry[0] as Record<string, unknown>, path: Array.from(entry[1]) } : null;
    } catch { return null; }
  })();
  const cachedTabsRef = useRef(tabsNode);
  if (tabsNode) cachedTabsRef.current = tabsNode;

  const isInToggle = isInAncestor(editor, "toggle");
  const toggleNode = (() => {
    if (!isInToggle || !editor.selection) return null;
    try {
      const entry = editor.api.above({ match: { type: "toggle" } });
      return entry ? { node: entry[0] as Record<string, unknown>, path: Array.from(entry[1]) } : null;
    } catch { return null; }
  })();
  const isInCallout = isInAncestor(editor, "callout");
  const calloutNode = (() => {
    if (!isInCallout || !editor.selection) return null;
    try {
      const entry = editor.api.above({ match: { type: "callout" } });
      return entry ? { node: entry[0] as Record<string, unknown>, path: Array.from(entry[1]) } : null;
    } catch { return null; }
  })();

  const { currentTableInfo, cellBg, cellVAlign, tableCaption, isZebraActive, currentZebraColor } = useTableInfo(editor, isInTable);
  const { toggleZebraStripe, reapplyZebraIfActive, resetTableFormat, setCellAttr } = useTableActions(editor);
  const borderPopover = useBorderPopover(editor, savedSelectionRef);

  // ── Image state ──
  const selectedImageRaw = (() => {
    if (!editor.selection) return null;
    try {
      const entry = editor.api.above({ match: { type: "img" } });
      return entry ? (entry[0] as Record<string, unknown>) : null;
    } catch { return null; }
  })();
  const cachedImageRef = useRef(selectedImageRaw);
  if (selectedImageRaw) cachedImageRef.current = selectedImageRaw;
  const [imgToolbarFocused, setImgToolbarFocused] = useState(false);
  const selectedImage = selectedImageRaw || (imgToolbarFocused ? cachedImageRef.current : null);
  const isInImage = !!selectedImageRaw || imgToolbarFocused;

  // ── Media embed state ──
  const selectedMediaEmbed = (() => {
    if (!editor.selection) return null;
    try {
      const entry = editor.api.above({ match: { type: "media_embed" } });
      return entry ? { node: entry[0] as Record<string, unknown>, path: Array.from(entry[1]) } : null;
    } catch { return null; }
  })();
  const isInMediaEmbed = !!selectedMediaEmbed;

  // 선택의 "가장 안쪽 contextual 블록" 타입 — floating bar 가 중첩될 때 현재(가장 깊은) 것만 띄우려고.
  // 컨테이너 바(table/column/toggle/callout)는 자기보다 더 깊은 블록이 선택되면 닫는다.
  const nearestContextType = (() => {
    try {
      if (!editor.selection) return null;
      const CTX = new Set(["table", "column_group", "toggle", "callout", "tabs", "img", "equation", "media_embed"]);
      let found: string | null = null;
      let depth = -1;
      // 순회 순서와 무관하게 path 가 가장 긴(가장 안쪽) contextual 블록을 고른다.
      for (const [node, path] of editor.api.levels({ at: editor.selection.anchor.path })) {
        const ty = (node as { type?: string }).type;
        if (ty && CTX.has(ty) && (path as number[]).length > depth) { found = ty; depth = (path as number[]).length; }
      }
      return found;
    } catch { return null; }
  })();

  // ── floating bar 닫기 ── 다른 블록의 컨트롤(탭 버튼·다른 블록 UI 등)과 인터랙션하면
  // 에디터 선택을 해제해 컨텍스트 바가 닫히게 한다. (이미지/void·바 자체·같은 컨텍스트 블록은 제외)
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!editor.selection) return;
      const root = document.querySelector('[data-slate-editor="true"]') as HTMLElement | null;
      const t = e.target as HTMLElement | null;
      if (!root || !t || !root.contains(t)) return; // 에디터 밖(바·팝오버 등)은 무시
      const ctrl = t.closest('[contenteditable="false"]');
      if (!ctrl) return; // 편집 텍스트 클릭은 Slate 가 처리
      if (t.closest('[data-slate-void="true"]')) return; // 이미지 등 void 는 기존 선택 핸들러 담당
      try {
        const selEntry = editor.api.block();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const selDom = selEntry ? (editor.api.toDOMNode(selEntry[0] as any) as HTMLElement | null) : null;
        const clicked = (ctrl as HTMLElement).closest('[data-slate-node="element"]');
        if (selDom && clicked && (clicked === selDom || clicked.contains(selDom))) return; // 같은 컨텍스트 블록
      } catch { /* noop */ }
      editor.tf.deselect();
    };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [editor]);

  // ── void 블록 전후에 빈 paragraph 보장 ──
  useEffect(() => {
    if (!editor) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orig = (editor as any).normalizeNode;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (editor as any).normalizeNode = (entry: any, options: any) => {
      const [node, path] = entry;
      // paragraph 안의 inline img 앞뒤에 빈 텍스트 노드 보장
      if (path.length === 2) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const n = node as any;
        if (n.type === "img") {
          const parentPath = path.slice(0, 1);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parent = editor.children[parentPath[0]] as any;
          if (parent?.children) {
            const idx = path[1];
            const prev = parent.children[idx - 1];
            const next = parent.children[idx + 1];
            // 앞에 텍스트 노드가 없으면 삽입
            if (!prev || prev.type) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              editor.tf.insertNodes({ text: "\u200B" } as any, { at: [...parentPath, idx] });
              return;
            }
            // 뒤에 텍스트 노드가 없으면 삽입
            if (!next || next.type) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              editor.tf.insertNodes({ text: "\u200B" } as any, { at: [...parentPath, idx + 1] });
              return;
            }
          }
        }
      }

      if (path.length === 1) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const type = (node as any).type;
        // inline img가 top-level에 있으면 paragraph로 감싸기
        if (type === "img") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          editor.tf.wrapNodes({ type: "p", children: [] } as any, { at: path });
          return;
        }
        const blockVoids = new Set(["media_embed", "hr", "file_embed", "audio_embed", "equation", "table", "code_block", "callout", "toggle"]);
        if (blockVoids.has(type)) {
          const idx = path[0];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const emptyP = { type: "p", children: [{ text: "" }] } as any;
          if (idx === 0) { editor.tf.insertNodes(emptyP, { at: [0] }); return; }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const prev = editor.children[idx - 1] as any;
          if (prev && blockVoids.has(prev.type)) {
            editor.tf.insertNodes(emptyP, { at: [idx] }); return;
          }
          if (idx === editor.children.length - 1) {
            editor.tf.insertNodes(emptyP, { at: [idx + 1] }); return;
          }
        }
      }
      orig(entry, options);
    };
  }, [editor]);

  // ── 각주 정합성: ref/content 하나 삭제 시 연결된 쪽도 제거 ──
  useEffect(() => {
    if (!editor) return;
    const timer = setTimeout(() => {
      try {
        const refIds = new Set<string>();
        const contentIds = new Set<string>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const [n] of editor.api.nodes({ at: [], match: (n: any) => n.type === "footnote_ref" })) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          refIds.add((n as any).footnoteId);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const [n] of editor.api.nodes({ at: [], match: (n: any) => n.type === "footnote_content" })) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          contentIds.add((n as any).footnoteId);
        }
        // content가 있는데 ref가 없는 경우 → content 삭제 (역순)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orphanContents = [...editor.api.nodes({ at: [], match: (n: any) => n.type === "footnote_content" && !refIds.has(n.footnoteId) })];
        for (let i = orphanContents.length - 1; i >= 0; i--) {
          editor.tf.removeNodes({ at: orphanContents[i][1] });
        }
        // ref가 있는데 content가 없는 경우 → ref 삭제 (역순)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orphanRefs = [...editor.api.nodes({ at: [], match: (n: any) => n.type === "footnote_ref" && !contentIds.has(n.footnoteId) })];
        for (let i = orphanRefs.length - 1; i >= 0; i--) {
          editor.tf.removeNodes({ at: orphanRefs[i][1] });
        }
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [editor, tick]);

  // ── 초기 콘텐츠의 float 이미지 분리 (1회) ──
  // usePlateEditor 가 만든 초기 콘텐츠는 아래 value 동기화 effect 가 skip 하므로 여기서 처리.
  // float/block 이미지가 텍스트와 한 문단이면 분리(= 블록 드래그 독립). 구조가 바뀔 때만 setValue.
  const didInitIsolateRef = useRef(false);
  useEffect(() => {
    if (!editor || didInitIsolateRef.current) return;
    const t = setTimeout(() => {
      if (didInitIsolateRef.current) return;
      didInitIsolateRef.current = true;
      try {
        const cur = editor.children as unknown as Array<Record<string, unknown>>;
        // 초기 콘텐츠(mount deserialize)는 블록 margin-left→indent 복원이 안 됐으므로 원본 HTML 로 복원.
        const restored = restoreBlockIndent(stripDetachedMedia(value || ""), JSON.parse(JSON.stringify(cur)) as Array<Record<string, unknown>>);
        const split = isolateFloatImageBlocks(restored);
        if (split.length !== cur.length || JSON.stringify(split) !== JSON.stringify(cur)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          editor.tf.setValue(split as any);
        }
      } catch { /* ignore */ }
    }, 60);
    return () => clearTimeout(t);
  }, [editor, value]);

  // ── float/block 이미지 상시 분리 (변경마다) ──
  // 이미지는 inline void 라 텍스트와 한 블록에 공존 가능 → 그대로면 블록 드래그/선택 시 통째로 묶인다.
  // normalize 는 dirty 노드만 타서 기존/이동된 블록을 놓치므로, tick(=모든 변경) 마다 전체를 훑어
  // mixed 블록을 splitNodes 로 분리한다. mixed 가 있을 때만 분리(=idempotent) → 일반 타이핑엔 영향 없고
  // splitNodes 라 커서/선택도 보존된다.
  useEffect(() => {
    if (!editor) return;
    const timer = setTimeout(() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isFloatImg = (c: any) => c?.type === "img" && (c.layout === "block" || (typeof c.layout === "string" && (c.layout as string).startsWith("float")));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const blank = (c: any) => typeof c?.text === "string" && (c.text as string).replace(/[​‌‍﻿\s]/g, "") === "";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isBlock = (n: any) => editor.api.isBlock(n);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const blocks = editor.children as any[];
        // 역순 — 분리로 인덱스가 밀려도 아래쪽(이미 처리한) 블록에 영향 없게
        for (let bi = blocks.length - 1; bi >= 0; bi--) {
          const kids = blocks[bi]?.children;
          if (!Array.isArray(kids)) continue;
          const imgIdx = kids.findIndex(isFloatImg);
          if (imgIdx < 0) continue;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const hasBefore = kids.slice(0, imgIdx).some((c: any) => !blank(c));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const hasAfter = kids.slice(imgIdx + 1).some((c: any) => !blank(c));
          if (!hasBefore && !hasAfter) continue;
          editor.tf.withoutNormalizing(() => {
            // 뒤 먼저 분리(앞 인덱스 안 흔들리게) → 그 다음 앞
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (hasAfter) editor.tf.splitNodes({ at: { path: [bi, imgIdx + 1], offset: 0 }, match: isBlock, mode: "lowest", always: true } as any);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (hasBefore) editor.tf.splitNodes({ at: { path: [bi, imgIdx], offset: 0 }, match: isBlock, mode: "lowest", always: true } as any);
          });
        }
      } catch { /* ignore */ }
    }, 120);
    return () => clearTimeout(timer);
  }, [editor, tick]);

  // ── 외부 value 동기화 ──
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
      // detached 미디어는 본문이 아니라 패널 "삭제됨" 목록으로 복원 → 본문 deserialize 전에 분리
      detachedRef.current = extractDetachedMedia(value || "");
      const cleanHtml = stripDetachedMedia(value || "<p></p>");
      const nodes = restoreBlockIndent(cleanHtml, editor.api.html.deserialize({ element: cleanHtml }) as Array<Record<string, unknown>>);
      // float/block 이미지가 텍스트와 같은 문단에 섞여 있으면(= inline void 라 생기는 현상)
      // 블록 드래그 시 통째로 움직인다. 로드 시점에 이미지를 자기 문단으로 분리해 독립 이동 보장.
      const split = isolateFloatImageBlocks(nodes as Array<Record<string, unknown>>);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.tf.setValue(split as any);

      // ☐ 마커(U+200B + U+2610)가 있는 paragraph → todo 변환
      editor.tf.withoutNormalizing(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const [node, path] of editor.api.nodes({ at: [], match: (n: any) => n.type === "p" || !!n.listStyleType })) {
          const el = node as Record<string, unknown>;
          if (!Array.isArray(el.children)) continue;
          const first = (el.children as Record<string, unknown>[])[0];
          if (!first || typeof first.text !== "string") continue;
          if (first.text.startsWith("\u200B\u2610 ")) {
            // 마커 텍스트 제거
            const textPath = [...path, 0];
            editor.tf.delete({ at: { anchor: { path: textPath, offset: 0 }, focus: { path: textPath, offset: 3 } } });
            // todo 속성 설정 (indent/listStyleType 초기화 후)
            editor.tf.unsetNodes(["indent", "listStyleType", "listStart"], { at: path });
            editor.tf.setNodes({ listStyleType: "todo", checked: false }, { at: path });
          }
        }
      });
    } catch {
      editor.tf.setValue(value || "<p></p>");
    }
  }, [value, editor]);

  // ── 인라인 이미지 선택 건너뛰기 ──
  const skipImgRef = useRef(false);
  // 화살표로 이미지를 막 선택했을 때, handleChange 의 "이미지 자동 건너뛰기"를 1회 막아 선택 유지
  const arrowSelectImgRef = useRef(false);
  const prevAnchorRef = useRef<{ path: number[]; offset: number } | null>(null);
  const pointerDownRef = useRef(false);

  // 클릭으로 인한 선택은 건너뛰기 제외
  useEffect(() => {
    const onDown = () => { pointerDownRef.current = true; };
    const onUp = () => { requestAnimationFrame(() => { pointerDownRef.current = false; }); };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointerup", onUp, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
    };
  }, []);

  // ── onChange ──
  const handleChange = useCallback(
    ({ value: slateValue }: { value: SlateNode[] }) => {
      setTick((t) => t + 1);

      // 인라인 이미지 위에 커서가 멈추면 이동 방향에 따라 건너뛰기 (클릭은 제외)
      if (editor.selection && editor.api.isCollapsed() && !skipImgRef.current && !pointerDownRef.current) {
        try {
          const { anchor } = editor.selection;
          const parentPath = anchor.path.slice(0, -1);
          if (parentPath.length > 0) {
            const parentNode = editor.api.node(parentPath);
            if (parentNode) {
              const pn = parentNode[0] as Record<string, unknown>;
              if (pn.type === "img") {
                // float/block 이미지는 독립 블록 → 커서가 머물러도 됨(선택 상태). 자동 건너뛰기 안 함.
                // (inline 이미지만 흐름 중간에 끼므로 건너뛰기 필요. 단 화살표로 방금 선택한 경우는 inline 도 유지)
                const lay = pn.layout;
                const floatOrBlock = lay === "block" || (typeof lay === "string" && (lay as string).startsWith("float"));
                if (floatOrBlock || arrowSelectImgRef.current) {
                  arrowSelectImgRef.current = false;
                  prevAnchorRef.current = { path: [...editor.selection.anchor.path], offset: editor.selection.anchor.offset };
                  return;
                }
                // 이전 위치와 비교해서 방향 판단
                const prev = prevAnchorRef.current;
                let isForward = true;
                if (prev) {
                  // path를 비교: 현재가 이전보다 뒤면 forward
                  for (let i = 0; i < Math.min(prev.path.length, anchor.path.length); i++) {
                    if (anchor.path[i] > prev.path[i]) { isForward = true; break; }
                    if (anchor.path[i] < prev.path[i]) { isForward = false; break; }
                  }
                }

                skipImgRef.current = true;
                const target = isForward
                  ? editor.api.after(parentPath)
                  : editor.api.before(parentPath);
                if (target) {
                  requestAnimationFrame(() => {
                    try { editor.tf.select(target); } catch { /* ignore */ }
                    prevAnchorRef.current = { path: [...target.path], offset: target.offset };
                    skipImgRef.current = false;
                  });
                } else {
                  skipImgRef.current = false;
                }
                return;
              } else if (Array.isArray(pn.children)) {
                // 이미지 전용 블록(float 이미지 + 빈 텍스트)의 빈 위치(ZWSP)에 커서가 오면 — 그 자리는
                // 다음 블록이 덮어 안 보이므로 머물지 않고 진행 방향으로 블록을 건너뛴다(가둠 방지).
                // 이미지 선택은 화살표 keydown(좌/우)이 직접 처리하므로 여기선 통과만 시킨다.
                const kids = pn.children as Array<Record<string, unknown>>;
                const fb = (c: Record<string, unknown>) => c.type === "img" && (c.layout === "block" || (typeof c.layout === "string" && (c.layout as string).startsWith("float")));
                const isBlank = (c: Record<string, unknown>) => typeof c.text === "string" && (c.text as string).replace(/[​‌‍﻿\s]/g, "") === "";
                const imgIdx = kids.findIndex(fb);
                const cursorChildIdx = anchor.path[parentPath.length];
                if (imgIdx >= 0 && kids.every((c, i) => i === imgIdx || isBlank(c)) && cursorChildIdx !== imgIdx) {
                  const prev = prevAnchorRef.current;
                  // 바깥 블록에서 들어왔으면(enter) 이미지 선택, 이 블록 안(이미지)에서 나왔으면(leave) 건너뛰기.
                  const entering = !prev || prev.path[0] !== anchor.path[0];
                  skipImgRef.current = true;
                  if (entering) {
                    const imgPath = [...parentPath, imgIdx];
                    requestAnimationFrame(() => {
                      try {
                        const a = editor.api.start(imgPath);
                        const f = editor.api.end(imgPath);
                        arrowSelectImgRef.current = true;
                        editor.tf.select(a && f ? { anchor: a, focus: f } : imgPath);
                        prevAnchorRef.current = { path: [...imgPath, 0], offset: 0 };
                      } catch { /* ignore */ }
                      skipImgRef.current = false;
                    });
                  } else {
                    let isForward = true;
                    for (let i = 0; i < Math.min(prev.path.length, anchor.path.length); i++) {
                      if (anchor.path[i] > prev.path[i]) { isForward = true; break; }
                      if (anchor.path[i] < prev.path[i]) { isForward = false; break; }
                    }
                    const target = isForward ? editor.api.after(parentPath) : editor.api.before(parentPath);
                    if (target) {
                      requestAnimationFrame(() => {
                        try { editor.tf.select(target); } catch { /* ignore */ }
                        prevAnchorRef.current = { path: [...target.path], offset: target.offset };
                        skipImgRef.current = false;
                      });
                    } else {
                      skipImgRef.current = false;
                    }
                  }
                  return;
                }
              }
            }
          }
          prevAnchorRef.current = { path: [...anchor.path], offset: anchor.offset };
        } catch { /* ignore */ }
      }

      if (slateValue !== lastSlateValueRef.current) {
        // 직렬화 먼저 — 실패하면 ref/상태를 건드리지 않고 빠져 다음 변경 때 다시 시도(자동저장 정지 방지).
        // (serializeNode 는 노드별 방어라 사실상 throw 안 나지만, detached 직렬화 등 만일에 대비한 2차 방어)
        let html: string;
        try {
          // detached 미디어를 숨김 div 로 덧붙여 저장 → 새로고침 후에도 패널에 유지 (없으면 빈 문자열)
          html = slateToHtml(slateValue) + serializeDetachedMedia(detachedRef.current);
        } catch (e) {
          if (typeof console !== "undefined") console.error("[PlateEditor] 본문 직렬화 실패 — 이번 변경은 자동저장에 반영 안 됨:", e);
          return;
        }
        lastSlateValueRef.current = slateValue;
        isInternalUpdate.current = true;
        prevValueRef.current = html;
        onChangeRef.current(html);
      }
    },
    [editor],
  );

  // ── Image actions ──
  const addImage = useCallback(async () => {
    if (!onImageUpload || !editor) return;
    const sel = editor.selection ? JSON.parse(JSON.stringify(editor.selection)) : null;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,video/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const url = await onImageUpload(file);
        const isVideo = file.type.startsWith("video/");
        if (sel) {
          try { editor.tf.select(sel); } catch { /* ignore */ }
        }
        if (isVideo) {
          // 동영상 → media_embed 노드 (mediaType으로 강제 video 판별)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const node = { type: "media_embed", url, mediaType: "video", children: [{ text: "" }] } as any;
          if (editor.selection) {
            editor.tf.insertNodes(node, { at: [editor.selection.anchor.path[0] + 1] });
          } else {
            editor.tf.insertNodes(node, { at: [editor.children.length] });
          }
        } else {
          // 이미지 → img 노드 (inline)
          const imgNode = { type: "img", url, children: [{ text: "" }] };
          if (editor.selection) {
            editor.tf.insertNodes(imgNode, { at: editor.selection });
          } else {
            const lastIdx = editor.children.length - 1;
            const lastBlock = editor.children[lastIdx] as { children?: unknown[] };
            const innerLen = lastBlock?.children?.length ?? 0;
            editor.tf.insertNodes(imgNode, { at: [lastIdx, innerLen] });
          }
        }
      } catch (e) {
        showMediaError(e);
      }
    };
    input.click();
  }, [editor, onImageUpload, showMediaError]);

  /** 블록 void 요소를 현재 커서 위치 또는 문서 끝에 삽입 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertBlockNode = useCallback((node: any, sel: unknown) => {
    if (sel) {
      try { editor.tf.select(sel as Parameters<typeof editor.tf.select>[0]); } catch { /* ignore */ }
    }
    if (editor.selection) {
      // 현재 커서가 있는 블록 다음에 삽입
      const path = editor.selection.anchor.path;
      const topPath = [path[0] + 1];
      editor.tf.insertNodes(node, { at: topPath });
    } else {
      editor.tf.insertNodes(node, { at: [editor.children.length] });
    }
  }, [editor]);

  const addFile = useCallback(async () => {
    if (!onImageUpload || !editor) return;
    const sel = editor.selection ? JSON.parse(JSON.stringify(editor.selection)) : null;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.tar,.gz,.txt,.csv,.json,.xml,.svg";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const url = await onImageUpload(file);
        insertBlockNode({
          type: "file_embed", url, fileName: file.name, fileSize: file.size, children: [{ text: "" }],
        }, sel);
      } catch (e) {
        showMediaError(e);
      }
    };
    input.click();
  }, [editor, onImageUpload, insertBlockNode, showMediaError]);

  const addAudio = useCallback(async () => {
    if (!onImageUpload || !editor) return;
    const sel = editor.selection ? JSON.parse(JSON.stringify(editor.selection)) : null;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const url = await onImageUpload(file);
        insertBlockNode({
          type: "audio_embed", url, title: file.name, children: [{ text: "" }],
        }, sel);
      } catch (e) {
        showMediaError(e);
      }
    };
    input.click();
  }, [editor, onImageUpload, insertBlockNode, showMediaError]);

  const imgPathRef = useRef<number[] | null>(null);
  // 이미지 선택 시 path 캐시
  if (selectedImageRaw) {
    try {
      const entry = editor.api.above({ match: { type: "img" } });
      if (entry) imgPathRef.current = Array.from(entry[1]);
    } catch { /* ignore */ }
  }
  // float/block 이미지를 같은 문단의 텍스트와 분리해 독립 블록으로 만든다.
  // 이미지는 inline void 라 한 문단에 텍스트와 공존 가능 → 그대로 두면 블록 드래그/선택 시
  // 텍스트 블록을 잡아도 이미지가 통째로 묶인다. 로드 시엔 isolateFloatImageBlocks 가 처리하지만
  // in-session(삽입/레이아웃 변경 직후)은 아니므로, float/block 전환 시점에 1회 분리한다.
  const isolateImageBlock = useCallback((path: number[]) => {
    try {
      if (path.length < 2) return; // 이미 top-level 단독
      const blockPath = path.slice(0, -1);
      const idx = path[path.length - 1];
      const blockEntry = editor.api.node(blockPath);
      if (!blockEntry) return;
      const block = blockEntry[0] as { type?: string; children?: Array<Record<string, unknown>> };
      const kids = block.children;
      if (!Array.isArray(kids)) return;
      const meaningful = (c: Record<string, unknown>) =>
        c.type ? true : (typeof c.text === "string" && (c.text as string).replace(/[​‌‍﻿\s]/g, "").length > 0);
      const before = kids.slice(0, idx);
      const after = kids.slice(idx + 1);
      const hasBefore = before.some(meaningful);
      const hasAfter = after.some(meaningful);
      if (!hasBefore && !hasAfter) return; // 이미 단독 블록
      const imgNode = kids[idx];
      const blockType = typeof block.type === "string" ? block.type : "p";
      const pad = (a: Array<Record<string, unknown>>) => {
        const arr = [...a];
        if (!arr.length || typeof arr[0]?.text !== "string") arr.unshift({ text: "" });
        if (typeof arr[arr.length - 1]?.text !== "string") arr.push({ text: "" });
        return arr;
      };
      const newBlocks: Array<Record<string, unknown>> = [];
      if (hasBefore) newBlocks.push({ ...block, type: blockType, children: pad(before) });
      const imgBlockIndex = newBlocks.length;
      newBlocks.push({ type: "p", children: [{ text: "" }, imgNode, { text: "" }] });
      if (hasAfter) newBlocks.push({ ...block, type: blockType, children: pad(after) });
      editor.tf.withoutNormalizing(() => {
        editor.tf.removeNodes({ at: blockPath });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        editor.tf.insertNodes(newBlocks as any, { at: blockPath });
      });
      // 분리된 이미지를 다시 선택 → toolbar 유지 + path 캐시 갱신
      const imgPath = [blockPath[0] + imgBlockIndex, 1];
      imgPathRef.current = imgPath;
      try { editor.tf.select(imgPath); editor.tf.focus(); } catch { /* ignore */ }
    } catch { /* ignore */ }
  }, [editor]);

  const setImageAttr = useCallback((attr: string, val: unknown) => {
    // 에디터에 selection이 있으면 직접 탐색, 없으면 캐시된 path 사용
    try {
      let targetPath: number[] | null = null;
      if (editor?.selection) {
        const entry = editor.api.above({ match: { type: "img" } });
        if (entry) { editor.tf.setNodes({ [attr]: val }, { at: entry[1] }); targetPath = entry[1] as number[]; }
      }
      if (!targetPath && imgPathRef.current) {
        editor.tf.setNodes({ [attr]: val }, { at: imgPathRef.current });
        targetPath = imgPathRef.current;
      }
      // float/block 전환 시 같은 문단의 텍스트와 분리 (독립 블록화)
      if (attr === "layout" && targetPath && typeof val === "string" && (val === "block" || val.startsWith("float"))) {
        isolateImageBlock(targetPath);
      }
    } catch { /* ignore */ }
  }, [editor, isolateImageBlock]);

  // ── Link / Embed insert ──
  const doInsertLink = useCallback((form: { url: string; text: string; protocol: string; target: string }) => {
    if (!editor || !form.url) return;
    let url = form.url;
    // 프로토콜이 이미 포함되어 있지 않으면 선택된 프로토콜 추가
    if (!/^(https?:\/\/|mailto:|tel:)/i.test(url)) {
      url = `${form.protocol}${url}`;
    }
    restoreSelection();
    const sel = editor.selection;
    let selectedText: string | undefined;
    if (sel && !editor.api.isCollapsed()) {
      selectedText = editor.api.string(sel);
    }
    const displayText = form.text || selectedText || url;
    const target = form.target || undefined;
    setTimeout(() => {
      try {
        upsertLink(editor, { url, target, text: displayText });
      } catch {
        editor.tf.insertNodes({
          type: "a", url, target,
          children: [{ text: displayText }],
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
          editor.tf.insertNodes([embedNode, emptyP], { at: [editor.children.length] });
          return;
        }
        insertMediaEmbed(editor, { url });
      } catch {
        try { editor.tf.insertNodes([embedNode, emptyP]); }
        catch {
          try { upsertLink(editor, { url, target: "_blank" }); }
          catch { editor.tf.insertNodes({ type: "a", url, target: "_blank", children: [{ text: url }] }); }
        }
      }
      // embed 뒤에 빈 paragraph 보장
      try {
        if (editor.selection) {
          const path = editor.selection.anchor.path;
          for (let i = 0; i < path.length; i++) {
            const node = editor.api.node([...path.slice(0, i + 1)]);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (node && (node[0] as any).type === "media_embed") {
              const nextPath = [...path.slice(0, i), path[i] + 1];
              const next = editor.api.node(nextPath);
              if (!next) editor.tf.insertNodes(emptyP, { at: nextPath });
              editor.tf.select({ anchor: { path: [...nextPath, 0], offset: 0 }, focus: { path: [...nextPath, 0], offset: 0 } });
              break;
            }
          }
        }
      } catch { /* ignore */ }
    }, 0);
  }, [editor, restoreSelection]);

  // ── Math insert ──
  const doInsertMath = useCallback((latex: string, mode: "inline" | "block") => {
    if (!editor) return;
    restoreSelection();
    editor.tf.insertNodes({
      type: mode === "inline" ? "inline_equation" : "equation",
      texExpression: latex,
      children: [{ text: "" }],
    });
  }, [editor, restoreSelection]);

  // ── Inline input close handlers (moved from JSX to avoid hook-in-render) ──
  const closeLinkInput = useCallback(() => { setShowLinkInput(false); setLinkForm({ url: "", text: "", protocol: "https://", target: "_blank" }); }, []);
  // 링크 툴바 바깥 클릭 시 닫기 — 에디터 본문 클릭은 무시 (자동 열기/닫기가 처리)
  const closeLinkOnOutside = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    // 에디터 content 안 클릭이면 무시 (링크 자동 감지가 처리)
    if (target.closest("[data-slate-editor]")) return;
    closeLinkInput();
  }, [closeLinkInput]);
  useEffect(() => {
    if (!showLinkInput) return;
    const handler = (e: MouseEvent) => {
      // 링크 바는 body 로 portal 되므로 ref.contains 대신 data-link-toolbar 로 내부 클릭 판별
      if ((e.target as HTMLElement).closest("[data-link-toolbar]")) return;
      closeLinkOnOutside(e);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showLinkInput, closeLinkOnOutside]);
  const closeEmbedInput = useCallback(() => { setShowEmbedInput(false); setEmbedInputValue(""); }, []);

  // ── Link unwrap on Backspace at link boundary ──
  const handleContentKeyDown = useCallback((e: React.KeyboardEvent) => {
    // 한글 IME composition 중에는 모든 커스텀 핸들러 skip — Enter / Backspace 가
    // composition commit 과 우리 동작을 둘 다 처리하면서 글자 복제 / 빈 줄 삽입
    // 등 race condition 발생. 브라우저가 composition 끝낸 후 다시 키 누르면 정상 처리.
    if (e.nativeEvent.isComposing) return;

    // ── 블록 다중 선택 중이면 shift+화살표(shift / shift+⌥ / shift+⌘ 무관)를 "블록 단위" 선택 확장으로 처리 ──
    // 이미 2개 이상 블록에 걸친 선택이면 내부 텍스트/단어/줄 선택 대신 통째 블록을 선택/해제한다.
    // (⌥+⌘+shift = 블록 이동 조합은 제외 — 아래 블록 이동 핸들러로 넘김)
    {
      const ak = e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight";
      if (e.shiftKey && ak && !(e.altKey && (e.metaKey || e.ctrlKey))) {
        const sel = editor.selection;
        if (sel) {
          const originTop = sel.anchor.path[0]; // 선택 시작 블록(고정)
          const focusTop = sel.focus.path[0];   // 이동하는 끝 블록
          if (originTop !== focusTop) {
            e.preventDefault();
            const forward = e.key === "ArrowDown" || e.key === "ArrowRight";
            const len = (editor.children as unknown[]).length;
            const newFocus = Math.max(0, Math.min(len - 1, focusTop + (forward ? 1 : -1)));
            try {
              // 항상 origin~focus 블록을 통째로(시작~끝) 감싸도록 selection 재설정
              if (newFocus >= originTop) {
                editor.tf.select({ anchor: editor.api.start([originTop])!, focus: editor.api.end([newFocus])! });
              } else {
                editor.tf.select({ anchor: editor.api.end([originTop])!, focus: editor.api.start([newFocus])! });
              }
            } catch { /* noop */ }
            return;
          }
        }
      }
    }

    // ── ⌘+Shift+←→ (Mac): 누를 때마다 "시각적 줄 끝/시작"으로 선택 확장, 이미 그 위치면 다음/이전 줄로.
    // Selection.modify 로 브라우저의 visual-line 로직을 그대로 사용(줄바꿈·블록 경계도 자연 처리).
    // Windows Ctrl+Shift+←→ 는 단어 선택(네이티브)이라 건드리지 않음(metaKey 만). ──
    if (e.metaKey && !e.ctrlKey && !e.altKey && e.shiftKey && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      const dom = window.getSelection() as (Selection & { modify?: (alter: string, dir: string, granularity: string) => void }) | null;
      if (dom && dom.rangeCount > 0 && typeof dom.modify === "function") {
        e.preventDefault();
        const dir = e.key === "ArrowRight" ? "forward" : "backward";
        const bn = dom.focusNode, bo = dom.focusOffset;
        try {
          dom.modify("extend", dir, "lineboundary"); // 현재 줄 끝/시작
          if (dom.focusNode === bn && dom.focusOffset === bo) {
            // 이미 줄 끝/시작 → 다음/이전 줄로 이동 후 그 줄 끝/시작
            dom.modify("extend", dir, "line");
            dom.modify("extend", dir, "lineboundary");
          }
        } catch { /* modify 미지원 → 무시 */ }
        return;
      }
    }

    // ── 블록 단축키 ──
    // ⌥↑↓            = 블록 간 커서 점프 (상하)
    // ⌘⌥⇧ + 화살표   = 블록 이동 (상하 순서 / 좌우 열) — mod = Mac ⌘ / Win Ctrl
    // ⌘(Cmd/Ctrl) 를 함께 요구해 macOS 네이티브 ⌥⇧←→(단어 선택)·⌥⇧↑↓(문단 선택)을 침범하지 않음.
    {
      const arrow = e.key === "ArrowUp" ? "up" : e.key === "ArrowDown" ? "down" : e.key === "ArrowLeft" ? "left" : e.key === "ArrowRight" ? "right" : null;
      const mod = isMac ? e.metaKey : e.ctrlKey;
      // 블록 이동: mod + Alt + Shift + 화살표(4방향)
      if (arrow && e.altKey && e.shiftKey && mod) {
        if (moveBlockDir(arrow)) { e.preventDefault(); return; }
      }
      // 커서 점프: Alt + ↑/↓ (수식키 없이)
      if ((arrow === "up" || arrow === "down") && e.altKey && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        try {
          const sel = editor.selection;
          if (sel) {
            const top = sel.anchor.path[0];
            const to = arrow === "up" ? top - 1 : top + 1;
            if (to >= 0 && to < (editor.children as unknown[]).length) {
              const start = editor.api.start([to]);
              if (start) { editor.tf.select(start); e.preventDefault(); return; }
            }
          }
        } catch { /* noop */ }
      }
    }

    // ── 들여쓴 블록 맨 앞에서 Backspace → 들여쓰기 한 단계 줄이기(outdent) ──
    // 리스트는 자체 backspace 동작이 있으니 제외.
    if (e.key === "Backspace" && editor.selection && editor.api.isCollapsed()) {
      try {
        const entry = editor.api.block();
        if (entry) {
          const [node, path] = entry;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const n = node as any;
          if (!n.listStyleType && (n.indent as number) > 0 && editor.api.isStart(editor.selection.anchor, path)) {
            e.preventDefault();
            outdent(editor);
            return;
          }
        }
      } catch { /* noop */ }
    }

    // ── 탭 패널 안에서 Backspace 로 탭이 삭제되지 않도록 ──
    // 패널 첫 블록의 맨 앞에서 Backspace → 기본 병합이 패널 밖으로 빠져나가며 탭 구조를 깬다. 차단.
    if (e.key === "Backspace" && editor.selection && editor.api.isCollapsed()) {
      try {
        const anchor = editor.selection.anchor;
        for (let len = anchor.path.length - 1; len >= 1; len--) {
          const p = anchor.path.slice(0, len);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const parent = editor.api.node(p.slice(0, -1))?.[0] as any;
          if (parent?.type === "tab_panel") {
            if (p[p.length - 1] === 0 && editor.api.isStart(anchor, p)) {
              e.preventDefault();
              return;
            }
            break;
          }
        }
      } catch { /* noop */ }
    }

    // ── 여러 top-level 블록에 걸친 선택에서 Backspace/Delete → 선택된 블록들을 통째로 삭제 ──
    // 기본 deleteFragment 는 void/특수 블록(이미지·코드블록·hr 등)을 일부 남기므로 명시적으로 removeNodes.
    if ((e.key === "Backspace" || e.key === "Delete") && editor.selection && !editor.api.isCollapsed()) {
      // anchor/focus 의 블록 path 를 구해 공통 부모에서 발산하는 레벨의 블록들을 삭제.
      // → top-level 뿐 아니라 탭 패널·컬럼 등 중첩 컨테이너 안에서도 멀티블록 선택 삭제 동작.
      let aB: number[] | undefined, fB: number[] | undefined;
      try {
        aB = editor.api.block({ at: editor.selection.anchor })?.[1] as number[] | undefined;
        fB = editor.api.block({ at: editor.selection.focus })?.[1] as number[] | undefined;
      } catch { /* noop */ }
      let d = 0;
      if (aB && fB) { while (d < aB.length && d < fB.length && aB[d] === fB[d]) d++; }
      if (aB && fB && d < aB.length && d < fB.length && aB[d] !== fB[d]) {
        const parent = aB.slice(0, d);
        const startIdx = Math.min(aB[d], fB[d]);
        const endIdx = Math.max(aB[d], fB[d]);
        e.preventDefault();
        editor.tf.withoutNormalizing(() => {
          for (let i = endIdx; i >= startIdx; i--) {
            try { editor.tf.removeNodes({ at: [...parent, i] }); } catch { /* noop */ }
          }
        });
        try {
          // 부모(또는 루트)가 비면 빈 p 삽입
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pn = parent.length ? (editor.api.node(parent)?.[0] as any) : null;
          const empty = parent.length ? !(pn?.children?.length) : editor.children.length === 0;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (empty) editor.tf.insertNodes({ type: "p", children: [{ text: "" }] } as any, { at: [...parent, 0] });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pn2 = parent.length ? (editor.api.node(parent)?.[0] as any) : null;
          const count = parent.length ? (pn2?.children?.length ?? 1) : editor.children.length;
          const idx = Math.max(0, Math.min(startIdx, count - 1));
          editor.tf.select(editor.api.start([...parent, idx])!);
          editor.tf.focus();
        } catch { /* noop */ }
        return;
      }
    }

    // ── 화살표로 이미지 선택 ──
    // 커서가 이미지(inline void) 바로 옆에서 ←/→ 를 누르면 그냥 지나치지 않고 이미지를 선택(툴바 표시).
    // 한 번 더 누르면(이미 선택=비collapsed) 기본 동작으로 지나간다.
    if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && editor.selection && editor.api.isCollapsed()) {
      try {
        const right = e.key === "ArrowRight";
        const point = editor.selection.anchor;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isImg = (n: any) => n?.type === "img";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const blank = (n: any) => typeof n?.text === "string" && (n.text as string).replace(/[​‌‍﻿\s]/g, "") === "";
        const selectImgPath = (imgPath: number[]) => {
          const doSelect = () => {
            try {
              const a = editor.api.start(imgPath);
              const f = editor.api.end(imgPath);
              imgPathRef.current = imgPath;
              arrowSelectImgRef.current = true;
              editor.tf.select(a && f ? { anchor: a, focus: f } : imgPath);
            } catch { /* ignore */ }
          };
          // 동기 선택 먼저 — Slate 기본 이동이 막혔으면 이게 유지돼 깜빡임 없음.
          // Slate 가 그래도 keydown 직후 커서를 옮기면 rAF 로 재선택(fallback).
          doSelect();
          requestAnimationFrame(doSelect);
        };
        // 커서가 이미 float/block 이미지 위(= 선택 상태)면 ←/→ 로 이미지 블록을 건너뛰어 인접 블록으로.
        // 기본 이동에 맡기면 빈 ZWSP 자리에 떨어지므로 keydown 에서 직접 처리(preventDefault).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const curParent = editor.api.node(point.path.slice(0, -1))?.[0] as any;
        if (curParent?.type === "img" && (curParent.layout === "block" || (typeof curParent.layout === "string" && (curParent.layout as string).startsWith("float")))) {
          // 바로 인접한 블록을 명시적으로 타겟 (after/before 는 빈 블록 등을 건너뛸 수 있어 한 블록 더 감)
          const adjIdx = point.path[0] + (right ? 1 : -1);
          if (adjIdx >= 0 && adjIdx < editor.children.length) {
            const target = right ? editor.api.start([adjIdx]) : editor.api.end([adjIdx]);
            if (target) {
              e.preventDefault();
              e.stopPropagation();
              skipImgRef.current = true;
              editor.tf.select(target);
              prevAnchorRef.current = { path: [...target.path], offset: target.offset };
              // Slate 기본 화살표가 preventDefault 를 무시하고 한 번 더 옮기는 경우(→ 한 블록 더 건너뜀)
              // 대비: rAF 로 목표 위치를 다시 고정해 이중 이동을 되돌린다.
              requestAnimationFrame(() => {
                try { editor.tf.select(target); } catch { /* ignore */ }
                skipImgRef.current = false;
              });
              return;
            }
          }
        }
        const leaf = editor.api.node(point.path)?.[0] as Record<string, unknown> | undefined;
        const leafLen = typeof leaf?.text === "string" ? (leaf.text as string).length : 0;
        // 현재 리프 끝(→)/시작(←) 이거나, 빈 텍스트(ZWSP 패딩) 위면 인접 이미지 탐색
        const atEdge = (right ? point.offset >= leafLen : point.offset <= 0) || blank(leaf);
        const parentPath = point.path.slice(0, -1);
        const idx = point.path[point.path.length - 1];
        const parent = editor.api.node(parentPath)?.[0] as { children?: Record<string, unknown>[] } | undefined;
        const kids = parent?.children ?? [];
        if (atEdge) {
          // (1) 같은 문단에서 해당 방향으로 스캔 — ZWSP 등 빈 텍스트는 건너뛰고 img 면 선택
          //     (inline 이미지는 normalize 가 앞뒤에 ZWSP 를 넣어 바로 옆이 img 가 아닐 수 있음)
          const dir = right ? 1 : -1;
          for (let j = idx + dir; j >= 0 && j < kids.length; j += dir) {
            if (isImg(kids[j])) {
              e.preventDefault();
              selectImgPath([...parentPath, j]);
              return;
            }
            if (!blank(kids[j])) break;
          }
          // (2) 문단 경계 — 인접 블록이 이미지 전용 블록(float/block)이면 그 이미지 선택
          const atBlockEdge = right ? idx >= kids.length - 1 : idx <= 0;
          if (point.path.length === 2 && atBlockEdge) {
            const adjBlockPath = [point.path[0] + (right ? 1 : -1)];
            if (adjBlockPath[0] >= 0 && adjBlockPath[0] < editor.children.length) {
              const adj = editor.api.node(adjBlockPath)?.[0] as { children?: Record<string, unknown>[] } | undefined;
              const adjKids = adj?.children ?? [];
              const imgIdx = adjKids.findIndex(isImg);
              if (imgIdx >= 0 && adjKids.every((k) => isImg(k) || blank(k))) {
                e.preventDefault();
                selectImgPath([...adjBlockPath, imgIdx]);
                return;
              }
            }
          }
        }
      } catch { /* ignore */ }
    }

    // ── Find & Replace 단축키 ──
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === "f") {
      e.preventDefault();
      setFindOpen(true);
      setFindReplace(false);
      setFindInSel(false); setFindSelScope(null);
      setTimeout(() => findInputRef.current?.focus(), 50);
      return;
    }
    if (mod && e.key === "h") {
      e.preventDefault();
      setFindOpen(true);
      setFindReplace(true);
      setFindInSel(false); setFindSelScope(null);
      setTimeout(() => findInputRef.current?.focus(), 50);
      return;
    }
    // Ctrl/Cmd+A → 전체 "블록" 선택(한 번에). Slate 기본은 첫 A 가 현재 블록 텍스트만 선택하지만,
    // 여기서 문서 처음~끝을 한 번에 선택 → 여러 블록에 걸쳐 MultiBlockHighlight 가 블록 tint 를 켜고
    // 텍스트 하이라이트(::selection)는 [data-multiblock] 로 숨겨진다.
    if (mod && e.key === "a" && !e.shiftKey && !e.altKey) {
      try {
        const s = editor.api.start([]);
        const en = editor.api.end([]);
        if (s && en) {
          e.preventDefault();
          editor.tf.focus();
          editor.tf.select({ anchor: s, focus: en });
          return;
        }
      } catch { /* 기본 동작에 맡김 */ }
    }
    if (e.key === "Escape") {
      // 아래 toolbar부터 순차적으로 닫기: contextual → find
      const inContextual = isInTable || isInColumn || isInToggle || isInCallout || mathEditing || isInImage || isInMediaEmbed;
      if (inContextual && editor.selection) {
        // 현재 블록 밖으로 커서 이동 → contextual toolbar 닫힘
        e.preventDefault();
        try {
          const topPath = [editor.selection.anchor.path[0]];
          const after = editor.api.after(topPath);
          if (after) {
            editor.tf.select(after);
          } else {
            // 마지막 블록이면 뒤에 빈 p 추가
            const insertAt = [editor.children.length];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            editor.tf.insertNodes({ type: "p", children: [{ text: "" }] } as any, { at: insertAt });
            editor.tf.select({ path: [...insertAt, 0], offset: 0 });
          }
        } catch { /* ignore */ }
        return;
      }
      if (findOpen) {
        setFindOpen(false);
        setFindQuery("");
        setReplaceQuery("");
        return;
      }
    }
    // kbd/code 안에서 Enter → 맨앞이면 위에 plain p, 끝이면 아래에 plain p
    if (e.key === "Enter" && !e.shiftKey && editor.selection && editor.api.isCollapsed()) {
      const marks = editor.api.marks();
      if (marks?.kbd || marks?.code) {
        const { anchor } = editor.selection;
        const leafNode = editor.api.node(anchor.path);
        if (leafNode) {
          const text = ((leafNode[0] as Record<string, unknown>).text as string || "").replace(/[\uFEFF\u200B]/g, "");
          const atStart = anchor.offset === 0;
          const atEnd = anchor.offset >= text.length;
          if (atStart || atEnd) {
            e.preventDefault();
            const blockEntry = editor.api.block();
            if (blockEntry) {
              const [, blockPath] = blockEntry;
              if (atStart) {
                // 맨앞: 위에 plain p 삽입, 커서는 현재 위치 유지
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                editor.tf.insertNodes({ type: "p", children: [{ text: "" }] } as any, { at: blockPath });
              } else {
                // 끝: 아래에 plain p 삽입, 커서 이동
                const newPath = [blockPath[0] + 1];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                editor.tf.insertNodes({ type: "p", children: [{ text: "" }] } as any, { at: newPath });
                editor.tf.select({ path: [...newPath, 0], offset: 0 });
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (editor as any).marks = {};
              }
            }
            return;
          }
        }
      }
    }
    // kbd/code 빈 상태에서 Backspace → mark 해제 + 캐시 리셋
    if (e.key === "Backspace" && editor.selection && editor.api.isCollapsed()) {
      const marks = editor.api.marks();
      if (marks?.kbd || marks?.code) {
        const leaf = editor.api.node(editor.selection.anchor.path);
        if (leaf) {
          const text = ((leaf[0] as Record<string, unknown>).text as string || "").replace(/[\uFEFF\u200B]/g, "");
          if (text.length === 0) {
            e.preventDefault();
            if (marks.kbd) editor.tf.toggleMark("kbd");
            if (marks.code) editor.tf.toggleMark("code");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (editor as any).marks = null;
            return;
          }
        }
      }
    }
    // toggle/callout 제목에서 Backspace → 빈 제목이면 블록 삭제
    if (e.key === "Backspace" && editor.selection && editor.api.isCollapsed()) {
      const { anchor } = editor.selection;
      if (anchor.offset === 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rootNode = editor.children[anchor.path[0]] as any;
        if (rootNode?.type === "toggle" || rootNode?.type === "callout") {
          const childIdx = anchor.path[1];
          if (childIdx === 0) {
            // 제목의 첫 번째 위치에서 Backspace
            const firstChild = rootNode.children?.[0];
            const isEmpty = firstChild?.children?.every((l: { text?: string }) => !l.text || l.text.length === 0);
            if (isEmpty) {
              e.preventDefault();
              const rootPath = [anchor.path[0]];
              // 내용이 있으면 내용을 밖으로 빼고 container 삭제
              const otherChildren = (rootNode.children || []).slice(1);
              editor.tf.removeNodes({ at: rootPath });
              if (otherChildren.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                otherChildren.forEach((child: any, i: number) => {
                  editor.tf.insertNodes(child, { at: [rootPath[0] + i] });
                });
              }
              // 커서를 이전 위치로
              const cursorPath = rootPath[0] > 0 ? [rootPath[0] - 1] : [0];
              try {
                const endPoint = editor.api.end(cursorPath);
                if (endPoint) editor.tf.select(endPoint);
              } catch { /* ignore */ }
              return;
            }
          }
        }
      }
    }
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
  }, [editor, findOpen, isInTable, isInColumn, isInToggle, isInCallout, mathEditing, isInImage, isInMediaEmbed, moveBlockDir, isMac]);

  // ── All media (images + video embeds) + detached 동기 관리 ──
  // 초기값: 저장 HTML 에 남아있던 detached 미디어 복원 (새로고침 후에도 패널 "삭제됨" 유지)
  const detachedRef = useRef<{ url: string; mediaType?: string }[]>(extractDetachedMedia(value || ""));
  const prevContentUrlsRef = useRef<Map<string, string>>(new Map()); // url → mediaType
  const deletedUrlsRef = useRef<Set<string>>(new Set()); // 패널에서 완전 삭제된 URL

  const allImages = React.useMemo(() => {
    // 본문에서 현재 미디어 수집
    const content: { url: string; path: number[]; mediaType?: string }[] = [];
    const walk = (nodes: unknown[], path: number[]) => {
      if (!Array.isArray(nodes)) return;
      nodes.forEach((node, i) => {
        const n = node as Record<string, unknown>;
        if (n.type === "img" && n.url) content.push({ url: n.url as string, path: [...path, i], mediaType: "img" });
        if (n.type === "media_embed" && n.url && (n.mediaType === "video" || /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(n.url as string))) content.push({ url: n.url as string, path: [...path, i], mediaType: "video" });
        if (n.children) walk(n.children as unknown[], [...path, i]);
      });
    };
    walk(editor.children as unknown[], []);

    const contentUrls = new Set(content.map((img) => img.url));
    const detachedUrls = new Set(detachedRef.current.map((d) => d.url));

    // 이전에 본문에 있었는데 지금 없는 URL → detached로 추가 (완전 삭제된 건 제외)
    for (const [url, mediaType] of prevContentUrlsRef.current) {
      if (!contentUrls.has(url) && !detachedUrls.has(url) && !deletedUrlsRef.current.has(url)) {
        detachedRef.current.push({ url, mediaType });
      }
    }

    // 본문에 다시 삽입된 URL은 detached에서 제거 + 삭제 목록에서도 제거
    detachedRef.current = detachedRef.current.filter((d) => !contentUrls.has(d.url));
    for (const url of contentUrls) deletedUrlsRef.current.delete(url);

    // 현재 본문 URL 기록
    prevContentUrlsRef.current = new Map(content.map((img) => [img.url, img.mediaType || ""]));

    // detached 항목을 패널용 형태로 변환
    const detachedItems = detachedRef.current.map((d) => ({
      ...d,
      path: [] as number[],
      detached: true,
    }));

    return [...content, ...detachedItems];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, editor.children, tick]);

  const removeDetached = useCallback((url: string) => {
    detachedRef.current = detachedRef.current.filter((d) => d.url !== url);
    deletedUrlsRef.current.add(url);
    setTick((t) => t + 1); // 리렌더 트리거 → allImages 재계산
  }, []);

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

  const removeImage = useCallback((path: number[]) => {
    try {
      const node = editor.api.node(path);
      if (node) {
        const n = node[0] as Record<string, unknown>;
        if (n.url) deletedUrlsRef.current.add(n.url as string);
      }
      const blockPath = path.slice(0, -1);
      editor.tf.removeNodes({ at: path });
      // 이미지가 빠진 뒤 블록이 비었으면(빈 텍스트만) 블록째 제거 — float/block 단독 이미지 블록의 잔여 공간 방지
      try {
        if (blockPath.length === 1 && editor.children.length > 1) {
          const block = editor.api.node(blockPath)?.[0] as { children?: Array<Record<string, unknown>> } | undefined;
          const kids = block?.children ?? [];
          const empty = kids.length > 0 && kids.every((k) => typeof k.text === "string" && (k.text as string).replace(/[​‌‍﻿\s]/g, "") === "");
          if (empty) editor.tf.removeNodes({ at: blockPath });
        }
      } catch { /* ignore */ }
    } catch { /* ignore */ }
  }, [editor]);

  const reorderImage = useCallback((fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const fromImg = allImages[fromIdx];
    const toImg = allImages[toIdx];
    if (!fromImg || !toImg) return;
    try { editor.tf.moveNodes({ at: fromImg.path, to: toImg.path }); } catch { /* ignore */ }
  }, [editor, allImages]);

  const insertImageByUrl = useCallback((url: string) => {
    if (!editor) return;
    const imgNode = { type: "img", url, children: [{ text: "" }] };
    if (editor.selection) {
      editor.tf.insertNodes(imgNode, { at: editor.selection });
    } else {
      // 선택 없으면 문서 끝 마지막 블록 안에 삽입
      const lastIdx = editor.children.length - 1;
      const lastBlock = editor.children[lastIdx] as { children?: unknown[] };
      const innerLen = lastBlock?.children?.length ?? 0;
      editor.tf.insertNodes(imgNode, { at: [lastIdx, innerLen] });
    }
  }, [editor]);

  const insertMediaByUrl = useCallback((url: string) => {
    if (!editor) return;
    // 동영상 URL 이면 mediaType 명시 → 확장자 없는 URL 도 확실히 video 로 렌더
    const isVid = /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url);
    const node = { type: "media_embed", url, ...(isVid ? { mediaType: "video" } : {}), children: [{ text: "" }] };
    if (editor.selection) {
      editor.tf.insertNodes(node, { at: [editor.selection.anchor.path[0] + 1] });
    } else {
      editor.tf.insertNodes(node, { at: [editor.children.length] });
    }
  }, [editor]);

  const getImagesLive = useCallback((): import("./plate/types").EditorImageInfo[] => {
    const content: import("./plate/types").EditorImageInfo[] = [];
    const walk = (nodes: unknown[], path: number[]) => {
      if (!Array.isArray(nodes)) return;
      nodes.forEach((node, i) => {
        const n = node as Record<string, unknown>;
        if (n.type === "img" && n.url) content.push({ url: n.url as string, path: [...path, i], mediaType: "img" });
        if (n.type === "media_embed" && n.url && (n.mediaType === "video" || /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(n.url as string))) content.push({ url: n.url as string, path: [...path, i], mediaType: "video" });
        if (n.children) walk(n.children as unknown[], [...path, i]);
      });
    };
    walk(editor.children as unknown[], []);
    const detachedItems = detachedRef.current.map((d) => ({
      ...d, path: [] as number[], detached: true,
    }));
    return [...content, ...detachedItems];
  }, [editor]);

  // toggleHtmlMode 는 아래에서 정의됨(TDZ) → ref 경유로 handle 에 노출
  const toggleHtmlModeRef = useRef<() => void>(() => {});
  useImperativeHandle(editorRef, () => ({
    getImages: getImagesLive,
    selectImageAt,
    reorderImage,
    removeImage,
    insertImageByUrl,
    insertMediaByUrl,
    removeDetached,
    toggleHtmlMode: () => toggleHtmlModeRef.current(),
  }), [selectImageAt, reorderImage, removeImage, insertImageByUrl, insertMediaByUrl, removeDetached, getImagesLive]);

  // ── MainToolbar toggle handlers ──
  const toggleLinkInput = useCallback(() => {
    if (showLinkInput) { closeLinkInput(); return; }
    saveSelection();
    // 선택된 텍스트가 있으면 표시 텍스트에 자동 입력
    const sel = editor.selection;
    let selectedText = sel && !editor.api.isCollapsed() ? editor.api.string(sel) : "";
    // 이미 링크 안에 있으면 기존 정보 로드
    let existingUrl = "";
    let existingTarget = "_blank";
    try {
      const linkEntry = editor.api.above({ match: { type: "a" } });
      if (linkEntry) {
        const linkNode = linkEntry[0] as Record<string, unknown>;
        existingUrl = (linkNode.url as string) || "";
        existingTarget = (linkNode.target as string) || "_blank";
        // collapsed selection이면 링크 전체 텍스트를 가져옴
        if (!selectedText) {
          selectedText = editor.api.string(linkEntry[1]) || "";
        }
      }
    } catch { /* ignore */ }
    const protocol = existingUrl.startsWith("mailto:") ? "mailto:" : existingUrl.startsWith("tel:") ? "tel:" : "https://";
    const urlWithoutProtocol = existingUrl.replace(/^(https?:\/\/|mailto:|tel:)/, "");
    setShowEmbedInput(false);
    setShowLinkInput(true);
    setLinkForm({ url: urlWithoutProtocol, text: selectedText, protocol, target: existingTarget });
    setTimeout(() => linkUrlRef.current?.focus(), 30);
  }, [showLinkInput, saveSelection, closeLinkInput, editor]);

  // 링크 안에 커서가 놓이면 자동으로 링크 툴바 표시
  const prevIsInLinkRef = useRef(false);
  const linkCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (currentLinkKey) {
      // 링크 진입/이동 — 닫기 타이머 취소
      if (linkCloseTimerRef.current) {
        clearTimeout(linkCloseTimerRef.current);
        linkCloseTimerRef.current = null;
      }
      // 정보 로드 + form 갱신 (이미 열려있으면 form만 갱신)
      try {
        const linkEntry = editor.api.above({ match: { type: "a" } });
        if (linkEntry) {
          const linkNode = linkEntry[0] as Record<string, unknown>;
          const url = (linkNode.url as string) || "";
          const target = (linkNode.target as string) || "_blank";
          const text = editor.api.string(linkEntry[1]) || "";
          const protocol = url.startsWith("mailto:") ? "mailto:" : url.startsWith("tel:") ? "tel:" : "https://";
          const urlWithoutProtocol = url.replace(/^(https?:\/\/|mailto:|tel:)/, "");
          saveSelection();
          setShowEmbedInput(false);
          if (!showLinkInput) setShowLinkInput(true);
          setLinkForm({ url: urlWithoutProtocol, text, protocol, target });
        }
      } catch { /* ignore */ }
    } else if (prevIsInLinkRef.current && !linkCloseTimerRef.current) {
      // 링크 이탈 — 지연 후 닫기 (링크→링크 이동 시 깜빡임 방지)
      linkCloseTimerRef.current = setTimeout(() => {
        linkCloseTimerRef.current = null;
        closeLinkInput();
      }, 50);
    }
    prevIsInLinkRef.current = !!currentLinkKey;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLinkKey]);

  const toggleEmbedInput = useCallback(() => {
    if (showEmbedInput) { setShowEmbedInput(false); setEmbedInputValue(""); return; }
    saveSelection();
    setShowLinkInput(false);
    setShowEmbedInput(true);
    setEmbedInputValue("");
    setTimeout(() => embedInputRef.current?.focus(), 30);
  }, [showEmbedInput, saveSelection]);

  const toggleHtmlMode = useCallback(() => {
    if (!htmlMode) {
      setHtmlSource(slateToHtml(editor.children as SlateNode[]));
    } else {
      try {
        const nodes = restoreBlockIndent(htmlSource || "<p></p>", editor.api.html.deserialize({ element: htmlSource || "<p></p>" }) as Array<Record<string, unknown>>);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        editor.tf.setValue(nodes as any);
        isInternalUpdate.current = true;
        prevValueRef.current = htmlSource;
        onChangeRef.current(htmlSource);
      } catch { /* ignore */ }
    }
    setHtmlMode(!htmlMode);
  }, [htmlMode, htmlSource, editor]);
  // 외부(제목 라인) 토글 버튼이 ref 로 호출할 수 있게 최신 함수 보관
  toggleHtmlModeRef.current = toggleHtmlMode;
  // htmlMode 변화를 부모(PostEditor/WorkEditor)에 통지 → 외부 버튼 active 표시
  useEffect(() => { onHtmlModeChange?.(htmlMode); }, [htmlMode, onHtmlModeChange]);

  const insertMathBlock = useCallback(() => doInsertMath("", "block"), [doInsertMath]);

  const editorContainerRef = useRef<HTMLDivElement>(null);
  // 블록 DnD 자동 스크롤 대상 = 에디터 스크롤 컨테이너([data-slate-editor]). 전체 페이지 스크롤 방지.
  useEffect(() => {
    let raf = 0;
    const set = () => {
      const el = editorContainerRef.current?.querySelector<HTMLElement>("[data-slate-editor]") ?? null;
      if (el) _dndScrollContainer.current = el;
      else raf = requestAnimationFrame(set);
    };
    set();
    return () => { cancelAnimationFrame(raf); _dndScrollContainer.current = null; };
  }, []);
  // (도킹형 contextToolbar 제거됨 — 모든 컨텍스트 바가 FloatingBar 로 대상 요소에 앵커되므로
  //  상단 도킹 높이 측정/패딩 보정 로직 불필요)

  if (!editor) return null;

  // ── Character count ──
  const text = getEditorText(editor);
  const charCount = text.length;
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // ── Toolbar visibility ──
  // 한 번에 floating bar 는 하나만 — 우선순위로 활성 바 하나를 정하고 나머지는 숨긴다.
  // link/embed(명시적 입력) > find(검색) > void 요소(math/image/media) > 텍스트 선택(format) > 컨테이너 바.
  // 컨테이너 바(table/column/toggle/callout)는 nearestContextType 으로 이미 하나만 매칭됨.
  const hasTextSel = !!editor.selection && (() => { try { return !editor.api.isCollapsed(); } catch { return false; } })();
  // 표에서 여러 셀에 걸친 선택 = 셀 선택. 이땐 텍스트 format 대신 표 바를 유지해야 함(닫히지 않게).
  const tableCellSel = (() => {
    if (!isInTable || !hasTextSel || !editor.selection) return false;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m = (n: any) => n.type === "td" || n.type === "th";
      const ca = editor.api.above({ at: editor.selection.anchor, match: m });
      const cf = editor.api.above({ at: editor.selection.focus, match: m });
      return !!(ca && cf && ca[1].join(",") !== cf[1].join(","));
    } catch { return false; }
  })();
  // find 바는 전역 검색 오버레이 — 블록 컨텍스트 바(table/callout 등)와 독립적으로 공존해야 하므로
  // activeBar cascade 에 넣지 않고 findOpen 으로 직접 연다.
  const activeBar: string | null =
    showLinkInput ? "link"
      : showEmbedInput ? "embed"
      : mathEditing ? "math"
      : isInImage ? "image"
      : (isInMediaEmbed && nearestContextType === "media_embed") ? "media"
      : (isInTable && nearestContextType === "table" && tableCellSel) ? "table"
      : hasTextSel ? "format"
      : (isInTable && nearestContextType === "table") ? "table"
      : (isInColumn && columnGroupNode && nearestContextType === "column_group") ? "column"
      : (isInToggle && toggleNode && nearestContextType === "toggle") ? "toggle"
      : (isInTabsRaw && tabsNode && nearestContextType === "tabs") ? "tabs"
      : (isInCallout && calloutNode && nearestContextType === "callout") ? "callout"
      : null;

  return (
    <div className={styles.wrapper} data-theme={theme}>
      <Plate editor={editor} onChange={handleChange}>
        <FindBarRectContext.Provider value={findBarRect}>

        <MainToolbar
          editor={editor}
          isMac={isMac}
          tick={tick}
          postLang={postLang}
          showLinkInput={showLinkInput}
          onToggleLinkInput={toggleLinkInput}
          showEmbedInput={showEmbedInput}
          onToggleEmbedInput={toggleEmbedInput}
          onAddImage={addImage}
          onAddFile={addFile}
          onAddAudio={addAudio}
          onInsertMath={insertMathBlock}
          mathEditing={mathEditing}
        />

        {/* ── Contextual Toolbars ── */}
        <div ref={editorContainerRef} className={`${styles.editorContainer} ${activeBar === "table" ? styles.editorContainerActive : ""}`}>
          <TableToolbar
            editor={editor}
            visible={activeBar === "table"}
            cellBg={cellBg}
            cellVAlign={cellVAlign}
            tableCaption={tableCaption}
            currentTableInfo={currentTableInfo}
            isZebraActive={isZebraActive}
            currentZebraColor={currentZebraColor}
            setCellAttr={setCellAttr}
            toggleZebraStripe={toggleZebraStripe}
            reapplyZebraIfActive={reapplyZebraIfActive}
            resetTableFormat={resetTableFormat}
            saveSelection={saveSelection}
            borderPopover={borderPopover}
          />

          <ImageToolbar
            editor={editor}
            visible={activeBar === "image"}
            onFocusCapture={() => setImgToolbarFocused(true)}
            onBlurCapture={() => setImgToolbarFocused(false)}
            selectedImage={selectedImage}
            setImageAttr={setImageAttr}
          />

          <MathToolbar
            visible={activeBar === "math"}
            getAnchorRect={() => {
              try {
                const panel = document.querySelector("[data-math-panel]") as HTMLElement | null;
                const r = panel?.getBoundingClientRect();
                if (r && (r.width || r.height)) return r;
                const el = document.querySelector('[data-slate-editor="true"]') as HTMLElement | null;
                const er = el?.getBoundingClientRect();
                if (er) return new DOMRect(er.x + er.width / 2 - 1, er.y + 8, 2, 2);
              } catch { /* noop */ }
              return new DOMRect();
            }}
          />

          {/* Media Embed (동영상 / YouTube·임베드) — image·table 과 동일한 공통 FloatingBar */}
          <VideoToolbar
            editor={editor}
            visible={activeBar === "media"}
            selectedMedia={selectedMediaEmbed}
          />

          {/* Find & Replace — 현재 매치에 앵커. keepInView 로 스크롤해도 항상 화면 안에 유지(전역 도구).
              activeBar 와 독립(findOpen) — 검색 중에도 표/콜아웃 등 컨텍스트 바가 함께 동작. */}
          <FloatingBar
            open={findOpen}
            isFindBar
            keepInView
            onRect={setFindBarRect}
            getAnchorRect={() => {
              try {
                const m = matches[findIdx] || matches[0];
                if (m) {
                  const dr = editor.api.toDOMRange({ anchor: { path: m.path, offset: m.offset }, focus: { path: m.path, offset: m.offset + m.length } });
                  if (dr) { const r = dr.getBoundingClientRect(); if (r.width || r.height) return r; }
                }
                if (editor.selection) {
                  const dr = editor.api.toDOMRange(editor.selection);
                  if (dr) { const r = dr.getBoundingClientRect(); if (r.width || r.height) return r; }
                }
                const el = document.querySelector('[data-slate-editor="true"]') as HTMLElement | null;
                const er = el?.getBoundingClientRect();
                if (er) return new DOMRect(er.x + er.width / 2 - 1, er.y + 8, 2, 2);
              } catch { /* noop */ }
              return new DOMRect();
            }}
          >
            <div className={styles.floatingBarRow}>
              {/* 좌측 chevron — 바꾸기 행 펼치기/접기 (VS Code 패턴) */}
              <TBtn square active={findReplace} onClick={() => setFindReplace(!findReplace)} tooltip={t("editor.replace")}>
                {findReplace ? <ChevronDown size={15} strokeWidth={1.75} /> : <ChevronRight size={15} strokeWidth={1.75} />}
              </TBtn>
              {/* 찾기 필드 — 입력 + 인라인 옵션 토글(Aa / ab / .*) */}
              <div className={styles.findField} style={{ width: 236 }}>
                <input
                  ref={findInputRef}
                  type="text"
                  className={styles.findInput}
                  placeholder={t("editor.findPlaceholder")}
                  value={findQuery}
                  onMouseDown={(e) => e.stopPropagation()}
                  onChange={(e) => { setFindQuery(e.target.value); setFindIdx(0); histIdxRef.current = -1; }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); commitHistory(); if (e.shiftKey) doFindPrev(); else doFindNext(); }
                    else if (e.key === "ArrowUp") { e.preventDefault(); navHistory(1); }
                    else if (e.key === "ArrowDown") { e.preventDefault(); navHistory(-1); }
                    else if (e.key === "Escape") { setFindOpen(false); editor.tf.focus(); }
                  }}
                />
                <Pressable className={`${styles.findToggle}${findCase ? ` ${styles.findToggleOn}` : ""}`} onMouseDown={(e) => e.preventDefault()} onClick={() => setFindCase(!findCase)} title={t("editor.matchCase")} aria-pressed={findCase}>
                  <CaseSensitive size={14} strokeWidth={1.75} />
                </Pressable>
                <Pressable className={`${styles.findToggle}${findWord ? ` ${styles.findToggleOn}` : ""}`} onMouseDown={(e) => e.preventDefault()} onClick={() => setFindWord(!findWord)} title={t("editor.wholeWord")} aria-pressed={findWord}>
                  <WholeWord size={14} strokeWidth={1.75} />
                </Pressable>
                <Pressable className={`${styles.findToggle}${findRegex ? ` ${styles.findToggleOn}` : ""}`} onMouseDown={(e) => e.preventDefault()} onClick={() => setFindRegex(!findRegex)} title={t("editor.useRegex")} aria-pressed={findRegex}>
                  <Regex size={14} strokeWidth={1.75} />
                </Pressable>
              </div>
              <span className={styles.findCount}>
                {findQuery ? (matches.length > 0 ? `${Math.min(findIdx + 1, matches.length)}/${matches.length}` : t("editor.noResults")) : ""}
              </span>
              <div className={styles.tableGroup}>
                <TBtn square onClick={doFindPrev} tooltip={t("editor.findPrev")}><ChevronUp size={15} strokeWidth={1.75} /></TBtn>
                <TBtn square onClick={doFindNext} tooltip={t("editor.findNext")}><ChevronDown size={15} strokeWidth={1.75} /></TBtn>
              </div>
              {/* 선택 영역에서 찾기(≡) */}
              <TBtn square active={findInSel} onClick={toggleFindInSel} tooltip={t("editor.findInSelection")}><TextSelect size={15} strokeWidth={1.75} /></TBtn>
              <CloseButton size="sm" title="Close (Esc)" ariaLabel="Close (Esc)" onClick={() => { setFindOpen(false); setFindQuery(""); setReplaceQuery(""); setFindInSel(false); setFindSelScope(null); editor.tf.focus(); }} />
            </div>
            {findReplace && (
              <div className={styles.floatingBarRow}>
                {/* 찾기 행 좌측 chevron 폭만큼 정렬용 spacer */}
                <span aria-hidden style={{ width: "var(--control-h-sm)", flexShrink: 0 }} />
                {/* 바꾸기 필드 — 입력 + 대소문자 유지(AB) 토글 */}
                <div className={styles.findField} style={{ width: 236 }}>
                  <input
                    type="text"
                    className={styles.findInput}
                    placeholder={t("editor.replacePlaceholder")}
                    value={replaceQuery}
                    onMouseDown={(e) => e.stopPropagation()}
                    onChange={(e) => setReplaceQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); doReplace(); }
                      if (e.key === "Escape") { setFindOpen(false); editor.tf.focus(); }
                    }}
                  />
                  <Pressable className={`${styles.findToggle}${preserveCase ? ` ${styles.findToggleOn}` : ""}`} onMouseDown={(e) => e.preventDefault()} onClick={() => setPreserveCase(!preserveCase)} title={t("editor.preserveCase")} aria-pressed={preserveCase}>
                    <CaseUpper size={15} strokeWidth={1.75} />
                  </Pressable>
                </div>
                <div className={styles.tableGroup}>
                  <TBtn square onClick={doReplace} tooltip={t("editor.replaceOne")}><Replace size={15} strokeWidth={1.75} /></TBtn>
                  <TBtn square onClick={doReplaceAll} tooltip={t("editor.replaceAll")}><ReplaceAll size={15} strokeWidth={1.75} /></TBtn>
                </div>
              </div>
            )}
          </FloatingBar>

          {/* Column toolbar — 대상 컬럼 블록에 앵커 + 스크롤 추적 (inline: 가로 한 줄 배치) */}
          <FloatingBar
            inline
            open={activeBar === "column"}
            anchorKey={columnGroupNode ? columnGroupNode.path.join(",") : null}
            getAnchorRect={() => {
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const dom = columnGroupForRender ? editor.api.toDOMNode(columnGroupForRender.node as any) : null;
                return (dom as HTMLElement | null)?.getBoundingClientRect() ?? new DOMRect();
              } catch { return new DOMRect(); }
            }}
          >
            {columnGroupForRender && (() => {
              const colBg = (columnGroupForRender.node.columnBg as string) || "";
              const colDiv = (columnGroupForRender.node.columnDivider as string) || "";
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const colChildren = ((columnGroupForRender.node as any).children || []) as { width?: string; widthPx?: number; colMode?: string }[];
              const activePath = columnGroupNode?.path || columnGroupForRender.path;
              const colCount = colChildren.length;
              const nm = (c: LocalizedText) => (language === "ko" ? c.ko : c.en);
              const setColBg = (v: string | undefined) => editor.tf.setNodes({ columnBg: v }, { at: activePath });
              const setColDiv = (v: string | undefined) => editor.tf.setNodes({ columnDivider: v }, { at: activePath });
              const L2 = (ko: string, en: string) => (language === "ko" ? ko : en);
              // 랜덤 색 — BG 는 파스텔(밝고 옅게), Line 은 선명한 톤
              const randHue = () => Math.floor(Math.random() * 360);
              const randomBg = () => `oklch(${88 + Math.floor(Math.random() * 8)}% ${(0.03 + Math.random() * 0.06).toFixed(3)} ${randHue()})`;
              const randomLine = () => `oklch(${52 + Math.floor(Math.random() * 20)}% ${(0.12 + Math.random() * 0.08).toFixed(3)} ${randHue()})`;
              // 최근색 고정 슬롯 수 (=hook MAX_RECENT)
              const RECENT_SLOTS = 8;
              // 열 개수 직접 변경 (2~12) — 공식 setColumns 트랜스폼 사용.
              // 늘리면 빈 열 추가(create.block), 줄이면 잘리는 열 내용을 마지막 열로 병합 + 너비 균등.
              // 수동 insert/remove 는 column 플러그인 normalize 와 충돌해 무한루프 발생 → 공식 API 로 위임.
              // 실제 렌더 폭 측정(px/%/드래그 무관) — 개수 변경·화면맞춤에서 현재 비율 보존용.
              const measureColPx = (i: number) => {
                try {
                  const entry = editor.api.node([...activePath, i]);
                  if (!entry) return 0;
                  const dom = editor.api.toDOMNode(entry[0]) as HTMLElement | null;
                  return Math.round(dom?.getBoundingClientRect().width ?? 0);
                } catch { return 0; }
              };
              const setColumnCount = (n: number) => {
                const target = Math.max(2, Math.min(12, n));
                if (target === colCount || !activePath) return;
                const measured = colChildren.map((_, i) => measureColPx(i) || 1);
                // px 로 고정된 블록이면 기존 열 폭을 그대로 두고 새 열만 기본 폭으로 오른쪽에 덧붙인다.
                // (예전엔 무조건 widthPx: null + % 합 100 재분배라, 열을 추가하는 순간 px 가 전부 날아가고
                //  블록이 화면 폭으로 되돌아갔다 — 넓혀둔 폭이 사라지는 원인)
                const hasPx = colChildren.some((c) => typeof c.widthPx === "number" && c.widthPx > 0);
                const clampColPx = (w: number) => Math.min(COLUMN_MAX_PX, Math.max(COLUMN_MIN_PX, Math.round(w)));
                if (hasPx) {
                  setColumns(editor, { at: activePath, widths: equalColWidths(target) }); // 개수만 변경(정수 합=100 → loop 방지)
                  /* 살아남는 기존 열은 측정한 현재 폭 그대로, 새 열은 기본 폭으로 오른쪽에 덧붙인다.
                     블록 상한에 여유가 없을 때만 fitColumnsForInsert 가 기존 열을 비례로 깎아 자리를 낸다.
                     한 번에 여러 열이 늘 수 있으므로(2→5) 한 개씩 누적한다 — 한꺼번에 계산하면
                     중간 단계의 상한 초과를 놓친다.
                     width(%) 는 equalColWidths 가 합 100 을 유지하므로 건드리지 않는다 — px 가 렌더를 지배. */
                  let next = measured.slice(0, Math.min(colCount, target)).map(clampColPx);
                  for (let i = colCount; i < target; i++) {
                    const fit = fitColumnsForInsert(next, COLUMN_DEFAULT_PX);
                    next = [...fit.widths, fit.added];
                  }
                  editor.tf.withoutNormalizing(() => {
                    next.forEach((w, i) => editor.tf.setNodes({ widthPx: w }, { at: [...activePath, i] }));
                  });
                } else {
                  // 유동(%) 블록 — px 가 없으니 보존할 폭도 없다. 기존대로 비율 보존 재분배.
                  const avg = Math.round(measured.reduce((a, b) => a + b, 0) / measured.length) || 1;
                  const base = target > colCount
                    ? [...measured, ...Array(target - colCount).fill(avg)]
                    : measured.slice(0, target);
                  const pcts = distributeInts(100, base);
                  setColumns(editor, { at: activePath, widths: equalColWidths(target) });
                  editor.tf.withoutNormalizing(() => {
                    pcts.forEach((p, i) => editor.tf.setNodes({ width: `${p}%`, widthPx: null }, { at: [...activePath, i] }));
                  });
                }
                // 개수 변경 후 selection 이 풀려 floating bar 가 닫히지 않도록 그룹 안으로 복원.
                try { editor.tf.select(editor.api.start(activePath)!); } catch { /* noop */ }
              };
              /* 균등 — **현재 블록 총폭**을 그대로 두고 열끼리만 똑같이 나눈다. 화면 폭에 맞추지 않는다.
                 (화면에 맞추는 건 바로 아래 fitToWidth 가 따로 한다 — 예전엔 균등이 widthPx: null 로
                  px 를 풀어버려서 넓혀둔 블록이 페이지 폭으로 줄어들었다) */
              const equalizeColumns = () => {
                if (!activePath) return;
                const hasPxCols = colChildren.some((c) => typeof c.widthPx === "number" && c.widthPx > 0);
                if (hasPxCols) {
                  const measured = colChildren.map((_, i) => measureColPx(i) || 1);
                  const total = measured.reduce((a, b) => a + b, 0);
                  const each = Math.min(COLUMN_MAX_PX, Math.max(COLUMN_MIN_PX, Math.round(total / colCount)));
                  editor.tf.withoutNormalizing(() => {
                    for (let i = 0; i < colCount; i++) editor.tf.setNodes({ widthPx: each }, { at: [...activePath, i] });
                  });
                  return;
                }
                // 유동(%) 블록 — px 가 없어 총폭이 곧 페이지 폭이다. 균등 % 로 충분.
                const ws = equalColWidths(colCount);
                editor.tf.withoutNormalizing(() => {
                  ws.forEach((w, i) => editor.tf.setNodes({ width: w }, { at: [...activePath, i] }));
                });
              };
              // 화면 너비 맞춤 — 현재 비율은 유지한 채 px 고정 해제 → 페이지 폭에 유동(오버플로 제거).
              const fitToWidth = () => {
                if (!activePath) return;
                const measured = colChildren.map((_, i) => measureColPx(i) || 1);
                const pcts = distributeInts(100, measured); // 정수 합 100 (normalizer 루프 방지)
                editor.tf.withoutNormalizing(() => {
                  pcts.forEach((p, i) => editor.tf.setNodes({ width: `${p}%`, widthPx: null }, { at: [...activePath, i] }));
                });
              };
              // ── 정리/초기화 — 열 그룹 대상 ──
              const COL_MARK_KEYS = ["color", "backgroundColor", "bold", "italic", "underline", "strikethrough", "code", "kbd", "highlight", "fontSize", "fontFamily", "fontWeight", "subscript", "superscript"];
              // 서식(그룹 스타일 + 열 너비) 제거 — 열은 전부 균등 %(px 고정 해제)
              const resetColStyle = () => {
                const ws = equalColWidths(colCount);
                editor.tf.withoutNormalizing(() => {
                  editor.tf.setNodes({ columnBg: undefined, columnDivider: undefined }, { at: activePath });
                  ws.forEach((w, i) => editor.tf.setNodes({ width: w, widthPx: null }, { at: [...activePath, i] }));
                });
              };
              // 콘텐츠 서식(텍스트 마크) 제거 — 각 열 내부
              const resetColContent = () => {
                editor.tf.withoutNormalizing(() => {
                  colChildren.forEach((_, i) => {
                    try {
                      const a = editor.api.start([...activePath, i]); const f = editor.api.end([...activePath, i]);
                      if (a && f) editor.tf.unsetNodes(COL_MARK_KEYS, { at: { anchor: a, focus: f }, match: (n) => typeof (n as { text?: unknown }).text === "string", split: true });
                    } catch { /* noop */ }
                  });
                });
              };
              // 내용(텍스트) 지우기 — 각 열 내부, 구조 유지
              // 내용 지우기 — 열(칸) 자체는 남기고 안의 내용만 비운다.
              // 대상이 "블록 전체" 인지 "커서가 있는 열 하나" 인지만 다르다.
              const clearColsContent = (idxs: number[]) => {
                editor.tf.withoutNormalizing(() => {
                  idxs.forEach((i) => {
                    try {
                      const a = editor.api.start([...activePath, i]); const f = editor.api.end([...activePath, i]);
                      if (a && f) editor.tf.delete({ at: { anchor: a, focus: f } });
                    } catch { /* noop */ }
                  });
                });
              };
              const clearColContentAll = () => clearColsContent(colChildren.map((_, i) => i));
              const clearColContentSelected = () => clearColsContent([activeColIdx]);
              const resetColAll = () => { resetColStyle(); resetColContent(); };
              return (
                <>
                  {/* BG — 트리거(현재색 스와치) → popover */}
                  <Popover openOnHover placement="bottom-start" offset={8}
                    trigger={
                      <TBtn aria-label="background" style={{ padding: "0 10px" }}>
                        <span className={styles.tblBarLabel}>BG<span className={styles.presetDotInline} style={{ background: colBg === "transparent" ? CHECKER_BG : (colBg || COLUMN_DEFAULT_BG), margin: 0 }} /></span>
                      </TBtn>
                    }>
                    {() => (
                      <div className={styles.colorMenu} onMouseDown={(e) => e.preventDefault()}>
                        <ColorMenu
                          label={L2("배경 색", "Background")}
                          value={colBg}
                          onPick={(v) => setColBg(v)}
                          onCommit={(v) => recentColBg.addColor(v)}
                          presets={COLUMN_BG_NAMED.map((c) => ({ hex: c.hex, label: nm(c) }))}
                          defaultColor={COLUMN_DEFAULT_BG}
                          defaultLabel={L2("기본 (테마 배경)", "Default")}
                          removeValue="transparent"
                          removeLabel={L2("배경 제거 (투명)", "Remove (transparent)")}
                          onRandom={randomBg}
                          recent={recentColBg.colors}
                          recentSlots={RECENT_SLOTS}
                          recentLabel={L2("최근", "Recent")}
                        />
                      </div>
                    )}
                  </Popover>
                  {/* Line — popover */}
                  <Popover openOnHover placement="bottom-start" offset={8}
                    trigger={
                      <TBtn aria-label="divider" style={{ padding: "0 10px" }}>
                        <span className={styles.tblBarLabel}>Line<span className={styles.presetDotInline} style={{ background: colDiv && colDiv !== "transparent" ? colDiv : CHECKER_BG, margin: 0 }} /></span>
                      </TBtn>
                    }>
                    {() => (
                      <div className={styles.colorMenu} onMouseDown={(e) => e.preventDefault()}>
                        <ColorMenu
                          label={L2("구분선 색", "Divider line")}
                          value={colDiv && colDiv !== "transparent" ? colDiv : undefined}
                          onPick={(v) => setColDiv(v)}
                          onCommit={(v) => recentColLine.addColor(v)}
                          presets={COLUMN_LINE_NAMED.map((c) => ({ hex: c.hex, label: nm(c) }))}
                          defaultColor={CHECKER_BG}
                          defaultLabel={L2("선 제거 (숨김)", "Remove (hidden)")}
                          onRandom={randomLine}
                          recent={recentColLine.colors}
                          recentSlots={RECENT_SLOTS}
                          recentLabel={L2("최근", "Recent")}
                          checkLight
                          pickerFallback="#d1d5db"
                        />
                      </div>
                    )}
                  </Popover>
                  {/* 열 레이아웃 — 개수 + 비율 통합 popover */}
                  <span className={styles.divider} />
                  <Popover openOnHover placement="bottom-start" offset={8} contentClassName={styles.colLayoutPopover}
                    trigger={
                      <TBtn aria-label="column layout" style={{ padding: "0 10px" }}>
                        <span className={styles.tblBarLabel}><Columns3 size={15} strokeWidth={1.75} />{colCount}</span>
                      </TBtn>
                    }>
                    {() => (
                      <div className={styles.colLayoutMenu} onMouseDown={(e) => e.preventDefault()}>
                        <div className={styles.groupLabel}>
                          {L2("열 레이아웃", "Column layout")}
                          {/* 총 너비 — 열마다 px 를 더해볼 필요 없이 블록이 지금 얼마나 넓은지 바로 보이게.
                              화면보다 넓힐 수 있게 된 뒤로 "지금 총 얼마"가 유일하게 안 보이는 수였다. */}
                          <span className={styles.groupLabelValue}>
                            {measureColumnPxs(editor, activePath, colCount).reduce((a, b) => a + b, 0)}px
                          </span>
                        </div>
                        <div className={styles.colLayoutRow}>
                          <span className={styles.fieldLabel}>{L2("열 개수", "Columns")}</span>
                          <NumberInput value={colCount} onCommit={setColumnCount} min={2} max={12} width={30} height={24} ariaLabel={L2("열 개수", "Columns")} />
                        </div>
                        <span className={styles.colorMenuDivider} />
                        <div className={styles.colLayoutRow}>
                          <span className={styles.fieldLabel}>{L2("열 폭", "Column width")}</span>
                        </div>
                        <ColumnWidthControls
                          colChildren={colChildren}
                          colCount={colCount}
                          activePath={activePath}
                          editor={editor}
                          language={language}
                          tGroupMax={t("editor.columnGroupMaxWidth")}
                        />
                      </div>
                    )}
                  </Popover>
                  {/* 너비 균등 · 화면 맞춤 — 최상단 1-클릭 액션 */}
                  {/* 선택한 열 기준 추가/삭제 — 개수 stepper(popover)와 목적이 다르다.
                      stepper 는 오른쪽 끝에서 지우고 내용을 마지막 열로 합치지만, 여기는 지목한 열을
                      통째로 지운다(내용 포함) → 내용이 있으면 확인 모달을 거친다. */}
                  <TBtn
                    aria-label="add column"
                    tooltip={t("editor.addColumnAfter")}
                    square
                    onClick={() => {
                      if (!activePath) return;
                      // 막지 않고 왜 안 되는지 알린다 (열 너비 상한 toast 와 같은 결)
                      if (!insertColumnAfter(editor, activePath, activeColIdx)) {
                        showToast(t("editor.columnMaxCount").replace("{{max}}", String(MAX_COLUMNS)), "info");
                      }
                    }}
                  >
                    <BetweenHorizontalStart size={15} strokeWidth={1.75} />
                  </TBtn>
                  <TBtn
                    aria-label="remove column"
                    tooltip={t("editor.removeColumn")}
                    square
                    onClick={() => {
                      if (!activePath) return;
                      if (colCount <= MIN_COLUMNS) {
                        showToast(t("editor.columnMinCount").replace("{{min}}", String(MIN_COLUMNS)), "info");
                        return;
                      }
                      const doRemove = () => removeColumnAt(editor, activePath, activeColIdx);
                      // 빈 열은 그냥 지운다 — 잃을 게 없는데 확인을 받으면 성가시다.
                      if (!columnHasContent(colChildren[activeColIdx])) { doRemove(); return; }
                      openModal(
                        <ModalConfirm
                          desc={t("editor.removeColumnDesc")}
                          confirmText={t("editor.removeColumnConfirm")}
                          danger
                          onConfirm={doRemove}
                        />,
                        { id: "remove-column", header: { title: t("editor.removeColumnTitle") }, closeButton: true, width: "420px" },
                      );
                    }}
                  >
                    <Trash2 size={15} strokeWidth={1.75} />
                  </TBtn>
                  <span className={styles.divider} />
                  <TBtn square onClick={equalizeColumns} tooltip={L2("너비 균등", "Equalize widths")} aria-label="equalize widths">
                    <AlignHorizontalSpaceAround size={15} strokeWidth={1.75} />
                  </TBtn>
                  <TBtn square onClick={fitToWidth} tooltip={L2("화면 너비 맞춤", "Fit to width")} aria-label="fit to width">
                    <StretchHorizontal size={15} strokeWidth={1.75} />
                  </TBtn>
                  {/* 액션 */}
                  <span className={styles.divider} />
                  {/* 정리 / 초기화 — 열 그룹 대상 */}
                  <Popover openOnHover placement="bottom-end" offset={8} contentClassName={styles.cleanupMenu}
                    trigger={<TBtn square tooltip={L2("정리 · 초기화", "Clean up")}><Sparkles size={15} strokeWidth={1.75} /></TBtn>}>
                    {({ close }: { close: () => void }) => (
                      <div onMouseDown={(e) => e.preventDefault()}>
                        <div className={styles.groupLabel}>{L2("정리 · 초기화", "Clean up")}</div>
                        <MenuItem icon={<Sparkles size={15} />} label={L2("서식 모두 제거", "Remove all formatting")} onClick={() => { resetColAll(); close(); }} />
                        <MenuItem icon={<Columns3 size={15} />} label={L2("열 서식 제거", "Remove column formatting")} onClick={() => { resetColStyle(); close(); }} />
                        <MenuItem icon={<Type size={15} />} label={L2("콘텐츠 서식 제거", "Remove content formatting")} onClick={() => { resetColContent(); close(); }} />
                        <MenuDivider />
                        <MenuItem icon={<Eraser size={15} />} label={L2("내용 모두 지우기", "Clear all content")} onClick={() => { clearColContentAll(); close(); }} />
                        <MenuItem icon={<Eraser size={15} />} label={L2("선택한 열의 내용 지우기", "Clear selected column")} onClick={() => { clearColContentSelected(); close(); }} />
                      </div>
                    )}
                  </Popover>
                  <TBtn
                    square
                    className={styles.tableDangerBtn}
                    onClick={() => { if (activePath) editor.tf.removeNodes({ at: activePath }); }}
                    tooltip={t("editor.deleteColumnLayout")}
                  >
                    <TblTrash />
                  </TBtn>
                </>
              );
            })()}
          </FloatingBar>

          {/* Tabs — 대상 탭 블록에 앵커된 FloatingBar.
              탭 이름/아이콘/탭 삭제는 탭을 다시 눌러 뜨는 기존 팝업이 담당한다(탭 하나하나에 붙어야 해서).
              여기는 블록 전체 범위의 동작 — 지금은 내용 지우기(모두 / 선택한 탭). */}
          <FloatingBar
            inline
            open={activeBar === "tabs"}
            anchorKey={tabsNode ? tabsNode.path.join(",") : null}
            getAnchorRect={() => {
              try {
                const src = tabsNode || cachedTabsRef.current;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const dom = src ? editor.api.toDOMNode(src.node as any) : null;
                return (dom as HTMLElement | null)?.getBoundingClientRect() ?? new DOMRect();
              } catch { return new DOMRect(); }
            }}
          >
            {(() => {
              const src = tabsNode || cachedTabsRef.current;
              if (!src) return null;
              const L2 = (ko: string, en: string) => (language === "ko" ? ko : en);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const panels = ((src.node as any).children || []) as unknown[];
              /* "선택한 탭" = 커서가 있는 탭이 아니라 **화면에 보이는 탭**(activeTab).
                 탭을 눌러 전환해도 커서는 이전 패널에 남고, 안 보이는 패널은 display:none 이라
                 커서 기준으로 지우면 아무 일도 안 일어난 것처럼 보인다. (TabsElements 와 같은 clamp) */
              const activeTab = Math.min(
                Math.max(0, ((src.node as { activeTab?: number }).activeTab as number) ?? 0),
                Math.max(0, panels.length - 1),
              );
              // 탭(칸) 자체는 남기고 안의 내용만 비운다 — 열/표의 "내용 지우기" 와 같은 규칙.
              const clearTabs = (idxs: number[]) => {
                editor.tf.withoutNormalizing(() => {
                  idxs.forEach((i) => {
                    try {
                      const a = editor.api.start([...src.path, i]); const f = editor.api.end([...src.path, i]);
                      if (a && f) editor.tf.delete({ at: { anchor: a, focus: f } });
                    } catch { /* noop */ }
                  });
                });
              };
              return (
                <>
                  {/* cleanupMenu — 열 바의 정리·초기화와 같은 규격.
                      blockToolsMenu(220px 고정 + 라벨 padding 2px)를 쓰면 짧은 항목 2개에 비해 과하게 넓고,
                      헤더 라벨이 MenuItem(좌측 --spacing-sm)과 좌측 정렬이 어긋난 채 위 모서리에 붙는다. */}
                  <Popover openOnHover placement="bottom-end" offset={8} contentClassName={styles.cleanupMenu}
                    trigger={<TBtn square tooltip={L2("정리 · 초기화", "Clean up")}><Sparkles size={15} strokeWidth={1.75} /></TBtn>}>
                    {({ close }: { close: () => void }) => (
                      <div onMouseDown={(e) => e.preventDefault()}>
                        <div className={styles.groupLabel}>{L2("정리 · 초기화", "Clean up")}</div>
                        <MenuItem icon={<Eraser size={15} />} label={L2("내용 모두 지우기", "Clear all content")}
                          onClick={() => { clearTabs(panels.map((_, i) => i)); close(); }} />
                        <MenuItem icon={<Eraser size={15} />} label={L2("선택한 탭의 내용 지우기", "Clear selected tab")}
                          onClick={() => { clearTabs([activeTab]); close(); }} />
                      </div>
                    )}
                  </Popover>
                </>
              );
            })()}
          </FloatingBar>

          {/* Toggle toolbar */}
          {/* Toggle — 대상 토글 블록에 앵커된 FloatingBar (도킹형 대체) */}
          <FloatingBar
            inline
            open={activeBar === "toggle"}
            anchorKey={toggleNode ? toggleNode.path.join(",") : null}
            getAnchorRect={() => {
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const dom = toggleNode ? editor.api.toDOMNode(toggleNode.node as any) : null;
                return (dom as HTMLElement | null)?.getBoundingClientRect() ?? new DOMRect();
              } catch { return new DOMRect(); }
            }}
          >
            {toggleNode && (() => {
              // 첫 번째 child의 타입 확인
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const children = (toggleNode.node as any).children || [];
              const firstChild = children[0] as { type?: string; listStyleType?: string; checked?: boolean } | undefined;
              const headingType = firstChild?.type || "p";
              return (
                <>
                  {/* 제목 스타일 */}
                  <div className={styles.tableGroup}>
                    <span className={styles.tableGroupLabel}>{t("editor.toggleTitle") || "제목"}</span>
                    {(["p", "h1", "h2", "h3"] as const).map((type) => {
                      const label = type === "p" ? "P" : type.toUpperCase();
                      return (
                        <TBtn
                          key={type}
                          square
                          active={headingType === type}
                          onClick={() => {
                            const firstPath = [...toggleNode.path, 0];
                            editor.tf.setNodes({ type, listStyleType: undefined }, { at: firstPath });
                          }}
                          tooltip={type === "p" ? t("editor.paragraph") || "Paragraph" : t(`editor.heading${type.charAt(1)}`)}
                        >
                          {label}
                        </TBtn>
                      );
                    })}
                  </div>
                  {/* 목록 삽입 — 토글 내용 영역에 목록 추가, 커서는 제목에 유지 */}
                  {(() => {
                    // 현재 본문의 목록 타입 감지
                    const bodyChild = children[1] as { listStyleType?: string; checked?: boolean } | undefined;
                    const currentListStyle = bodyChild?.listStyleType || "";
                    const ulTypes = new Set(["disc", "circle", "square", "'- '", "'✓ '", "'→ '", "'★ '"]);
                    const olTypes = new Set(["decimal", "decimal-leading-zero", "lower-alpha", "upper-alpha", "lower-roman", "upper-roman"]);
                    const currentUl = ulTypes.has(currentListStyle) ? currentListStyle : "";
                    const currentOl = olTypes.has(currentListStyle) ? currentListStyle : "";
                    const insertListInToggle = (listStyleType: string, isTodo?: boolean) => {
                      const savedSel = editor.selection ? JSON.parse(JSON.stringify(editor.selection)) : null;
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const ch = (toggleNode.node as any).children || [];
                      if (ch.length < 2) {
                        editor.tf.insertNodes({ type: "p", children: [{ text: "" }] }, { at: [...toggleNode.path, 1] });
                      }
                      const contentPath = [...toggleNode.path, ch.length < 2 ? 1 : ch.length - 1];
                      try {
                        const endPoint = editor.api.end(contentPath);
                        if (endPoint) editor.tf.select(endPoint);
                      } catch {
                        editor.tf.select({ anchor: { path: [...toggleNode.path, 1, 0], offset: 0 }, focus: { path: [...toggleNode.path, 1, 0], offset: 0 } });
                      }
                      if (isTodo) {
                        try {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const toggleChildren = (toggleNode.node as any).children || [];
                          // 본문이 없으면 todo paragraph 삽입
                          if (toggleChildren.length < 2) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            editor.tf.insertNodes({ type: "p", checked: false, listStyleType: "todo", children: [{ text: "" }] } as any, { at: [...toggleNode.path, 1] });
                          } else {
                            // 첫 번째 본문 자식으로 토글/해제 판단
                            const isAlreadyTodo = Object.hasOwn(toggleChildren[1], "checked");
                            // indent 없는 본문 자식만 체크박스 적용
                            editor.tf.withoutNormalizing(() => {
                              for (let ci = 1; ci < toggleChildren.length; ci++) {
                                const child = toggleChildren[ci] as Record<string, unknown>;
                                if (child.type && child.type !== "p") continue;
                                // indent가 있는 하위 항목은 건너뜀
                                if (child.indent && (child.indent as number) > 1) continue;
                                const childPath = [...toggleNode.path, ci];
                                if (isAlreadyTodo) {
                                  editor.tf.unsetNodes(["checked", "listStyleType"], { at: childPath });
                                } else {
                                  if (child.listStyleType && child.listStyleType !== "todo") {
                                    editor.tf.unsetNodes(["listStyleType", "indent"], { at: childPath });
                                  }
                                  editor.tf.setNodes({ checked: false, listStyleType: "todo" }, { at: childPath });
                                }
                              }
                            });
                          }
                        } catch { /* ignore */ }
                      } else {
                        toggleList(editor, { listStyleType });
                      }
                      if ((toggleNode.node as Record<string, unknown>).open === false) {
                        editor.tf.setNodes({ open: true }, { at: toggleNode.path });
                      }
                      if (savedSel) {
                        setTimeout(() => { try { editor.tf.select(savedSel); } catch { /* ignore */ } }, 0);
                      }
                    };
                    return (
                      <div className={styles.tableGroup}>
                        <span className={styles.tableGroupLabel}>List</span>
                        <div className={styles.selectWrap}>
                          <select className={styles.fontSelect} style={{ width: "auto" }} value={currentUl} onChange={(e) => { if (e.target.value) insertListInToggle(e.target.value); }}>
                            <option value="">● UL</option>
                            <option value="disc">{`● ${t("editor.ulDisc")}`}</option>
                            <option value="circle">{`○ ${t("editor.ulCircle")}`}</option>
                            <option value="square">{`■ ${t("editor.ulSquare")}`}</option>
                            <option value="'- '">{`– ${t("editor.ulDash")}`}</option>
                            <option value="'✓ '">{`✓ ${t("editor.ulCheck")}`}</option>
                            <option value="'→ '">{`→ ${t("editor.ulArrow")}`}</option>
                            <option value="'★ '">{`★ ${t("editor.ulStar")}`}</option>
                          </select>
                        </div>
                        <div className={styles.selectWrap}>
                          <select className={styles.fontSelect} style={{ width: "auto" }} value={currentOl} onChange={(e) => { if (e.target.value) insertListInToggle(e.target.value); }}>
                            <option value="">1. OL</option>
                            <option value="decimal">1, 2, 3</option>
                            <option value="decimal-leading-zero">01, 02, 03</option>
                            <option value="lower-alpha">a, b, c</option>
                            <option value="upper-alpha">A, B, C</option>
                            <option value="lower-roman">i, ii, iii</option>
                            <option value="upper-roman">I, II, III</option>
                          </select>
                        </div>
                        <TBtn square onClick={() => insertListInToggle("todo", true)} tooltip={t("editor.todoList")}>
                          <ListTodo size={15} strokeWidth={1.75} />
                        </TBtn>
                      </div>
                    );
                  })()}
                  {/* 기본 펼침/접힘 설정 */}
                  <div className={styles.tableGroup}>
                    <span className={styles.tableGroupLabel}>{t("editor.defaultState") || "State"}</span>
                    <TBtn
                      square
                      active={(toggleNode.node.open as boolean) !== false}
                      onClick={() => editor.tf.setNodes({ open: true }, { at: toggleNode.path })}
                      tooltip={t("editor.expanded") || "Expanded"}
                    >
                      <ChevronDown size={15} strokeWidth={1.75} />
                    </TBtn>
                    <TBtn
                      square
                      active={(toggleNode.node.open as boolean) === false}
                      onClick={() => editor.tf.setNodes({ open: false }, { at: toggleNode.path })}
                      tooltip={t("editor.collapsed") || "Collapsed"}
                    >
                      <ChevronRight size={15} strokeWidth={1.75} />
                    </TBtn>
                  </div>
                  {/* 서식 초기화 / 삭제 */}
                  <TBtn
                    onClick={() => editor.tf.setNodes({ open: true }, { at: toggleNode.path })}
                    tooltip={t("editor.clearFormat")}
                    style={{ padding: "0 6px" }}
                  >
                    Clear
                  </TBtn>
                  <TBtn
                    square
                    className={styles.tableDangerBtn}
                    onClick={() => { if (toggleNode.path) editor.tf.removeNodes({ at: toggleNode.path }); }}
                    tooltip={t("editor.deleteToggle") || "Delete toggle"}
                  >
                    <TblTrash />
                  </TBtn>
                </>
              );
            })()}
          </FloatingBar>

          {/* Callout — 대상 콜아웃 블록에 앵커된 FloatingBar (도킹형 대체) */}
          <FloatingBar
            inline
            open={activeBar === "callout"}
            anchorKey={calloutNode ? calloutNode.path.join(",") : null}
            getAnchorRect={() => {
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const dom = calloutNode ? editor.api.toDOMNode(calloutNode.node as any) : null;
                return (dom as HTMLElement | null)?.getBoundingClientRect() ?? new DOMRect();
              } catch { return new DOMRect(); }
            }}
          >
            {calloutNode && (() => {
              const cBg = (calloutNode.node.bg as string) || "var(--bg-tertiary)";
              return (
                <>
                  {/* BG — 클릭식 popover (색상 피커가 지속 클릭을 요구해 openOnHover 는 피커가 바로 닫힘) */}
                  <Popover placement="bottom-start" offset={8}
                    trigger={
                      <TBtn aria-label="background" style={{ padding: "0 10px" }}>
                        <span className={styles.tblBarLabel}>BG<span className={styles.presetDotInline} style={{ background: cBg === "transparent" ? CHECKER_BG : cBg, margin: 0 }} /></span>
                      </TBtn>
                    }>
                    {() => (
                      <div className={styles.colorMenu} onMouseDown={(e) => e.preventDefault()}>
                        <ColorMenu
                          label={language === "ko" ? "배경 색" : "Background"}
                          value={cBg}
                          onPick={(v) => editor.tf.setNodes({ bg: v ?? "transparent" }, { at: calloutNode.path })}
                          onCommit={(v) => recentCallout.addColor(v)}
                          presets={CALLOUT_BG_PRESETS.filter((p) => p.color.startsWith("#")).map((p) => ({ hex: p.color }))}
                          defaultColor="var(--bg-tertiary)"
                          hideDefault
                          removeValue="transparent"
                          removeLabel={language === "ko" ? "투명 (테두리)" : "Transparent (border)"}
                          recent={recentCallout.colors}
                          recentLabel={language === "ko" ? "최근" : "Recent"}
                        />
                      </div>
                    )}
                  </Popover>
                  {/* 프리셋 (아이콘 + 배경 세트) */}
                  <div className={styles.tableGroup}>
                    <span className={styles.tableGroupLabel}>Preset</span>
                    <TBtn onClick={() => editor.tf.setNodes({ bg: "var(--bg-tertiary)", icon: "💡" }, { at: calloutNode.path })} tooltip="Tip" style={{ padding: 0, width: 28, aspectRatio: "1" }}>💡</TBtn>
                    <TBtn onClick={() => editor.tf.setNodes({ bg: "#fee2e2", icon: "⚠️" }, { at: calloutNode.path })} tooltip="Warning" style={{ padding: 0, width: 28, aspectRatio: "1" }}>⚠️</TBtn>
                    <TBtn onClick={() => editor.tf.setNodes({ bg: "#dcfce7", icon: "✅" }, { at: calloutNode.path })} tooltip="Success" style={{ padding: 0, width: 28, aspectRatio: "1" }}>✅</TBtn>
                    <TBtn onClick={() => editor.tf.setNodes({ bg: "#dbeafe", icon: "ℹ️" }, { at: calloutNode.path })} tooltip="Info" style={{ padding: 0, width: 28, aspectRatio: "1" }}>ℹ️</TBtn>
                    <TBtn onClick={() => editor.tf.setNodes({ bg: "#fef3c7", icon: "📌" }, { at: calloutNode.path })} tooltip="Note" style={{ padding: 0, width: 28, aspectRatio: "1" }}>📌</TBtn>
                    <TBtn onClick={() => editor.tf.setNodes({ bg: "#e8d0f0", icon: "🔮" }, { at: calloutNode.path })} tooltip="Insight" style={{ padding: 0, width: 28, aspectRatio: "1" }}>🔮</TBtn>
                  </div>
                  {/* 이모지 제거/추가 · 삭제 */}
                  {calloutNode.node.icon ? (
                    <TBtn square onClick={() => editor.tf.setNodes({ icon: undefined }, { at: calloutNode.path })} tooltip={t("editor.removeEmoji")}>
                      <Eraser size={15} strokeWidth={1.75} />
                    </TBtn>
                  ) : (
                    <TBtn onClick={() => editor.tf.setNodes({ icon: "💡" }, { at: calloutNode.path })} tooltip={t("editor.addEmoji")}>😀</TBtn>
                  )}
                  <TBtn square className={styles.tableDangerBtn} onClick={() => { if (calloutNode.path) editor.tf.removeNodes({ at: calloutNode.path }); }} tooltip={t("editor.deleteCallout")}>
                    <TblTrash />
                  </TBtn>
                </>
              );
            })()}
          </FloatingBar>

          {/* Link form — 링크 대상(저장된 선택)에 앵커된 FloatingBar (도킹형 대체) */}
          <FloatingBar
            inline
            open={activeBar === "link"}
            getAnchorRect={() => {
              try {
                const el = document.querySelector('[data-slate-editor="true"]') as HTMLElement | null;
                const er = el?.getBoundingClientRect() ?? null;
                const sel = savedSelectionRef.current || editor.selection;
                if (sel) {
                  const dr = editor.api.toDOMRange(sel);
                  if (dr) {
                    const r = dr.getBoundingClientRect();
                    if (r.width || r.height) {
                      if (er) { const top = Math.min(Math.max(r.top, er.top + 8), er.bottom - 44); return new DOMRect(r.x, top, r.width || 2, r.height || 2); }
                      return r;
                    }
                  }
                }
                if (er) return new DOMRect(er.x + er.width / 2 - 1, er.y + 8, 2, 2);
              } catch { /* noop */ }
              return new DOMRect();
            }}
          >
            {/* display:contents 래퍼 — 바깥 클릭 감지(data-link-toolbar) + 인풋 focus 위해 mousedown 전파 차단 */}
            <div data-link-toolbar style={{ display: "contents" }} onMouseDown={(e) => e.stopPropagation()}>
              {/* 프로토콜 Select + URL input 을 한 pill 로 (triggerClassName 으로 Select 테두리 제거) */}
              <div className={styles.linkPill}>
                <Select
                  value={linkForm.protocol}
                  options={[
                    { value: "https://", label: "https://" },
                    { value: "http://", label: "http://" },
                    { value: "mailto:", label: "mailto:" },
                    { value: "tel:", label: "tel:" },
                    { value: "", label: "/" },
                  ]}
                  onChange={(proto) => setLinkForm((f) => ({ ...f, protocol: proto, ...(proto === "" ? { target: "_self" } : {}) }))}
                  size="sm"
                  width="max"
                  triggerClassName={styles.linkPillSelect}
                  preserveFocus
                  dropAlign="below"
                />
                <input
                  ref={linkUrlRef}
                  type="text"
                  className={styles.linkPillInput}
                  placeholder={linkForm.protocol === "" ? "/posts/my-post" : linkForm.protocol.startsWith("mailto") ? "user@example.com" : linkForm.protocol.startsWith("tel") ? "010-1234-5678" : "example.com"}
                  value={linkForm.url}
                  onChange={(e) => {
                    const val = e.target.value;
                    const protoMatch = val.match(/^(https?:\/\/|mailto:|tel:)(.*)/);
                    if (protoMatch) { setLinkForm((f) => ({ ...f, protocol: protoMatch[1], url: protoMatch[2] })); return; }
                    setLinkForm((f) => ({ ...f, url: val }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && linkForm.url.trim()) { doInsertLink(linkForm); closeLinkInput(); }
                    else if (e.key === "Escape") closeLinkInput();
                  }}
                />
              </div>
              {/* 표시 텍스트 pill */}
              <div className={styles.linkTextPill}>
                <span className={styles.linkTextLabel}>{t("editor.linkText")}</span>
                <input
                  type="text"
                  className={styles.linkPillInput}
                  style={{ maxWidth: 110 }}
                  placeholder="Text"
                  value={linkForm.text}
                  onChange={(e) => setLinkForm((f) => ({ ...f, text: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && linkForm.url.trim()) { doInsertLink(linkForm); closeLinkInput(); }
                    else if (e.key === "Escape") closeLinkInput();
                  }}
                />
              </div>
              {/* 타겟 — 공통 Select */}
              <Select
                value={linkForm.target}
                options={[
                  { value: "_blank", label: t("editor.linkNewTab") },
                  { value: "_self", label: t("editor.linkSameTab") },
                ]}
                onChange={(v) => setLinkForm((f) => ({ ...f, target: v }))}
                size="sm"
                width="max"
                preserveFocus
                dropAlign="below"
              />
              {/* 삽입 / 열기 / 복사 / 제거 / 닫기 — 전부 아이콘 통일, 적용은 accent 강조 */}
              <div className={styles.linkActions}>
                <TBtn square className={styles.linkApplyBtn} onClick={() => { if (linkForm.url.trim()) { doInsertLink(linkForm); closeLinkInput(); } }} tooltip={t("editor.insertLink")}>
                  <Check size={15} strokeWidth={1.75} />
                </TBtn>
                <TBtn square disabled={!linkForm.url.trim()} onClick={() => { const href = (linkForm.protocol || "") + linkForm.url.trim(); if (href) window.open(href, "_blank", "noopener,noreferrer"); }} tooltip={t("editor.openLink")}>
                  <ExternalLink size={15} strokeWidth={1.75} />
                </TBtn>
                <TBtn square disabled={!linkForm.url.trim()} onClick={() => { const href = (linkForm.protocol || "") + linkForm.url.trim(); if (href) { try { navigator.clipboard?.writeText(href); showToast(t("editor.linkCopied"), "success"); } catch { /* ignore */ } } }} tooltip={t("editor.copyUrl")}>
                  <Copy size={15} strokeWidth={1.75} />
                </TBtn>
                <TBtn square className={styles.linkRemoveBtn} onClick={() => { restoreSelection(); try { unwrapLink(editor); } catch { /* ignore */ } closeLinkInput(); }} tooltip={t("editor.removeLink")}>
                  <Trash2 size={15} strokeWidth={1.75} />
                </TBtn>
              </div>
            </div>
          </FloatingBar>

          <InlineInputToolbar
            visible={activeBar === "embed"}
            value={embedInputValue}
            onChange={setEmbedInputValue}
            onSubmit={doInsertEmbed}
            onClose={closeEmbedInput}
            getAnchorRect={() => {
              try {
                const el = document.querySelector('[data-slate-editor="true"]') as HTMLElement | null;
                const er = el?.getBoundingClientRect() ?? null;
                const sel = editor.selection || savedSelectionRef.current;
                if (sel) {
                  const dr = editor.api.toDOMRange(sel);
                  if (dr) {
                    const r = dr.getBoundingClientRect();
                    if (r.width || r.height) {
                      if (er) { const top = Math.min(Math.max(r.top, er.top + 8), er.bottom - 44); return new DOMRect(r.x, top, r.width || 2, r.height || 2); }
                      return r;
                    }
                  }
                }
                if (er) return new DOMRect(er.x + er.width / 2 - 1, er.y + 8, 2, 2);
              } catch { /* noop */ }
              return new DOMRect();
            }}
            placeholder="YouTube · Spotify · X ..."
            inputType="url"
            inputRef={embedInputRef}
          />

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
                minHeight: 300, width: "100%",
                fontFamily: "var(--font-mono)", fontSize: "13px", lineHeight: 1.6,
                padding: "var(--spacing-sm)", outline: "none",
                resize: "vertical", background: "var(--bg-primary)", color: "var(--text-primary)",
                whiteSpace: "pre-wrap", wordBreak: "break-all",
              }}
              data-lenis-prevent
              spellCheck={false}
            />
          ) : (
            <>
            {/* 인라인 이미지 드래그 시 드롭 위치 캐럿 */}
            <div
              id="inline-drag-caret"
              style={{
                position: "fixed",
                width: 3,
                background: "var(--color-accent)",
                borderRadius: 1,
                pointerEvents: "none",
                zIndex: "var(--z-top)",
                opacity: 0,
                transition: "opacity 0.1s",
              }}
            />
            <PlateContent
              className={`${styles.editorContent} prose-content`}
              style={{ minHeight: 300, paddingBottom: 40 }}
              data-lenis-prevent
              onKeyDown={handleContentKeyDown}
              decorate={findOpen ? decorate : undefined}
              renderLeaf={renderFindLeaf}
              scrollSelectionIntoView={(ed, domRange) => {
                // 달력 등 VOID 를 클릭/선택하면 Slate 기본 scrollSelectionIntoView 가 스크롤 컨테이너
                // (.editorContent = [data-slate-editor], overflow-y:auto)를 스크롤해 그 큰 void 를 화면에
                // 맞추면서 "블록 아래로 점프"가 발생. window 가 아니라 이 내부 컨테이너가 움직였던 것.
                // → void 선택 시엔 스크롤을 억제하고, 일반 텍스트 선택만 기본 동작 유지.
                try {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const voidEntry = editor.selection ? editor.api.above({ match: (n: any) => editor.api.isVoid(n) }) : undefined;
                  if (voidEntry) {
                    // TODO(debug): 스크롤 이슈 확인용 — void 선택 시에만 로그. 확인 후 이 블록 제거.
                    if (process.env.NODE_ENV !== "production") {
                      const sc = document.querySelector('[data-slate-editor="true"]') as HTMLElement | null;
                      console.debug("[cal-scroll] void selected → suppress scroll", { type: (voidEntry[0] as { type?: string })?.type, scrollTop: sc?.scrollTop });
                    }
                    return; // void(달력) 선택 → 스크롤 안 함
                  }
                } catch { /* ignore */ }
                defaultScrollSelectionIntoView(ed as unknown as ReactEditor, domRange);
              }}
              onClick={(e) => {
                // kbd/code 밖 클릭 시 plain text 모드로 전환
                const clickTarget = e.target as HTMLElement;
                const clickedOnMark = !!clickTarget.closest("code:not(pre code), kbd");
                if (!clickedOnMark) {
                  setTimeout(() => {
                    try {
                      if (!editor.selection) return;
                      const marks = editor.api.marks();
                      if (marks?.kbd || marks?.code) {
                        // 커서가 kbd/code leaf 안이지만 클릭은 밖 → plain text 모드
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (editor as any).marks = {};
                      }
                    } catch { /* ignore */ }
                  }, 0);
                }
                // 에디터 하단 빈 영역 클릭 시 맨 끝에 커서
                const target = e.target as HTMLElement;
                const isEditorRoot = target.getAttribute("data-slate-editor") === "true";
                if (!isEditorRoot) return;
                const clickY = e.clientY;
                // 클릭이 마지막 블록 아래인지 확인
                const lastChild = target.lastElementChild as HTMLElement | null;
                if (lastChild) {
                  const lastRect = lastChild.getBoundingClientRect();
                  if (clickY > lastRect.bottom) {
                    const lastIdx = editor.children.length;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const lastNode = editor.children[lastIdx - 1] as any;
                    const lastIsEmptyP = lastNode?.type === "p" && lastNode?.children?.every((c: { text?: string }) => !c.text || c.text.length === 0);
                    if (lastIsEmptyP) {
                      editor.tf.select({ path: [lastIdx - 1, 0], offset: 0 });
                    } else {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      editor.tf.insertNodes({ type: "p", children: [{ text: "" }] } as any, { at: [lastIdx] });
                      editor.tf.select({ path: [lastIdx, 0], offset: 0 });
                    }
                  }
                }
              }}
            />
            </>
          )}

        </div>

        {/* 선택 영역 floating 포맷팅 툴바 (링크/임베드 입력 중엔 숨김) */}
        <FloatingToolbar hideToolbar={activeBar !== "format" || slashOpen} />

        {/* 슬래시 명령 메뉴 (/) */}
        <SlashMenu onOpenChange={setSlashOpen} />

        {/* 다중 블록 선택 하이라이트 */}
        <MultiBlockHighlight editor={editor} />

        {/* float 이미지 옆 블록의 핸들/placeholder 위치 조정 */}
        <FloatEdgeAdjust />

        {/* 이모지 인라인 검색 (:) */}
        <EmojiMenu />

        {/* 날짜 멘션 인라인 (@) */}
        <DateMentionMenu />

        {/* 게시물 링크 인라인 ([[) */}
        <PostLinkMenu />

        {/* ── Status bar ── */}
        <div className={styles.statusBar}>
          <span>{charCount.toLocaleString()} {t("editor.charUnit")}</span>
          <span>·</span>
          <span>{wordCount.toLocaleString()} {t("editor.wordUnit")}</span>
        </div>
        </FindBarRectContext.Provider>

      </Plate>
    </div>
  );
}
