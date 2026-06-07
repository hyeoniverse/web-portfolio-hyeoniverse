"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  useEditorId,
  useEditorRef,
  useEditorSelection,
  useEventEditorValue,
  useMarkToolbarButton,
  useMarkToolbarButtonState,
} from "platejs/react";
import { useVirtualFloating, offset, flip, shift } from "@platejs/floating";
import { toggleList } from "@platejs/list";
import { useLanguage } from "@/providers/LanguageProvider";
import TBtn from "../TBtn";
import styles from "../../RichTextEditor.module.css";

/** 마크 토글 버튼 — 공식 useMarkToolbarButton 패턴 (pressed/onClick/onMouseDown) 을 TBtn 에 연결 */
function MarkButton({ nodeType, tooltip, children, style }: {
  nodeType: string;
  tooltip?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const state = useMarkToolbarButtonState({ nodeType });
  const { props } = useMarkToolbarButton(state);
  return (
    <TBtn active={props.pressed} onClick={props.onClick} onMouseDown={props.onMouseDown} tooltip={tooltip} style={style}>
      {children}
    </TBtn>
  );
}

/** 블록 타입 전환(turn-into) 버튼 — toggleBlock */
function BlockButton({ type, tooltip, children }: { type: string; tooltip?: React.ReactNode; children: React.ReactNode }) {
  const editor = useEditorRef();
  return (
    <TBtn
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => { editor.tf.toggleBlock(type); setTimeout(() => editor.tf.focus(), 0); }}
      tooltip={tooltip}
    >
      {children}
    </TBtn>
  );
}

/** 리스트 전환 버튼 — toggleList */
function ListButton({ listStyleType, tooltip, children }: { listStyleType: string; tooltip?: React.ReactNode; children: React.ReactNode }) {
  const editor = useEditorRef();
  return (
    <TBtn
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => { toggleList(editor, { listStyleType }); setTimeout(() => editor.tf.focus(), 0); }}
      tooltip={tooltip}
    >
      {children}
    </TBtn>
  );
}

/** 현재 DOM 선택(또는 collapsed 커서)의 화면 사각형 — caret 위치 추적용 */
function getSelectionRect(): DOMRect {
  if (typeof window === "undefined") return new DOMRect();
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    const r = range.getBoundingClientRect();
    if (r && (r.width || r.height)) return r;
    // collapsed/빈 줄: range rects → anchor element 순으로 폴백
    const rects = range.getClientRects();
    if (rects.length) return rects[0] as DOMRect;
    const node = range.startContainer;
    const el = node.nodeType === 3 ? node.parentElement : (node as Element);
    if (el) return el.getBoundingClientRect();
  }
  return new DOMRect();
}

/**
 * 선택 영역/커서 위에 뜨는 floating 포맷팅 툴바 — @platejs/floating useVirtualFloating.
 * 공식 useFloatingToolbar 는 expanded 선택만 표시하므로, collapsed 커서(클릭만)에도
 * 뜨도록 virtual element 로 caret 위치를 직접 추적한다.
 * hideToolbar: 링크/임베드 입력 툴바가 열려 있을 때 겹침 방지용.
 */
export default function FloatingToolbar({ hideToolbar }: { hideToolbar?: boolean }) {
  const { t } = useLanguage();
  const editorId = useEditorId();
  const focusedEditorId = useEventEditorValue("focus");
  const selection = useEditorSelection();

  const focused = editorId === focusedEditorId;
  const open = focused && selection != null && !hideToolbar;

  const { refs, style, update } = useVirtualFloating({
    open,
    getBoundingClientRect: getSelectionRect,
    // fixed: overflow/positioned 조상에 clipping 안 되도록 viewport 기준 배치
    strategy: "fixed",
    placement: "top",
    middleware: [offset(12), flip({ padding: 12 }), shift({ padding: 12 })],
  });

  // 선택/커서 이동 시 caret rect 재계산 → 재배치
  React.useEffect(() => {
    if (open) update?.();
  }, [open, selection, update]);

  if (!open) return null;

  const toolbar = (
    <div>
      {/* refs 는 floating-ui 의 ref 객체(React ref 아님) — setFloating 은 callback ref */}
      {/* eslint-disable-next-line react-hooks/refs */}
      <div ref={refs.setFloating} className={styles.floatingToolbar} style={style}>
        {/* turn-into */}
        <BlockButton type="h1" tooltip={t("editor.heading1")}>H1</BlockButton>
        <BlockButton type="h2" tooltip={t("editor.heading2")}>H2</BlockButton>
        <BlockButton type="h3" tooltip={t("editor.heading3")}>H3</BlockButton>
        <BlockButton type="blockquote" tooltip={t("editor.blockquote")}>&ldquo;</BlockButton>
        <ListButton listStyleType="disc" tooltip={t("editor.bulletList")}>&bull;</ListButton>
        <ListButton listStyleType="decimal" tooltip={t("editor.numberedList")}>1.</ListButton>
        <span className={styles.divider} />
        {/* marks */}
        <MarkButton nodeType="bold" tooltip={t("editor.bold")}>B</MarkButton>
        <MarkButton nodeType="italic" tooltip={t("editor.italic")} style={{ fontStyle: "italic" }}>I</MarkButton>
        <MarkButton nodeType="underline" tooltip={t("editor.underline")} style={{ textDecoration: "underline" }}>U</MarkButton>
        <MarkButton nodeType="strikethrough" tooltip={t("editor.strikethrough")} style={{ textDecoration: "line-through" }}>S</MarkButton>
        <MarkButton nodeType="code" tooltip={t("editor.inlineCode")}>{"<>"}</MarkButton>
        <MarkButton nodeType="highlight" tooltip={t("editor.highlight")} style={{ background: "var(--color-warning-soft)", borderRadius: 3 }}>H</MarkButton>
      </div>
    </div>
  );

  // admin 레이아웃의 transform/overflow 조상을 벗어나도록 body 로 portal
  return typeof document !== "undefined" ? createPortal(toolbar, document.body) : null;
}
