"use client";

import React, { useState, useCallback, useEffect, useRef, useImperativeHandle, useMemo } from "react";
import {
  Plate,
  PlateContent,
  usePlateEditor,
} from "platejs/react";
import { ReactEditor } from "slate-react";
import { insertMediaEmbed } from "@platejs/media";
import { upsertLink, unwrapLink } from "@platejs/link";
import { toggleList } from "@platejs/list";
import "katex/dist/katex.min.css";
import { slateToHtml, setWrapLabel, setScrollLabel, type SlateNode } from "./plateSerializer";
import { useTheme } from "@/providers/ThemeProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./RichTextEditor.module.css";

// ── plate/ submodules ──
import type { PlateEditorProps } from "./plate/types";
export type { EditorImageInfo, PlateEditorHandle } from "./plate/types";
import { isInAncestor, getEditorText, _mathEditingSet, _imageUploadFn, findTextMatches } from "./plate/utils";
import { CHECKER_BG, COLUMN_BG_PRESETS, CALLOUT_BG_PRESETS } from "./plate/presets";
import { EditorKit } from "./plate/editor-kit";

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
import MathToolbar from "./plate/toolbars/MathToolbar";
import InlineInputToolbar from "./plate/toolbars/InlineInputToolbar";
import FloatingToolbar from "./plate/toolbars/FloatingToolbar";
import SlashMenu from "./plate/toolbars/SlashMenu";
import EmojiMenu from "./plate/toolbars/EmojiMenu";
import FindReplaceBar from "./plate/toolbars/FindReplaceBar";
import TBtn from "./plate/TBtn";
import { TblTrash } from "./plate/icons";
import { RxReset } from "react-icons/rx";
import { Pipette, ListTodo, Check, ChevronUp, ChevronDown, ChevronRight, Replace, X, Unlink } from "lucide-react";
import Tooltip from "@/components/ui/Tooltip";
import ColorPicker from "@/components/ui/ColorPicker";
import NumberInput from "@/components/ui/NumberInput";

// Re-export ImagePanel for backward compatibility
export { ImagePanel } from "./plate/ImagePanel";

// ── Find highlight leaf renderer (stable reference) ──
// Plate 의 RenderLeafFn 시그니처를 따르되 leaf 의 동적 hl 필드는 narrow 한 record 로 캐스팅
type FindLeafExtras = { findHighlight?: boolean; findCurrent?: boolean };
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

// ── Column ratio inputs (Enter/blur로 적용) ──
function ColumnRatioInputs({ colChildren, colCount, activePath, editor }: {
  colChildren: { width?: string }[];
  colCount: number;
  activePath: number[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any;
}) {
  const getWidths = () => colChildren.map((c) => c.width ? parseInt(c.width) : Math.round(100 / colCount));
  const [drafts, setDrafts] = useState<string[]>(() => getWidths().map(String));
  const prevKey = colChildren.map((c) => c.width).join(",") + colCount;
  const prevKeyRef = useRef(prevKey);
  if (prevKey !== prevKeyRef.current) {
    prevKeyRef.current = prevKey;
    setDrafts(getWidths().map(String));
  }

  const applyWidth = (idx: number, raw: string) => {
    const v = parseInt(raw);
    if (isNaN(v)) { setDrafts(getWidths().map(String)); return; }
    const clamped = Math.max(10, Math.min(90, v));
    const others = colChildren.map((c, j) => j === idx ? 0 : (c.width ? parseInt(c.width) : Math.round(100 / colCount)));
    const othersTotal = others.reduce((a, b) => a + b, 0);
    const remaining = 100 - clamped;
    editor.tf.withoutNormalizing(() => {
      editor.tf.setNodes({ width: `${clamped}%` }, { at: [...activePath, idx] });
      colChildren.forEach((_: unknown, j: number) => {
        if (j === idx) return;
        const ratio = othersTotal > 0 ? others[j] / othersTotal : 1 / (colCount - 1);
        const adjusted = Math.max(10, Math.round(remaining * ratio));
        editor.tf.setNodes({ width: `${adjusted}%` }, { at: [...activePath, j] });
      });
    });
  };

  const spinWidth = (idx: number, delta: number) => {
    const current = colChildren[idx]?.width ? parseInt(colChildren[idx].width!) : Math.round(100 / colCount);
    applyWidth(idx, String(current + delta));
  };

  const applyAll = () => {
    drafts.forEach((d, i) => applyWidth(i, d));
  };

  const currentWidths = getWidths();
  const isDirty = drafts.some((d, i) => d !== String(currentWidths[i]));

  return (
    <>
      {colChildren.map((_, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span style={{ color: "var(--text-muted)", fontSize: 10, lineHeight: 1, padding: "0 0 0 6px" }}>:</span>}
          <div className={styles.ratioWrap} style={i === colChildren.length - 1 ? { marginRight: 4 } : undefined}>
            <input
              type="text" inputMode="numeric"
              value={drafts[i] ?? ""}
              className={styles.ratioInput}
              onChange={(e) => {
                const raw = e.target.value;
                const next = [...drafts];
                next[i] = raw;
                const v = parseInt(raw);
                if (!isNaN(v)) {
                  const clamped = Math.max(0, Math.min(100, v));
                  const remaining = 100 - clamped;
                  const others = currentWidths.map((w, j) => j === i ? 0 : w);
                  const othersTotal = others.reduce((a, b) => a + b, 0);
                  colChildren.forEach((_, j) => {
                    if (j === i) return;
                    const ratio = othersTotal > 0 ? others[j] / othersTotal : 1 / (colCount - 1);
                    next[j] = String(Math.max(0, Math.round(remaining * ratio)));
                  });
                }
                setDrafts(next);
              }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyAll(); } }}
              onMouseDown={(e) => e.stopPropagation()}
            />
            <div className={styles.ratioSpin}>
              <button type="button" className={styles.ratioSpinBtn} onClick={() => spinWidth(i, 1)}>
                <svg width="8" height="5" viewBox="0 0 8 5"><path d="M4 0L8 5H0z" fill="currentColor"/></svg>
              </button>
              <button type="button" className={styles.ratioSpinBtn} onClick={() => spinWidth(i, -1)}>
                <svg width="8" height="5" viewBox="0 0 8 5"><path d="M4 5L0 0h8z" fill="currentColor"/></svg>
              </button>
            </div>
          </div>
        </React.Fragment>
      ))}
      <TBtn square tooltip="Apply" disabled={!isDirty} onClick={applyAll} style={{ marginLeft: 4 }}>
        <Check size={12} strokeWidth={2.5} />
      </TBtn>
    </>
  );
}

// 다중 블록 선택 시 — 텍스트 하이라이트 대신 블록 전체에 배경 표시.
// selection 이 두 개 이상의 top-level 블록에 걸치면 해당 블록 DOM 에 data-block-selected 부여.
function MultiBlockHighlight() {
  useEffect(() => {
    const root = document.querySelector('[data-slate-editor="true"]') as HTMLElement | null;
    if (!root) return;
    const CLIP_VARS = ["--a-l", "--a-t", "--a-w", "--a-h", "--b-l", "--b-t", "--b-w", "--b-h"];
    const clearClip = (el: HTMLElement) => { el.removeAttribute("data-float-clip"); CLIP_VARS.forEach((v) => el.style.removeProperty(v)); };
    const clear = () => root.querySelectorAll("[data-block-selected]").forEach((el) => { el.removeAttribute("data-block-selected"); clearClip(el as HTMLElement); });
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
    // 에디터 루트의 직속 자식(top-level 블록 래퍼) 찾기
    const blockOf = (node: Node | null): HTMLElement | null => {
      let el: HTMLElement | null = node ? (node.nodeType === 3 ? node.parentElement : (node as HTMLElement)) : null;
      while (el && el.parentElement && el.parentElement !== root) el = el.parentElement;
      return el && el.parentElement === root ? el : null;
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
      if (!aB || !fB || aB === fB) { root.removeAttribute("data-multiblock"); return; }
      root.setAttribute("data-multiblock", "");
      const floats = Array.from(root.querySelectorAll("[data-float-side]")) as HTMLElement[];
      let start = aB, end = fB;
      if (aB.compareDocumentPosition(fB) & Node.DOCUMENT_POSITION_PRECEDING) { start = fB; end = aB; }
      let cur: HTMLElement | null = start;
      while (cur) {
        cur.setAttribute("data-block-selected", "");
        if (floats.length) applyClip(cur, floats); else clearClip(cur);
        if (cur === end) break;
        cur = cur.nextElementSibling as HTMLElement | null;
      }
    };
    document.addEventListener("selectionchange", apply);
    return () => {
      document.removeEventListener("selectionchange", apply);
      root.removeAttribute("data-multiblock");
      clear();
    };
  }, []);
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
}: PlateEditorProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const isInternalUpdate = useRef(false);
  const prevValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  _imageUploadFn.current = onImageUpload || null;
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
  const linkToolbarRef = useRef<HTMLDivElement>(null);
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
  const findToolbarRef = useRef<HTMLDivElement>(null);

  // ── Math editing ──
  const [mathEditing, setMathEditing] = useState(false);
  _mathEditingSet.current = setMathEditing;

  const editor = usePlateEditor({
    plugins: EditorKit,
    value: stripDetachedMedia(value || "<p></p>"),
  });

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
          range = document.createRange();
          range.setStart(pos.offsetNode, pos.offset);
          range.collapse(true);
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
    return findTextMatches(editor.children as unknown[], findQuery, {
      caseSensitive: findCase,
      wholeWord: findWord,
      useRegex: findRegex,
    });
  }, [findQuery, findCase, findWord, findRegex, editor]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const matches = useMemo(() => findOpen ? findMatches() : [], [findOpen, findQuery, findCase, findWord, findRegex, editor]);

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
      const isCurrent = matches.length > 0 && findIdx < matches.length &&
        matches[findIdx].path.join(",") === path.join(",") && matches[findIdx].offset === m.index;
      ranges.push({
        anchor: { path, offset: m.index },
        focus: { path, offset: m.index + m[0].length },
        findHighlight: true,
        findCurrent: isCurrent,
      });
      if (m[0].length === 0) regex.lastIndex++;
    }
    return ranges;
  }, [findOpen, findQuery, findCase, findWord, findRegex, findIdx, matches]);

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
    editor.tf.select({
      anchor: { path: match.path, offset: match.offset },
      focus: { path: match.path, offset: match.offset + match.length },
    });
    editor.tf.insertText(replaceQuery);
  }, [findMatches, findIdx, replaceQuery, editor]);

  const doReplaceAll = useCallback(() => {
    const m = findMatches();
    if (m.length === 0) return;
    editor.tf.withoutNormalizing(() => {
      for (let i = m.length - 1; i >= 0; i--) {
        const match = m[i];
        editor.tf.select({
          anchor: { path: match.path, offset: match.offset },
          focus: { path: match.path, offset: match.offset + match.length },
        });
        editor.tf.insertText(replaceQuery);
      }
    });
    setFindIdx(0);
  }, [findMatches, replaceQuery, editor]);

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
  // 닫힘 애니메이션용 캐시
  const cachedColumnGroupRef = useRef(columnGroupNode);
  if (columnGroupNode) cachedColumnGroupRef.current = columnGroupNode;
  const columnGroupForRender = columnGroupNode || cachedColumnGroupRef.current;
  const colBgRecentColors = useRef<string[]>(
    typeof window !== "undefined"
      ? (() => { try { return JSON.parse(localStorage.getItem("col-bg-recent") || "[]"); } catch { return []; } })()
      : []
  );
  const colLineRecentColors = useRef<string[]>(
    typeof window !== "undefined"
      ? (() => { try { return JSON.parse(localStorage.getItem("col-line-recent") || "[]"); } catch { return []; } })()
      : []
  );
  const calloutRecentColors = useRef<string[]>(
    typeof window !== "undefined"
      ? (() => { try { return JSON.parse(localStorage.getItem("callout-recent-colors") || "[]"); } catch { return []; } })()
      : []
  );
  const [, forceColorUpdate] = useState(0);
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
        const split = isolateFloatImageBlocks(cur);
        if (split.length !== cur.length) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          editor.tf.setValue(split as any);
        }
      } catch { /* ignore */ }
    }, 60);
    return () => clearTimeout(t);
  }, [editor]);

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
      const nodes = editor.api.html.deserialize({ element: stripDetachedMedia(value || "<p></p>") });
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
        lastSlateValueRef.current = slateValue;
        isInternalUpdate.current = true;
        // detached 미디어를 숨김 div 로 덧붙여 저장 → 새로고침 후에도 패널에 유지 (없으면 빈 문자열)
        const html = slateToHtml(slateValue) + serializeDetachedMedia(detachedRef.current);
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
        console.error("[addImage] ERROR:", e);
      }
    };
    input.click();
  }, [editor, onImageUpload]);

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
        console.error("[addFile] ERROR:", e);
      }
    };
    input.click();
  }, [editor, onImageUpload, insertBlockNode]);

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
        console.error("[addAudio] ERROR:", e);
      }
    };
    input.click();
  }, [editor, onImageUpload, insertBlockNode]);

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
      if (linkToolbarRef.current && !linkToolbarRef.current.contains(e.target as Node)) {
        closeLinkOnOutside(e);
      }
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
      setTimeout(() => findInputRef.current?.focus(), 50);
      return;
    }
    if (mod && e.key === "h") {
      e.preventDefault();
      setFindOpen(true);
      setFindReplace(true);
      setTimeout(() => findInputRef.current?.focus(), 50);
      return;
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
  }, [editor, findOpen, isInTable, isInColumn, isInToggle, isInCallout, mathEditing, isInImage, isInMediaEmbed]);

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
    if (editor.selection) {
      insertMediaEmbed(editor, { url });
    } else {
      editor.tf.insertNodes(
        { type: "media_embed", url, children: [{ text: "" }] },
        { at: [editor.children.length] },
      );
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

  useImperativeHandle(editorRef, () => ({
    getImages: getImagesLive,
    selectImageAt,
    reorderImage,
    removeImage,
    insertImageByUrl,
    insertMediaByUrl,
    removeDetached,
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
        const nodes = editor.api.html.deserialize({ element: htmlSource || "<p></p>" });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        editor.tf.setValue(nodes as any);
        isInternalUpdate.current = true;
        prevValueRef.current = htmlSource;
        onChangeRef.current(htmlSource);
      } catch { /* ignore */ }
    }
    setHtmlMode(!htmlMode);
  }, [htmlMode, htmlSource, editor]);

  const insertMathBlock = useCallback(() => doInsertMath("", "block"), [doInsertMath]);

  // ── Active toolbar height → scrollPaddingTop + find offset ──
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const toolbarPadRef = useRef(0);
  // 어떤 toolbar든 visibility가 바뀌면 재측정
  const toolbarKey = `${findOpen}|${findReplace}|${isInTable}|${isInColumn}|${isInToggle}|${isInCallout}|${mathEditing}|${isInImage}|${showLinkInput}|${showEmbedInput}`;
  useEffect(() => {
    // 다음 프레임에서 측정 — DOM 업데이트 후
    const id = requestAnimationFrame(() => {
      const container = editorContainerRef.current;
      if (!container) return;
      const findH = findToolbarRef.current && !findToolbarRef.current.classList.contains(styles.tableToolbarHidden)
        ? findToolbarRef.current.offsetHeight : 0;
      container.querySelectorAll<HTMLElement>(`.${styles.tableToolbar}`).forEach((tb) => {
        if (tb === findToolbarRef.current) return;
        const isHidden = tb.classList.contains(styles.tableToolbarHidden);
        if (isHidden) {
          tb.style.top = "0px";
        } else if (findH > 0) {
          tb.style.top = `${findH}px`;
        } else {
          tb.style.top = "";
        }
      });
      let maxH = 0;
      container.querySelectorAll<HTMLElement>(`.${styles.tableToolbar}`).forEach((tb) => {
        if (!tb.classList.contains(styles.tableToolbarHidden)) {
          maxH = Math.max(maxH, (tb === findToolbarRef.current ? 0 : findH) + tb.offsetHeight);
        }
      });
      const scrollEl = container.querySelector<HTMLElement>("[data-slate-editor]");
      if (!scrollEl) return;
      const prev = toolbarPadRef.current;
      if (prev === maxH) return;
      const delta = maxH - prev;
      toolbarPadRef.current = maxH;
      scrollEl.style.paddingTop = maxH > 0 ? `calc(var(--spacing-md) + ${maxH}px)` : "";
      scrollEl.style.scrollPaddingTop = maxH > 0 ? `${maxH}px` : "";
      // padding 변경분만큼 scrollTop 보정 → 콘텐츠 점프 방지
      if (delta !== 0 && scrollEl.scrollTop > 0) {
        scrollEl.scrollTop += delta;
      }
    });
    return () => cancelAnimationFrame(id);
  }, [toolbarKey]);

  if (!editor) return null;

  // ── Character count ──
  const text = getEditorText(editor);
  const charCount = text.length;
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // ── Toolbar visibility ──
  const noOverlay = !showLinkInput && !showEmbedInput;

  return (
    <div className={styles.wrapper} data-theme={theme}>
      <Plate editor={editor} onChange={handleChange}>

        <MainToolbar
          editor={editor}
          isMac={isMac}
          tick={tick}
          postLang={postLang}
          showLinkInput={showLinkInput}
          onToggleLinkInput={toggleLinkInput}
          showEmbedInput={showEmbedInput}
          onToggleEmbedInput={toggleEmbedInput}
          htmlMode={htmlMode}
          onToggleHtmlMode={toggleHtmlMode}
          onAddImage={addImage}
          onAddFile={addFile}
          onAddAudio={addAudio}
          onInsertMath={insertMathBlock}
          mathEditing={mathEditing}
        />

        {/* ── Contextual Toolbars ── */}
        <div ref={editorContainerRef} className={`${styles.editorContainer} ${isInTable && noOverlay ? styles.editorContainerActive : ""}`}>
          <TableToolbar
            editor={editor}
            visible={isInTable && noOverlay}
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
            visible={isInImage && noOverlay}
            onFocusCapture={() => setImgToolbarFocused(true)}
            onBlurCapture={() => setImgToolbarFocused(false)}
            selectedImage={selectedImage}
            setImageAttr={setImageAttr}
          />

          <MathToolbar visible={mathEditing && noOverlay} />

          {/* Media Embed toolbar */}
          <div className={`${styles.tableToolbar} ${!isInMediaEmbed || !noOverlay ? styles.tableToolbarHidden : ""}`}>
            {selectedMediaEmbed && (() => {
              const mel = selectedMediaEmbed.node;
              const mUrl = (mel.url as string) || "";
              const isYT = /youtube\.com\/embed\//.test(mUrl) || /youtube\.com\/watch|youtu\.be/.test(mUrl);
              const mAlign = (mel.align as string) || "center";
              const mWidth = (mel.width as number) || 0;
              const mStart = (mel.ytStart as number) || 0;
              const mAutoplay = (mel.ytAutoplay as boolean) || false;
              const mLoop = (mel.ytLoop as boolean) || false;
              const mMute = (mel.ytMute as boolean) || false;
              const setAttr = (attrs: Record<string, unknown>) => {
                try { editor.tf.setNodes(attrs, { at: selectedMediaEmbed.path }); } catch {}
              };
              const SIZES = [{ label: "S", w: 400 }, { label: "M", w: 560 }, { label: "L", w: 720 }, { label: "Full", w: 0 }];
              const hh = Math.floor(mStart / 3600);
              const mm = Math.floor((mStart % 3600) / 60);
              const ss = mStart % 60;
              const handleTimeChange = (type: "h" | "m" | "s", val: string) => {
                const n = Math.max(0, Number(val) || 0);
                const next = type === "h" ? n * 3600 + mm * 60 + ss
                  : type === "m" ? hh * 3600 + Math.min(59, n) * 60 + ss
                  : hh * 3600 + mm * 60 + Math.min(59, n);
                setAttr({ ytStart: next });
              };
              return (
                <div className={styles.tableToolbarRow}>
                  <span className={styles.tableToolbarLabel}>EMBED</span>
                  <div className={styles.tableGroup}>
                    {(["left", "center", "right"] as const).map((a) => (
                      <TBtn key={a} square active={mAlign === a} onClick={() => setAttr({ align: a })}>{a === "left" ? "◧" : a === "center" ? "◻" : "◨"}</TBtn>
                    ))}
                  </div>
                  <div className={styles.tableGroup}>
                    {SIZES.map((s) => (
                      <TBtn key={s.label} active={mWidth === s.w} onClick={() => setAttr({ width: s.w })} style={{ padding: "0 6px" }}>{s.label}</TBtn>
                    ))}
                  </div>
                  {isYT && (
                    <>
                      <div className={styles.tableGroup}>
                        <span className={styles.embedStartLabel}>Start</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0 4px" }}>
                          <NumberInput label="h" value={hh} min={0} emptyValue={-1} stepper={false} width={26} onCommit={(n) => handleTimeChange("h", String(n))} ariaLabel="hours" />
                          <NumberInput label="m" value={mm} min={0} max={59} emptyValue={-1} stepper={false} width={26} onCommit={(n) => handleTimeChange("m", String(n))} ariaLabel="minutes" />
                          <NumberInput label="s" value={ss} min={0} max={59} emptyValue={-1} stepper={false} width={26} onCommit={(n) => handleTimeChange("s", String(n))} ariaLabel="seconds" />
                        </span>
                      </div>
                      <div className={styles.tableGroup}>
                        <span className={styles.tableGroupLabel}>Options</span>
                        <TBtn active={mAutoplay} onClick={() => setAttr({ ytAutoplay: !mAutoplay })} style={{ padding: "0 6px" }}>Autoplay</TBtn>
                        <TBtn active={mLoop} onClick={() => setAttr({ ytLoop: !mLoop })} style={{ padding: "0 6px" }}>Loop</TBtn>
                        <TBtn active={mMute} onClick={() => setAttr({ ytMute: !mMute })} style={{ padding: "0 6px" }}>Mute</TBtn>
                      </div>
                    </>
                  )}
                  <div className={styles.tableToolbarActions}>
                    <TBtn square onClick={() => setAttr({ width: 0, align: "center", ytStart: 0, ytAutoplay: false, ytLoop: false, ytMute: false, ytControls: true })}><RxReset size={13} /></TBtn>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Find & Replace toolbar — always on top */}
          <div ref={findToolbarRef} className={`${styles.tableToolbar} ${styles.findToolbar} ${!findOpen ? styles.tableToolbarHidden : ""}`}>
            <div className={styles.tableToolbarRow}>
              <span className={styles.tableToolbarLabel} style={{ minWidth: 52 }}>FIND</span>
              <div className={styles.tableGroup} style={{ width: 220 }}>
                <input
                  ref={findInputRef}
                  type="text"
                  className={styles.findInput}
                  placeholder={t("editor.findPlaceholder")}
                  value={findQuery}
                  onChange={(e) => { setFindQuery(e.target.value); setFindIdx(0); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); if (e.shiftKey) doFindPrev(); else doFindNext(); }
                    if (e.key === "Escape") { setFindOpen(false); editor.tf.focus(); }
                  }}
                />
                <span className={styles.findCount}>{matches.length > 0 ? `${Math.min(findIdx + 1, matches.length)}/${matches.length}` : "0"}</span>
              </div>
              <div className={styles.tableGroup}>
                <TBtn active={findCase} onClick={() => setFindCase(!findCase)} tooltip="Match Case (Aa)">Aa</TBtn>
                <TBtn active={findWord} onClick={() => setFindWord(!findWord)} tooltip="Match Whole Word">
                  <span style={{ fontSize: 10, fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 2 }}>ab</span>
                </TBtn>
                <TBtn active={findRegex} onClick={() => setFindRegex(!findRegex)} tooltip="Use Regular Expression">.*</TBtn>
              </div>
              <div className={styles.tableGroup}>
                <TBtn square onClick={doFindPrev} tooltip={t("editor.findPrev")}>
                  <ChevronUp size={12} strokeWidth={2.5} />
                </TBtn>
                <TBtn square onClick={doFindNext} tooltip={t("editor.findNext")}>
                  <ChevronDown size={12} strokeWidth={2.5} />
                </TBtn>
                <TBtn square active={findReplace} onClick={() => setFindReplace(!findReplace)} tooltip={t("editor.replace")}>
                  <Replace size={12} />
                </TBtn>
              </div>
              <div className={styles.tableToolbarActions}>
                <TBtn square onClick={() => { setFindOpen(false); setFindQuery(""); setReplaceQuery(""); editor.tf.focus(); }} tooltip="Close (Esc)">
                  <X size={12} strokeWidth={2.5} />
                </TBtn>
              </div>
            </div>
            {findReplace && (
              <div className={styles.tableToolbarRow}>
                <span className={styles.tableToolbarLabel} style={{ minWidth: 52 }}>REPLACE</span>
                <div className={styles.tableGroup} style={{ width: 220 }}>
                  <input
                    type="text"
                    className={styles.findInput}
                    placeholder={t("editor.replacePlaceholder")}
                    value={replaceQuery}
                    onChange={(e) => setReplaceQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); doReplace(); }
                      if (e.key === "Escape") { setFindOpen(false); editor.tf.focus(); }
                    }}
                  />
                </div>
                <TBtn onClick={doReplace} tooltip={t("editor.replaceOne")}>One</TBtn>
                <TBtn onClick={doReplaceAll} tooltip={t("editor.replaceAll")}>All</TBtn>
              </div>
            )}
          </div>

          {/* Column toolbar */}
          <div className={`${styles.tableToolbar} ${!(isInColumn && columnGroupNode && noOverlay) ? styles.tableToolbarHidden : ""}`}>
            {columnGroupForRender && (() => {
              const colBg = (columnGroupForRender.node.columnBg as string) || "";
              const colDiv = (columnGroupForRender.node.columnDivider as string) || "";
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const colChildren = ((columnGroupForRender.node as any).children || []) as { width?: string }[];
              const activePath = columnGroupNode?.path || columnGroupForRender.path;
              const colCount = colChildren.length;
              const BG_PRESETS = COLUMN_BG_PRESETS;
              return (
                <div className={styles.tableToolbarRow}>
                  <span className={styles.tableToolbarLabel}>COLS</span>
                  {/* BG 캡슐: 현재색 | 기본색 | 프리셋 | 초기화 | 피커 */}
                  <div className={styles.tableGroup}>
                    <span className={styles.tableGroupLabel}>BG</span>
                    <div className={styles.divider} />
                    <Tooltip content="current" placement="top" delay={200}>
                      <div className={styles.presetDotInline} style={{ background: colBg || CHECKER_BG, margin: "0 2px" }} />
                    </Tooltip>
                    <div className={styles.divider} />
                    {/* default(배경색) */}
                    <Tooltip content="default" placement="top" delay={200}>
                      <button type="button" className={`${styles.presetDotInline} ${!colBg ? styles.presetDotActive : ""}`} style={{ background: "var(--bg-secondary)" }} onClick={() => editor.tf.setNodes({ columnBg: undefined }, { at: activePath })} />
                    </Tooltip>
                    {/* none(투명) */}
                    <Tooltip content="none" placement="top" delay={200}>
                      <button type="button" className={`${styles.presetDotInline} ${colBg === "transparent" ? styles.presetDotActive : ""}`} style={{ background: CHECKER_BG }} onClick={() => editor.tf.setNodes({ columnBg: "transparent" }, { at: activePath })} />
                    </Tooltip>
                    {/* 프리셋 */}
                    {BG_PRESETS.filter((c) => c !== "transparent").map((c) => (
                      <Tooltip key={`bg-${c}`} content={c} placement="top" delay={200}>
                        <button type="button" className={`${styles.presetDotInline} ${c === colBg ? styles.presetDotActive : ""}`} style={{ background: c }} onClick={() => editor.tf.setNodes({ columnBg: c }, { at: activePath })} />
                      </Tooltip>
                    ))}
                    <div className={styles.divider} />
                    <div className={styles.colorGroup} style={{ gap: 2 }}>
                      <Pipette size={13} style={{ color: "var(--text-muted)", pointerEvents: "none", flexShrink: 0 }} />
                      <div className={styles.presetDotInline} style={{ background: colBg || CHECKER_BG, margin: "0 2px" }} />
                      <span style={{ width: 1, alignSelf: "stretch", background: "var(--border-light-color)", flexShrink: 0 }} />
                      <ColorPicker
                        value={colBg || "#ffffff"}
                        onChange={(c) => {
                          const v = c.oklch;
                          editor.tf.setNodes({ columnBg: v }, { at: activePath });
                          const list = colBgRecentColors.current;
                          if (list[0] !== v) {
                            const idx = list.indexOf(v);
                            if (idx !== -1) list.splice(idx, 1);
                            list.unshift(v);
                            if (list.length > 5) list.pop();
                            localStorage.setItem("col-bg-recent", JSON.stringify(list));
                            forceColorUpdate((v) => v + 1);
                          }
                        }}
                        triggerClassName={styles.colorInput}
                      />
                    </div>
                    {Array.from({ length: 5 }).map((_, i) => {
                      const c = colBgRecentColors.current[i];
                      const btn = <button key={i} type="button" className={`${styles.presetDotInline} ${c && colBg === c ? styles.presetDotActive : ""}`} disabled={!c} style={{ background: c || CHECKER_BG, cursor: c ? "pointer" : "default" }} onClick={() => { if (c) editor.tf.setNodes({ columnBg: c }, { at: activePath }); }} />;
                      return c ? <Tooltip key={i} content={c} placement="top" delay={200}>{btn}</Tooltip> : btn;
                    })}
                  </div>
                  {/* LINE 캡슐: 현재색 | 기본색 | none | 프리셋 | 초기화 | 피커 */}
                  <div className={styles.tableGroup}>
                    <span className={styles.tableGroupLabel}>Line</span>
                    <div className={styles.divider} />
                    <Tooltip content="current" placement="top" delay={200}>
                      <div className={styles.presetDotInline} style={{ background: colDiv === "transparent" ? CHECKER_BG : colDiv || "var(--text-muted)", margin: "0 2px" }} />
                    </Tooltip>
                    <div className={styles.divider} />
                    {/* 기본색(default) */}
                    <Tooltip content="default" placement="top" delay={200}>
                      <button type="button" className={`${styles.presetDotInline} ${!colDiv ? styles.presetDotActive : ""}`} style={{ background: "var(--text-muted)" }} onClick={() => editor.tf.setNodes({ columnDivider: undefined }, { at: activePath })} />
                    </Tooltip>
                    {/* none(transparent) */}
                    <Tooltip content="none" placement="top" delay={200}>
                      <button type="button" className={`${styles.presetDotInline} ${colDiv === "transparent" ? styles.presetDotActive : ""}`} style={{ background: CHECKER_BG }} onClick={() => editor.tf.setNodes({ columnDivider: "transparent" }, { at: activePath })} />
                    </Tooltip>
                    {/* 프리셋 */}
                    {["#d1d5db", "#000000", "#374151", "#ef4444", "#3b82f6", "#22c55e", "#8b5cf6"].map((c) => (
                      <Tooltip key={`line-${c}`} content={c} placement="top" delay={200}>
                        <button type="button" className={`${styles.presetDotInline} ${c === colDiv ? styles.presetDotActive : ""}`} style={{ background: c }} onClick={() => editor.tf.setNodes({ columnDivider: c }, { at: activePath })} />
                      </Tooltip>
                    ))}
                    <div className={styles.divider} />
                    <div className={styles.colorGroup} style={{ gap: 2 }}>
                      <Pipette size={13} style={{ color: "var(--text-muted)", pointerEvents: "none", flexShrink: 0 }} />
                      <div className={styles.presetDotInline} style={{ background: colDiv === "transparent" ? CHECKER_BG : colDiv || "var(--text-muted)", margin: "0 2px" }} />
                      <span style={{ width: 1, alignSelf: "stretch", background: "var(--border-light-color)", flexShrink: 0 }} />
                      <ColorPicker
                        value={colDiv && colDiv !== "transparent" ? colDiv : "#d1d5db"}
                        onChange={(c) => {
                          const v = c.oklch;
                          editor.tf.setNodes({ columnDivider: v }, { at: activePath });
                          const list = colLineRecentColors.current;
                          if (list[0] !== v) {
                            const idx = list.indexOf(v);
                            if (idx !== -1) list.splice(idx, 1);
                            list.unshift(v);
                            if (list.length > 5) list.pop();
                            localStorage.setItem("col-line-recent", JSON.stringify(list));
                            forceColorUpdate((v) => v + 1);
                          }
                        }}
                        triggerClassName={styles.colorInput}
                      />
                    </div>
                    {Array.from({ length: 5 }).map((_, i) => {
                      const c = colLineRecentColors.current[i];
                      const btn = <button key={i} type="button" className={`${styles.presetDotInline} ${c && colDiv === c ? styles.presetDotActive : ""}`} disabled={!c} style={{ background: c || CHECKER_BG, cursor: c ? "pointer" : "default" }} onClick={() => { if (c) editor.tf.setNodes({ columnDivider: c }, { at: activePath }); }} />;
                      return c ? <Tooltip key={i} content={c} placement="top" delay={200}>{btn}</Tooltip> : btn;
                    })}
                  </div>
                  {/* 너비 캡슐 */}
                  {colCount > 1 && (
                    <div className={styles.tableGroup}>
                      <span className={styles.tableGroupLabel}>Ratio</span>
                      <div className={styles.divider} />
                      <ColumnRatioInputs
                        colChildren={colChildren}
                        colCount={colCount}
                        activePath={activePath}
                        editor={editor}
                      />
                    </div>
                  )}
                  {/* 액션 */}
                  <div className={styles.tableToolbarActions}>
                    <TBtn
                      onClick={() => {
                        editor.tf.setNodes({ columnBg: undefined, columnDivider: undefined }, { at: activePath });
                        colChildren.forEach((_, i) => {
                          editor.tf.setNodes({ width: `${Math.round(100 / colCount)}%` }, { at: [...activePath, i] });
                        });
                      }}
                      tooltip={t("editor.clearFormat")}
                      style={{ padding: "0 6px" }}
                    >
                      Clear
                    </TBtn>
                    <TBtn
                      square
                      className={styles.tableDangerBtn}
                      onClick={() => { if (activePath) editor.tf.removeNodes({ at: activePath }); }}
                      tooltip={t("editor.deleteColumnLayout")}
                    >
                      <TblTrash />
                    </TBtn>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Toggle toolbar */}
          <div className={`${styles.tableToolbar} ${!(isInToggle && toggleNode && noOverlay) ? styles.tableToolbarHidden : ""}`}>
            {toggleNode && (() => {
              // 첫 번째 child의 타입 확인
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const children = (toggleNode.node as any).children || [];
              const firstChild = children[0] as { type?: string; listStyleType?: string; checked?: boolean } | undefined;
              const headingType = firstChild?.type || "p";
              return (
                <div className={styles.tableToolbarRow}>
                  <span className={styles.tableToolbarLabel}>TOGGLE</span>
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
                          <ListTodo size={14} />
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
                      <ChevronDown size={14} />
                    </TBtn>
                    <TBtn
                      square
                      active={(toggleNode.node.open as boolean) === false}
                      onClick={() => editor.tf.setNodes({ open: false }, { at: toggleNode.path })}
                      tooltip={t("editor.collapsed") || "Collapsed"}
                    >
                      <ChevronRight size={14} />
                    </TBtn>
                  </div>
                  {/* 삭제 */}
                  <div className={styles.tableToolbarActions}>
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
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Callout toolbar */}
          <div className={`${styles.tableToolbar} ${!(isInCallout && calloutNode && noOverlay) ? styles.tableToolbarHidden : ""}`}>
            {calloutNode && (() => {
              const cBg = (calloutNode.node.bg as string) || "var(--bg-tertiary)";
              return (
                <div className={styles.tableToolbarRow}>
                  <span className={styles.tableToolbarLabel}>CALLOUT</span>
                  {/* BG 그룹 (캡슐) */}
                  <div className={styles.tableGroup}>
                    <span className={styles.tableGroupLabel}>BG</span>
                    <div className={styles.divider} />
                    {/* 프리셋 */}
                    {CALLOUT_BG_PRESETS.map((p) => (
                      <Tooltip key={p.color} content={p.color} placement="top" delay={200}>
                        <button
                          type="button"
                          className={`${styles.presetDotInline} ${cBg === p.color ? styles.presetDotActive : ""}`}
                          style={{ background: p.color }}
                          onClick={() => editor.tf.setNodes({ bg: p.color }, { at: calloutNode.path })}
                        />
                      </Tooltip>
                    ))}
                    <div className={styles.divider} />
                    {/* 컬러피커 + 현재색 + 최근 피커색 */}
                    <div className={styles.colorGroup} style={{ gap: 2 }}>
                      <Pipette size={13} style={{ color: "var(--text-muted)", pointerEvents: "none", flexShrink: 0 }} />
                      <div className={styles.presetDotInline} style={{ background: (cBg.startsWith("#") || cBg.startsWith("oklch")) ? cBg : CHECKER_BG, margin: "0 2px" }} />
                      <span style={{ width: 1, alignSelf: "stretch", background: "var(--border-light-color)", flexShrink: 0 }} />
                      <ColorPicker
                        value={(cBg.startsWith("#") || cBg.startsWith("oklch")) ? cBg : "#ffffff"}
                        onChange={(c) => {
                          const v = c.oklch;
                          editor.tf.setNodes({ bg: v }, { at: calloutNode.path });
                          // 최근색 — 우리 ColorPicker 의 commit 시점에 1회 호출
                          const list = calloutRecentColors.current;
                          if (list[0] !== v) {
                            const idx = list.indexOf(v);
                            if (idx !== -1) list.splice(idx, 1);
                            list.unshift(v);
                            if (list.length > 5) list.pop();
                            localStorage.setItem("callout-recent-colors", JSON.stringify(list));
                            forceColorUpdate((v) => v + 1);
                          }
                        }}
                        triggerClassName={styles.colorInput}
                      />
                    </div>
                    {Array.from({ length: 5 }).map((_, i) => {
                      const c = calloutRecentColors.current[i];
                      const btn = (
                        <button
                          key={i}
                          type="button"
                          className={`${styles.presetDotInline} ${c && cBg === c ? styles.presetDotActive : ""}`}
                          disabled={!c}
                          style={{ background: c || CHECKER_BG, cursor: c ? "pointer" : "default" }}
                          onClick={() => { if (c) editor.tf.setNodes({ bg: c }, { at: calloutNode.path }); }}
                        />
                      );
                      return c ? <Tooltip key={i} content={c} placement="top" delay={200}>{btn}</Tooltip> : btn;
                    })}
                  </div>
                  {/* 프리셋 캡슐 */}
                  <div className={styles.tableGroup}>
                    <span className={styles.tableGroupLabel}>Preset</span>
                    <TBtn
                      onClick={() => editor.tf.setNodes({ bg: "var(--bg-tertiary)", icon: "💡" }, { at: calloutNode.path })}
                      tooltip="Tip"
                      style={{ padding: 0, width: 24, aspectRatio: "1" }}
                    >💡</TBtn>
                    <TBtn
                      onClick={() => editor.tf.setNodes({ bg: "#fee2e2", icon: "⚠️" }, { at: calloutNode.path })}
                      tooltip="Warning"
                      style={{ padding: 0, width: 24, aspectRatio: "1" }}
                    >⚠️</TBtn>
                    <TBtn
                      onClick={() => editor.tf.setNodes({ bg: "#dcfce7", icon: "✅" }, { at: calloutNode.path })}
                      tooltip="Success"
                      style={{ padding: 0, width: 24, aspectRatio: "1" }}
                    >✅</TBtn>
                    <TBtn
                      onClick={() => editor.tf.setNodes({ bg: "#dbeafe", icon: "ℹ️" }, { at: calloutNode.path })}
                      tooltip="Info"
                      style={{ padding: 0, width: 24, aspectRatio: "1" }}
                    >ℹ️</TBtn>
                    <TBtn
                      onClick={() => editor.tf.setNodes({ bg: "#fef3c7", icon: "📌" }, { at: calloutNode.path })}
                      tooltip="Note"
                      style={{ padding: 0, width: 24, aspectRatio: "1" }}
                    >📌</TBtn>
                    <TBtn
                      onClick={() => editor.tf.setNodes({ bg: "#e8d0f0", icon: "🔮" }, { at: calloutNode.path })}
                      tooltip="Insight"
                      style={{ padding: 0, width: 24, aspectRatio: "1" }}
                    >🔮</TBtn>
                  </div>
                  {/* 우측 — 이모지 제거/추가, 서식 초기화, 콜아웃 삭제 */}
                  <div className={styles.tableToolbarActions}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                      {calloutNode.node.icon ? (
                        <TBtn
                          square
                          onClick={() => editor.tf.setNodes({ icon: undefined }, { at: calloutNode.path })}
                          tooltip={t("editor.removeEmoji")}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/><line x1="4" y1="4" x2="20" y2="20"/></svg>
                        </TBtn>
                      ) : (
                        <TBtn
                          onClick={() => editor.tf.setNodes({ icon: "💡" }, { at: calloutNode.path })}
                          tooltip={t("editor.addEmoji")}
                        >
                          😀
                        </TBtn>
                      )}
                      <TBtn
                        onClick={() => editor.tf.setNodes({ bg: "var(--bg-tertiary)", icon: "💡" }, { at: calloutNode.path })}
                        tooltip={t("editor.clearFormat")}
                      >
                        Clear
                      </TBtn>
                      <TBtn
                        square
                        className={styles.tableDangerBtn}
                        onClick={() => {
                          if (calloutNode.path) editor.tf.removeNodes({ at: calloutNode.path });
                        }}
                        tooltip={t("editor.deleteCallout")}
                      >
                        <TblTrash />
                      </TBtn>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ── Link form (advanced) ── */}
          <div ref={linkToolbarRef} className={`${styles.tableToolbar} ${!showLinkInput ? styles.tableToolbarHidden : ""}`}>
            <div className={styles.tableToolbarRow} style={{ gap: 6, paddingRight: "var(--spacing-xs)" }}>
              <span className={styles.tableToolbarLabel}>LINK</span>
              {/* 프로토콜 + URL 캡슐 */}
              <div className={styles.linkCapsule}>
                <select
                  className={styles.linkProtocol}
                  value={linkForm.protocol}
                  onChange={(e) => {
                    const proto = e.target.value;
                    setLinkForm((f) => ({ ...f, protocol: proto, ...(proto === "" ? { target: "_self" } : {}) }));
                  }}
                >
                  <option value="https://">https://</option>
                  <option value="http://">http://</option>
                  <option value="mailto:">mailto:</option>
                  <option value="tel:">tel:</option>
                  <option value="">/</option>
                </select>
                <input
                  ref={linkUrlRef}
                  type="text"
                  className={styles.linkCapsuleInput}
                  placeholder={linkForm.protocol === "" ? "/posts/my-post" : linkForm.protocol.startsWith("mailto") ? "user@example.com" : linkForm.protocol.startsWith("tel") ? "010-1234-5678" : "example.com"}
                  value={linkForm.url}
                  onChange={(e) => {
                    const val = e.target.value;
                    // URL 붙여넣기 시 프로토콜 자동 분리
                    const protoMatch = val.match(/^(https?:\/\/|mailto:|tel:)(.*)/);
                    if (protoMatch) {
                      setLinkForm((f) => ({ ...f, protocol: protoMatch[1], url: protoMatch[2] }));
                      return;
                    }
                    setLinkForm((f) => ({ ...f, url: val }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && linkForm.url.trim()) { doInsertLink(linkForm); closeLinkInput(); }
                    else if (e.key === "Escape") closeLinkInput();
                  }}
                />
              </div>
              {/* 표시 텍스트 그룹 */}
              <div className={styles.tableGroup}>
                <span className={styles.tableGroupLabel}>{t("editor.linkText")}</span>
                <input
                  type="text"
                  className={styles.linkInput}
                  style={{ width: 100 }}
                  placeholder="Text"
                  value={linkForm.text}
                  onChange={(e) => setLinkForm((f) => ({ ...f, text: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && linkForm.url.trim()) { doInsertLink(linkForm); closeLinkInput(); }
                    else if (e.key === "Escape") closeLinkInput();
                  }}
                />
              </div>
              {/* 타겟 그룹 */}
              <div className={styles.tableGroup}>
                <span className={styles.tableGroupLabel}>{t("editor.linkTarget")}</span>
                <div className={styles.selectWrap}>
                  <select
                    className={styles.fontSelect}
                    style={{ width: 80 }}
                    value={linkForm.target}
                    onChange={(e) => setLinkForm((f) => ({ ...f, target: e.target.value }))}
                  >
                    <option value="_blank">{t("editor.linkNewTab")}</option>
                    <option value="_self">{t("editor.linkSameTab")}</option>
                  </select>
                </div>
              </div>
              {/* 삽입/제거/닫기 그룹 — 오른쪽 끝 */}
              <div className={styles.linkActions}>
                <TBtn
                  onClick={() => { if (linkForm.url.trim()) { doInsertLink(linkForm); closeLinkInput(); } }}
                  tooltip={t("editor.insertLink")}
                >✓</TBtn>
                <TBtn
                  square
                  onClick={() => {
                    restoreSelection();
                    try { unwrapLink(editor); } catch { /* ignore */ }
                    closeLinkInput();
                  }}
                  tooltip={t("editor.removeLink")}
                >
                  <Unlink size={12} />
                </TBtn>
                <TBtn onClick={closeLinkInput} tooltip={t("common.cancel")}>×</TBtn>
              </div>
            </div>
          </div>

          <InlineInputToolbar
            label="EMBED"
            visible={showEmbedInput}
            value={embedInputValue}
            onChange={setEmbedInputValue}
            onSubmit={doInsertEmbed}
            onClose={closeEmbedInput}
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
                zIndex: 9998,
                opacity: 0,
                transition: "opacity 0.1s",
              }}
            />
            <PlateContent
              className={styles.editorContent}
              style={{ minHeight: 300, paddingBottom: 40 }}
              data-lenis-prevent
              onKeyDown={handleContentKeyDown}
              decorate={findOpen ? decorate : undefined}
              renderLeaf={findOpen ? renderFindLeaf : undefined}
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
        <FloatingToolbar hideToolbar={showLinkInput || showEmbedInput || isInImage || isInMediaEmbed || mathEditing || slashOpen} />

        {/* 슬래시 명령 메뉴 (/) */}
        <SlashMenu onOpenChange={setSlashOpen} />

        {/* 다중 블록 선택 하이라이트 */}
        <MultiBlockHighlight />

        {/* float 이미지 옆 블록의 핸들/placeholder 위치 조정 */}
        <FloatEdgeAdjust />

        {/* 이모지 인라인 검색 (:) */}
        <EmojiMenu />

        {/* 찾기 & 바꾸기 (Cmd/Ctrl+F) */}
        <FindReplaceBar />

        {/* ── Status bar ── */}
        <div className={styles.statusBar}>
          <span>{charCount.toLocaleString()} {t("editor.charUnit")}</span>
          <span>·</span>
          <span>{wordCount.toLocaleString()} {t("editor.wordUnit")}</span>
        </div>

      </Plate>
    </div>
  );
}
