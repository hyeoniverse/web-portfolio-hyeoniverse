"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FrameComponent } from "./FrameComponent";

export interface Frame {
  id: number;
  video?: string;
  image?: string;
  defaultPos: { x: number; y: number; w: number; h: number };
  mediaSize: number;
  borderThickness: number;
  borderSize: number;
  autoplayMode: "all" | "hover";
  isHovered: boolean;
}

export interface DynamicFrameLayoutProps {
  initialFrames?: Frame[];
  gridSize?: number;
  cellSize?: number;
  initialHoverSize?: number;
  initialGapSize?: number;
  initialShowControls?: boolean;
  initialCleanInterface?: boolean;
  initialShowFrames?: boolean;
  initialAutoplayMode?: "all" | "hover";
  onFramesChange?: (frames: Frame[]) => void;
  onUpdateCodebase?: (config: {
    hoverSize: number;
    gapSize: number;
    frames: Frame[];
  }) => void;
  showTitle?: boolean;
  title?: string;
  renderOverlay?: (frame: Frame, index: number, isHovered: boolean) => React.ReactNode;
  renderCell?: (params: {
    frame: Frame;
    index: number;
    isHovered: boolean;
  }) => React.ReactNode;
}

export const defaultFrames: Frame[] = [
  {
    id: 1,
    video:
      "https://static.cdn-luma.com/files/981e483f71aa764b/Company%20Thing%20Exported.mp4",
    defaultPos: { x: 0, y: 0, w: 4, h: 4 },
    mediaSize: 1,
    borderThickness: 0,
    borderSize: 80,
    autoplayMode: "all",
    isHovered: false,
  },
  {
    id: 2,
    video:
      "https://static.cdn-luma.com/files/58ab7363888153e3/WebGL%20Exported%20(1).mp4",
    defaultPos: { x: 4, y: 0, w: 4, h: 4 },
    mediaSize: 1,
    borderThickness: 0,
    borderSize: 80,
    autoplayMode: "all",
    isHovered: false,
  },
  {
    id: 3,
    video:
      "https://static.cdn-luma.com/files/58ab7363888153e3/Jitter%20Exported%20Poster.mp4",
    defaultPos: { x: 8, y: 0, w: 4, h: 4 },
    mediaSize: 1,
    borderThickness: 0,
    borderSize: 80,
    autoplayMode: "all",
    isHovered: false,
  },
  {
    id: 4,
    video:
      "https://static.cdn-luma.com/files/58ab7363888153e3/Exported%20Web%20Video.mp4",
    defaultPos: { x: 0, y: 4, w: 4, h: 4 },
    mediaSize: 1,
    borderThickness: 0,
    borderSize: 80,
    autoplayMode: "all",
    isHovered: false,
  },
  {
    id: 5,
    video:
      "https://static.cdn-luma.com/files/58ab7363888153e3/Logo%20Exported.mp4",
    defaultPos: { x: 4, y: 4, w: 4, h: 4 },
    mediaSize: 1,
    borderThickness: 0,
    borderSize: 80,
    autoplayMode: "all",
    isHovered: false,
  },
  {
    id: 6,
    video:
      "https://static.cdn-luma.com/files/58ab7363888153e3/Animation%20Exported%20(4).mp4",
    defaultPos: { x: 8, y: 4, w: 4, h: 4 },
    mediaSize: 1,
    borderThickness: 0,
    borderSize: 80,
    autoplayMode: "all",
    isHovered: false,
  },
  {
    id: 7,
    video:
      "https://static.cdn-luma.com/files/58ab7363888153e3/Illustration%20Exported%20(1).mp4",
    defaultPos: { x: 0, y: 8, w: 4, h: 4 },
    mediaSize: 1,
    borderThickness: 0,
    borderSize: 80,
    autoplayMode: "all",
    isHovered: false,
  },
  {
    id: 8,
    video:
      "https://static.cdn-luma.com/files/58ab7363888153e3/Art%20Direction%20Exported.mp4",
    defaultPos: { x: 4, y: 8, w: 4, h: 4 },
    mediaSize: 1,
    borderThickness: 0,
    borderSize: 80,
    autoplayMode: "all",
    isHovered: false,
  },
  {
    id: 9,
    video:
      "https://static.cdn-luma.com/files/58ab7363888153e3/Product%20Video.mp4",
    defaultPos: { x: 8, y: 8, w: 4, h: 4 },
    mediaSize: 1,
    borderThickness: 0,
    borderSize: 80,
    autoplayMode: "all",
    isHovered: false,
  },
];

export default function DynamicFrameLayout({
  initialFrames = defaultFrames,
  gridSize = 12,
  initialHoverSize = 6,
  initialGapSize = 4,
  initialShowFrames = false,
  initialAutoplayMode = "all",
  renderOverlay,
  renderCell,
}: DynamicFrameLayoutProps = {}) {
  const [frames] = useState<Frame[]>(initialFrames);
  const [hovered, setHovered] = useState<{ row: number; col: number } | null>(
    null
  );
  const [hoverSize] = useState(initialHoverSize);
  const [gapSize] = useState(initialGapSize);
  const [showFrames] = useState(initialShowFrames);
  const [autoplayMode] = useState<"all" | "hover">(initialAutoplayMode);

  const getRowSizes = () => {
    if (hovered === null) {
      return "4fr 4fr 4fr";
    }
    const { row } = hovered;
    const nonHoveredSize = (gridSize - hoverSize) / 2;
    return [0, 1, 2]
      .map((r) => (r === row ? `${hoverSize}fr` : `${nonHoveredSize}fr`))
      .join(" ");
  };

  const getColSizes = () => {
    if (hovered === null) {
      return "4fr 4fr 4fr";
    }
    const { col } = hovered;
    const nonHoveredSize = (gridSize - hoverSize) / 2;
    return [0, 1, 2]
      .map((c) => (c === col ? `${hoverSize}fr` : `${nonHoveredSize}fr`))
      .join(" ");
  };

  const getTransformOrigin = (x: number, y: number) => {
    const vertical = y === 0 ? "top" : y === 4 ? "center" : "bottom";
    const horizontal = x === 0 ? "left" : x === 4 ? "center" : "right";
    return `${vertical} ${horizontal}`;
  };

  return (
    <div className="space-y-4 w-full h-full">
      <div
        className="relative w-full h-full"
        style={{
          display: "grid",
          gridTemplateRows: getRowSizes(),
          gridTemplateColumns: getColSizes(),
          gap: `${gapSize}px`,
          transition:
            "grid-template-rows 0.4s ease, grid-template-columns 0.4s ease",
        }}
      >
        {frames.map((frame) => {
          const row = Math.floor(frame.defaultPos.y / 4);
          const col = Math.floor(frame.defaultPos.x / 4);
          const transformOrigin = getTransformOrigin(
            frame.defaultPos.x,
            frame.defaultPos.y
          );

          const frameIndex = frames.indexOf(frame);
          const isHoveredCell =
            hovered?.row === row && hovered?.col === col;

          // w/h 가 4 보다 크면 grid span 으로 여러 cell 차지 (bento 지원)
          const colSpan = Math.max(1, Math.round(frame.defaultPos.w / 4));
          const rowSpan = Math.max(1, Math.round(frame.defaultPos.h / 4));
          return (
            <motion.div
              key={frame.id}
              style={{
                position: "relative",
                overflow: "hidden",
                transformOrigin,
                transition: "transform 0.4s ease",
                gridColumn: colSpan > 1 ? `span ${colSpan}` : undefined,
                gridRow: rowSpan > 1 ? `span ${rowSpan}` : undefined,
              }}
              onMouseEnter={() => setHovered({ row, col })}
              onMouseLeave={() => setHovered(null)}
            >
              {renderCell ? (
                renderCell({
                  frame,
                  index: frameIndex,
                  isHovered: !!isHoveredCell,
                })
              ) : (
                <>
                  <FrameComponent
                    video={frame.video}
                    image={frame.image}
                    width="100%"
                    height="100%"
                    className="absolute inset-0"
                    mediaSize={frame.mediaSize}
                    borderThickness={frame.borderThickness}
                    borderSize={frame.borderSize}
                    showFrame={showFrames}
                    autoplayMode={autoplayMode}
                    isHovered={!!isHoveredCell}
                  />
                  {renderOverlay && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        zIndex: 2,
                      }}
                    >
                      {renderOverlay(frame, frameIndex, !!isHoveredCell)}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
