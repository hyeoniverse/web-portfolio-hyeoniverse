import React from "react";
import { useEditorRef } from "platejs/react";
import { _blockDragPath } from "./utils";
import styles from "../RichTextEditor.module.css";

// ── 드래그 중 에디터 가장자리 자동 스크롤 ──
const EDGE_ZONE = 60;  // px — 가장자리 감지 영역
const SCROLL_SPEED = 12; // px per frame

let _scrollRaf: number | null = null;
let _lastClientY = 0;

function startAutoScroll(editorEl: HTMLElement | null) {
  stopAutoScroll();
  if (!editorEl) return;

  // 에디터의 스크롤 가능한 부모 찾기
  const scrollParent = findScrollParent(editorEl);
  if (!scrollParent) return;

  const tick = () => {
    const rect = scrollParent.getBoundingClientRect();
    const y = _lastClientY;

    if (y < rect.top + EDGE_ZONE && y >= rect.top) {
      // 위쪽 가장자리 — 위로 스크롤
      const intensity = 1 - (y - rect.top) / EDGE_ZONE;
      scrollParent.scrollTop -= SCROLL_SPEED * intensity;
    } else if (y > rect.bottom - EDGE_ZONE && y <= rect.bottom) {
      // 아래쪽 가장자리 — 아래로 스크롤
      const intensity = 1 - (rect.bottom - y) / EDGE_ZONE;
      scrollParent.scrollTop += SCROLL_SPEED * intensity;
    }

    _scrollRaf = requestAnimationFrame(tick);
  };

  _scrollRaf = requestAnimationFrame(tick);
}

function stopAutoScroll() {
  if (_scrollRaf !== null) {
    cancelAnimationFrame(_scrollRaf);
    _scrollRaf = null;
  }
}

function findScrollParent(el: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = el;
  while (current) {
    const { overflow, overflowY } = getComputedStyle(current);
    if (/(auto|scroll)/.test(overflow + overflowY) && current.scrollHeight > current.clientHeight) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

// document-level drag listener for tracking mouse Y
function onDocDrag(e: DragEvent) {
  _lastClientY = e.clientY;
}

/**
 * 블록 요소(이미지, 표, 수식, 코드블록)에 부착하는 드래그 핸들.
 * 드래그 시작 시 path를 모듈 ref에 저장, 드롭 시 moveNodes로 이동.
 */
export function BlockDragHandle({ path }: { path: number[] | null }) {
  if (!path) return null;

  return (
    <div
      className={styles.blockDragHandle}
      contentEditable={false}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", "block-dnd");
        _blockDragPath.current = path;
        _lastClientY = e.clientY;

        // 에디터 영역 찾아서 auto-scroll 시작
        const editorEl = (e.target as HTMLElement).closest("[data-slate-editor]") as HTMLElement | null;
        document.addEventListener("drag", onDocDrag);
        startAutoScroll(editorEl);
      }}
      onDragEnd={() => {
        _blockDragPath.current = null;
        document.removeEventListener("drag", onDocDrag);
        stopAutoScroll();
      }}
      title="Drag to reorder"
    >
      <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
        <circle cx="3" cy="2" r="1.2" />
        <circle cx="7" cy="2" r="1.2" />
        <circle cx="3" cy="7" r="1.2" />
        <circle cx="7" cy="7" r="1.2" />
        <circle cx="3" cy="12" r="1.2" />
        <circle cx="7" cy="12" r="1.2" />
      </svg>
    </div>
  );
}

/**
 * 블록 요소의 드롭 존 래퍼.
 * 다른 블록이 드래그되어 올 때 드롭 표시기 + 실제 이동 수행.
 */
export function BlockDropZone({
  path,
  children,
  className,
  style,
}: {
  path: number[] | null;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const editor = useEditorRef();
  const [dropPosition, setDropPosition] = React.useState<"above" | "below" | null>(null);

  const wrapCls = [styles.blockDragWrap, className].filter(Boolean).join(" ");

  if (!path) return <div className={wrapCls} style={style}>{children}</div>;

  const onDragOver = (e: React.DragEvent) => {
    const src = _blockDragPath.current;
    if (!src) return;
    // 자기 자신 위에선 무시
    if (src.length === path.length && src.every((v, i) => v === path[i])) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    // 마우스 위치로 위/아래 결정
    const rect = e.currentTarget.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    setDropPosition(e.clientY < mid ? "above" : "below");
  };

  const onDragLeave = () => {
    setDropPosition(null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropPosition(null);
    const src = _blockDragPath.current;
    if (!src || !path) return;
    if (src.length === path.length && src.every((v, i) => v === path[i])) return;

    try {
      // 같은 depth의 블록간 이동
      if (src.length === path.length) {
        const targetIdx = dropPosition === "below" ? path[path.length - 1] + 1 : path[path.length - 1];
        const parentPath = path.slice(0, -1);
        editor.tf.moveNodes({ at: src, to: [...parentPath, targetIdx] });
      }
    } catch { /* ignore */ }
    _blockDragPath.current = null;
    stopAutoScroll();
  };

  return (
    <div
      className={wrapCls}
      style={{ ...style, position: "relative" }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {dropPosition === "above" && <div className={styles.blockDropIndicator} style={{ top: -1 }} />}
      {children}
      {dropPosition === "below" && <div className={styles.blockDropIndicator} style={{ bottom: -1 }} />}
    </div>
  );
}
