"use client";

import * as React from "react";
import {
  useEditorId,
  useEditorRef,
  useEditorSelection,
  useEventEditorValue,
  useMarkToolbarButton,
  useMarkToolbarButtonState,
} from "platejs/react";
import { toggleList } from "@platejs/list";
import { toggleCodeBlock } from "@platejs/code-block";
import { insertInlineEquation } from "@platejs/math";
import { useLanguage } from "@/providers/LanguageProvider";
import { useIsMobile } from "@/hooks/useIsMobile";
import Popover, { MenuItem } from "@/components/ui/Popover";
import Select from "@/components/ui/Select";
import ColorPicker from "@/components/ui/ColorPicker";
import { readBlockInfo } from "../hooks";
import TBtn from "../TBtn";
import FloatingBar from "./FloatingBar";
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

// turn-into(블록 전환) 옵션 — 라벨은 i18n editor.* 키
const TURN_INTO = [
  { value: "p", key: "paragraph", icon: "¶" },
  { value: "h1", key: "heading1", icon: "H1" },
  { value: "h2", key: "heading2", icon: "H2" },
  { value: "h3", key: "heading3", icon: "H3" },
  { value: "bulleted", key: "bulletList", icon: "•" },
  { value: "numbered", key: "numberedList", icon: "1." },
  { value: "blockquote", key: "blockquote", icon: "❝" },
  { value: "code_block", key: "codeBlock", icon: "</>" },
] as const;

/** Turn into — 현재 블록 타입 표시 + hover 로 열리는 전환 메뉴 (Popover openOnHover, 다른 floating bar 메뉴와 일관) */
function TurnIntoMenu() {
  const { t } = useLanguage();
  const editor = useEditorRef();
  const { block, blockType } = readBlockInfo(editor);
  const listStyle = (block?.[0] as { listStyleType?: string } | undefined)?.listStyleType;
  const current = listStyle === "disc" ? "bulleted" : listStyle === "decimal" ? "numbered" : blockType;

  const apply = (value: string) => {
    switch (value) {
      case "bulleted": toggleList(editor, { listStyleType: "disc" }); break;
      case "numbered": toggleList(editor, { listStyleType: "decimal" }); break;
      case "code_block": toggleCodeBlock(editor); break;
      case "p":
        if (listStyle) toggleList(editor, { listStyleType: listStyle });
        else if (blockType === "blockquote") editor.tf.toggleBlock("blockquote");
        else if (blockType === "code_block") toggleCodeBlock(editor);
        else editor.tf.setNodes({ type: "p" });
        break;
      default: editor.tf.toggleBlock(value); // h1/h2/h3/blockquote
    }
    setTimeout(() => editor.tf.focus(), 0);
  };

  return (
    <Select
      value={TURN_INTO.some((o) => o.value === current) ? current : "p"}
      options={TURN_INTO.map((o) => ({
        value: o.value,
        label: t(`editor.${o.key}`),
        icon: <span className={styles.menuIcon}>{o.icon}</span>,
      }))}
      onChange={apply}
      size="sm"
      width="max"
      preserveFocus
      dropAlign="below"
    />
  );
}

/** 글자색 — Palette 대신 A 버튼으로 ColorPicker 팝오버 열어 선택 텍스트에 color 마크 적용.
   댓글 툴바처럼 선택 툴바에도 색상 도구 제공. mousedown preventDefault 로 에디터 선택 유지. */
function ColorButton() {
  const { t } = useLanguage();
  const editor = useEditorRef();
  const apply = (color: string) => editor.tf.addMarks({ color });
  return (
    <ColorPicker
      value="#000000"
      onChange={(c) => apply(c.oklch)}
      onChangeComplete={(c) => { apply(c.oklch); setTimeout(() => editor.tf.focus(), 0); }}
    >
      {({ toggle }) => (
        <TBtn tooltip={t("editor.textColor")} onMouseDown={(e) => e.preventDefault()} onClick={toggle}>
          <span style={{ fontWeight: 700 }}>A</span>
        </TBtn>
      )}
    </ColorPicker>
  );
}

/** ⋯ 오버플로 — 자주 안 쓰는 마크 (kbd / 위·아래첨자 / 형광) */
function OverflowMenu() {
  const { t } = useLanguage();
  const editor = useEditorRef();
  const toggle = (mark: string, close: () => void) => {
    editor.tf.toggleMark(mark);
    close();
    setTimeout(() => editor.tf.focus(), 0);
  };
  return (
    <Popover
      openOnHover
      placement="bottom-end"
      contentClassName={styles.floatingMenu}
      trigger={<TBtn square tooltip={t("editor.more")}>⋯</TBtn>}
    >
      {({ close }) => (
        <div onMouseDown={(e) => e.preventDefault()}>
          <MenuItem icon={<span className={styles.menuIcon} style={{ background: "var(--color-warning-soft)", borderRadius: 3 }}>H</span>} label={t("editor.highlight")} onClick={() => toggle("highlight", close)} />
          <MenuItem icon={<span className={styles.menuIcon}>x²</span>} label={t("editor.superscript")} onClick={() => toggle("superscript", close)} />
          <MenuItem icon={<span className={styles.menuIcon}>x₂</span>} label={t("editor.subscript")} onClick={() => toggle("subscript", close)} />
          <MenuItem icon={<span className={styles.menuIcon}>⌘</span>} label="Kbd" onClick={() => toggle("kbd", close)} />
        </div>
      )}
    </Popover>
  );
}

/** 현재 DOM 선택(또는 collapsed 커서)의 화면 사각형 — caret 위치 추적용 */
export function getSelectionRect(): DOMRect {
  if (typeof window === "undefined") return new DOMRect();
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    const r = range.getBoundingClientRect();
    if (r && (r.width || r.height)) return r;
    const rects = range.getClientRects();
    if (rects.length) return rects[0] as DOMRect;
    const node = range.startContainer;
    const el = node.nodeType === 3 ? node.parentElement : (node as Element);
    if (el) return el.getBoundingClientRect();
  }
  return new DOMRect();
}

/**
 * 선택 영역/커서 위에 뜨는 floating 포맷팅 툴바.
 * 구성: [Turn into ▾] | 굵게·기울임·밑줄·취소선·코드·수식 | [⋯ kbd/첨자/형광]
 * collapsed 커서(클릭)에도 뜨도록 useVirtualFloating 으로 caret 위치를 추적한다.
 */
export default function FloatingToolbar({ hideToolbar }: { hideToolbar?: boolean }) {
  const { t } = useLanguage();
  const { isTouch } = useIsMobile();
  const editor = useEditorRef();
  const editorId = useEditorId();
  const focusedEditorId = useEventEditorValue("focus");
  const selection = useEditorSelection();

  const focused = editorId === focusedEditorId;
  // 구분선(hr) 등 void 블록 선택 시엔 서식 툴바가 의미 없으므로 숨김
  const voidSelected = React.useMemo(() => {
    if (!selection) return false;
    try {
      const entry = editor.api.block();
      return entry ? editor.api.isVoid(entry[0]) : false;
    } catch {
      return false;
    }
  }, [editor, selection]);
  // 텍스트를 실제로 선택(드래그)했을 때만 — collapsed 커서(클릭)엔 숨김
  const collapsed = React.useMemo(() => {
    // selection 이 없으면 접힌 것으로 본다. 아래 open 계산에서 어차피 걸러지고,
    // 이렇게 해야 selection 이 deps 에 있는 이유가 본문에도 드러난다.
    if (!selection) return true;
    try { return editor.api.isCollapsed(); } catch { return true; }
  }, [editor, selection]);
  // 터치: 네이티브 선택 핸들/콜아웃과 충돌 → 플로팅 서식 툴바 숨김(메인 툴바가 서식 담당).
  const open = focused && selection != null && !collapsed && !hideToolbar && !voidSelected && !isTouch;

  return (
    <FloatingBar open={open} getAnchorRect={getSelectionRect} inline>
      <TurnIntoMenu />
      <MarkButton nodeType="bold" tooltip={t("editor.bold")}>B</MarkButton>
      <MarkButton nodeType="italic" tooltip={t("editor.italic")} style={{ fontStyle: "italic" }}>I</MarkButton>
      <MarkButton nodeType="underline" tooltip={t("editor.underline")} style={{ textDecoration: "underline" }}>U</MarkButton>
      <MarkButton nodeType="strikethrough" tooltip={t("editor.strikethrough")} style={{ textDecoration: "line-through" }}>S</MarkButton>
      <MarkButton nodeType="code" tooltip={t("editor.inlineCode")}>{"<>"}</MarkButton>
      <ColorButton />
      <TBtn
        tooltip={t("editor.inlineEquation")}
        onClick={() => { insertInlineEquation(editor); setTimeout(() => editor.tf.focus(), 0); }}
      >
        <span style={{ fontStyle: "italic" }}>fx</span>
      </TBtn>
      <OverflowMenu />
    </FloatingBar>
  );
}
