"use client";

// ── 자체 srcdoc 러너 (다중 파일) ── 외부 번들러/서버 의존 0. CodeMirror 편집 + iframe.srcdoc 실행.
// VSCode 식 파일/폴더 트리(추가·이름변경·삭제) + 탭. 파일맵은 buildSrcdoc 가 엔트리(index.html)
// 기준으로 조립한다(참조된 css/js 인라인, 조각이면 모든 css/js 번들).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSyncRef } from "@/hooks/useSyncRef";
import { Code2, Monitor, Terminal, Maximize2, Minimize2, RotateCw, PanelLeft, PanelLeftClose, Minus, Plus, ZoomIn, ZoomOut, Columns2, Rows2, FilePlus, FolderPlus, Pencil, Trash2, ChevronRight, ChevronDown, X, Undo2, Redo2, Scaling, Ban, Download } from "@/components/icons";
import Tooltip from "@/components/ui/Tooltip";
import CodeMirrorEditor from "./CodeMirrorEditor";
import { buildSrcdoc, parseConsoleMessage, type ConsoleMsg } from "./buildSrcdoc";
import { buildTree, fileLang, fileIcon, isGitkeep, type TreeNode } from "./fileTree";
import type { PlaygroundData } from "./model";
import styles from "../PlaygroundElement.module.css";
import Pressable from "@/components/ui/Pressable";

const base = (p: string) => p.split("/").pop() || p;
const dirOf = (p: string) => p.slice(0, p.lastIndexOf("/")); // "/lib/u.js" → "/lib", "/a.js" → ""
const realPaths = (files: Record<string, string>) => Object.keys(files).filter((p) => !isGitkeep(p));
function pickEntry(files: Record<string, string>): string {
  const real = realPaths(files);
  return real.find((p) => p === "/index.html") || real.find((p) => /\.html?$/i.test(p)) || real[0] || "";
}
/** from → to 로 rename (폴더면 하위 전부 prefix 치환) */
function renameInMap(files: Record<string, string>, from: string, to: string, isDir: boolean): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [p, c] of Object.entries(files)) {
    if (isDir && (p === from || p.startsWith(from + "/"))) next[to + p.slice(from.length)] = c;
    else if (!isDir && p === from) next[to] = c;
    else next[p] = c;
  }
  return next;
}
/** path 삭제 (폴더면 하위 전부) */
function removeInMap(files: Record<string, string>, path: string, isDir: boolean): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [p, c] of Object.entries(files)) {
    if (isDir ? (p === path || p.startsWith(path + "/")) : p === path) continue;
    next[p] = c;
  }
  return next;
}

function TB({ on, tip, onClick, disabled, children }: { on?: boolean; tip: React.ReactNode; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip content={tip} placement="top" delay={400}>
      <Pressable noTapScale className={styles.spIconBtn} data-on={on ? "" : undefined} disabled={disabled} onClick={onClick}>{children}</Pressable>
    </Tooltip>
  );
}
function RowAction({ tip, onClick, children }: { tip: React.ReactNode; onClick: (e: React.MouseEvent) => void; children: React.ReactNode }) {
  return (
    <Tooltip content={tip} placement="top" delay={400}>
      <Pressable noTapScale className={styles.spTreeAction} onClick={onClick}>{children}</Pressable>
    </Tooltip>
  );
}

export default function PlaygroundRunner({ data, onChange, readOnly, height = 460, fullscreen, onToggleFullscreen, resizable }: {
  data: PlaygroundData;
  onChange?: (files: Record<string, string>) => void;
  readOnly?: boolean;
  height?: number | string;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
  resizable?: boolean;
}) {
  const ko = typeof document !== "undefined" && (document.documentElement.lang || "ko").toLowerCase().startsWith("ko");
  const controlled = onToggleFullscreen != null;
  const [fsInternal, setFsInternal] = useState(false);
  const fs = controlled ? !!fullscreen : fsInternal;
  const toggleFs = controlled ? onToggleFullscreen! : () => setFsInternal((v) => !v);

  // 파일 상태 — 동적 맵. active = 현재 편집 파일, openTabs = 열린 탭
  const [files, setFiles] = useState<Record<string, string>>(() => ({ ...data.files }));
  const [active, setActive] = useState<string>(() => pickEntry(data.files));
  const [openTabs, setOpenTabs] = useState<string[]>(() => {
    const entry = pickEntry(data.files);
    return readOnly ? (entry ? [entry] : []) : realPaths(data.files);
  });
  const [srcdoc, setSrcdoc] = useState(() => buildSrcdoc(data.files));
  const [logs, setLogs] = useState<ConsoleMsg[]>([]);

  // 뷰 토글 — 리더는 기본 미리보기만
  const [showEditor, setShowEditor] = useState(!readOnly);
  const [showPreview, setShowPreview] = useState(true);
  const [showConsole, setShowConsole] = useState(false);
  const [logFilter, setLogFilter] = useState<"all" | "warn" | "error">("all"); // 콘솔 레벨 필터
  const [logQuery, setLogQuery] = useState(""); // 콘솔 텍스트 필터
  // 인라인 컨트롤 — 사이드바 / 폰트 크기 / 미리보기 배율 / 레이아웃(가로·세로 분할)
  const [sidebar, setSidebar] = useState(!readOnly);
  const [fontSize, setFontSize] = useState(13);
  const [zoom, setZoom] = useState(1);         // 미리보기(iframe) 배율
  const [viewZoom, setViewZoom] = useState(1); // 플레이그라운드 내부 전체(사이드바+코드+콘솔) 배율 — VSCode UI 줌
  const [vertical, setVertical] = useState(false);
  const stepFont = (d: number) => setFontSize((v) => Math.min(24, Math.max(10, v + d)));
  const stepZoom = (d: number) => setZoom((v) => Math.min(2, Math.max(0.5, Math.round((v + d) * 100) / 100)));
  const stepView = (d: number) => setViewZoom((v) => Math.min(1.8, Math.max(0.6, Math.round((v + d) * 100) / 100)));
  // 사이드바/콘솔/레이아웃은 코드 에디터 영역에 딸려 있어, 코드가 꺼져 있으면 눌렀을 때 코드도 자동으로 켠다.
  const toggleSidebar = () => { if (!showEditor) { setShowEditor(true); setSidebar(true); } else setSidebar((v) => !v); };
  const toggleConsole = () => { if (!showEditor) { setShowEditor(true); setShowConsole(true); } else setShowConsole((v) => !v); };
  const toggleLayout = () => { if (!showEditor) setShowEditor(true); setVertical((v) => !v); };

  // 탐색기 — 접힘 / 인라인 생성 / 인라인 이름변경 / 선택 디렉토리 / DnD / 사이드바 폭
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState<null | "file" | "folder">(null);
  const [draftName, setDraftName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [selectedDir, setSelectedDir] = useState("");        // 새 파일/폴더 생성 위치("" = 루트)
  const [dragPath, setDragPath] = useState<string | null>(null); // DnD 이동 중인 노드
  const [dropDir, setDropDir] = useState<string | null>(null);   // 드롭 대상 폴더(하이라이트)
  const [exW, setExW] = useState(184);                       // 사이드바(탐색기) 폭

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const editorColRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(0.5);
  const [consoleH, setConsoleH] = useState(150);
  const [boxH, setBoxH] = useState(typeof height === "number" ? height : 460);
  const dragKind = useRef<null | "ratio" | "console" | "block" | "explorer">(null);
  const dragStart = useRef({ y: 0, h: 0 });

  // 되돌리기/다시하기 — files 맵 스냅샷 스택. 텍스트 편집은 디바운스로 합치고, 구조 변경도 포함.
  const history = useRef<Record<string, string>[]>([]);
  const hIndex = useRef(0);
  const applyingHistory = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  if (history.current.length === 0) history.current.push(files); // 최초 렌더 1회(같은 객체라 mount 시 중복 push 안 됨)
  const syncHist = () => { setCanUndo(hIndex.current > 0); setCanRedo(hIndex.current < history.current.length - 1); };
  const pushHist = () => {
    if (history.current[hIndex.current] === files) return;
    history.current = history.current.slice(0, hIndex.current + 1);
    history.current.push(files);
    hIndex.current = history.current.length - 1;
    if (history.current.length > 120) { history.current.shift(); hIndex.current -= 1; }
  };
  const restoreHist = (snap: Record<string, string>) => {
    applyingHistory.current = true;
    setFiles(snap);
    setOpenTabs((ts) => ts.filter((p) => snap[p] !== undefined));
    if (snap[active] === undefined) {
      const openLeft = openTabs.filter((p) => snap[p] !== undefined);
      setActive(openLeft[openLeft.length - 1] || pickEntry(snap));
    }
    syncHist();
  };
  const undo = () => { pushHist(); if (hIndex.current <= 0) return; hIndex.current -= 1; restoreHist(history.current[hIndex.current]); };
  const redo = () => { if (hIndex.current >= history.current.length - 1) return; hIndex.current += 1; restoreHist(history.current[hIndex.current]); };

  const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
  const cap = (e: React.PointerEvent) => { e.currentTarget.setPointerCapture(e.pointerId); e.preventDefault(); };
  const rel = (e: React.PointerEvent) => { try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ } };
  const startRatio = (e: React.PointerEvent) => { dragKind.current = "ratio"; cap(e); };
  const moveRatio = (e: React.PointerEvent) => {
    if (dragKind.current !== "ratio" || !rowRef.current) return;
    const r = rowRef.current.getBoundingClientRect();
    const v = vertical ? (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width;
    setRatio(clamp(v, 0.15, 0.85));
  };
  const startCon = (e: React.PointerEvent) => { dragKind.current = "console"; cap(e); };
  const moveCon = (e: React.PointerEvent) => {
    if (dragKind.current !== "console" || !editorColRef.current) return;
    const r = editorColRef.current.getBoundingClientRect();
    setConsoleH(clamp(r.bottom - e.clientY, 80, r.height - 120));
  };
  const startEx = (e: React.PointerEvent) => { dragKind.current = "explorer"; dragStart.current = { y: e.clientX, h: exW }; cap(e); };
  const moveEx = (e: React.PointerEvent) => {
    if (dragKind.current !== "explorer") return;
    setExW(clamp(dragStart.current.h + (e.clientX - dragStart.current.y), 130, 420));
  };
  const startBlk = (e: React.PointerEvent) => { dragKind.current = "block"; dragStart.current = { y: e.clientY, h: boxH }; cap(e); };
  const moveBlk = (e: React.PointerEvent) => {
    if (dragKind.current !== "block") return;
    setBoxH(Math.max(240, dragStart.current.h + (e.clientY - dragStart.current.y)));
  };
  const endDrag = (e: React.PointerEvent) => { dragKind.current = null; rel(e); };

  // 파일 변경 → 저장(디바운스). 전체 맵을 그대로 저장(.gitkeep 빈 폴더 포함)
  const cb = useRef(onChange); useSyncRef(cb, onChange);
  useEffect(() => {
    if (readOnly) return;
    const t = window.setTimeout(() => cb.current?.(files), 700);
    return () => window.clearTimeout(t);
  }, [files, readOnly]);

  // 파일 변경 → srcdoc 재빌드(디바운스) + 로그 초기화
  useEffect(() => {
    const t = window.setTimeout(() => { setLogs([]); setSrcdoc(buildSrcdoc(files)); }, 350);
    return () => window.clearTimeout(t);
  }, [files]);

  // 파일 변경 → 히스토리 스냅샷(디바운스로 연속 편집을 한 스텝으로 합침). undo/redo 로 인한 변경은 제외
  useEffect(() => {
    if (applyingHistory.current) { applyingHistory.current = false; return; }
    const t = window.setTimeout(() => {
      if (history.current[hIndex.current] === files) return;
      history.current = history.current.slice(0, hIndex.current + 1);
      history.current.push(files);
      hIndex.current = history.current.length - 1;
      if (history.current.length > 120) { history.current.shift(); hIndex.current -= 1; }
      syncHist();
    }, 450);
    return () => window.clearTimeout(t);
  }, [files]);

  // 프리뷰 → 콘솔 메시지 수신
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      const m = parseConsoleMessage(e.data);
      if (!m) return;
      setLogs((prev) => [...prev, m].slice(-200));
      if (m.level === "error") setShowConsole(true);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Esc 로 리더 전체화면 종료
  useEffect(() => {
    if (controlled || !fsInternal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFsInternal(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [controlled, fsInternal]);

  const rerun = () => { setLogs([]); setSrcdoc(buildSrcdoc(files) + "<!--" + Date.now().toString(36) + "-->"); };
  const setActiveCode = (v: string) => setFiles((f) => ({ ...f, [active]: v }));

  // ── 파일 조작 ──
  const openFile = (p: string) => { setActive(p); setSelectedDir(dirOf(p)); setOpenTabs((t) => (t.includes(p) ? t : [...t, p])); if (!showEditor) setShowEditor(true); };
  const closeTab = (p: string) => {
    const nt = openTabs.filter((x) => x !== p);
    setOpenTabs(nt);
    if (active === p) setActive(nt[nt.length - 1] || pickEntry(files));
  };
  const toggleDir = (p: string) => { setSelectedDir(p); setCollapsed((s) => { const n = new Set(s); if (n.has(p)) n.delete(p); else n.add(p); return n; }); };

  const startCreate = (mode: "file" | "folder") => { setCreating(mode); setDraftName(""); };
  const commitCreate = () => {
    const raw = draftName.trim().replace(/^\/+/, "").replace(/\/+$/, "");
    const mode = creating;
    setCreating(null); setDraftName("");
    if (!raw || !mode) return;
    const path = (selectedDir + "/" + raw).replace(/\/{2,}/g, "/"); // 선택 디렉토리 하위에 생성
    if (selectedDir) setCollapsed((s) => { const n = new Set(s); n.delete(selectedDir); return n; }); // 대상 폴더 펼침
    if (mode === "folder") {
      const kp = path + "/.gitkeep";
      if (files[kp] === undefined) setFiles((f) => ({ ...f, [kp]: "" }));
    } else if (files[path] === undefined) {
      setFiles((f) => ({ ...f, [path]: "" }));
      openFile(path);
    } else {
      openFile(path);
    }
  };

  const startRename = (path: string, name: string) => { setRenaming(path); setRenameName(name); };
  // from → to 이동/이름변경 (폴더면 하위 전부 prefix 치환) + active/탭 동기화
  const applyMove = (from: string, to: string, isDir: boolean) => {
    if (!to || to === from) return;
    if (isDir && to.startsWith(from + "/")) return;                    // 자기 하위로는 이동 금지
    if (files[isDir ? to + "/.gitkeep" : to] !== undefined) return;    // 대상 이름 충돌
    setFiles((f) => renameInMap(f, from, to, isDir));
    const map = (p: string) => (isDir ? (p === from || p.startsWith(from + "/")) : p === from) ? to + p.slice(from.length) : p;
    setActive((a) => map(a));
    setOpenTabs((ts) => ts.map(map));
  };
  const commitRename = (node: TreeNode) => {
    const raw = renameName.trim().replace(/^\/+|\/+$/g, "");
    setRenaming(null); setRenameName("");
    if (!raw || raw === node.name) return;
    applyMove(node.path, (dirOf(node.path) + "/" + raw).replace(/\/{2,}/g, "/"), node.dir);
  };

  // DnD — 드래그한 노드를 targetDir 폴더 안으로 이동("" = 루트)
  const dropInto = (targetDir: string) => {
    const from = dragPath;
    setDropDir(null); setDragPath(null);
    if (!from || dirOf(from) === targetDir) return;   // 같은 위치면 무시
    const isDir = files[from] === undefined;          // 파일 경로만 맵의 키 → 없으면 폴더
    applyMove(from, (targetDir + "/" + base(from)).replace(/\/{2,}/g, "/"), isDir);
  };

  const removeNode = (node: TreeNode) => {
    const nf = removeInMap(files, node.path, node.dir);
    const gone = (p: string) => (node.dir ? (p === node.path || p.startsWith(node.path + "/")) : p === node.path);
    setFiles(nf);
    setOpenTabs((ts) => ts.filter((p) => !gone(p)));
    if (gone(active)) {
      const openLeft = openTabs.filter((p) => !gone(p) && nf[p] !== undefined);
      setActive(openLeft[openLeft.length - 1] || pickEntry(nf));
    }
  };

  // 파일 변경 → 저장/실행은 위 effect. active 코드 편집
  const tree = useMemo(() => buildTree(Object.keys(files)), [files]);
  const activeLang = fileLang(active || "x.js");
  const bothCols = showEditor && showPreview;
  const tabs = openTabs.filter((p) => files[p] !== undefined && !isGitkeep(p));
  const shownLogs = logs.filter((l) =>
    (logFilter === "all" || l.level === logFilter) &&
    (!logQuery || l.text.toLowerCase().includes(logQuery.toLowerCase()))
  );

  // 활성 파일 다운로드 (실제 파일명으로)
  const downloadActive = () => {
    if (!active) return;
    const blob = new Blob([files[active] ?? ""], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = base(active); a.click();
    URL.revokeObjectURL(url);
  };

  // 단축키 — 에디터/트리 위에서 동작 (입력 중인 인라인 input 은 자체 stopPropagation 으로 제외)
  const onWrapKeyDown = (e: React.KeyboardEvent) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    const k = e.key.toLowerCase();
    if (k === "s" || k === "enter") { e.preventDefault(); rerun(); }
    else if (k === "b") { e.preventDefault(); setSidebar((v) => !v); }
    else if (k === "d") { e.preventDefault(); if (active) removeNode({ name: base(active), path: active, dir: false, children: [] }); }
  };

  const renderNodes = (nodes: TreeNode[], depth: number): React.ReactNode =>
    nodes.map((n) => {
      const pad = 8 + depth * 14;
      if (renaming === n.path) {
        const meta = n.dir ? null : fileIcon(n.path);
        return (
          <div key={n.path} className={styles.spTreeRow} style={{ paddingLeft: pad }}>
            {meta ? <meta.Icon size={14} color={meta.color} /> : <ChevronRight size={14} className={styles.spTreeChevron} />}
            <input
              className={styles.spTreeInput}
              autoFocus
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); commitRename(n); } else if (e.key === "Escape") { e.preventDefault(); setRenaming(null); setRenameName(""); } }}
              onBlur={() => commitRename(n)}
            />
          </div>
        );
      }
      // 드래그 소스(파일·폴더 공통). 더블클릭=이름변경, hover 액션=이름변경·삭제
      const dragSource = readOnly ? {} : {
        draggable: true,
        onDragStart: (e: React.DragEvent) => { e.stopPropagation(); e.dataTransfer.effectAllowed = "move"; setDragPath(n.path); },
        onDragEnd: () => { setDragPath(null); setDropDir(null); },
      };
      const actions = !readOnly && (
        <span className={styles.spTreeActions}>
          <RowAction tip={ko ? "이름 변경" : "Rename"} onClick={(e) => { e.stopPropagation(); startRename(n.path, n.name); }}><Pencil size={13} /></RowAction>
          <RowAction tip={ko ? "삭제" : "Delete"} onClick={(e) => { e.stopPropagation(); removeNode(n); }}><Trash2 size={13} /></RowAction>
        </span>
      );
      if (n.dir) {
        const open = !collapsed.has(n.path);
        return (
          <React.Fragment key={n.path}>
            <div
              className={styles.spTreeRow}
              data-drop={dropDir === n.path ? "" : undefined}
              style={{ paddingLeft: pad }}
              role="button" tabIndex={0}
              onClick={() => toggleDir(n.path)}
              onDoubleClick={() => { if (!readOnly) startRename(n.path, n.name); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleDir(n.path); } }}
              {...dragSource}
              onDragOver={readOnly ? undefined : (e) => { if (!dragPath || dragPath === n.path) return; e.preventDefault(); e.stopPropagation(); setDropDir(n.path); }}
              onDragLeave={readOnly ? undefined : (e) => { e.stopPropagation(); setDropDir((d) => (d === n.path ? null : d)); }}
              onDrop={readOnly ? undefined : (e) => { e.preventDefault(); e.stopPropagation(); dropInto(n.path); }}
            >
              {open ? <ChevronDown size={14} className={styles.spTreeChevron} /> : <ChevronRight size={14} className={styles.spTreeChevron} />}
              <span className={styles.spTreeName}>{n.name}</span>
              {actions}
            </div>
            {open && renderNodes(n.children, depth + 1)}
          </React.Fragment>
        );
      }
      const { Icon, color } = fileIcon(n.path);
      return (
        <div
          key={n.path}
          className={styles.spTreeRow}
          data-active={n.path === active ? "" : undefined}
          style={{ paddingLeft: pad + 14 }}
          role="button" tabIndex={0}
          onClick={() => openFile(n.path)}
          onDoubleClick={() => { if (!readOnly) startRename(n.path, n.name); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openFile(n.path); } }}
          {...dragSource}
          onDragOver={readOnly ? undefined : (e) => { if (!dragPath || dragPath === n.path) return; e.preventDefault(); e.stopPropagation(); }}
          onDrop={readOnly ? undefined : (e) => { e.preventDefault(); e.stopPropagation(); dropInto(dirOf(n.path)); }}
        >
          <Icon size={14} color={color} />
          <span className={styles.spTreeName}>{n.name}</span>
          {actions}
        </div>
      );
    });

  return (
    <div className={styles.spWrap} style={{ height: fs ? "100%" : (resizable ? boxH : height), "--pg-view-zoom": viewZoom } as React.CSSProperties} onKeyDown={onWrapKeyDown}>
      <div className={styles.spViewBar}>
        {/* ── 왼쪽 pill 1: 주 출력 패널(코드 · 미리보기) — 항상 의미 있음 ── */}
        <span className={styles.spGroup}>
          <TB on={showEditor} tip={ko ? "코드 표시/숨기기" : "Toggle code"} onClick={() => setShowEditor((v) => (showPreview ? !v : v))}><Code2 size={16} /></TB>
          <TB on={showPreview} tip={ko ? "미리보기 표시/숨기기" : "Toggle preview"} onClick={() => setShowPreview((v) => (showEditor ? !v : v))}><Monitor size={16} /></TB>
        </span>
        {/* ── 왼쪽 pill 2: 코드 영역 부속(사이드바 · 콘솔 · 레이아웃) — 누르면 코드가 꺼져 있어도 자동으로 켜진다 ── */}
        <span className={styles.spGroup}>
          <TB on={sidebar && showEditor} tip={ko ? "파일 사이드바" : "Files sidebar"} onClick={toggleSidebar}>{sidebar && showEditor ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}</TB>
          <TB on={showConsole && showEditor} tip={ko ? "콘솔 표시/숨기기" : "Toggle console"} onClick={toggleConsole}><Terminal size={16} /></TB>
          <TB on={vertical} tip={ko ? "레이아웃 — 상하/좌우" : "Layout — split direction"} onClick={toggleLayout}>{vertical ? <Rows2 size={16} /> : <Columns2 size={16} />}</TB>
        </span>

        <span className="spacer" />

        {/* ── 오른쪽: 폰트 · 배율 · 액션 — 각 기능을 흰 pill 로 구분 ── */}
        <span className={styles.spGroup}>
          <TB tip={ko ? "폰트 작게" : "Smaller font"} onClick={() => stepFont(-1)}><Minus size={15} /></TB>
          <span className={styles.spCtlValue}>{fontSize}px</span>
          <TB tip={ko ? "폰트 크게" : "Larger font"} onClick={() => stepFont(1)}><Plus size={15} /></TB>
        </span>
        <span className={styles.spGroup}>
          <span className={styles.spGroupLead}><Scaling size={14} /></span>
          <TB tip={ko ? "전체 축소 (UI)" : "Zoom out UI"} onClick={() => stepView(-0.1)}><ZoomOut size={16} /></TB>
          <span className={styles.spCtlValue}>{Math.round(viewZoom * 100)}%</span>
          <TB tip={ko ? "전체 확대 (UI)" : "Zoom in UI"} onClick={() => stepView(0.1)}><ZoomIn size={16} /></TB>
        </span>
        <span className={styles.spGroup}>
          <TB tip={ko ? "되돌리기" : "Undo"} onClick={undo} disabled={!canUndo}><Undo2 size={16} /></TB>
          <TB tip={ko ? "다시하기" : "Redo"} onClick={redo} disabled={!canRedo}><Redo2 size={16} /></TB>
          <TB tip={ko ? "현재 파일 다운로드" : "Download file"} onClick={downloadActive} disabled={!active}><Download size={16} /></TB>
          <TB tip={ko ? "다시 실행" : "Re-run"} onClick={rerun}><RotateCw size={16} /></TB>
          <TB tip={fs ? (ko ? "전체화면 종료" : "Exit fullscreen") : (ko ? "전체화면" : "Fullscreen")} onClick={toggleFs}>{fs ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</TB>
        </span>
      </div>

      <div className={styles.spRow}>
        {sidebar && showEditor && (
          <div className={styles.spExplorer} style={{ width: exW }}>
            <div className={styles.spExplorerBar}>
              <span>{ko ? "파일" : "FILES"}</span>
              {!readOnly && (
                <span className={styles.spExplorerActions}>
                  <TB tip={ko ? "새 파일" : "New file"} onClick={() => startCreate("file")}><FilePlus size={15} /></TB>
                  <TB tip={ko ? "새 폴더" : "New folder"} onClick={() => startCreate("folder")}><FolderPlus size={15} /></TB>
                </span>
              )}
            </div>
            {/* 빈 영역/트리 루트로 드롭 → 루트로 이동 */}
            <div
              className={styles.spTree}
              data-lenis-prevent
              onDragOver={readOnly ? undefined : (e) => { if (dragPath) e.preventDefault(); }}
              onDrop={readOnly ? undefined : (e) => { e.preventDefault(); dropInto(""); }}
            >
              {creating && (
                <div className={styles.spTreeRow} style={{ paddingLeft: 8 }}>
                  {creating === "folder" ? <FolderPlus size={14} className={styles.spTreeChevron} /> : <FilePlus size={14} className={styles.spTreeChevron} />}
                  <input
                    className={styles.spTreeInput}
                    autoFocus
                    value={draftName}
                    placeholder={`${selectedDir || ""}/${creating === "folder" ? (ko ? "폴더 이름" : "folder name") : (ko ? "파일 (예: util.js)" : "file (e.g. util.js)")}`}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); commitCreate(); } else if (e.key === "Escape") { e.preventDefault(); setCreating(null); setDraftName(""); } }}
                    onBlur={commitCreate}
                  />
                </div>
              )}
              {renderNodes(tree, 0)}
            </div>
          </div>
        )}

        {sidebar && showEditor && (
          <div className={styles.spSplit} data-cursor="resizeH" onPointerDown={startEx} onPointerMove={moveEx} onPointerUp={endDrag} onPointerCancel={endDrag} />
        )}

        <div ref={rowRef} className={styles.spMain} style={{ flexDirection: vertical ? "column" : "row" }}>
          {showEditor && (
            <div ref={editorColRef} className={styles.spEditorCol} style={bothCols ? { flex: `0 0 ${ratio * 100}%` } : { flex: 1 }}>
              <div className={styles.spTabs} data-lenis-prevent>
                {tabs.map((p) => {
                  const { Icon, color } = fileIcon(p);
                  return (
                    <div key={p} className={styles.spTab} data-active={p === active ? "" : undefined} onClick={() => setActive(p)}>
                      <Icon size={15} color={color} />
                      <span className={styles.spTabName}>{base(p)}</span>
                      {!readOnly && tabs.length > 1 && (
                        <Pressable noTapScale className={styles.spTabClose} aria-label={ko ? "탭 닫기" : "Close tab"} onClick={(e) => { e.stopPropagation(); closeTab(p); }}><X size={13} /></Pressable>
                      )}
                    </div>
                  );
                })}
              </div>
              <CodeMirrorEditor value={files[active] ?? ""} language={activeLang} onChange={setActiveCode} readOnly={readOnly} fontSize={fontSize} />
              {showConsole && (
                <>
                  <div className={styles.spSplitV} data-cursor="resizeV" onPointerDown={startCon} onPointerMove={moveCon} onPointerUp={endDrag} onPointerCancel={endDrag} />
                  <div className={styles.spConsole} style={{ height: consoleH }} data-lenis-prevent>
                    <div className={styles.rnConsoleWrap}>
                      <div className={styles.rnConsoleBar}>
                        <div className={styles.rnFilterChips}>
                          <Pressable noTapScale className={styles.rnChip} data-on={logFilter === "all" ? "" : undefined} onClick={() => setLogFilter("all")}>{ko ? "전체" : "All"}</Pressable>
                          <Pressable noTapScale className={styles.rnChip} data-on={logFilter === "warn" ? "" : undefined} onClick={() => setLogFilter("warn")}>{ko ? "경고" : "Warn"}</Pressable>
                          <Pressable noTapScale className={styles.rnChip} data-on={logFilter === "error" ? "" : undefined} onClick={() => setLogFilter("error")}>{ko ? "에러" : "Error"}</Pressable>
                        </div>
                        <input className={styles.rnFilterInput} placeholder={ko ? "필터" : "Filter"} value={logQuery} onChange={(e) => setLogQuery(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
                        <TB tip={ko ? "콘솔 지우기" : "Clear console"} onClick={() => setLogs([])}><Ban size={15} /></TB>
                      </div>
                      <div className={styles.rnConsole}>
                        {shownLogs.length === 0
                          ? <div className={styles.rnConsoleEmpty}>{logs.length === 0 ? (ko ? "console.log 출력이 여기 표시됩니다" : "console output appears here") : (ko ? "필터와 일치하는 로그가 없습니다" : "no logs match the filter")}</div>
                          : shownLogs.map((l, i) => <div key={i} className={styles.rnLog} data-level={l.level}>{l.text}</div>)}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {bothCols && (
            <div
              className={vertical ? styles.spSplitV : styles.spSplit}
              data-cursor={vertical ? "resizeV" : "resizeH"}
              onPointerDown={startRatio} onPointerMove={moveRatio} onPointerUp={endDrag} onPointerCancel={endDrag}
            />
          )}

          {showPreview && (
            <div className={styles.spPreviewCol} data-zoomed={zoom !== 1 ? "" : undefined} style={{ "--pg-zoom": zoom } as React.CSSProperties}>
              <iframe
                ref={iframeRef}
                className={styles.rnFrame}
                srcDoc={srcdoc}
                title="preview"
                sandbox="allow-scripts allow-modals allow-forms allow-popups allow-pointer-lock allow-downloads"
              />
              {/* 미리보기 배율 — 툴바가 아니라 미리보기 영역 우상단 오버레이 */}
              <div className={styles.rnPreviewZoom}>
                <TB tip={ko ? "미리보기 축소" : "Zoom out"} onClick={() => stepZoom(-0.1)}><ZoomOut size={16} /></TB>
                <span className={styles.spCtlValue}>{Math.round(zoom * 100)}%</span>
                <TB tip={ko ? "미리보기 확대" : "Zoom in"} onClick={() => stepZoom(0.1)}><ZoomIn size={16} /></TB>
              </div>
            </div>
          )}
        </div>
      </div>

      {resizable && !fs && (
        <div className={styles.pgResize} data-cursor="resizeV" onPointerDown={startBlk} onPointerMove={moveBlk} onPointerUp={endDrag} onPointerCancel={endDrag} />
      )}
    </div>
  );
}
