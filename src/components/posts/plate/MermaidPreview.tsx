"use client";

// mermaid 코드 → 다이어그램 SVG 미리보기 (동적 import). 에디터·리더 공용.
import React from "react";
import styles from "../EditorDiagram.module.css";

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

export default function MermaidPreview({ code, split }: { code: string; split?: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
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
          if (el && natural > 0) el.style.minWidth = `${Math.round(natural * 0.8)}px`;
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
  }, [code, theme]);

  return (
    <div contentEditable={false} className={`${styles.mermaidPreview}${split ? ` ${styles.mermaidPreviewSplit}` : ""}`}>
      {/* 캔버스는 폭을 꽉 채운다 — 폭이 없으면 svg 의 width:100% 가 브라우저 기본값(300px)으로 풀려 그림이 쪼그라들었다 */}
      {error ? <div className={styles.mermaidError}>{error}</div> : <div ref={ref} className={styles.mermaidCanvas} />}
    </div>
  );
}
