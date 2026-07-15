"use client";

// ── 코드 플레이그라운드 블록 (void) — Sandpack(CodeSandbox 식) ──
// 무거운 Sandpack 은 lazy-load. el.data 에 { template, files, dependencies } 저장.
import React, { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useEditorRef, useSelected, PlateElement, type PlateElementProps } from "platejs/react";
import { SquareCode, Maximize2, Minimize2 } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { BlockDropZone, useBlockDrag } from "./BlockDragHandle";
import TBtn from "./TBtn";
import Select from "@/components/ui/Select";
import { normalizePlayground, RUNNER_TEMPLATES, type PlaygroundData } from "./playground/model";
import { starterFiles } from "./playground/starters";
import styles from "./PlaygroundElement.module.css";

// HTML/CSS/JS = 자체 srcdoc 러너(외부 의존 0), 나머지 = Sandpack (하이브리드)
const PlaygroundSandpack = React.lazy(() => import("./playground/PlaygroundSandpack"));
const PlaygroundRunner = React.lazy(() => import("./playground/PlaygroundRunner"));

const TEMPLATES = [
  { value: "html", label: "HTML/CSS/JS" },
  { value: "vanilla-ts", label: "TypeScript" },
  { value: "react-ts", label: "React (TS)" },
  { value: "react", label: "React" },
];

export function PlaygroundElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const selected = useSelected();
  const { language } = useLanguage();
  const { theme } = useTheme();
  const t = (ko: string, en: string) => (language === "ko" ? ko : en);
  const el = props.element as Record<string, unknown>;
  const initial = useMemo(() => normalizePlayground(el.data), [el.data]);

  const [data, setData] = useState<PlaygroundData>(initial);
  const [fullscreen, setFullscreen] = useState(false);
  const [boxH, setBoxH] = useState(460); // 사용자가 지정한 블록 높이
  const resizeRef = useRef<{ y: number; h: number } | null>(null);

  const elementRef = useRef(props.element); elementRef.current = props.element;
  const dataRef = useRef(data); dataRef.current = data;

  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();
  const { blockDragProps } = useBlockDrag(elPath);

  const persist = useCallback((next: PlaygroundData) => {
    let p: number[] | null = null;
    try { const pp = editor.api.findPath(elementRef.current); p = pp ? Array.from(pp) : null; } catch { p = null; }
    if (!p) return;
    try { if (!editor.api.node(p)) return; } catch { return; }
    try { editor.tf.setNodes({ data: next } as Record<string, unknown>, { at: p }); } catch { /* noop */ }
  }, [editor]);

  // Sandpack 파일 변경 → 저장(setData 안 함 → Sandpack 리마운트/상태손실 방지)
  const onFilesChange = useCallback((files: Record<string, string>) => {
    const next = { ...dataRef.current, files };
    dataRef.current = next;
    persist(next);
  }, [persist]);

  // 템플릿 변경 → 스타터(예시) 파일로 채우고 리마운트(key=template)
  const setTemplate = useCallback((tpl: string) => {
    const next: PlaygroundData = { template: tpl, files: starterFiles(tpl) };
    dataRef.current = next;
    setData(next);
    persist(next);
  }, [persist]);

  // 블록 전체 높이 조절(하단 핸들)
  const startResize = (e: React.PointerEvent) => { resizeRef.current = { y: e.clientY, h: boxH }; e.currentTarget.setPointerCapture(e.pointerId); e.preventDefault(); };
  const onResize = (e: React.PointerEvent) => { const s = resizeRef.current; if (!s) return; setBoxH(Math.max(240, s.h + (e.clientY - s.y))); };
  const endResize = (e: React.PointerEvent) => { resizeRef.current = null; try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ } };

  // 전체화면 토글 — body 로 portal 하며 Sandpack 이 리마운트되므로, 최신 files 를
  // data 로 동기화해 유실 방지(onFilesChange 는 dataRef 만 갱신하고 setData 안 함).
  const applyFullscreen = useCallback((next: boolean) => { setData(dataRef.current); setFullscreen(next); }, []);

  React.useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); applyFullscreen(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, applyFullscreen]);

  const body = (
    <div contentEditable={false} className={`${styles.pgInner}${fullscreen ? ` ${styles.pgFullscreen}` : ""}`} data-selected={selected ? "" : undefined}>
      <div className={styles.pgToolbar}>
        <span className={styles.pgTitle}><SquareCode size={13} />{t("플레이그라운드", "Playground")}</span>
        <span className={styles.pgToolbarSpacer} />
        <span onMouseDown={(e) => e.stopPropagation()} style={{ display: "inline-flex" }}>
          <Select value={data.template} width="s" onChange={setTemplate} options={TEMPLATES} />
        </span>
        <TBtn active={fullscreen} onMouseDown={(e) => { e.preventDefault(); applyFullscreen(!fullscreen); }} tooltip={fullscreen ? t("전체화면 종료", "Exit fullscreen") : t("전체화면", "Fullscreen")} square>
          {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </TBtn>
      </div>
      {/* CodeMirror(Sandpack) 안의 키보드·클립보드 이벤트가 Slate Editable 로 버블돼
          복사/선택을 가로채는 문제 차단 — void 블록 내부는 CodeMirror 가 네이티브로 처리 */}
      <div
        className={styles.pgSandpack}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onKeyUp={(e) => e.stopPropagation()}
        onCopy={(e) => e.stopPropagation()}
        onCut={(e) => e.stopPropagation()}
        onPaste={(e) => e.stopPropagation()}
      >
        <React.Suspense fallback={<div className={styles.pgLoading}>{t("에디터 불러오는 중…", "Loading editor…")}</div>}>
          {RUNNER_TEMPLATES.has(data.template)
            ? <PlaygroundRunner key="runner" data={data} onChange={onFilesChange} height={fullscreen ? "100%" : boxH} fullscreen={fullscreen} onToggleFullscreen={() => applyFullscreen(!fullscreen)} />
            : <PlaygroundSandpack key={data.template} data={data} onChange={onFilesChange} height={fullscreen ? "100%" : boxH} theme={theme === "dark" ? "dark" : "light"} fullscreen={fullscreen} onToggleFullscreen={() => applyFullscreen(!fullscreen)} />}
        </React.Suspense>
      </div>
      {!fullscreen && (
        <div
          className={styles.pgResize}
          data-cursor="resizeV"
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={startResize}
          onPointerMove={onResize}
          onPointerUp={endResize}
          onPointerCancel={endResize}
          title={t("높이 조절", "Resize height")}
        />
      )}
    </div>
  );

  return (
    <BlockDropZone path={elPath}>
      <div {...blockDragProps}>
        <PlateElement {...props} className={styles.pgBlock}>
          {/* 전체화면 시엔 body 를 document.body 로 portal → 조상 stacking context(backdrop-filter 등)
              를 벗어나 nav·이미지 패널 위 최상단에 렌더 */}
          {fullscreen ? null : body}
          {props.children}
        </PlateElement>
      </div>
      {fullscreen && createPortal(body, document.body)}
    </BlockDropZone>
  );
}

export default PlaygroundElement;
