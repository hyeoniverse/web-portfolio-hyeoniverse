"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ZoomIn, ZoomOut, RotateCcw, X } from "@/components/icons";
import Pressable from "@/components/ui/Pressable";
import type { Language } from "@/providers/LanguageProvider";
import type { TroubleshootingDiagram } from "@/data/about/types";
import FlowDiagram from "../../FlowDiagram";
import { getNodeX, getNodeY } from "../../_utils/flowLayout";
import styles from "./DiagramFullscreenViewer.module.css";

/** Flow chart 인터랙티브 풀스크린 viewer — 휠 zoom, 빈 영역 드래그 pan, 노드 드래그로 개별 이동, +/-/리셋/닫기 컨트롤 */
export default function DiagramFullscreenViewer({
  diagram,
  language,
  onClose,
}: {
  diagram: TroubleshootingDiagram;
  language: Language;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(() => new Map());
  const stageRef = useRef<HTMLDivElement>(null);
  // dragMode: pan = 전체 canvas 이동, node = 개별 노드 이동
  const dragRef = useRef<
    | { mode: "none" }
    | { mode: "pan"; startX: number; startY: number; panX: number; panY: number }
    | { mode: "node"; nodeId: string; startX: number; startY: number; nodeX: number; nodeY: number }
  >({ mode: "none" });

  // ESC 로 닫기 + body 스크롤 잠금 (event 차단 방식, body 위치 변경 X — GSAP/Lenis 영향 없음)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prevent = (e: Event) => {
      const target = e.target as Node | null;
      if (stageRef.current && target && stageRef.current.contains(target)) return;
      e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("wheel", prevent, { passive: false });
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("wheel", prevent);
      document.removeEventListener("touchmove", prevent);
    };
  }, [onClose]);

  // 휠 zoom — 커서 위치 기준으로 확대 (point under cursor 유지)
  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setZoom((prev) => {
      const next = Math.max(0.2, Math.min(8, prev * factor));
      const actualFactor = next / prev;
      setPan((p) => ({
        x: cx - (cx - p.x) * actualFactor,
        y: cy - (cy - p.y) * actualFactor,
      }));
      return next;
    });
  }, []);

  // 드래그 시작 — 노드 위에서 시작하면 node mode, 빈 영역에서 시작하면 pan mode
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as Element;
    const nodeEl = target.closest("[data-node-id]") as SVGGElement | null;
    if (nodeEl) {
      const nodeId = nodeEl.dataset.nodeId!;
      const node = diagram.nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const curX = getNodeX(node, nodePositions);
      const curY = getNodeY(node, nodePositions);
      dragRef.current = {
        mode: "node",
        nodeId,
        startX: e.clientX,
        startY: e.clientY,
        nodeX: curX,
        nodeY: curY,
      };
    } else {
      dragRef.current = {
        mode: "pan",
        startX: e.clientX,
        startY: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    }
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }, [pan, diagram.nodes, nodePositions]);
  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag.mode === "pan") {
      setPan({
        x: drag.panX + (e.clientX - drag.startX),
        y: drag.panY + (e.clientY - drag.startY),
      });
    } else if (drag.mode === "node") {
      // 화면 좌표 delta 를 SVG 좌표로 변환 (zoom 만큼 나눠줘야 함)
      const dx = (e.clientX - drag.startX) / zoom;
      const dy = (e.clientY - drag.startY) / zoom;
      setNodePositions((prev) => {
        const next = new Map(prev);
        next.set(drag.nodeId, { x: drag.nodeX + dx, y: drag.nodeY + dy });
        return next;
      });
    }
  }, [zoom]);
  const onPointerUp = useCallback(() => {
    dragRef.current = { mode: "none" };
  }, []);

  const reset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setNodePositions(new Map());
  }, []);

  if (typeof window === "undefined") return null;
  return createPortal(
    <div className={styles.diagramViewerOverlay} role="dialog" aria-label="Diagram viewer">
      {/* Header — title + close */}
      <div className={styles.diagramViewerHeader}>
        <span className={styles.diagramViewerTitle}>
          {diagram.title ? diagram.title[language] : "Flow chart"}
        </span>
        <Pressable noTapScale
          data-clickable="true"
          className={styles.diagramViewerIconBtn}
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </Pressable>
      </div>

      {/* Stage — zoom/pan 적용되는 영역 */}
      <div
        ref={stageRef}
        className={styles.diagramViewerStage}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className={styles.diagramViewerCanvas}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          <FlowDiagram nodes={diagram.nodes} edges={diagram.edges} language={language} nodePositions={nodePositions} />
        </div>
      </div>

      {/* Controls — 우하단 zoom in/out/reset */}
      <div className={styles.diagramViewerControls}>
        <Pressable noTapScale
          data-clickable="true"
          className={styles.diagramViewerIconBtn}
          onClick={() => setZoom((z) => Math.min(8, z * 1.2))}
          aria-label="Zoom in"
        >
          <ZoomIn size={18} />
        </Pressable>
        <span className={styles.diagramViewerZoomLabel}>{Math.round(zoom * 100)}%</span>
        <Pressable noTapScale
          data-clickable="true"
          className={styles.diagramViewerIconBtn}
          onClick={() => setZoom((z) => Math.max(0.2, z / 1.2))}
          aria-label="Zoom out"
        >
          <ZoomOut size={18} />
        </Pressable>
        <Pressable noTapScale
          data-clickable="true"
          className={styles.diagramViewerIconBtn}
          onClick={reset}
          aria-label="Reset"
        >
          <RotateCcw size={16} />
        </Pressable>
      </div>
    </div>,
    document.body,
  );
}
