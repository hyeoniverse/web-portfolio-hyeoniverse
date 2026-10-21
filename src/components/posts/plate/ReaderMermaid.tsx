"use client";

// 리더용 mermaid 블록 — 본문의 코드블록과 같은 창(.code-block-wrap: 신호등 · 가운데 언어 라벨 · 오른쪽 캡슐 컨트롤).
// 예전엔 둥근 세그먼트 + 굵은 테두리 상자를 따로 그려 본문의 코드블록과 결이 달랐고 면이 무거웠다.
// 캡슐 안: 다이어그램 / 코드 / 나란히 + 복사. 코드 보기는 Prism 으로 칠한다(utils/prismHighlight 의 mermaid 문법).
import React, { useMemo, useRef, useState } from "react";
import { COPY_FEEDBACK_MS } from "@/constants";
import { highlightCode } from "@/utils/prismHighlight";
import MermaidPreview from "./MermaidPreview";
import Pressable from "@/components/ui/Pressable";
import styles from "../EditorDiagram.module.css";

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
  const highlighted = useMemo(() => highlightCode(code, "mermaid").html, [code]);

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

  const views: { value: View; label: string }[] = [
    { value: "diagram", label: labels.diagram },
    { value: "code", label: labels.code },
    { value: "split", label: labels.split },
  ];

  return (
    <div className={`code-block-outer ${styles.readerMermaid}`}>
      <div className={`code-block-wrap has-code-bar ${styles.readerMermaidWindow}`}>
        <div className="code-block-bar" contentEditable={false}>
          <span className="code-lang-label">mermaid</span>
          <div className="code-block-controls">
            {views.map((v) => (
              <Pressable
                key={v.value}
                className={`code-copy-btn ${styles.readerMermaidView}`}
                aria-pressed={view === v.value}
                onClick={() => setView(v.value)}
              >
                {v.label}
              </Pressable>
            ))}
            <Pressable className="code-copy-btn" onClick={copy}>
              {copied ? labels.copied : labels.copyCode}
            </Pressable>
          </div>
        </div>
        <div
          className={isSplit ? `${styles.graphSplit} ${styles.readerMermaidSplit}` : styles.readerMermaidBody}
          ref={splitRef}
          style={isSplit ? ({ ["--split-pct" as string]: `${splitPct}%` } as React.CSSProperties) : undefined}
        >
          {showCode && (
            /* language-mermaid — 본문 코드블록 꾸미기(highlightCodeBlocks)가 이 pre 에 바를 또 달지 않게 */
            <pre className={`${styles.readerMermaidCode}${isSplit ? ` ${styles.graphSplitCode}` : ""}`}>
              <code className="language-mermaid" dangerouslySetInnerHTML={{ __html: highlighted }} />
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
    </div>
  );
}
