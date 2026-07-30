"use client";

// 리더용 mermaid 블록 — 에디터와 동일한 SegmentedControl + MermaidPreview + split 레이아웃 재사용.
// 뷰 토글(다이어그램/코드/스플릿) + 코드 복사는 우상단.
import React, { useRef, useState } from "react";
import { COPY_FEEDBACK_MS } from "@/constants";
import SegmentedControl from "@/components/ui/SegmentedControl";
import MermaidPreview from "./MermaidPreview";
import styles from "../RichTextEditor.module.css";

type View = "diagram" | "code" | "split";

export default function ReaderMermaid({ code, labels }: {
  code: string;
  labels: { diagram: string; code: string; split: string; copyCode: string; copied: string };
}) {
  const [view, setView] = useState<View>("diagram");
  const [copied, setCopied] = useState(false);
  const isSplit = view === "split";
  const showCode = view !== "diagram";
  const showGraph = view !== "code";

  // split 시 코드/그래프 폭 비율(%) — 가운데 핸들 드래그로 조절 (편집뷰와 동일)
  const [splitPct, setSplitPct] = useState(50);
  const splitRef = useRef<HTMLDivElement>(null);
  const onSplitHandleDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const container = splitRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const onMove = (ev: PointerEvent) => {
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.min(80, Math.max(20, pct)));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = "";
    };
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const copy = () => {
    try { navigator.clipboard?.writeText(code); } catch { /* noop */ }
    setCopied(true);
    window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
  };

  return (
    <div className={styles.readerMermaid}>
      <div className={styles.readerMermaidBar} contentEditable={false}>
        <SegmentedControl<View>
          items={[
            { value: "diagram", label: labels.diagram },
            { value: "code", label: labels.code },
            { value: "split", label: labels.split },
          ]}
          value={view}
          onChange={setView}
          size="sm"
        />
        <button type="button" className={styles.readerMermaidCopy} onClick={copy}>
          {copied ? labels.copied : labels.copyCode}
        </button>
      </div>
      <div
        className={isSplit ? styles.graphSplit : undefined}
        ref={splitRef}
        style={isSplit ? ({ ["--split-pct" as string]: `${splitPct}%` } as React.CSSProperties) : undefined}
      >
        {showCode && (
          <pre className={`${styles.readerMermaidCode}${isSplit ? ` ${styles.graphSplitCode}` : ""}`}>
            <code>{code}</code>
          </pre>
        )}
        {isSplit && showGraph && (
          <div className={styles.graphSplitHandle} role="separator" aria-label="resize"
            data-cursor="resizeH" onPointerDown={onSplitHandleDown}>
            <span className={styles.graphSplitHandleBar} />
          </div>
        )}
        {showGraph && <MermaidPreview code={code} split={isSplit} />}
      </div>
    </div>
  );
}
