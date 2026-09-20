"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useEditorRef, useEditorSelection } from "platejs/react";
import { useVirtualFloating, offset, flip, shift, arrow } from "@platejs/floating";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";
import { getSelectionRect } from "./FloatingToolbar";
import tooltip from "@/components/ui/Tooltip.module.css";
import styles from "../../RichTextEditor.module.css";

/**
 * 고른 글자 수를 선택 바로 아래에 띄우는 작은 표시.
 *
 * 서식 툴바(FloatingToolbar)가 선택 위쪽에 뜨므로 이쪽은 아래쪽, 그중에서도 고른 끝에 붙는다.
 * 아래 자리가 없으면 flip 이 위로 넘기는데, 그때도 서식 툴바와 겹치지 않게 offset 을 넉넉히 준다.
 * 읽기만 하는 표시라 pointer-events 를 끊어 글자 선택/클릭을 가로채지 않는다.
 * 말풍선 생김새는 공통 Tooltip 의 유리판 변형(bubbleGlass)을 그대로 쓴다.
 */
/* 꼬리가 말풍선 끝으로 몰릴 때 캡슐의 둥근 모서리 위에 얹히면 어긋나 보인다 —
   모서리 반지름(높이 24의 절반)에 꼬리 반쪽을 더한 만큼은 끝에서 떨어뜨린다. */
const ARROW_PADDING = 16;

export default function SelectionCountTip({ countSpaces, hidden }: { countSpaces: boolean; hidden?: boolean }) {
  const { t } = useLanguage();
  const editor = useEditorRef();
  const selection = useEditorSelection();

  /* 선택이 바뀔 때마다(끌어서 넓히는 중에도) 다시 센다 — selection 은 변경마다 새 객체다 */
  const count = React.useMemo(() => {
    if (!selection) return 0;
    try {
      if (editor.api.isCollapsed()) return 0;
      const text = editor.api.string(selection);
      return countSpaces ? text.length : text.replace(/\s/g, "").length;
    } catch {
      return 0;
    }
  }, [editor, selection, countSpaces]);

  const open = !hidden && count > 0;
  /* 꼬리 요소는 ref 가 아니라 state 로 들고 있는다 — 그려지는 중에 ref 를 읽지 않게 */
  const [arrowEl, setArrowEl] = React.useState<HTMLSpanElement | null>(null);
  const { refs, style, update, middlewareData, placement } = useVirtualFloating({
    open,
    getBoundingClientRect: getSelectionRect,
    strategy: "fixed",
    /* bottom-end — 고른 끝(손을 뗀 자리) 아래에 붙어 다음 줄을 덜 가린다 */
    placement: "bottom-end",
    middleware: [offset(10), flip({ padding: 8 }), shift({ padding: 8 }), arrow({ element: arrowEl, padding: ARROW_PADDING })],
  });

  /* 선택을 끌며 넓히면 rect 가 계속 바뀐다 — 매 프레임 앵커를 확인해 바뀐 프레임에만 다시 계산 */
  React.useEffect(() => {
    if (!open) return;
    let raf = 0;
    let last = "";
    const loop = () => {
      const r = getSelectionRect();
      const key = `${Math.round(r.top)}|${Math.round(r.left)}|${Math.round(r.width)}|${Math.round(r.height)}`;
      if (key !== last) { last = key; update?.(); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [open, update]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      // eslint-disable-next-line react-hooks/refs -- floating-ui 가 주는 setter (FloatingBar 와 같은 처리)
      ref={refs.setFloating}
      /* 생김새는 공통 Tooltip 의 말풍선 그대로 — 같은 정보를 주는 표시라 모양이 달라 보이면 안 된다 */
      className={`${tooltip.bubble} ${tooltip.bubbleGlass} ${styles.selectionCountTip}`}
      style={{ ...style, zIndex: "var(--z-dropdown)" }}
    >
      {fillTemplate(t("editor.selectedChars"), { n: count.toLocaleString() })}
      {/* 꼬리는 말풍선이 붙은 반대쪽에 — 아래에 떴으면 위를 가리킨다 */}
      <span
        ref={setArrowEl}
        className={`${tooltip.arrow} ${tooltip.arrowGlass} ${String(placement).startsWith("top") ? tooltip.arrowBottom : tooltip.arrowTop}`}
        style={{ left: middlewareData.arrow?.x, marginLeft: 0 }}
      />
    </div>,
    document.body,
  );
}
