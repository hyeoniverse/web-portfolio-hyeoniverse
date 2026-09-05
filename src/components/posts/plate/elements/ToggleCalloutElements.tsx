import React, { useState, useRef } from "react";

import {
  PlateElement,
  type PlateElementProps,
  useEditorRef,
} from "platejs/react";

import { BlockDropZone, useBlockDrag } from "../BlockDragHandle";

import { _imageUploadFn } from "../utils";
import EmojiPickerPopup, { EmojiIcon } from "@/components/ui/EmojiPicker";
import { CaretRightIcon } from "@/components/icons";

import Pressable from "@/components/ui/Pressable";

/* 토글 · 콜아웃 요소 — elements.tsx 에서 분리 (#680). */

export function ToggleElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const el = props.element as Record<string, unknown>;
  const [open, setOpen] = useState((el.open as boolean) ?? true);
  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();
  const { blockDragProps } = useBlockDrag(elPath);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (elPath) editor.tf.setNodes({ open: next }, { at: elPath });
  };

  // 첫 번째 child의 heading type 확인
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children = (el.children as any[]) || [];
  const firstType = children[0]?.type || "p";
  const headingStyles: Record<string, React.CSSProperties> = {
    h1: { fontSize: "var(--font-size-2xl)", fontFamily: "var(--font-instrument)", fontWeight: "var(--font-weight-regular)" as string },
    h2: { fontSize: "var(--font-size-lg)", fontFamily: "var(--font-instrument)", fontWeight: "var(--font-weight-regular)" as string },
    h3: { fontSize: "var(--font-size-md)", fontFamily: "var(--font-instrument)", fontWeight: "var(--font-weight-regular)" as string },
  };
  const titleStyle: React.CSSProperties = headingStyles[firstType] || {};

  return (
    <BlockDropZone path={elPath}>
      <div {...blockDragProps} style={{ margin: "var(--prose-block-gap) 0" }}>
        <PlateElement {...props} style={{ ...props.style }}>
          {React.Children.map(props.children, (child, i) => {
            if (i === 0) {
              return (
                <div className="toggle-title-wrap" style={{ display: "flex", alignItems: "flex-start", gap: 4, ...titleStyle }}>
                  <Pressable noTapScale contentEditable={false} style={{
                    border: "none", background: "transparent", cursor: "pointer",
                    padding: 0, color: "var(--text-muted)",
                    transition: "transform 0.15s", transform: open ? "rotate(90deg)" : "rotate(0deg)",
                    display: "flex", alignItems: "center", flexShrink: 0,
                    height: "1.4em",
                  }} onMouseDown={(e) => e.preventDefault()} onClick={toggleOpen}>
                    <CaretRightIcon />
                  </Pressable>
                  <div style={{ flex: 1, minWidth: 0 }}>{child}</div>
                </div>
              );
            }
            return (
              <div style={{
                overflow: "hidden", maxHeight: open ? 2000 : 0, opacity: open ? 1 : 0,
                transition: "max-height 0.25s ease-out, opacity 0.2s ease-out", paddingLeft: 18,
              }}>
                {child}
              </div>
            );
          })}
        </PlateElement>
      </div>
    </BlockDropZone>
  );
}

// ── Callout ──
export function CalloutElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const el = props.element as Record<string, unknown>;
  const bg = (el.bg as string) || "var(--bg-tertiary)";
  const icon = (el.icon as string) || "";
  const hasIcon = icon.length > 0;
  const [showIconPicker, setShowIconPicker] = useState(false);
  const iconRef = useRef<HTMLSpanElement>(null);
  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();
  const { blockDragProps } = useBlockDrag(elPath);

  return (
    <BlockDropZone path={elPath}>
      <div {...blockDragProps} style={{ position: "relative", margin: "var(--prose-block-gap) 0" }}>
        {hasIcon && (
          <span ref={iconRef} contentEditable={false} style={{
            position: "absolute", left: 12, top: "calc(var(--spacing-md) + 2px)", zIndex: 1,
            fontSize: 20, lineHeight: 1, cursor: "pointer", userSelect: "none",
          }} onMouseDown={(e) => e.preventDefault()} onClick={() => setShowIconPicker(!showIconPicker)} data-clickable="true">
            <EmojiIcon value={icon} />
          </span>
        )}
        <EmojiPickerPopup
          open={showIconPicker}
          getAnchorRect={() => iconRef.current?.getBoundingClientRect() ?? null}
          onClose={() => setShowIconPicker(false)}
          onSelect={(val) => { if (elPath) editor.tf.setNodes({ icon: val || undefined }, { at: elPath }); }}
          onImageUpload={_imageUploadFn.current || undefined}
          currentValue={icon}
        />
        <PlateElement {...props} style={{
          ...props.style,
          padding: hasIcon ? "var(--spacing-md) var(--spacing-md) var(--spacing-md) 44px" : "var(--spacing-md)",
          borderRadius: "var(--radius-2xl)", background: bg,
          border: (bg === "var(--bg-primary)" || bg === "transparent") ? "1px solid var(--border-color-light)" : "1px solid transparent",
        }}>
          {props.children}
        </PlateElement>
      </div>
    </BlockDropZone>
  );
}
