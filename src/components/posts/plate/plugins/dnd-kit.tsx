"use client";

import { NodeIdPlugin } from "platejs";
import { DndPlugin } from "@platejs/dnd";
import { DndProvider } from "react-dnd";
import { HTML5Backend, getEmptyImage } from "react-dnd-html5-backend";
import { BlockDraggable } from "../BlockDraggable";
import { BlockDragLayer } from "../BlockDragLayer";

/**
 * 블록 drag&drop — 공식 @platejs/dnd.
 * - NodeIdPlugin: 블록마다 런타임 id 부여(DnD 가 블록 추적에 필요). id 는 HTML 직렬화기가
 *   whitelist 방식이라 저장 HTML 에 포함되지 않음.
 * - DndPlugin: aboveSlate 로 DndProvider(HTML5Backend) 주입, aboveNodes 로 BlockDraggable 적용.
 * - enableScroller=false: 빌트인 스크롤러(edge 안쪽 좁은 밴드에서만 동작)를 끄고,
 *   BlockDragLayer 가 커서가 에디터 경계 밖이면 그 방향으로 연속 스크롤(에디터 컨테이너만).
 */

// 첫 드래그 실패 방지 — 네이티브 preview 를 disable(getEmptyImage)하면 첫 드래그 때
// 이미지가 아직 로드 안 돼 드래그가 시작 안 되는 react-dnd 고질 이슈. 모듈 로드 시 미리 생성.
if (typeof window !== "undefined") {
  try { getEmptyImage(); } catch { /* noop */ }
}

export const DndKit = [
  NodeIdPlugin,
  DndPlugin.configure({
    render: {
      aboveSlate: ({ children }: { children: React.ReactNode }) => (
        <DndProvider backend={HTML5Backend}>
          {children}
          <BlockDragLayer />
        </DndProvider>
      ),
      aboveNodes: BlockDraggable,
    },
    options: { enableScroller: false },
  }),
];
