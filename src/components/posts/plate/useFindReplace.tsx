"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { PlateEditor } from "platejs/react";
import { findTextMatches } from "./utils";

/* 찾기 · 바꾸기 — 에디터 본문에서만 쓰는 상태 열 개와 그 위의 연산을 한곳에 모았다.
   매치는 문서 전체를 훑어 경로+오프셋으로 모으고, 하이라이트는 decorate 가 leaf 로 그린다.
   "선택 영역에서 찾기" 는 켤 때 선택 범위를 scope 로 캡처해 매치를 그 안으로 한정한다.
   PlateEditor.tsx 에서 분리 (#680). */

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

export function useFindReplace(editor: PlateEditor) {
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

  /** 선택 영역 한정을 끈다 — 찾기 바를 새로 열거나 닫을 때 */
  const clearFindScope = useCallback(() => {
    setFindInSel(false);
    setFindSelScope(null);
  }, []);

  return {
    findOpen, setFindOpen, findReplace, setFindReplace,
    findQuery, setFindQuery, replaceQuery, setReplaceQuery,
    findCase, setFindCase, findWord, setFindWord, findRegex, setFindRegex,
    findIdx, setFindIdx, findInputRef,
    findInSel, findSelScope, toggleFindInSel, clearFindScope,
    preserveCase, setPreserveCase,
    findHistoryRef, histIdxRef,
    findBarRect, setFindBarRect,
    matches, decorate, renderFindLeaf,
    doFindNext, doFindPrev, doReplace, doReplaceAll,
  };
}
