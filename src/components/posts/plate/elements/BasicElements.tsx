

import {
  PlateElement,
  type PlateElementProps,
  useEditorRef,
  useSelected,
  useFocused,
} from "platejs/react";

import { useLanguage } from "@/providers/LanguageProvider";

import { BlockDropZone } from "../BlockDragHandle";

import { Music } from "@/components/icons";

import { BlockTailClickZone, isEmptyBlock, BlockPlaceholder } from "./shared";

/* 기본 블록 — 제목 · 인용 · 오디오 · 구분선 — elements.tsx 에서 분리 (#680). */

export function HeadingElement(props: PlateElementProps) {
  const { t } = useLanguage();
  const editor = useEditorRef();
  const selected = useSelected();
  const el = props.element as Record<string, unknown>;
  const tag = (el.type as string) || "h1";
  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();
  const sel0 = editor.selection;
  const multiBlock = !!sel0 && sel0.anchor.path[0] !== sel0.focus.path[0];
  // 확장(range) 선택 — 표 여러 셀 선택 등. 이때는 커서가 아니므로 placeholder 숨김.
  const collapsed = !!sel0 && sel0.anchor.offset === sel0.focus.offset && sel0.anchor.path.join() === sel0.focus.path.join();
  const showPlaceholder = selected && collapsed && !multiBlock && isEmptyBlock(props.element);
  const phKey = tag === "h1" ? "editor.phHeading1" : tag === "h2" ? "editor.phHeading2" : "editor.phHeading3";
  return (
    <BlockDropZone path={elPath}>
      <PlateElement {...props} as={tag as "h1"} style={{ ...props.style, position: "relative" }}>
        {showPlaceholder && <BlockPlaceholder text={t(phKey)} />}
        {props.children}
      </PlateElement>
    </BlockDropZone>
  );
}

/** Blockquote — 드롭 존 래퍼. 열블록처럼 내부에 블록을 담는 컨테이너 → 자체 placeholder 는 안 그리고
    내부 블록(문단 등)의 placeholder 를 그대로 쓴다(겹침 방지). */
export function BlockquoteElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();
  return (
    <BlockDropZone path={elPath}>
      <PlateElement {...props} as="blockquote" style={{ ...props.style, position: "relative" }}>
        {props.children}
      </PlateElement>
    </BlockDropZone>
  );
}

/** Horizontal Rule — 드롭 존 래퍼 */
export function AudioElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const el = props.element as Record<string, unknown>;
  const url = (el.url as string) || "";
  const title = (el.title as string) || "";
  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();
  return (
    <BlockDropZone path={elPath}>
      <PlateElement {...props} style={{ margin: "var(--prose-block-gap) 0", ...props.style }}>
        <div contentEditable={false} style={{
          maxWidth: 480,
        }}>
          {title && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, paddingLeft: 18, color: "var(--text-secondary)" }}>
              <Music size={16} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>{title}</span>
            </div>
          )}
          <audio src={url} controls preload="metadata" style={{ width: "100%" }} />
        </div>
        <BlockTailClickZone path={elPath} />
        {props.children}
      </PlateElement>
    </BlockDropZone>
  );
}

export function HrElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const selected = useSelected();
  const focused = useFocused();
  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();
  return (
    <BlockDropZone path={elPath}>
      <PlateElement {...props} style={{ margin: "var(--prose-block-gap) 0", ...props.style }}>
        <hr contentEditable={false} style={{ border: "none", borderTop: "1px solid var(--border-color-light)", margin: 0, borderRadius: 1, outline: selected && focused ? "2px solid var(--color-accent)" : "none", outlineOffset: 4 }} />
        <BlockTailClickZone path={elPath} />
        {props.children}
      </PlateElement>
    </BlockDropZone>
  );
}

// ── Column layout ──
