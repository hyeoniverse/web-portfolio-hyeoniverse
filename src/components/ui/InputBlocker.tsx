"use client";

import { usePopoverRef } from "@/hooks/useTopLayer";

/** 불러오는 동안 화면 전체의 입력을 막는 투명한 막 — top layer(3.10-1)라 무엇보다 위에서 받는다 */
export default function InputBlocker() {
  const ref = usePopoverRef<HTMLDivElement>();
  return (
    <div
      ref={ref}
      popover="manual"
      style={{ position: "fixed", inset: 0, background: "transparent", cursor: "wait" }}
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onKeyDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
    />
  );
}
