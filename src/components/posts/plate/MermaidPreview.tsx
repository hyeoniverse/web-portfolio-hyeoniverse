"use client";

// mermaid 코드 → 다이어그램 SVG 미리보기 (동적 import). 에디터·리더 공용.
import React from "react";
import Pressable from "@/components/ui/Pressable";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Maximize2, Minimize2, RotateCcw, ZoomIn, ZoomOut } from "@/components/icons";
import styles from "../EditorDiagram.module.css";

/** 그림 컨트롤 이름 — 넘기면 GitHub 과 같은 이동 · 확대 · 원위치 · 크게 보기 단추를 단다(리더) */
export interface MermaidControlLabels {
  zoomIn: string;
  zoomOut: string;
  reset: string;
  panUp: string;
  panDown: string;
  panLeft: string;
  panRight: string;
  fullscreen: string;
  exitFullscreen: string;
}

const PAN_STEP = 60;
const ZOOM_STEP = 1.25;
const MIN_SCALE = 0.4;
const MAX_SCALE = 4;

/* 사이트 테마(html[data-theme]) — 리더의 다이어그램은 React 트리 밖 island 로 마운트돼 ThemeProvider 를 못 쓴다.
   속성을 직접 지켜보다가 바뀌면 다시 그린다 */
function useDocumentTheme(): string {
  const subscribe = React.useCallback((onChange: () => void) => {
    const mo = new MutationObserver(onChange);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "style"] });
    return () => mo.disconnect();
  }, []);
  return React.useSyncExternalStore(
    subscribe,
    () => document.documentElement.getAttribute("data-theme") ?? "light",
    () => "light",
  );
}

/** CSS 토큰 → 실제 색(#rrggbb). light-dark() · color-mix() 를 브라우저가 풀게 임시 요소에 칠해 읽는다.
 *  계산된 색은 oklch() · color() 로 올 수 있어(토큰이 oklch 다) 글자로 풀지 않고, 캔버스에 한 점 칠해 sRGB 픽셀로 읽는다.
 *  반투명 토큰은 사이트 배경 위에 겹친 색이 된다 — 다이어그램도 그 배경 위에 놓이므로 보이는 색과 같다 */
function resolveColors(vars: Record<string, string>): Record<string, string> {
  const probe = document.createElement("span");
  probe.style.display = "none";
  document.body.appendChild(probe);
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  probe.style.color = "var(--bg-primary)";
  const base = getComputedStyle(probe).color;
  const out: Record<string, string> = {};
  for (const [key, token] of Object.entries(vars)) {
    probe.style.color = `var(${token})`;
    const css = getComputedStyle(probe).color;
    if (!ctx) {
      out[key] = css;
      continue;
    }
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 1, 1);
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    out[key] = `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
  }
  probe.remove();
  return out;
}

/** 사이트 토큰으로 칠한 mermaid 테마 — 기본 neutral 은 다크 화면에서 밝은 상자가 떠 보였다 */
function themeVariables() {
  const c = resolveColors({
    text: "--text-primary",
    muted: "--text-secondary",
    line: "--text-tertiary",
    node: "--bg-tertiary",
    nodeBorder: "--border-color-strong",
    surface: "--bg-primary",
    accent: "--text-accent",
  });
  const font = getComputedStyle(document.body).fontFamily;
  return {
    fontFamily: font,
    fontSize: "15px",
    background: c.surface,
    primaryColor: c.node,
    primaryTextColor: c.text,
    primaryBorderColor: c.nodeBorder,
    secondaryColor: c.node,
    tertiaryColor: c.surface,
    lineColor: c.line,
    textColor: c.text,
    mainBkg: c.node,
    nodeBorder: c.nodeBorder,
    clusterBkg: c.surface,
    clusterBorder: c.nodeBorder,
    edgeLabelBackground: c.surface,
    // 시퀀스 다이어그램
    actorBkg: c.node,
    actorBorder: c.nodeBorder,
    actorTextColor: c.text,
    actorLineColor: c.line,
    signalColor: c.muted,
    signalTextColor: c.text,
    labelBoxBkgColor: c.node,
    labelBoxBorderColor: c.nodeBorder,
    labelTextColor: c.text,
    loopTextColor: c.text,
    noteBkgColor: c.surface,
    noteBorderColor: c.accent,
    noteTextColor: c.text,
    activationBkgColor: c.node,
    activationBorderColor: c.accent,
    sequenceNumberColor: c.surface,
  };
}

export default function MermaidPreview({ code, split, controls }: { code: string; split?: boolean; controls?: MermaidControlLabels }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  /* 이동 · 확대 — 캔버스에 transform 으로 건다. 그림을 다시 그리지 않아 가볍다 */
  const [view, setView] = React.useState({ x: 0, y: 0, scale: 1 });
  const [fullscreen, setFullscreen] = React.useState(false);
  const canFullscreen = React.useSyncExternalStore(
    () => () => {},
    () => !!document.fullscreenEnabled,
    () => false,
  );

  React.useEffect(() => {
    if (!controls) return;
    const onChange = () => setFullscreen(document.fullscreenElement === viewportRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [controls]);

  const pan = (dx: number, dy: number) => setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  const zoom = (factor: number) =>
    setView((v) => ({ ...v, scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor)) }));
  const reset = () => setView({ x: 0, y: 0, scale: 1 });
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void viewportRef.current?.requestFullscreen();
  };

  /* 끌어서 이동 — 단추 위에서 시작한 누름은 단추 몫 */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!controls || e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
    const start = { px: e.clientX, py: e.clientY, x: view.x, y: view.y };
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    target.dataset.dragging = "";
    const onMove = (ev: PointerEvent) => setView((v) => ({ ...v, x: start.x + ev.clientX - start.px, y: start.y + ev.clientY - start.py }));
    const onUp = () => {
      delete target.dataset.dragging;
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onUp);
    };
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onUp);
  };
  const [error, setError] = React.useState<string | null>(null);
  const theme = useDocumentTheme();

  React.useEffect(() => {
    let cancelled = false;
    const src = code.trim();
    if (!src) {
      setError(null);
      if (ref.current) ref.current.innerHTML = "";
      return;
    }
    (async () => {
      const id = "mmd-" + Math.floor(Math.random() * 1e9).toString(36);
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          themeVariables: themeVariables(),
          securityLevel: "loose",
          /* 본문 칸(약 720px)에 맞춰 줄어드는 비율을 줄인다 — 기본 간격이면 가로 흐름도가 1000px 를 넘어 글자가 70% 로 작아졌다 */
          flowchart: { nodeSpacing: 28, rankSpacing: 36, padding: 10 },
        });
        /* 먼저 파싱만 해본다 — render() 는 실패해도 body 에 찌꺼기를 남기지만 parse() 는 안 남긴다.
           에디터에선 타이핑 중간 상태가 계속 파싱 에러라 이 구분이 중요하다. */
        await mermaid.parse(src);
        const { svg } = await mermaid.render(id, src);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          /* 칸보다 넓은 그림은 칸에 맞춰 줄어드는데, 원래 크기의 80% 아래로는 줄이지 않는다 —
             그 아래면 글자를 읽을 수 없다. 넘치는 만큼은 감싼 칸(.mermaidPreview)이 가로로 스크롤한다 */
          const el = ref.current.querySelector("svg");
          const natural = el?.viewBox.baseVal.width ?? 0;
          // 컨트롤이 있으면 칸에 맞춰 두고 확대 단추로 키운다 — 스크롤과 끌어 이동이 겹치지 않게
          if (el && natural > 0 && !controls) el.style.minWidth = `${Math.round(natural * 0.8)}px`;
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "mermaid render error");
      } finally {
        /* render() 가 실패하면 mermaid 가 측정용 임시 노드를 document.body 에 남긴다.
           id 가 매번 랜덤이라 재시도할 때마다 새로 쌓여서, 페이지 하단에
           "Syntax error in text / mermaid version …" 이 계속 늘어난다(mermaid 가 스스로 안 치운다).

           ⚠ **우리 ref 안에 있는 건 절대 건드리면 안 된다** — render() 가 돌려준 SVG 자체가
           같은 id 를 달고 있어서, 무턱대고 getElementById(id).remove() 하면 방금 그린 그래프를
           지워버린다(= 그래프가 안 그려짐). body 에 떠 있는 고아 노드만 치운다. */
        const dropOrphan = (n: HTMLElement | null) => { if (n && !ref.current?.contains(n)) n.remove(); };
        dropOrphan(document.getElementById(id));
        dropOrphan(document.getElementById("d" + id));
      }
    })();
    return () => { cancelled = true; };
  }, [code, theme, controls]);

  const btn = (label: string, onClick: () => void, icon: React.ReactNode, area: string) => (
    <Pressable className={styles.mermaidPadBtn} style={{ gridArea: area }} onClick={onClick} aria-label={label} title={label}>
      {icon}
    </Pressable>
  );

  return (
    <div
      ref={viewportRef}
      contentEditable={false}
      className={`${styles.mermaidPreview}${split ? ` ${styles.mermaidPreviewSplit}` : ""}${controls ? ` ${styles.mermaidPannable}` : ""}`}
      onPointerDown={controls ? onPointerDown : undefined}
      onDoubleClick={controls ? reset : undefined}
    >
      {/* 캔버스는 폭을 꽉 채운다 — 폭이 없으면 svg 의 width:100% 가 브라우저 기본값(300px)으로 풀려 그림이 쪼그라들었다 */}
      {error ? (
        <div className={styles.mermaidError}>{error}</div>
      ) : (
        <div
          ref={ref}
          className={styles.mermaidCanvas}
          style={controls ? { transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` } : undefined}
        />
      )}
      {controls && !error && (
        <>
          {canFullscreen && (
            <Pressable
              className={`${styles.mermaidPadBtn} ${styles.mermaidFullscreenBtn}`}
              onClick={toggleFullscreen}
              aria-label={fullscreen ? controls.exitFullscreen : controls.fullscreen}
              title={fullscreen ? controls.exitFullscreen : controls.fullscreen}
            >
              {fullscreen ? <Minimize2 size={14} strokeWidth={1.8} /> : <Maximize2 size={14} strokeWidth={1.8} />}
            </Pressable>
          )}
          {/* GitHub 과 같은 3×3 — 가운데 원위치, 상하좌우 이동, 오른쪽 위 · 아래 확대 · 축소 */}
          <div className={styles.mermaidPad}>
            {btn(controls.panUp, () => pan(0, PAN_STEP), <ArrowUp size={14} strokeWidth={1.8} />, "up")}
            {btn(controls.zoomIn, () => zoom(ZOOM_STEP), <ZoomIn size={14} strokeWidth={1.8} />, "in")}
            {btn(controls.panLeft, () => pan(PAN_STEP, 0), <ArrowLeft size={14} strokeWidth={1.8} />, "left")}
            {btn(controls.reset, reset, <RotateCcw size={14} strokeWidth={1.8} />, "reset")}
            {btn(controls.panRight, () => pan(-PAN_STEP, 0), <ArrowRight size={14} strokeWidth={1.8} />, "right")}
            {btn(controls.panDown, () => pan(0, -PAN_STEP), <ArrowDown size={14} strokeWidth={1.8} />, "down")}
            {btn(controls.zoomOut, () => zoom(1 / ZOOM_STEP), <ZoomOut size={14} strokeWidth={1.8} />, "out")}
          </div>
        </>
      )}
    </div>
  );
}
