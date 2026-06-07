"use client";

import { NodeIdPlugin } from "platejs";
import { DndPlugin } from "@platejs/dnd";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { BlockDraggable } from "../BlockDraggable";

/**
 * 블록 drag&drop — 공식 @platejs/dnd.
 * - NodeIdPlugin: 블록마다 런타임 id 부여(DnD 가 블록 추적에 필요). id 는 HTML 직렬화기가
 *   whitelist 방식이라 저장 HTML 에 포함되지 않음.
 * - DndPlugin: aboveSlate 로 DndProvider(HTML5Backend) 주입, aboveNodes 로 BlockDraggable 적용.
 */
export const DndKit = [
  NodeIdPlugin,
  DndPlugin.configure({
    render: {
      aboveSlate: ({ children }: { children: React.ReactNode }) => (
        <DndProvider backend={HTML5Backend}>{children}</DndProvider>
      ),
      aboveNodes: BlockDraggable,
    },
    options: { enableScroller: true },
  }),
];
