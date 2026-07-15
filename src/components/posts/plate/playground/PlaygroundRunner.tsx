"use client";

// ── 자체 srcdoc 러너 (HTML/CSS/JS) ── 외부 번들러/서버 의존 0. CodeMirror 편집 + iframe.srcdoc 실행.
import React, { useEffect, useRef, useState } from "react";
import { Code2, Monitor, Terminal, Maximize2, Minimize2, RotateCw } from "lucide-react";
import { SiHtml5, SiCss, SiJavascript } from "react-icons/si";
import Tooltip from "@/components/ui/Tooltip";
import CodeMirrorEditor, { type CmLang } from "./CodeMirrorEditor";
import { buildSrcdoc, parseConsoleMessage, type ConsoleMsg } from "./buildSrcdoc";
import type { PlaygroundData } from "./model";
import styles from "../PlaygroundElement.module.css";

type TabKey = "html" | "css" | "js";
const TABS: { key: TabKey; file: string; lang: CmLang; label: string; Icon: React.ComponentType<{ size?: number; color?: string }>; color: string }[] = [
  { key: "html", file: "/index.html", lang: "html", label: "index.html", Icon: SiHtml5, color: "#e34f26" },
  { key: "css", file: "/styles.css", lang: "css", label: "styles.css", Icon: SiCss, color: "#2965f1" },
  { key: "js", file: "/script.js", lang: "javascript", label: "script.js", Icon: SiJavascript, color: "#f7df1e" },
];

function TB({ on, tip, onClick, children }: { on?: boolean; tip: React.ReactNode; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip content={tip} placement="top" delay={400}>
      <button type="button" className={styles.spIconBtn} data-on={on ? "" : undefined} onClick={onClick}>{children}</button>
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

  const [code, setCode] = useState({
    html: data.files["/index.html"] ?? "",
    css: data.files["/styles.css"] ?? "",
    js: data.files["/script.js"] ?? "",
  });
  const [active, setActive] = useState<TabKey>(readOnly ? "js" : "html");
  const [srcdoc, setSrcdoc] = useState(() => buildSrcdoc(code));
  const [logs, setLogs] = useState<ConsoleMsg[]>([]);

  // 뷰 토글 — 리더는 기본 미리보기만
  const [showEditor, setShowEditor] = useState(!readOnly);
  const [showPreview, setShowPreview] = useState(true);
  const [showConsole, setShowConsole] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  // 레이아웃 리사이즈
  const rowRef = useRef<HTMLDivElement>(null);
  const editorColRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(0.5);
  const [consoleH, setConsoleH] = useState(150);
  const [boxH, setBoxH] = useState(typeof height === "number" ? height : 460);
  const dragKind = useRef<null | "ratio" | "console" | "block">(null);
  const dragStart = useRef({ y: 0, h: 0 });

  const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
  const cap = (e: React.PointerEvent) => { e.currentTarget.setPointerCapture(e.pointerId); e.preventDefault(); };
  const rel = (e: React.PointerEvent) => { try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ } };
  const startRatio = (e: React.PointerEvent) => { dragKind.current = "ratio"; cap(e); };
  const moveRatio = (e: React.PointerEvent) => {
    if (dragKind.current !== "ratio" || !rowRef.current) return;
    const r = rowRef.current.getBoundingClientRect();
    setRatio(clamp((e.clientX - r.left) / r.width, 0.15, 0.85));
  };
  const startCon = (e: React.PointerEvent) => { dragKind.current = "console"; cap(e); };
  const moveCon = (e: React.PointerEvent) => {
    if (dragKind.current !== "console" || !editorColRef.current) return;
    const r = editorColRef.current.getBoundingClientRect();
    setConsoleH(clamp(r.bottom - e.clientY, 80, r.height - 120));
  };
  const startBlk = (e: React.PointerEvent) => { dragKind.current = "block"; dragStart.current = { y: e.clientY, h: boxH }; cap(e); };
  const moveBlk = (e: React.PointerEvent) => {
    if (dragKind.current !== "block") return;
    setBoxH(Math.max(240, dragStart.current.h + (e.clientY - dragStart.current.y)));
  };
  const endDrag = (e: React.PointerEvent) => { dragKind.current = null; rel(e); };

  // 파일 변경 → 저장(디바운스)
  const cb = useRef(onChange); cb.current = onChange;
  useEffect(() => {
    if (readOnly) return;
    const t = window.setTimeout(() => cb.current?.({ "/index.html": code.html, "/styles.css": code.css, "/script.js": code.js }), 700);
    return () => window.clearTimeout(t);
  }, [code, readOnly]);

  // 파일 변경 → srcdoc 재빌드(디바운스) + 로그 초기화
  useEffect(() => {
    const t = window.setTimeout(() => { setLogs([]); setSrcdoc(buildSrcdoc(code)); }, 350);
    return () => window.clearTimeout(t);
  }, [code]);

  // 프리뷰 → 콘솔 메시지 수신
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return; // 자기 iframe 것만
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

  const rerun = () => { setLogs([]); setSrcdoc(buildSrcdoc(code) + "<!--" + Date.now().toString(36) + "-->"); };
  const setActiveCode = (v: string) => setCode((c) => ({ ...c, [active]: v }));
  const bothCols = showEditor && showPreview;
  const activeTab = TABS.find((t) => t.key === active)!;

  return (
    <div className={styles.spWrap} style={{ height: fs ? "100%" : (resizable ? boxH : height) }}>
      <div className={styles.spViewBar}>
        <span className={styles.spViewBarSpacer} />
        <TB on={showEditor} tip={ko ? "코드 표시/숨기기" : "Toggle code"} onClick={() => setShowEditor((v) => (showPreview ? !v : v))}><Code2 size={14} /></TB>
        <TB on={showPreview} tip={ko ? "미리보기 표시/숨기기" : "Toggle preview"} onClick={() => setShowPreview((v) => (showEditor ? !v : v))}><Monitor size={14} /></TB>
        <TB on={showConsole} tip={ko ? "콘솔 표시/숨기기" : "Toggle console"} onClick={() => setShowConsole((v) => !v)}><Terminal size={14} /></TB>
        <span className={styles.spViewBarDiv} />
        <TB tip={ko ? "다시 실행" : "Re-run"} onClick={rerun}><RotateCw size={14} /></TB>
        <TB tip={fs ? (ko ? "전체화면 종료" : "Exit fullscreen") : (ko ? "전체화면" : "Fullscreen")} onClick={toggleFs}>{fs ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</TB>
      </div>

      <div ref={rowRef} className={styles.spRow}>
        {showEditor && (
          <div ref={editorColRef} className={styles.spEditorCol} style={bothCols ? { flex: `0 0 ${ratio * 100}%` } : { flex: 1 }}>
            <div className={styles.spTabs} data-lenis-prevent>
              {TABS.map((t) => (
                <div key={t.key} className={styles.spTab} data-active={t.key === active ? "" : undefined} onClick={() => setActive(t.key)}>
                  <t.Icon size={13} color={t.color} />
                  <span className={styles.spTabName}>{t.label}</span>
                </div>
              ))}
            </div>
            <CodeMirrorEditor value={code[active]} language={activeTab.lang} onChange={setActiveCode} readOnly={readOnly} />
            {showConsole && (
              <>
                <div className={styles.spSplitV} data-cursor="resizeV" onPointerDown={startCon} onPointerMove={moveCon} onPointerUp={endDrag} onPointerCancel={endDrag} />
                <div className={styles.spConsole} style={{ height: consoleH }} data-lenis-prevent>
                  <div className={styles.rnConsole}>
                    {logs.length === 0
                      ? <div className={styles.rnConsoleEmpty}>{ko ? "console.log 출력이 여기 표시됩니다" : "console output appears here"}</div>
                      : logs.map((l, i) => <div key={i} className={styles.rnLog} data-level={l.level}>{l.text}</div>)}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {bothCols && (
          <div className={styles.spSplit} data-cursor="resizeH" onPointerDown={startRatio} onPointerMove={moveRatio} onPointerUp={endDrag} onPointerCancel={endDrag} />
        )}

        {showPreview && (
          <div className={styles.spPreviewCol}>
            <iframe
              ref={iframeRef}
              className={styles.rnFrame}
              srcDoc={srcdoc}
              title="preview"
              sandbox="allow-scripts allow-modals allow-forms allow-popups allow-pointer-lock allow-downloads"
            />
          </div>
        )}
      </div>

      {resizable && !fs && (
        <div className={styles.pgResize} data-cursor="resizeV" onPointerDown={startBlk} onPointerMove={moveBlk} onPointerUp={endDrag} onPointerCancel={endDrag} />
      )}
    </div>
  );
}
