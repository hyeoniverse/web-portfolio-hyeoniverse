"use client";

// mermaid 코드 → 다이어그램 SVG 미리보기 (동적 import). 에디터·리더 공용.
import React from "react";
import styles from "../EditorDiagram.module.css";

export default function MermaidPreview({ code, split }: { code: string; split?: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [error, setError] = React.useState<string | null>(null);

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
        mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose" });
        /* 먼저 파싱만 해본다 — render() 는 실패해도 body 에 찌꺼기를 남기지만 parse() 는 안 남긴다.
           에디터에선 타이핑 중간 상태가 계속 파싱 에러라 이 구분이 중요하다. */
        await mermaid.parse(src);
        const { svg } = await mermaid.render(id, src);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
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
  }, [code]);

  return (
    <div contentEditable={false} className={`${styles.mermaidPreview}${split ? ` ${styles.mermaidPreviewSplit}` : ""}`}>
      {error ? <div className={styles.mermaidError}>{error}</div> : <div ref={ref} />}
    </div>
  );
}
