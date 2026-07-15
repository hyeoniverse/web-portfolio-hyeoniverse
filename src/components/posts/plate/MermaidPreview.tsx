"use client";

// mermaid 코드 → 다이어그램 SVG 미리보기 (동적 import). 에디터·리더 공용.
import React from "react";
import styles from "../RichTextEditor.module.css";

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
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose" });
        const id = "mmd-" + Math.floor(Math.random() * 1e9).toString(36);
        const { svg } = await mermaid.render(id, src);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "mermaid render error");
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
