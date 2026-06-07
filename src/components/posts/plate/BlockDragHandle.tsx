import React from "react";
import styles from "../RichTextEditor.module.css";

// 블록 drag&drop 은 공식 @platejs/dnd(DndKit)로 이관됨. 아래 두 export 는
// 기존 호출부(elements/Math/Table 의 BlockDropZone/useBlockDrag) 호환용 shim.

/**
 * 블록 요소에 롱프레스 드래그를 부여하는 훅.
 * 반환된 props를 드래그 대상 래퍼 div에 스프레드하면 됨.
 *
 * 롱프레스(400ms) 후 draggable 활성화 → 드래그 시작 → 드롭/취소 시 해제.
 * ghostRef를 전달하면 해당 요소만 고스트로 표시.
 */
/**
 * (구) 커스텀 네이티브 HTML5 블록 드래그 훅 — 공식 @platejs/dnd(DndKit) 로 대체되어 no-op.
 * 호출부 호환을 위해 시그니처만 유지하고 빈 props 를 반환한다.
 */
export function useBlockDrag(
  _path: number[] | null,
  _ghostRef?: React.RefObject<HTMLElement | null>,
) {
  void _path; void _ghostRef;
  return { blockDragProps: {} as React.HTMLAttributes<HTMLElement> & { draggable?: boolean }, isDragging: false };
}

/**
 * (구) 블록 드롭 존 래퍼 — 드래그/드롭은 공식 @platejs/dnd 가 담당하므로 여기선
 * 레이아웃 유지를 위한 passthrough wrapper 로만 동작(네이티브 drop 핸들러 제거).
 */
export function BlockDropZone({
  path: _path,
  children,
  className,
  style,
}: {
  path: number[] | null;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  void _path;
  const wrapCls = [styles.blockDragWrap, className].filter(Boolean).join(" ");
  return <div className={wrapCls} style={style}>{children}</div>;
}
