"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  useEditorId,
  useEventEditorValue,
  useMarkToolbarButton,
  useMarkToolbarButtonState,
} from "platejs/react";
import { useFloatingToolbar, useFloatingToolbarState, offset, flip } from "@platejs/floating";
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

/**
 * 선택 영역 위에 뜨는 floating 포맷팅 툴바 — 공식 @platejs/floating 패턴.
 * 표시/위치/외부클릭은 useFloatingToolbar 가 선택 상태로부터 계산.
 * hideToolbar: 링크/임베드 입력 툴바가 열려 있을 때 겹침 방지용.
 */
export default function FloatingToolbar({ hideToolbar }: { hideToolbar?: boolean }) {
  const { t } = useLanguage();
  const editorId = useEditorId();
  const focusedEditorId = useEventEditorValue("focus");
  const state = useFloatingToolbarState({
    editorId,
    focusedEditorId,
    hideToolbar,
    floatingOptions: {
      // fixed: overflow/positioned 조상에 clipping 안 되도록 viewport 기준 배치
      strategy: "fixed",
      placement: "top",
      middleware: [offset(12), flip({ padding: 12 })],
    },
  });
  const { clickOutsideRef, hidden, props, ref } = useFloatingToolbar(state);

  if (hidden) return null;

  const toolbar = (
    <div ref={clickOutsideRef}>
      <div ref={ref} className={styles.floatingToolbar} style={props.style}>
        <MarkButton nodeType="bold" tooltip={t("editor.bold")}>B</MarkButton>
        <MarkButton nodeType="italic" tooltip={t("editor.italic")} style={{ fontStyle: "italic" }}>I</MarkButton>
        <MarkButton nodeType="underline" tooltip={t("editor.underline")} style={{ textDecoration: "underline" }}>U</MarkButton>
        <MarkButton nodeType="strikethrough" tooltip={t("editor.strikethrough")} style={{ textDecoration: "line-through" }}>S</MarkButton>
        <MarkButton nodeType="code" tooltip={t("editor.inlineCode")}>{"<>"}</MarkButton>
      </div>
    </div>
  );

  // admin 레이아웃의 transform/overflow 조상을 벗어나도록 body 로 portal
  return typeof document !== "undefined" ? createPortal(toolbar, document.body) : null;
}
