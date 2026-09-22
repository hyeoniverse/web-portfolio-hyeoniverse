"use client";

import * as React from "react";
import {
  useEditorId,
  useEditorRef,
  useEditorSelection,
  useEditorSelector,
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
import { ChevronDown } from "@/components/icons";
import { readBlockInfo } from "../hooks";
import { ColorMenu } from "../ColorMenu";
import { useRecentColors } from "../useRecentColors";
import { VIVID_COLORS, PASTEL_COLORS } from "../constants";
import { CHECKER_BG } from "../presets";
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
  { value: "h4", key: "heading4", icon: "H4" },
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

const TEXT_PRESETS = VIVID_COLORS.map((hex) => ({ hex }));
const BG_PRESETS = PASTEL_COLORS.map((hex) => ({ hex }));
const RECENT_SLOTS = 8;

const COLOR_KIND = {
  text: { mark: "color", recentKey: "text-mark", apply: "editor.applyLastTextColor", menu: "editor.textColorMenu", name: "editor.textColor", presets: TEXT_PRESETS },
  bg: { mark: "backgroundColor", recentKey: "bg-mark", apply: "editor.applyLastBgColor", menu: "editor.bgColorMenu", name: "editor.bgColor", presets: BG_PRESETS },
} as const;

/** 글자색·배경색 분할 버튼(#1117) — 왼쪽은 마지막에 쓴 색을 바로 적용하고, ▾ 는 색 메뉴(프리셋·최근 색·색 고르기·기본)를 연다.
   쓴 색이 아직 없으면 왼쪽을 눌러도 메뉴를 연다. 마지막 색은 상단 툴바와 같은 최근 색 목록(useRecentColors)의 맨 앞이다.
   메뉴 안 mousedown 은 막아 에디터 선택을 지킨다 — 선택이 풀리면 이 툴바부터 닫힌다. */
function ColorSplitButton({ kind }: { kind: keyof typeof COLOR_KIND }) {
  const { t } = useLanguage();
  const editor = useEditorRef();
  const cfg = COLOR_KIND[kind];
  /* 선택한 글자의 현재 색 — 색을 바꿔도 선택은 그대로라, selection 이 아니라 값에 반응해야 체크 표시가 따라온다 */
  const current = useEditorSelector((ed) => {
    const m = ed.api.marks() as Record<string, unknown> | null;
    const v = m?.[cfg.mark];
    return typeof v === "string" ? v : "";
  }, [cfg.mark]);
  const recent = useRecentColors(cfg.recentKey);
  const last = recent.colors[0];
  const [menuOpen, setMenuOpen] = React.useState(false);

  const setMark = (v: string | undefined) => {
    if (v === undefined) editor.tf.removeMarks([cfg.mark]);
    else editor.tf.addMarks({ [cfg.mark]: v });
  };
  const applyLast = () => {
    if (!last) { setMenuOpen(true); return; }
    setMark(last);
  };
  /* onPick 은 피커를 끄는 동안에도 불린다 — 최근 색은 프리셋·최근 색을 누른 경우와 피커를 뗀 경우(onCommit)만 남긴다 */
  const known = (v: string) => cfg.presets.some((p) => p.hex === v) || recent.colors.includes(v);
  const bar = (color: string | undefined, fallback: string) => (
    <span style={{ width: 12, height: 3, borderRadius: "var(--radius-capsule)", background: color || fallback, boxShadow: "inset 0 0 0 0.5px var(--text-muted)" }} />
  );

  return (
    <span className={styles.colorSplit}>
      <TBtn tooltip={last ? t(cfg.apply) : t(cfg.menu)} aria-label={last ? t(cfg.apply) : t(cfg.menu)} onClick={applyLast}>
        <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
          <span style={{ fontWeight: 700, fontSize: 11 }}>{kind === "text" ? "A" : "BG"}</span>
          {bar(last, kind === "text" ? "var(--text-primary)" : CHECKER_BG)}
        </span>
      </TBtn>
      <Popover
        open={menuOpen}
        onOpenChange={setMenuOpen}
        placement="bottom-start"
        offset={8}
        trigger={<TBtn className={styles.colorSplitCaret} tooltip={t(cfg.menu)} aria-label={t(cfg.menu)}><ChevronDown size={12} /></TBtn>}
      >
        {() => (
          <div className={`${styles.colorMenu} ${styles.colorMarksMenu}`} onMouseDown={(e) => e.preventDefault()}>
            <ColorMenu
              label={t(cfg.name)}
              value={current || undefined}
              onPick={(v) => { setMark(v); if (v && known(v)) recent.addColor(v); }}
              onCommit={(v) => { setMark(v); recent.addColor(v); }}
              presets={[...cfg.presets]}
              defaultColor={kind === "text" ? "var(--text-primary)" : CHECKER_BG}
              defaultLabel={kind === "text" ? undefined : t("editor.removeBgColor")}
              recent={recent.colors}
              recentSlots={RECENT_SLOTS}
              pickerFallback={kind === "text" ? "#000000" : "#ffffff"}
            />
          </div>
        )}
      </Popover>
    </span>
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
          <MenuItem icon={<span className={styles.menuIcon} style={{ background: "var(--bg-accent-strong)", borderRadius: 3 }}>H</span>} label={t("editor.highlight")} onClick={() => toggle("highlight", close)} />
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
 * 구성: [Turn into ▾] | 굵게·기울임·밑줄·취소선·코드 | [글자색 | ▾] [배경색 | ▾] | 수식 | [⋯ kbd/첨자/형광]
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
      <ColorSplitButton kind="text" />
      <ColorSplitButton kind="bg" />
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
