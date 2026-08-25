"use client";

// ── Sandpack 기반 코드 플레이그라운드 (CodeSandbox 식) ──
// 무거운 의존성이라 PlaygroundElement 에서 lazy-load 로만 불러온다.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackConsole,
  useSandpack,
  type SandpackPredefinedTemplate,
  type SandpackTheme,
  type SandpackPreviewRef,
} from "@codesandbox/sandpack-react";
import {
  FilePlus, FolderPlus, Terminal, PanelLeft, Code2, Monitor,
  Bug, ExternalLink, ChevronRight, ChevronDown, X, WrapText,
  ZoomIn, ZoomOut, Maximize2, Minimize2,
} from "@/components/icons";
import { EditorSelection } from "@codemirror/state";
import type { EditorView, KeyBinding } from "@codemirror/view";
import {
  SiJavascript, SiTypescript, SiReact, SiCss, SiSass, SiHtml5,
  SiJson, SiMarkdown, SiVuedotjs, SiSvelte, SiGnubash, SiYaml,
} from "react-icons/si";
import Tooltip from "@/components/ui/Tooltip";
import type { PlaygroundData } from "./model";
import styles from "../PlaygroundElement.module.css";

// 앱 CSS 토큰 기반 테마 — 자동 라이트/다크 + 기본 흰색보다 톤 다운
const SP_THEME: SandpackTheme = {
  colors: {
    surface1: "var(--bg-primary)",
    surface2: "var(--bg-secondary)",
    surface3: "var(--bg-tertiary)",
    disabled: "var(--text-muted)",
    base: "var(--text-primary)",
    clickable: "var(--text-secondary)",
    hover: "var(--text-primary)",
    accent: "var(--text-accent)",
    error: "var(--text-accent)",
    errorSurface: "var(--bg-accent-subtle)",
  },
  syntax: {
    plain: "var(--text-primary)",
    comment: { color: "var(--text-muted)", fontStyle: "italic" },
    keyword: "var(--text-accent)",
    tag: "var(--text-accent)",
    punctuation: "var(--text-secondary)",
    definition: "var(--text-info)",
    property: "var(--text-info)",
    static: "var(--text-warning)",
    string: "var(--text-success)",
  },
  font: {
    body: "var(--font-space-grotesk), sans-serif",
    mono: "var(--font-mono), monospace",
    size: "13px",
    lineHeight: "1.6",
  },
};

// ── 언어별 아이콘 (브랜드 컬러는 고유 identity 라 토큰화하지 않음) ──
type IconMeta = { Icon: React.ComponentType<{ size?: number; color?: string }>; color: string };
function fileMeta(path: string): IconMeta {
  const name = path.split("/").pop() || path;
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  switch (ext) {
    case "js": case "mjs": case "cjs": return { Icon: SiJavascript, color: "#f7df1e" };
    case "ts": return { Icon: SiTypescript, color: "#3178c6" };
    case "jsx": case "tsx": return { Icon: SiReact, color: "#61dafb" };
    case "css": return { Icon: SiCss, color: "#2965f1" };
    case "scss": case "sass": return { Icon: SiSass, color: "#cd6799" };
    case "html": case "htm": return { Icon: SiHtml5, color: "#e34f26" };
    case "json": return { Icon: SiJson, color: "#cbcb41" };
    case "md": case "mdx": return { Icon: SiMarkdown, color: "#42a5f5" };
    case "vue": return { Icon: SiVuedotjs, color: "#42b883" };
    case "svelte": return { Icon: SiSvelte, color: "#ff3e00" };
    case "sh": case "bash": return { Icon: SiGnubash, color: "#4eaa25" };
    case "yml": case "yaml": return { Icon: SiYaml, color: "#cb171e" };
    default: return { Icon: SiJavascript, color: "var(--text-muted)" };
  }
}
const ERUDA_RE = /\s*<!--eruda:start-->[\s\S]*?<!--eruda:end-->/g;

// ── Cmd+Shift+→/← : 줄 끝/앞까지, 이미 경계면 다음/이전 줄 끝·앞으로 확장 ──
function extendLineForward(view: EditorView): boolean {
  const { state } = view;
  const ranges = state.selection.ranges.map((r) => {
    const line = state.doc.lineAt(r.head);
    const head = r.head >= line.to && line.number < state.doc.lines
      ? state.doc.line(line.number + 1).to
      : line.to;
    return EditorSelection.range(r.anchor, head);
  });
  view.dispatch({ selection: EditorSelection.create(ranges, state.selection.mainIndex), scrollIntoView: true, userEvent: "select" });
  return true;
}
function extendLineBackward(view: EditorView): boolean {
  const { state } = view;
  const ranges = state.selection.ranges.map((r) => {
    const line = state.doc.lineAt(r.head);
    const head = r.head <= line.from && line.number > 1
      ? state.doc.line(line.number - 1).from
      : line.from;
    return EditorSelection.range(r.anchor, head);
  });
  view.dispatch({ selection: EditorSelection.create(ranges, state.selection.mainIndex), scrollIntoView: true, userEvent: "select" });
  return true;
}
const PLAYGROUND_KEYMAP: KeyBinding[] = [
  { key: "Mod-Shift-ArrowRight", run: extendLineForward, preventDefault: true },
  { key: "Mod-Shift-ArrowLeft", run: extendLineBackward, preventDefault: true },
];

/** Sandpack 파일 변경 → 부모(el.data)로 디바운스 저장 (eruda 주입은 제외) */
function PersistBridge({ onChange }: { onChange: (files: Record<string, string>) => void }) {
  const { sandpack } = useSandpack();
  const timer = useRef(0);
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    const files: Record<string, string> = {};
    for (const [p, f] of Object.entries(sandpack.files)) {
      const code = (f as { code?: string }).code;
      if (typeof code === "string") files[p] = code.replace(ERUDA_RE, "");
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => cb.current(files), 700);
    return () => window.clearTimeout(timer.current);
  }, [sandpack.files]);
  return null;
}

// ── 파일 트리 ──
type TreeNode = { name: string; path: string; dir: boolean; children: TreeNode[] };
function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const full of paths) {
    let parts = full.replace(/^\//, "").split("/").filter(Boolean);
    if (parts[parts.length - 1] === ".gitkeep") parts = parts.slice(0, -1); // 빈 폴더 placeholder
    let level = root;
    let acc = "";
    parts.forEach((part, i) => {
      acc += "/" + part;
      const isFile = i === parts.length - 1 && /\.[^/]+$/.test(part);
      let node = level.find((n) => n.name === part && n.dir === !isFile);
      if (!node) { node = { name: part, path: isFile ? full : acc, dir: !isFile, children: [] }; level.push(node); }
      level = node.children;
    });
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => (a.dir !== b.dir ? (a.dir ? -1 : 1) : a.name.localeCompare(b.name)));
    nodes.forEach((n) => sort(n.children));
  };
  sort(root);
  return root;
}

function TreeRows({ nodes, depth, activeFile, collapsed, toggle, onOpen }: {
  nodes: TreeNode[]; depth: number; activeFile: string;
  collapsed: Set<string>; toggle: (p: string) => void; onOpen: (p: string) => void;
}) {
  return (
    <>
      {nodes.map((n) => {
        if (n.dir) {
          const open = !collapsed.has(n.path);
          return (
            <React.Fragment key={n.path}>
              <button type="button" className={styles.spTreeRow} style={{ paddingLeft: 6 + depth * 12 }} onClick={() => toggle(n.path)}>
                {open ? <ChevronDown size={13} className={styles.spTreeChevron} /> : <ChevronRight size={13} className={styles.spTreeChevron} />}
                <span className={styles.spTreeName}>{n.name}</span>
              </button>
              {open && <TreeRows nodes={n.children} depth={depth + 1} activeFile={activeFile} collapsed={collapsed} toggle={toggle} onOpen={onOpen} />}
            </React.Fragment>
          );
        }
        const { Icon, color } = fileMeta(n.path);
        return (
          <button
            key={n.path}
            type="button"
            className={styles.spTreeRow}
            data-active={n.path === activeFile ? "" : undefined}
            style={{ paddingLeft: 6 + depth * 12 + 13 }}
            onClick={() => onOpen(n.path)}
          >
            <Icon size={13} color={color} />
            <span className={styles.spTreeName}>{n.name}</span>
          </button>
        );
      })}
    </>
  );
}

/** 커스텀 레이아웃 — 탐색기 | 탭+에디터 | (핸들) | 미리보기+콘솔 */
function Layout({ height, readOnly, explorer, ko, fs, toggleFs, resizable }: { height: number | string; readOnly?: boolean; explorer?: boolean; ko: boolean; fs: boolean; toggleFs: () => void; resizable?: boolean }) {
  const { sandpack } = useSandpack();
  const previewRef = useRef<SandpackPreviewRef>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const editorColRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(0.5);      // 에디터/미리보기 폭 비율
  const [exW, setExW] = useState(168);          // 사이드바(탐색기) 폭
  const [consoleH, setConsoleH] = useState(150); // 콘솔(디버그) 높이
  const ratioDrag = useRef(false);
  const exDrag = useRef(false);
  const conDrag = useRef(false);

  // 뷰 on/off (VS 식) — 리더(readOnly)는 기본 "미리보기만"(iframe 처럼), 코드 버튼으로 전환
  const [showExplorer, setShowExplorer] = useState(!readOnly && !!explorer);
  const [showEditor, setShowEditor] = useState(!readOnly);
  const [showPreview, setShowPreview] = useState(true);
  const [showConsole, setShowConsole] = useState(false);
  const [devtools, setDevtools] = useState(false);
  const [wrap, setWrap] = useState(false);        // 코드 줄 바꿈
  const [viewZoom, setViewZoom] = useState(1);    // 사이드바+코드+디버깅 확대/축소
  const [previewZoom, setPreviewZoom] = useState(1); // 미리보기 확대/축소
  const [boxH, setBoxH] = useState(typeof height === "number" ? height : 460); // 리사이즈 가능한 블록 높이
  const blkResize = useRef<{ y: number; h: number } | null>(null);

  // 인라인 파일/폴더 생성
  const [creating, setCreating] = useState<null | "file" | "folder">(null);
  const [newName, setNewName] = useState("");

  // 탐색기 접힘 상태
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // 탭 순서 (드래그 재정렬용, 자체 관리)
  const [order, setOrder] = useState<string[]>(sandpack.visibleFiles);
  const [dragIdx, setDragIdx] = useState<number | null>(null); // 드래그 중인 탭
  const [overIdx, setOverIdx] = useState<number | null>(null); // 삽입 위치 인디케이터
  useEffect(() => {
    setOrder((prev) => {
      const vis = sandpack.visibleFiles;
      const kept = prev.filter((p) => vis.includes(p));
      const added = vis.filter((p) => !kept.includes(p));
      return [...kept, ...added];
    });
  }, [sandpack.visibleFiles]);

  // 에러 발생 시 하단 콘솔(디버그) 패널 자동 오픈 — 미리보기 오버레이 대신
  useEffect(() => { if (sandpack.error) setShowConsole(true); }, [sandpack.error]);

  const tree = useMemo(() => {
    const paths = Object.entries(sandpack.files)
      .filter(([p, f]) => !(f as { hidden?: boolean }).hidden && !p.startsWith("/node_modules"))
      .map(([p]) => p);
    return buildTree(paths);
  }, [sandpack.files]);

  const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
  const capture = (e: React.PointerEvent) => { e.currentTarget.setPointerCapture(e.pointerId); e.preventDefault(); };
  const release = (e: React.PointerEvent) => { try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ } };

  // 에디터 ↔ 미리보기 폭
  const startRatio = (e: React.PointerEvent) => { ratioDrag.current = true; capture(e); };
  const moveRatio = (e: React.PointerEvent) => {
    if (!ratioDrag.current || !rowRef.current) return;
    const r = rowRef.current.getBoundingClientRect();
    const ex = showExplorer ? exW + 6 : 0;
    setRatio(clamp((e.clientX - r.left - ex) / (r.width - ex), 0.15, 0.85));
  };
  const endRatio = (e: React.PointerEvent) => { ratioDrag.current = false; release(e); };

  // 사이드바 폭
  const startEx = (e: React.PointerEvent) => { exDrag.current = true; capture(e); };
  const moveEx = (e: React.PointerEvent) => {
    if (!exDrag.current || !rowRef.current) return;
    const r = rowRef.current.getBoundingClientRect();
    setExW(clamp(e.clientX - r.left, 120, r.width * 0.6));
  };
  const endEx = (e: React.PointerEvent) => { exDrag.current = false; release(e); };

  // 콘솔(디버그) 높이 — 코드뷰 아래
  const startCon = (e: React.PointerEvent) => { conDrag.current = true; capture(e); };
  const moveCon = (e: React.PointerEvent) => {
    if (!conDrag.current || !editorColRef.current) return;
    const r = editorColRef.current.getBoundingClientRect();
    setConsoleH(clamp(r.bottom - e.clientY, 80, r.height - 120));
  };
  const endCon = (e: React.PointerEvent) => { conDrag.current = false; release(e); };

  // 블록 전체 높이(리더 등 resizable 일 때 하단 핸들)
  const startBlk = (e: React.PointerEvent) => { blkResize.current = { y: e.clientY, h: boxH }; capture(e); };
  const moveBlk = (e: React.PointerEvent) => { const s = blkResize.current; if (!s) return; setBoxH(Math.max(240, s.h + (e.clientY - s.y))); };
  const endBlk = (e: React.PointerEvent) => { blkResize.current = null; release(e); };

  const openFile = (p: string) => { sandpack.openFile(p); sandpack.setActiveFile(p); if (!showEditor) setShowEditor(true); };
  const toggleDir = (p: string) => setCollapsed((s) => { const n = new Set(s); n.has(p) ? n.delete(p) : n.add(p); return n; });

  const startCreate = (mode: "file" | "folder") => { setCreating(mode); setNewName(""); };
  const commitCreate = () => {
    const n = newName.trim().replace(/^\/+/, "");
    const mode = creating;
    setCreating(null); setNewName("");
    if (!n || !mode) return;
    if (mode === "folder") sandpack.addFile("/" + n.replace(/\/+$/, "") + "/.gitkeep", "");
    else { const path = "/" + n; sandpack.addFile(path, ""); openFile(path); }
  };
  const onNewKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Enter") { e.preventDefault(); commitCreate(); }
    else if (e.key === "Escape") { e.preventDefault(); setCreating(null); setNewName(""); }
  };

  // 탭 재정렬 — 드롭 시점에만 확정(드래그 중엔 인디케이터만)
  const commitReorder = () => {
    if (dragIdx !== null && overIdx !== null) {
      const a = [...orderedTabs];
      const [m] = a.splice(dragIdx, 1);
      let ins = overIdx;
      if (dragIdx < overIdx) ins -= 1;
      a.splice(ins, 0, m);
      setOrder(a);
    }
    setDragIdx(null); setOverIdx(null);
  };
  const onTabDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault(); e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    const after = e.clientX > r.left + r.width / 2;
    setOverIdx(after ? i + 1 : i);
  };

  // 미리보기 새 탭
  const openInNewTab = () => {
    const url = previewRef.current?.getClient()?.iframe?.src;
    if (url) window.open(url, "_blank", "noopener");
  };

  // eruda devtools 주입 토글 (index.html 엔트리에 CDN 스크립트 삽입, 저장엔 제외)
  const htmlEntry = () => {
    const keys = Object.keys(sandpack.files);
    return keys.find((p) => p === "/index.html") || keys.find((p) => p.endsWith("index.html"));
  };
  const toggleDevtools = () => {
    const path = htmlEntry();
    if (!path) { setDevtools((v) => !v); return; }
    const cur = (sandpack.files[path] as { code?: string }).code || "";
    const stripped = cur.replace(ERUDA_RE, "");
    if (devtools) {
      sandpack.updateFile(path, stripped);
      setDevtools(false);
    } else {
      const tag = `\n<!--eruda:start--><script src="https://cdn.jsdelivr.net/npm/eruda"></script><script>eruda.init()</script><!--eruda:end-->`;
      const next = stripped.includes("</body>") ? stripped.replace("</body>", `${tag}\n</body>`) : stripped + tag;
      sandpack.updateFile(path, next);
      setDevtools(true);
    }
  };

  const bothCols = showEditor && showPreview;
  const orderedTabs = order.filter((p) => sandpack.visibleFiles.includes(p));

  return (
    <div className={styles.spWrap} style={{ height: fs ? "100%" : (resizable ? boxH : height), ["--pg-view-zoom" as string]: viewZoom } as React.CSSProperties}>
      {/* 뷰 토글 바 */}
      <div className={styles.spViewBar}>
        <span className="spacer" />
        <TB on={showExplorer} tip={ko ? "파일 탐색기 표시/숨기기" : "Toggle file explorer"} onClick={() => setShowExplorer((v) => !v)}><PanelLeft size={14} /></TB>
        <TB on={showEditor} tip={ko ? "코드 에디터 표시/숨기기" : "Toggle code editor"} onClick={() => setShowEditor((v) => (showPreview ? !v : v))}><Code2 size={14} /></TB>
        <TB on={wrap} tip={ko ? "코드 줄 바꿈" : "Word wrap"} onClick={() => setWrap((v) => !v)}><WrapText size={14} /></TB>
        <span className={styles.spViewBarDiv} />
        {/* 사이드바+코드+디버깅 영역 확대/축소 */}
        <TB tip={ko ? "코드·사이드바 축소" : "Zoom out code area"} onClick={() => setViewZoom((z) => clamp(Math.round((z - 0.1) * 10) / 10, 0.6, 2))}><ZoomOut size={14} /></TB>
        <TB tip={ko ? "코드·사이드바 확대" : "Zoom in code area"} onClick={() => setViewZoom((z) => clamp(Math.round((z + 0.1) * 10) / 10, 0.6, 2))}><ZoomIn size={14} /></TB>
        <span className={styles.spViewBarDiv} />
        <TB on={showPreview} tip={ko ? "미리보기 표시/숨기기" : "Toggle preview"} onClick={() => setShowPreview((v) => (showEditor ? !v : v))}><Monitor size={14} /></TB>
        <TB on={showConsole} tip={ko ? "콘솔(로그·에러) 표시/숨기기" : "Toggle console"} onClick={() => setShowConsole((v) => !v)}><Terminal size={14} /></TB>
        <span className={styles.spViewBarDiv} />
        <TB on={devtools} tip={ko ? "미리보기에서 개발자도구(Eruda) 열기" : "Open DevTools (Eruda) in preview"} onClick={toggleDevtools}><Bug size={14} /></TB>
        <TB tip={ko ? "미리보기를 새 탭에서 열기" : "Open preview in a new tab"} onClick={openInNewTab}><ExternalLink size={14} /></TB>
      </div>

      <div ref={rowRef} className={styles.spRow}>
        {showExplorer && (
          <div className={styles.spExplorer} style={{ width: exW }} data-lenis-prevent>
            <div className={styles.spExplorerBar}>
              <span>{ko ? "파일" : "Files"}</span>
              {!readOnly && (
                <span className={styles.spExplorerActions}>
                  <Tooltip content={ko ? "새 파일" : "New file"} placement="top" delay={400}>
                    <button type="button" className={styles.spIconBtn} onClick={() => startCreate("file")}><FilePlus size={13} /></button>
                  </Tooltip>
                  <Tooltip content={ko ? "새 폴더" : "New folder"} placement="top" delay={400}>
                    <button type="button" className={styles.spIconBtn} onClick={() => startCreate("folder")}><FolderPlus size={13} /></button>
                  </Tooltip>
                </span>
              )}
            </div>
            <div className={styles.spTree}>
              {/* VS Code 식 인라인 생성 행 — 트리 최상단(루트)에 입력행 표시 */}
              {creating && (
                <div className={styles.spTreeRow} style={{ paddingLeft: 6 + 13 }}>
                  {creating === "folder" ? <ChevronRight size={13} className={styles.spTreeChevron} /> : <FilePlus size={13} />}
                  <input
                    className={styles.spTreeInput}
                    autoFocus
                    value={newName}
                    placeholder={creating === "folder" ? (ko ? "폴더 이름" : "folder name") : (ko ? "파일 이름 (예: Card.tsx)" : "file name (e.g. Card.tsx)")}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={onNewKeyDown}
                    onBlur={commitCreate}
                    spellCheck={false}
                  />
                </div>
              )}
              <TreeRows nodes={tree} depth={0} activeFile={sandpack.activeFile} collapsed={collapsed} toggle={toggleDir} onOpen={openFile} />
            </div>
          </div>
        )}
        {showExplorer && (
          <div className={styles.spSplit} data-cursor="resizeH" onPointerDown={startEx} onPointerMove={moveEx} onPointerUp={endEx} onPointerCancel={endEx} />
        )}

        {showEditor && (
          <div ref={editorColRef} className={styles.spEditorCol} style={bothCols ? { flex: `0 0 ${ratio * 100}%` } : { flex: 1 }}>
            {/* 커스텀 탭 (아이콘 · 닫기 · 드래그 재정렬 + 인디케이터/고스트) */}
            <div
              className={styles.spTabs}
              data-lenis-prevent
              onDragOver={(e) => { if (dragIdx !== null) { e.preventDefault(); e.stopPropagation(); } }}
              onDrop={(e) => { if (dragIdx !== null) { e.preventDefault(); e.stopPropagation(); commitReorder(); } }}
            >
              {orderedTabs.map((p, i) => {
                const { Icon, color } = fileMeta(p);
                const name = p.split("/").pop() || p;
                return (
                  <React.Fragment key={p}>
                    {dragIdx !== null && overIdx === i && <span className={styles.spTabInd} />}
                    <div
                      className={styles.spTab}
                      data-active={p === sandpack.activeFile ? "" : undefined}
                      data-dragging={dragIdx === i ? "" : undefined}
                      draggable
                      onDragStart={(e) => { e.stopPropagation(); setDragIdx(i); setOverIdx(i); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", p); } catch { /* noop */ } }}
                      onDragOver={(e) => onTabDragOver(e, i)}
                      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); commitReorder(); }}
                      onDragEnd={(e) => { e.stopPropagation(); setDragIdx(null); setOverIdx(null); }}
                      onClick={() => sandpack.setActiveFile(p)}
                    >
                      <Icon size={13} color={color} />
                      <span className={styles.spTabName}>{name}</span>
                      <Tooltip content={ko ? "닫기" : "Close"} placement="top" delay={400}>
                        <button
                          type="button"
                          className={styles.spTabClose}
                          onClick={(e) => { e.stopPropagation(); sandpack.closeFile(p); }}
                        ><X size={12} /></button>
                      </Tooltip>
                    </div>
                  </React.Fragment>
                );
              })}
              {dragIdx !== null && overIdx === orderedTabs.length && <span className={styles.spTabInd} />}
            </div>
            <SandpackCodeEditor
              style={{ flex: 1, minHeight: 0 }}
              showTabs={false} showLineNumbers showInlineErrors readOnly={readOnly}
              wrapContent={wrap} extensionsKeymap={PLAYGROUND_KEYMAP}
            />
            {/* 디버그(콘솔) — 코드뷰 아래, 높이 핸들로 조절 */}
            {showConsole && (
              <>
                <div className={styles.spSplitV} data-cursor="resizeV" onPointerDown={startCon} onPointerMove={moveCon} onPointerUp={endCon} onPointerCancel={endCon} />
                <div className={styles.spConsole} style={{ height: consoleH }} data-lenis-prevent>
                  <SandpackConsole resetOnPreviewRestart showSyntaxError showHeader />
                </div>
              </>
            )}
          </div>
        )}

        {bothCols && (
          <div className={styles.spSplit} data-cursor="resizeH" onPointerDown={startRatio} onPointerMove={moveRatio} onPointerUp={endRatio} onPointerCancel={endRatio} />
        )}

        {showPreview && (
          <div className={styles.spPreviewCol} data-zoomed={previewZoom !== 1 ? "" : undefined} style={{ ["--pg-zoom" as string]: previewZoom } as React.CSSProperties}>
            {/* 주소창 바 우측 오버레이 — 미리보기 확대/축소 + 전체화면 */}
            <div className={styles.spPreviewNav}>
              <Tooltip content={ko ? "미리보기 축소" : "Zoom out preview"} placement="bottom" delay={400}>
                <button type="button" className={styles.spIconBtn} onClick={() => setPreviewZoom((z) => clamp(Math.round((z - 0.1) * 10) / 10, 0.4, 2))}><ZoomOut size={13} /></button>
              </Tooltip>
              <Tooltip content={ko ? "미리보기 확대" : "Zoom in preview"} placement="bottom" delay={400}>
                <button type="button" className={styles.spIconBtn} onClick={() => setPreviewZoom((z) => clamp(Math.round((z + 0.1) * 10) / 10, 0.4, 2))}><ZoomIn size={13} /></button>
              </Tooltip>
              <Tooltip content={fs ? (ko ? "전체화면 종료" : "Exit fullscreen") : (ko ? "전체화면" : "Fullscreen")} placement="bottom" delay={400}>
                <button type="button" className={styles.spIconBtn} data-on={fs ? "" : undefined} onClick={toggleFs}>{fs ? <Minimize2 size={13} /> : <Maximize2 size={13} />}</button>
              </Tooltip>
            </div>
            {/* 빌드/번들러 에러는 오버레이로 표시(원인 파악용), 런타임 console 은 하단 패널로 */}
            <SandpackPreview ref={previewRef} style={{ flex: 1, minHeight: 0 }} showNavigator showOpenInCodeSandbox={false} showRefreshButton />
          </div>
        )}
      </div>
      {/* 리더 등 resizable 모드 — 블록 높이 하단 핸들 */}
      {resizable && !fs && (
        <div className={styles.pgResize} data-cursor="resizeV" onPointerDown={startBlk} onPointerMove={moveBlk} onPointerUp={endBlk} onPointerCancel={endBlk} title={ko ? "높이 조절" : "Resize height"} />
      )}
    </div>
  );
}

/** 뷰바 토글 버튼 (설명 툴팁 포함) */
function TB({ on, tip, onClick, children }: { on?: boolean; tip: React.ReactNode; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip content={tip} placement="top" delay={400}>
      <button type="button" className={styles.spIconBtn} data-on={on ? "" : undefined} onClick={onClick}>
        {children}
      </button>
    </Tooltip>
  );
}

export default function PlaygroundSandpack({ data, onChange, readOnly, height = 460, explorer = true, fullscreen, onToggleFullscreen, resizable }: {
  data: PlaygroundData;
  onChange?: (files: Record<string, string>) => void;
  readOnly?: boolean;
  height?: number | string;
  explorer?: boolean;
  theme?: "dark" | "light";
  /** 전체화면 controlled 값 — 편집뷰(PlaygroundElement)가 portal 관리 */
  fullscreen?: boolean;
  /** 전체화면 토글 — 있으면 controlled(편집뷰), 없으면 내부 상태+portal(리더) */
  onToggleFullscreen?: () => void;
  /** 하단 핸들로 블록 높이 조절(리더용) */
  resizable?: boolean;
}) {
  const files = Object.keys(data.files).length ? data.files : undefined;
  const ko = typeof document !== "undefined" && (document.documentElement.lang || "ko").toLowerCase().startsWith("ko");

  const controlled = onToggleFullscreen != null;
  const [fsInternal, setFsInternal] = useState(false);
  const fs = controlled ? !!fullscreen : fsInternal;
  const toggleFs = controlled ? onToggleFullscreen! : () => setFsInternal((v) => !v);

  useEffect(() => {
    if (controlled || !fsInternal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFsInternal(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [controlled, fsInternal]);

  // static 은 static-server, 나머지(CRA/parcel/vue/svelte)는 원격 번들러 iframe 필요.
  // 번들러 기본 URL 누락으로 무한 로딩되는 경우 방지 — 비-static 에만 공식 v2 번들러 명시.
  const isStatic = data.template === "static";
  const spOptions = {
    initMode: "immediate" as const,
    ...(isStatic ? {} : { bundlerURL: "https://sandpack-bundler.codesandbox.io" }),
  };

  const content = (
    <SandpackProvider
      template={data.template as SandpackPredefinedTemplate}
      files={files}
      customSetup={data.dependencies ? { dependencies: data.dependencies } : undefined}
      theme={SP_THEME}
      options={spOptions}
    >
      <Layout height={height} readOnly={readOnly} explorer={explorer} ko={ko} fs={fs} toggleFs={toggleFs} resizable={resizable} />
      {!readOnly && onChange && <PersistBridge onChange={onChange} />}
    </SandpackProvider>
  );

  // 리더(uncontrolled) 자체 전체화면 — body 로 portal 해 stacking context 탈출
  if (!controlled && fsInternal && typeof document !== "undefined") {
    return createPortal(<div className={styles.spFullscreen}>{content}</div>, document.body);
  }
  return content;
}
