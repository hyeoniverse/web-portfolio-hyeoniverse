"use client";

import React, { useState, useCallback, useEffect, useRef, useImperativeHandle, useMemo } from "react";
import {
  Plate,
  PlateContent,
  usePlateEditor,
} from "platejs/react";
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
import { plugins } from "./plate/plugins";

// ── hooks ──
import {
  useTableInfo,
  useBorderPopover,
  useTableActions,
  useOutsideClick,
} from "./plate/hooks";

// ── toolbar components ──
import MainToolbar from "./plate/toolbars/MainToolbar";
import TableToolbar from "./plate/toolbars/TableToolbar";
import ImageToolbar from "./plate/toolbars/ImageToolbar";
import MathToolbar from "./plate/toolbars/MathToolbar";
import InlineInputToolbar from "./plate/toolbars/InlineInputToolbar";
import TBtn from "./plate/TBtn";
import { TblTrash } from "./plate/icons";
import { Pipette, ListTodo } from "lucide-react";
import Tooltip from "@/components/ui/Tooltip";

// Re-export ImagePanel for backward compatibility
export { ImagePanel } from "./plate/ImagePanel";

// ── Find highlight leaf renderer (stable reference) ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderFindLeaf = ({ children, leaf, attributes }: any) => {
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
          {i > 0 && <span style={{ color: "var(--text-muted)", fontSize: 10, lineHeight: 1, padding: "0 1px" }}>:</span>}
          <div className={styles.ratioWrap}>
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
      <div className={styles.divider} />
      <TBtn tooltip="Apply" disabled={!isDirty} onClick={applyAll}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </TBtn>
    </>
  );
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
    plugins,
    value: value || "<p></p>",
  });

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
  const selectedImage = (() => {
    if (!editor.selection) return null;
    try {
      const entry = editor.api.above({ match: { type: "img" } });
      return entry ? (entry[0] as Record<string, unknown>) : null;
    } catch { return null; }
  })();
  const isInImage = !!selectedImage;

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
      const nodes = editor.api.html.deserialize({ element: value || "<p></p>" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editor.tf.setValue(nodes as any);

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
              }
            }
          }
          prevAnchorRef.current = { path: [...anchor.path], offset: anchor.offset };
        } catch { /* ignore */ }
      }

      if (slateValue !== lastSlateValueRef.current) {
        lastSlateValueRef.current = slateValue;
        isInternalUpdate.current = true;
        const html = slateToHtml(slateValue);
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

  const setImageAttr = useCallback((attr: string, val: unknown) => {
    if (!editor?.selection) return;
    try {
      const entry = editor.api.above({ match: { type: "img" } });
      if (entry) editor.tf.setNodes({ [attr]: val }, { at: entry[1] });
    } catch { /* ignore */ }
  }, [editor]);

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
  useOutsideClick(linkToolbarRef, showLinkInput, closeLinkInput);
  const closeEmbedInput = useCallback(() => { setShowEmbedInput(false); setEmbedInputValue(""); }, []);

  // ── Link unwrap on Backspace at link boundary ──
  const handleContentKeyDown = useCallback((e: React.KeyboardEvent) => {
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
  }, [editor, findOpen, isInTable, isInColumn, isInToggle, isInCallout, mathEditing, isInImage]);

  // ── All media (images + video embeds) + detached 동기 관리 ──
  const detachedRef = useRef<{ url: string; mediaType?: string }[]>([]);
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
    console.log("[removeImage] path:", path);
    try {
      const node = editor.api.node(path);
      console.log("[removeImage] node:", node);
      if (node) {
        const n = node[0] as Record<string, unknown>;
        if (n.url) deletedUrlsRef.current.add(n.url as string);
      }
      editor.tf.removeNodes({ at: path });
      console.log("[removeImage] done");
    } catch (e) { console.error("[removeImage] ERROR:", e); }
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
    console.log("[insertMediaByUrl] url:", url, "selection:", editor?.selection);
    if (!editor) return;
    if (editor.selection) {
      insertMediaEmbed(editor, { url });
    } else {
      console.log("[insertMediaByUrl] no selection, inserting at:", [editor.children.length]);
      editor.tf.insertNodes(
        { type: "media_embed", url, children: [{ text: "" }] },
        { at: [editor.children.length] },
      );
    }
    console.log("[insertMediaByUrl] done");
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
  }), [allImages, selectImageAt, reorderImage, removeImage, insertImageByUrl, insertMediaByUrl, removeDetached]);

  // ── MainToolbar toggle handlers ──
  const toggleLinkInput = useCallback(() => {
    if (showLinkInput) { closeLinkInput(); return; }
    saveSelection();
    // 선택된 텍스트가 있으면 표시 텍스트에 자동 입력
    const sel = editor.selection;
    const selectedText = sel && !editor.api.isCollapsed() ? editor.api.string(sel) : "";
    // 이미 링크 안에 있으면 기존 정보 로드
    let existingUrl = "";
    let existingTarget = "_blank";
    try {
      const linkEntry = editor.api.above({ match: { type: "a" } });
      if (linkEntry) {
        const linkNode = linkEntry[0] as Record<string, unknown>;
        existingUrl = (linkNode.url as string) || "";
        existingTarget = (linkNode.target as string) || "_blank";
      }
    } catch { /* ignore */ }
    const protocol = existingUrl.startsWith("mailto:") ? "mailto:" : existingUrl.startsWith("tel:") ? "tel:" : "https://";
    const urlWithoutProtocol = existingUrl.replace(/^(https?:\/\/|mailto:|tel:)/, "");
    setShowEmbedInput(false);
    setShowLinkInput(true);
    setLinkForm({ url: urlWithoutProtocol, text: selectedText, protocol, target: existingTarget });
    setTimeout(() => linkUrlRef.current?.focus(), 30);
  }, [showLinkInput, saveSelection, closeLinkInput, editor]);

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
            selectedImage={selectedImage}
            setImageAttr={setImageAttr}
            moveImage={moveImage}
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
              return (
                <div className={styles.tableToolbarRow}>
                  <span className={styles.tableToolbarLabel}>EMBED</span>
                  <div className={styles.tableGroup}>
                    {(["left", "center", "right"] as const).map((a) => (
                      <TBtn key={a} active={mAlign === a} onClick={() => setAttr({ align: a })}>{a === "left" ? "◧" : a === "center" ? "◻" : "◨"}</TBtn>
                    ))}
                  </div>
                  <div className={styles.tableGroup}>
                    {SIZES.map((s) => (
                      <TBtn key={s.label} active={mWidth === s.w} onClick={() => setAttr({ width: s.w })}>{s.label}</TBtn>
                    ))}
                  </div>
                  <TBtn onClick={() => setAttr({ width: 0, align: "center", ytStart: 0, ytAutoplay: false, ytLoop: false, ytMute: false, ytControls: true })}>↺</TBtn>
                  {isYT && (
                    <>
                      <div className={styles.tableGroup}>
                        <span style={{ fontSize: 10, padding: "0 4px", color: "var(--text-tertiary)" }}>Start</span>
                        <input
                          type="number"
                          min={0}
                          value={mStart}
                          onChange={(e) => setAttr({ ytStart: Math.max(0, Number(e.target.value) || 0) })}
                          onMouseDown={(e) => e.stopPropagation()}
                          style={{ width: 44, padding: "1px 4px", fontSize: 11, border: "1px solid var(--border-light-color)", borderRadius: "var(--radius-xs)", background: "transparent", color: "inherit", textAlign: "center" }}
                        />
                        <span style={{ fontSize: 9, color: "var(--text-muted)" }}>s</span>
                      </div>
                      <div className={styles.tableGroup}>
                        <TBtn active={mAutoplay} onClick={() => setAttr({ ytAutoplay: !mAutoplay })}>Autoplay</TBtn>
                        <TBtn active={mLoop} onClick={() => setAttr({ ytLoop: !mLoop })}>Loop</TBtn>
                        <TBtn active={mMute} onClick={() => setAttr({ ytMute: !mMute })}>Mute</TBtn>
                      </div>
                    </>
                  )}
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
                <TBtn onClick={doFindPrev} tooltip={t("editor.findPrev")}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                </TBtn>
                <TBtn onClick={doFindNext} tooltip={t("editor.findNext")}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </TBtn>
                <TBtn active={findReplace} onClick={() => setFindReplace(!findReplace)} tooltip={t("editor.replace")}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
                </TBtn>
              </div>
              <div className={styles.tableToolbarActions}>
                <TBtn onClick={() => { setFindOpen(false); setFindQuery(""); setReplaceQuery(""); editor.tf.focus(); }} tooltip="Close (Esc)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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
                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: colBg || CHECKER_BG, border: "1px solid var(--border-light-color)", flexShrink: 0 }} />
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
                    <div className={styles.colorGroup} style={{ gap: 3 }}>
                      <Pipette size={13} style={{ color: "var(--text-muted)", pointerEvents: "none", flexShrink: 0 }} />
                      <div className={styles.colorIndicator} style={{ width: 12, height: 12, borderRadius: "50%", background: colBg || CHECKER_BG, border: "1px solid var(--border-light-color)" }} />
                      <input type="color" className={styles.colorInput} value={colBg || "#ffffff"}
                        onChange={(e) => editor.tf.setNodes({ columnBg: e.target.value }, { at: activePath })}
                        ref={(el) => {
                          if (!el || (el as HTMLInputElement & { _b?: boolean })._b) return;
                          (el as HTMLInputElement & { _b?: boolean })._b = true;
                          el.addEventListener("change", () => {
                            const c = el.value; const list = colBgRecentColors.current;
                            if (list[0] !== c) { const idx = list.indexOf(c); if (idx !== -1) list.splice(idx, 1); list.unshift(c); if (list.length > 5) list.pop(); localStorage.setItem("col-bg-recent", JSON.stringify(list)); forceColorUpdate((v) => v + 1); }
                          });
                        }}
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
                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: colDiv === "transparent" ? CHECKER_BG : colDiv || "var(--text-muted)", border: "1px solid var(--border-light-color)", flexShrink: 0 }} />
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
                    <div className={styles.colorGroup} style={{ gap: 3 }}>
                      <Pipette size={13} style={{ color: "var(--text-muted)", pointerEvents: "none", flexShrink: 0 }} />
                      <div className={styles.colorIndicator} style={{ width: 12, height: 12, borderRadius: "50%", background: colDiv === "transparent" ? CHECKER_BG : colDiv || "var(--text-muted)", border: "1px solid var(--border-light-color)" }} />
                      <input type="color" className={styles.colorInput} value={colDiv && colDiv !== "transparent" ? colDiv : "#d1d5db"}
                        onChange={(e) => editor.tf.setNodes({ columnDivider: e.target.value }, { at: activePath })}
                        ref={(el) => {
                          if (!el || (el as HTMLInputElement & { _b?: boolean })._b) return;
                          (el as HTMLInputElement & { _b?: boolean })._b = true;
                          el.addEventListener("change", () => {
                            const c = el.value; const list = colLineRecentColors.current;
                            if (list[0] !== c) { const idx = list.indexOf(c); if (idx !== -1) list.splice(idx, 1); list.unshift(c); if (list.length > 5) list.pop(); localStorage.setItem("col-line-recent", JSON.stringify(list)); forceColorUpdate((v) => v + 1); }
                          });
                        }}
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
                  {/* 액션 캡슐 */}
                  <div className={styles.tableToolbarActions}>
                    <div className={styles.tableGroup}>
                      <TBtn
                        onClick={() => {
                          editor.tf.setNodes({ columnBg: undefined, columnDivider: undefined }, { at: activePath });
                          colChildren.forEach((_, i) => {
                            editor.tf.setNodes({ width: `${Math.round(100 / colCount)}%` }, { at: [...activePath, i] });
                          });
                        }}
                        tooltip={t("editor.clearFormat")}
                      >
                        Clear
                      </TBtn>
                      <TBtn
                        className={styles.tableDangerBtn}
                        onClick={() => { if (activePath) editor.tf.removeNodes({ at: activePath }); }}
                        tooltip={t("editor.deleteColumnLayout")}
                      >
                        <TblTrash />
                      </TBtn>
                    </div>
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
                        const entry = editor.api.block();
                        if (entry) {
                          const [node, path] = entry;
                          const nd = node as Record<string, unknown>;
                          if (Object.hasOwn(nd, "checked")) {
                            editor.tf.unsetNodes(["checked", "listStyleType"], { at: path });
                          } else {
                            editor.tf.setNodes({ checked: false, listStyleType: "todo" }, { at: path });
                          }
                        }
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
                        <TBtn onClick={() => insertListInToggle("todo", true)} tooltip={t("editor.todoList")}>
                          <ListTodo size={14} />
                        </TBtn>
                      </div>
                    );
                  })()}
                  {/* 기본 펼침/접힘 설정 */}
                  <div className={styles.tableGroup}>
                    <span className={styles.tableGroupLabel}>{t("editor.defaultState") || "State"}</span>
                    <TBtn
                      active={(toggleNode.node.open as boolean) !== false}
                      onClick={() => editor.tf.setNodes({ open: true }, { at: toggleNode.path })}
                      tooltip={t("editor.expanded") || "Expanded"}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    </TBtn>
                    <TBtn
                      active={(toggleNode.node.open as boolean) === false}
                      onClick={() => editor.tf.setNodes({ open: false }, { at: toggleNode.path })}
                      tooltip={t("editor.collapsed") || "Collapsed"}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                    </TBtn>
                  </div>
                  {/* 삭제 */}
                  <div className={styles.tableToolbarActions}>
                    <div className={styles.tableGroup}>
                      <TBtn
                        onClick={() => editor.tf.setNodes({ open: true }, { at: toggleNode.path })}
                        tooltip={t("editor.clearFormat")}
                      >
                        Clear
                      </TBtn>
                      <TBtn
                        className={styles.tableDangerBtn}
                        onClick={() => { if (toggleNode.path) editor.tf.removeNodes({ at: toggleNode.path }); }}
                        tooltip={t("editor.deleteToggle") || "Delete toggle"}
                      >
                        <TblTrash />
                      </TBtn>
                    </div>
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
                    <div className={styles.colorGroup} style={{ gap: 3 }}>
                      <Pipette size={13} style={{ color: "var(--text-muted)", pointerEvents: "none", flexShrink: 0 }} />
                      <div className={styles.colorIndicator} style={{ width: 12, height: 12, borderRadius: "50%", background: cBg.startsWith("#") ? cBg : CHECKER_BG, border: "1px solid var(--border-light-color)" }} />
                      <input
                        type="color"
                        className={styles.colorInput}
                        value={cBg.startsWith("#") ? cBg : "#ffffff"}
                        onChange={(e) => {
                          // 실시간 배경 반영만
                          editor.tf.setNodes({ bg: e.target.value }, { at: calloutNode.path });
                        }}
                        ref={(el) => {
                          if (!el || (el as HTMLInputElement & { _bound?: boolean })._bound) return;
                          (el as HTMLInputElement & { _bound?: boolean })._bound = true;
                          // 네이티브 change = 피커 닫힐 때 1회
                          el.addEventListener("change", () => {
                            const c = el.value;
                            const list = calloutRecentColors.current;
                            if (list[0] !== c) {
                              const idx = list.indexOf(c);
                              if (idx !== -1) list.splice(idx, 1);
                              list.unshift(c);
                              if (list.length > 5) list.pop();
                              localStorage.setItem("callout-recent-colors", JSON.stringify(list));
                              forceColorUpdate((v) => v + 1);
                            }
                          });
                        }}
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
                    >💡</TBtn>
                    <TBtn
                      onClick={() => editor.tf.setNodes({ bg: "#fee2e2", icon: "⚠️" }, { at: calloutNode.path })}
                      tooltip="Warning"
                    >⚠️</TBtn>
                    <TBtn
                      onClick={() => editor.tf.setNodes({ bg: "#dcfce7", icon: "✅" }, { at: calloutNode.path })}
                      tooltip="Success"
                    >✅</TBtn>
                    <TBtn
                      onClick={() => editor.tf.setNodes({ bg: "#dbeafe", icon: "ℹ️" }, { at: calloutNode.path })}
                      tooltip="Info"
                    >ℹ️</TBtn>
                    <TBtn
                      onClick={() => editor.tf.setNodes({ bg: "#fef3c7", icon: "📌" }, { at: calloutNode.path })}
                      tooltip="Note"
                    >📌</TBtn>
                    <TBtn
                      onClick={() => editor.tf.setNodes({ bg: "#e8d0f0", icon: "🔮" }, { at: calloutNode.path })}
                      tooltip="Insight"
                    >🔮</TBtn>
                  </div>
                  {/* 우측 — 이모지 제거/추가, 서식 초기화, 콜아웃 삭제 */}
                  <div className={styles.tableToolbarActions}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                      {calloutNode.node.icon ? (
                        <TBtn
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
                <select
                  className={styles.fontSelect}
                  style={{ width: 80, height: 24, fontSize: 11, border: "none", borderLeft: "var(--border-light)", borderRadius: 0 }}
                  value={linkForm.target}
                  onChange={(e) => setLinkForm((f) => ({ ...f, target: e.target.value }))}
                >
                  <option value="_blank">{t("editor.linkNewTab")}</option>
                  <option value="_self">{t("editor.linkSameTab")}</option>
                </select>
              </div>
              {/* 삽입/제거/닫기 그룹 — 오른쪽 끝 */}
              <div className={styles.linkActions}>
                <TBtn
                  onClick={() => { if (linkForm.url.trim()) { doInsertLink(linkForm); closeLinkInput(); } }}
                  tooltip={t("editor.insertLink")}
                >✓</TBtn>
                <TBtn
                  onClick={() => {
                    restoreSelection();
                    try { unwrapLink(editor); } catch { /* ignore */ }
                    closeLinkInput();
                  }}
                  tooltip={t("editor.removeLink")}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18.84 12.25l1.72-1.71h-.02a5.004 5.004 0 00-7.07-7.07l-1.72 1.71" />
                    <path d="M5.17 11.75l-1.71 1.71a5 5 0 007.07 7.07l1.71-1.71" />
                    <line x1="8" y1="2" x2="8" y2="5" /><line x1="2" y1="8" x2="5" y2="8" /><line x1="16" y1="19" x2="16" y2="22" /><line x1="19" y1="16" x2="22" y2="16" />
                  </svg>
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
                position: "absolute",
                width: 2,
                background: "var(--color-accent)",
                borderRadius: 1,
                pointerEvents: "none",
                zIndex: 10,
                opacity: 0,
                transition: "opacity 0.1s",
              }}
            />
            <PlateContent
              className={styles.editorContent}
              placeholder="Write your content..."
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
