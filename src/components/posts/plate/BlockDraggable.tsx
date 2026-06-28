"use client";

import * as React from "react";
import { useDraggable, useDropLine } from "@platejs/dnd";
import type { TElement } from "platejs";
import type { RenderNodeWrapperProps, RenderNodeWrapperFunction } from "platejs/react";
import { useEditorRef } from "platejs/react";
import { toggleList } from "@platejs/list";
import { toggleCodeBlock } from "@platejs/code-block";
import {
  GripVertical, Plus, Copy, Trash2, Link2, Palette,
  Pilcrow, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Code,
} from "lucide-react";
import Popover, { MenuItem, MenuDivider } from "@/components/ui/Popover";
import { useLanguage } from "@/providers/LanguageProvider";
import { showToast } from "@/stores/toastStore";
import { _slashOpenTrigger } from "./utils";
import styles from "../RichTextEditor.module.css";

/* eslint-disable @typescript-eslint/no-explicit-any */

// 전환 가능한 블록 타입 (내용 유지)
const TURN_INTO: { value: string; labelKey: string; icon: React.ReactNode }[] = [
  { value: "p", labelKey: "paragraph", icon: <Pilcrow size={15} /> },
  { value: "h1", labelKey: "heading1", icon: <Heading1 size={15} /> },
  { value: "h2", labelKey: "heading2", icon: <Heading2 size={15} /> },
  { value: "h3", labelKey: "heading3", icon: <Heading3 size={15} /> },
  { value: "bulleted", labelKey: "bulletList", icon: <List size={15} /> },
  { value: "numbered", labelKey: "numberedList", icon: <ListOrdered size={15} /> },
  { value: "blockquote", labelKey: "blockquote", icon: <Quote size={15} /> },
  { value: "code_block", labelKey: "codeBlock", icon: <Code size={15} /> },
];

// 블록 텍스트 색상 스와치 (default = 색 제거)
const BLOCK_COLORS: { key: string; value: string | null }[] = [
  { key: "default", value: null },
  { key: "red", value: "var(--color-red-500, #ef4444)" },
  { key: "orange", value: "var(--color-orange-500, #f97316)" },
  { key: "green", value: "var(--color-green-500, #22c55e)" },
  { key: "blue", value: "var(--color-blue-500, #3b82f6)" },
  { key: "purple", value: "var(--color-purple-500, #a855f7)" },
];

// 공식 @platejs/dnd 기반 블록 드래그 래퍼 (aboveNodes 로 각 블록에 적용).
// 최상위 블록만 핸들 부여 — 표/컬럼/코드라인 내부 등은 제외.
// column_group(n단 블록 전체)은 드래그 허용 — 개별 column 은 레이아웃이라 제외
const NON_DRAGGABLE = new Set(["tr", "td", "th", "column", "code_line", "column-item"]);

export const BlockDraggable = (props: RenderNodeWrapperProps): RenderNodeWrapperFunction => {
  const { editor, element } = props;
  let path: number[] | null = null;
  try {
    const p = editor.api.findPath(element);
    path = p ? Array.from(p) : null;
  } catch {
    /* path 일시 무효 */
  }
  const type = (element as { type?: string }).type ?? "";
  // 최상위 블록 + 탭 패널 직계 자식(중첩 컨테이너 안에서도 블록 이동 가능)
  let enabled = !!path && path.length === 1 && !NON_DRAGGABLE.has(type);
  if (!enabled && path && path.length === 3 && !NON_DRAGGABLE.has(type)) {
    try {
      const parent = editor.api.node(path.slice(0, -1))?.[0] as { type?: string } | undefined;
      if (parent?.type === "tab_panel" || parent?.type === "column") enabled = true;
    } catch { /* path 일시 무효 */ }
  }
  if (!enabled) return undefined;

  return function DraggableWrapper(elementProps) {
    return <DraggableBlock element={element}>{elementProps.children}</DraggableBlock>;
  };
};

const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");

function DraggableBlock({ element, children }: { element: TElement; children: React.ReactNode }) {
  const { t } = useLanguage();
  const editor = useEditorRef();
  // 들여쓴 블록 위에 드롭하면 옮긴 블록도 그 들여쓰기(indent)를 물려받게 — "들여쓰기 블록 안에" 넣는 느낌.
  // 기본 이동(onDropNode)은 그대로 두고(return false), 이동 후 indent 만 맞춘다.
  const onDropHandler = React.useCallback((ed: any, { id, dragItem }: any) => {
    try {
      const targetEntry = ed.api.node({ id, at: [] });
      const targetIndent = targetEntry ? ((targetEntry[0]?.indent as number) ?? 0) : 0;
      if (targetIndent > 0) {
        const draggedId = Array.isArray(dragItem.id) ? dragItem.id[0] : dragItem.id;
        setTimeout(() => {
          try {
            const de = ed.api.node({ id: draggedId, at: [] });
            if (!de) return;
            const [dn, dp] = de;
            if (dn.listStyleType) return; // 리스트는 제외
            if (((dn.indent as number) ?? 0) !== targetIndent) ed.tf.setNodes({ indent: targetIndent }, { at: dp });
          } catch { /* noop */ }
        }, 0);
      }
    } catch { /* noop */ }
    return false;
  }, []);
  // preview.disable → 네이티브 HTML5 drag image 끄고 커스텀 BlockDragLayer 로 대체
  const { isDragging, nodeRef, handleRef } = useDraggable({ element, onDropHandler, preview: { disable: true } });
  // 공식 BlockDraggable 과 동일하게 인자 없이 호출 — 현재 drop target 위치(top/bottom)를 컨텍스트로 받음.
  const { dropLine } = useDropLine();

  // 노션식 + 버튼 — 클릭: 아래 / ⌥(Alt)+클릭: 위. 내용 없으면 그 자리에서(전환).
  // focus + 슬래시 메뉴 오픈("/" 텍스트는 넣지 않음).
  const addBlock = React.useCallback((above: boolean) => {
    try {
      const path = editor.api.findPath(element);
      if (!path) return;
      const empty = ((editor.api.string(path) as string) ?? "") === "";
      const insertNew = !(empty && !above); // 빈 블록 + 아래 = 새 블록 없이 현재 블록 전환
      let target = path as number[];
      if (insertNew) {
        const parent = path.slice(0, -1);
        const idx = path[path.length - 1];
        target = above ? [...parent, idx] : [...parent, idx + 1];
        editor.tf.insertNodes({ type: "p", children: [{ text: "" }] }, { at: target });
      }
      const start = editor.api.start(target);
      if (start) editor.tf.select(start);
      editor.tf.focus();
      // 새로 만든 빈 블록은, 명령 선택 없이 메뉴를 닫으면(blur/Esc) 다시 제거
      let onCancel: (() => void) | undefined;
      if (insertNew && start) {
        const ref = editor.api.pointRef(start);
        onCancel = () => {
          const pt = ref.unref();
          if (!pt) return;
          try {
            const entry = editor.api.block({ at: pt });
            if (entry && ((editor.api.string(entry[1]) as string) ?? "") === "") {
              editor.tf.removeNodes({ at: entry[1] });
            }
          } catch { /* ignore */ }
        };
      }
      setTimeout(() => _slashOpenTrigger.current?.(onCancel), 0);
    } catch { /* ignore */ }
  }, [editor, element]);

  // 핸들 popover 도구 — 현재 블록 path 기준으로 동작
  const path = () => { try { return editor.api.findPath(element); } catch { return null; } };
  const selectBlockStart = (p: number[]) => { const s = editor.api.start(p); if (s) editor.tf.select(s); };

  const turnInto = (value: string, close: () => void) => {
    const p = path(); if (!p) return;
    selectBlockStart(p);
    const cur = (element as any).listStyleType as string | undefined;
    switch (value) {
      case "bulleted": toggleList(editor, { listStyleType: "disc" }); break;
      case "numbered": toggleList(editor, { listStyleType: "decimal" }); break;
      case "code_block": toggleCodeBlock(editor); break;
      case "p":
        if (cur) toggleList(editor, { listStyleType: cur });
        else editor.tf.toggleBlock("p");
        break;
      default: editor.tf.toggleBlock(value);
    }
    close();
    setTimeout(() => editor.tf.focus(), 0);
  };

  const duplicate = (close: () => void) => {
    const p = path(); if (!p) return;
    try {
      const clone = JSON.parse(JSON.stringify(editor.api.node(p)?.[0]));
      editor.tf.insertNodes(clone, { at: [...p.slice(0, -1), p[p.length - 1] + 1] });
    } catch { /* ignore */ }
    close();
  };

  const copyLink = (close: () => void) => {
    const id = (element as any).id;
    const base = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "";
    const url = id ? `${base}#${id}` : base;
    try { navigator.clipboard?.writeText(url); showToast(t("editor.linkCopied"), "success"); } catch { /* ignore */ }
    close();
  };

  const setBlockColor = (value: string | null, close: () => void) => {
    const p = path(); if (!p) return;
    try {
      editor.tf.select({ anchor: editor.api.start(p)!, focus: editor.api.end(p)! });
      if (value) editor.tf.addMark("color", value);
      else editor.tf.removeMark("color");
    } catch { /* ignore */ }
    close();
    setTimeout(() => editor.tf.focus(), 0);
  };

  const removeBlock = (close: () => void) => {
    const p = path(); if (!p) return;
    try { editor.tf.removeNodes({ at: p }); } catch { /* ignore */ }
    close();
  };

  // 들여쓰기(indent) 만큼 핸들 거터도 우측으로 — 콘텐츠 왼쪽에 붙어있게.
  const indentLvl = (element as any).indent as number | undefined;
  const indentPx = indentLvl
    ? ((element as any).listStyleType ? Math.max(0, indentLvl - 1) : indentLvl) * 24
    : 0;

  return (
    <div
      ref={nodeRef}
      className={styles.blockDraggable}
      style={{
        ...(isDragging ? { opacity: 0.5 } : {}),
        ...(indentPx ? ({ ["--block-indent"]: `${indentPx}px` } as React.CSSProperties) : {}),
      }}
    >
      <div className={styles.blockDragGutter} contentEditable={false}>
        <button
          type="button"
          className={styles.blockAddBtn}
          aria-label={t("editor.addBlock")}
          title={IS_MAC ? `${t("editor.addBlockBelow")} · ⌥+${t("editor.addBlockAbove")}` : `${t("editor.addBlockBelow")} · Alt+${t("editor.addBlockAbove")}`}
          data-no-drag
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => addBlock(e.altKey)}
        >
          <Plus size={14} />
        </button>
        <Popover
          placement="bottom-start"
          contentClassName={styles.blockToolsMenu}
          trigger={
            <button
              type="button"
              ref={handleRef as unknown as React.Ref<HTMLButtonElement>}
              className={styles.blockDragHandleBtn}
              aria-label={t("editor.blockTools")}
              title={t("editor.blockTools")}
              data-no-drag
            >
              <GripVertical size={14} />
            </button>
          }
        >
          {({ close }) => (
            <div onMouseDown={(e) => e.preventDefault()}>
              <div className={styles.blockToolsLabel}>{t("editor.turnInto")}</div>
              <div className={styles.blockToolsTurn}>
                {TURN_INTO.map((o) => (
                  <button key={o.value} type="button" className={styles.blockToolsTurnBtn} title={t(`editor.${o.labelKey}`)} onClick={() => turnInto(o.value, close)}>
                    {o.icon}
                  </button>
                ))}
              </div>
              <MenuDivider />
              <MenuItem icon={<Copy size={15} />} label={t("editor.duplicate")} onClick={() => duplicate(close)} />
              <MenuItem icon={<Link2 size={15} />} label={t("editor.copyLink")} onClick={() => copyLink(close)} />
              <MenuDivider />
              <div className={styles.blockToolsLabel}><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Palette size={13} />{t("editor.textColor")}</span></div>
              <div className={styles.blockToolsSwatches}>
                {BLOCK_COLORS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={styles.blockToolsSwatch}
                    title={t(`editor.color_${c.key}`)}
                    style={{ background: c.value ?? "transparent", border: c.value ? "none" : "1px solid var(--border-strong-color)" }}
                    onClick={() => setBlockColor(c.value, close)}
                  >
                    {c.value ? "" : "⌀"}
                  </button>
                ))}
              </div>
              <MenuDivider />
              <MenuItem icon={<Trash2 size={15} />} label={t("editor.deleteBlock")} className={styles.blockToolsDanger} onClick={() => removeBlock(close)} />
            </div>
          )}
        </Popover>
      </div>
      {children}
      {dropLine && (
        <div
          contentEditable={false}
          className={`${styles.blockDropLine} ${dropLine === "bottom" ? styles.blockDropLineBottom : styles.blockDropLineTop}`}
        />
      )}
    </div>
  );
}
