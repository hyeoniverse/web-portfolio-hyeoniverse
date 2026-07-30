import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { SelectOption } from "@/types";
import { CAPTION_EDIT_EVENT } from "./constants";
import {
  PlateElement,
  type PlateElementProps,
  useEditorRef,
  useSelected,
  useFocused,
} from "platejs/react";
import type { TLinkElement } from "platejs";
import { useLanguage } from "@/providers/LanguageProvider";
import { showToast } from "@/stores/toastStore";
import Tooltip from "@/components/ui/Tooltip";
import { ReactEditor } from "slate-react";
import { COLUMN_DEFAULT_BG, COLUMN_MIN_PX, COLUMN_MAX_PX, COLUMN_GROUP_MAX_PX } from "./presets";
import { BlockDropZone, useBlockDrag } from "./BlockDragHandle";
import { formatCode, isFormattable } from "./formatCode";
import MermaidPreview from "./MermaidPreview";
import HelpButton from "@/components/ui/HelpButton";
import { lowlight } from "./lowlightInstance";
import FloatingBar from "./toolbars/FloatingBar";
import BlockActionsMenu from "./BlockActionsMenu";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { useModalStore } from "@/stores/modalStore";
import { _blockDragPath, _inlineDragPath, _imageUploadFn } from "./utils";
import EmojiPickerPopup, { EmojiIcon } from "@/components/ui/EmojiPicker";
import { Check, FileText, File, Music, Paperclip, Eye, Download, GripVertical, Copy, WrapText, MoreHorizontal, ChevronDown, Search, Sparkles, ExternalLink, ZoomIn, ZoomOut, Maximize, Maximize2, Minimize2 } from "lucide-react";
import { createPortal } from "react-dom";
import Popover from "@/components/ui/Popover";
import styles from "../RichTextEditor.module.css";

/** 블록 void 요소 아래 클릭 가능 영역 — 클릭 시 다음 줄에 커서 배치 */
export function BlockTailClickZone({ path }: { path: number[] | null }) {
  const editor = useEditorRef();
  if (!path) return null;
  return (
    <span
      contentEditable={false}
      onClick={(e) => {
        e.stopPropagation();
        try {
          const nextPath = [path[0] + 1];
          const nextNode = editor.api.node(nextPath);
          if (nextNode) {
            editor.tf.select({ path: [...nextPath, 0], offset: 0 });
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            editor.tf.insertNodes({ type: "p", children: [{ text: "" }] } as any, { at: nextPath });
            editor.tf.select({ path: [...nextPath, 0], offset: 0 });
          }
          editor.tf.focus();
        } catch { /* ignore */ }
      }}
      style={{ display: "block", width: "100%", minHeight: 8, cursor: "text" }}
    />
  );
}

/** 인라인 캡션 입력 — 이미지/표 공용 */
const CAPTION_MAX = 200;

export function InlineCaption({ caption, onCommit, onEditingChange, autoEdit, overlayMode }: { caption: string; onCommit: (v: string) => void; onEditingChange?: (editing: boolean) => void; autoEdit?: boolean; overlayMode?: boolean }) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const setEditingWrapped = useCallback((v: boolean) => { setEditing(v); onEditingChange?.(v); }, [onEditingChange]);
  const [draft, setDraft] = useState(caption);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autoEditDone = useRef(false);
  const overLimitRef = useRef(false);

  useEffect(() => { setDraft(caption); }, [caption]);

  // 높이는 CSS field-sizing:content 가 내용에 맞춰 자동 조절 (인라인 height 박으면 그게 무시되므로 설정 X).
  // field-sizing 미지원 브라우저 대비 fallback — 명시 height 대신 rows 만으로 대략.
  const shownValue = editing ? draft : caption;

  // autoEdit: 처음 마운트 시 자동 편집 모드 진입
  useEffect(() => {
    if (autoEdit && !autoEditDone.current) {
      autoEditDone.current = true;
      setEditingWrapped(true);
    }
  }, [autoEdit, setEditingWrapped]);

  const commit = useCallback(() => {
    setEditingWrapped(false);
    const trimmed = draft.trim();
    if (trimmed !== caption) onCommit(trimmed);
  }, [draft, caption, onCommit, setEditingWrapped]);

  return (
    <textarea
      ref={inputRef}
      data-img-caption
      contentEditable={false}
      rows={1}
      value={shownValue}
      readOnly={!editing}
      onChange={(e) => {
        const v = e.target.value;
        if (v.length > CAPTION_MAX) {
          // 제한 초과 — 잘라내고 toast 1회 알림 (다시 제한 아래로 내려가면 재알림 허용)
          if (!overLimitRef.current) { showToast(t("editor.captionMaxLength"), "warning"); overLimitRef.current = true; }
          setDraft(v.slice(0, CAPTION_MAX));
        } else {
          overLimitRef.current = false;
          setDraft(v);
        }
      }}
      onBlur={() => { if (editing) setTimeout(() => commit(), 0); }}
      // 캡션 클릭이 (1) 부모 onClick=selectImage 로 버블되거나 (2) Slate 네이티브 mousedown
      // 리스너가 caret 을 옆(float) 텍스트에 놓는 것 둘 다 차단해야 캡션이 편집됨.
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        // 전파만 차단(에디터/Slate 가 caret 가져가는 것 방지). textarea 는 진짜 폼 요소라
        // preventDefault 하면 네이티브 focus 자체가 막히므로 호출하지 않는다.
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        if (!editing) { setEditingWrapped(true); setDraft(caption); setTimeout(() => { inputRef.current?.focus(); }, 0); }
      }}
      onKeyDown={(e) => {
        if (!editing) return;
        // Enter=확정 / Shift+Enter=줄바꿈 / Esc=취소
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); }
        if (e.key === "Escape") { setDraft(caption); setEditingWrapped(false); }
      }}
      placeholder={editing ? t("editor.captionInput") : (caption || t("editor.captionAdd"))}
      autoFocus={editing}
      className={styles.captionInput}
      style={{
        display: "block",
        width: "100%",
        border: "none",
        outline: "none",
        background: "transparent",
        resize: "none",
        overflow: "hidden",
        textAlign: "center",
        fontSize: overlayMode ? 11 : "var(--font-size-sm)",
        lineHeight: 1.5,
        padding: overlayMode ? "0" : "var(--spacing-2xs) var(--spacing-3xs) 0",
        fontFamily: "var(--font-space-grotesk)",
        color: overlayMode
          ? (editing ? "#fff" : "rgba(255,255,255,0.9)")
          : (caption || editing ? "var(--text-tertiary)" : "var(--text-muted)"),
        cursor: editing ? "text" : "pointer",
      }}
    />
  );
}

export function ImageElement(props: PlateElementProps) {
  const { t } = useLanguage();
  const editor = useEditorRef();
  const selected = useSelected();
  const focused = useFocused();
  const [captionEditing, setCaptionEditing] = useState(false);
  // 선택(이미지 void 가 selection 에 포함) + 포커스면 활성 — 핸들/툴바 표시.
  // 선택은 PlateEditor capture 핸들러가 처리하므로 별도 clicked 플래그 불필요.
  const isActive = selected && focused;

  const el = props.element as Record<string, unknown>;
  const url = (el.url as string) || "";
  const alt = (el.alt as string) || "";
  const imgWidth = (el.width as number) || 0;   // px, 0 = auto
  const imgHeight = (el.height as number) || 0;  // px, 0 = auto
  const caption = (el.caption as string) || "";
  const lockAspect = (el.lockAspect as boolean) ?? true;
  const imgFilter = (el.filter as string) || "";
  const imgLayout = (el.layout as string) || "inline";

  const imgRef = useRef<HTMLImageElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [resizeSize, setResizeSize] = useState<{ w: number; h: number } | null>(null);
  // 이미지 로드 실패 시 placeholder.svg 로 swap
  const [imgErrored, setImgErrored] = useState(false);
  useEffect(() => { setImgErrored(false); }, [url]);
  const displayUrl = imgErrored ? "/images/placeholder.svg" : url;
  const draggingRef = useRef<{
    handle: "right" | "bottom" | "corner";
    startX: number; startY: number;
    startW: number; startH: number;
    ratio: number;
  } | null>(null);

  // 엘리먼트 path 가져오기
  const getPath = useCallback(() => {
    try {
      // selection 무관하게 이 이미지 element 의 path 를 직접 찾음 — blur(선택 해제) 후에도
      // 캡션 commit/clear 가 올바른 노드에 적용되도록. (above 는 selection 기준이라 blur 시 null)
      const p = editor.api.findPath(props.element);
      return p ? p : null;
    } catch { return null; }
  }, [editor, props.element]);

  const setAttr = useCallback((attrs: Record<string, unknown>) => {
    const path = getPath();
    if (path) editor.tf.setNodes(attrs, { at: path });
  }, [editor, getPath]);

  const onPointerDown = useCallback((handle: "right" | "bottom" | "corner") => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    draggingRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startW: rect.width,
      startH: rect.height,
      ratio: rect.width / rect.height,
    };

    const onPointerMove = (ev: PointerEvent) => {
      const d = draggingRef.current;
      if (!d || !img) return;
      const dx = ev.clientX - d.startX;
      const dy = ev.clientY - d.startY;
      let newW = d.startW;
      let newH = d.startH;

      if (d.handle === "right") {
        newW = Math.max(50, d.startW + dx);
        if (lockAspect) newH = newW / d.ratio;
      } else if (d.handle === "bottom") {
        newH = Math.max(30, d.startH + dy);
        if (lockAspect) newW = newH * d.ratio;
      } else {
        // corner
        newW = Math.max(50, d.startW + dx);
        if (lockAspect) {
          newH = newW / d.ratio;
        } else {
          newH = Math.max(30, d.startH + dy);
        }
      }
      const rw = Math.round(newW);
      const rh = Math.round(newH);
      img.style.width = `${rw}px`;
      // lockAspect 면 height 는 CSS aspectRatio 가 처리 → 드래그 중에도 비율 유지
      // (px 로 직접 set 하면 aspectRatio override 되어 셀 좁을 때 비율 깨짐 시각화)
      if (lockAspect) {
        img.style.height = "auto";
        img.style.aspectRatio = `${rw} / ${rh}`;
      } else {
        img.style.height = `${rh}px`;
        img.style.aspectRatio = "";
      }
      setResizeSize({ w: rw, h: rh });
    };

    const onPointerUp = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      if (!img) return;
      // resizeSize 의 의도 dimension 을 저장 (실제 rendered 가 아닌 사용자가 드래그한 목표)
      const w = Math.round(parseFloat(img.style.width));
      // height 는 lockAspect 이면 auto 라 parseFloat NaN — resizeSize 에서 가져옴
      const target = draggingRef.current;
      const h = lockAspect && target
        ? Math.round(Math.round(parseFloat(img.style.width)) / target.ratio)
        : Math.round(parseFloat(img.style.height));
      setAttr({ width: w, height: h });
      draggingRef.current = null;
      setResizeSize(null);
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  }, [lockAspect, setAttr]);

  const handleStyle: React.CSSProperties = {
    position: "absolute",
    background: "var(--color-accent, #3b82f6)",
    borderRadius: "var(--radius-capsule)",
    zIndex: 2,
  };

  // 파일명 추출
  const fileName = url ? decodeURIComponent(url.split("/").pop()?.split("?")[0] || "") : "";

  // 자연 크기 (로드 후)
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const onImgLoad = useCallback(() => {
    const img = imgRef.current;
    if (img) setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
  }, []);

  // 표시할 크기 결정
  const displaySize = resizeSize
    || (imgWidth > 0 && imgHeight > 0 ? { w: imgWidth, h: imgHeight } : null)
    || naturalSize;

  const isSmall = (imgWidth > 0 && imgWidth < 150) || (imgHeight > 0 && imgHeight < 80);
  // 캡션 영역은 (1) 이미 캡션이 있거나 (2) 툴바 "캡션 추가" 버튼을 눌러 편집을 시작했을 때만.
  // 단순 이미지 선택만으로는 뜨지 않는다.
  const showCaption = !!(caption || captionEditing);
  const badgeHeight = 22;
  const infoStyle: React.CSSProperties = {
    position: "absolute", left: 4,
    bottom: showCaption ? badgeHeight + 10 : 4,
    padding: "2px 10px",
    background: "var(--bg-overlay)", color: "#fff",
    borderRadius: "var(--radius-capsule)", fontSize: 11,
    fontFamily: "var(--font-space-grotesk)", lineHeight: 1.4,
    height: badgeHeight, display: "flex", alignItems: "center",
    pointerEvents: "none", whiteSpace: "nowrap", zIndex: 4,
    maxWidth: "calc(100% - 8px)", overflow: "hidden", textOverflow: "ellipsis",
  };

  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();

  // 클릭 시 이미지 void 노드를 명시적으로 선택 — 클릭만으로 선택이 잘 안 되는 문제 해결.
  // collapsed select 는 void 에 안 붙고 인접 텍스트로 재해석되므로 void 전체를 범위로 확장 선택.
  const selectImage = useCallback(() => {
    if (!elPath) return;
    try {
      const anchor = editor.api.start(elPath);
      const focus = editor.api.end(elPath);
      editor.tf.focus();
      if (anchor && focus) editor.tf.select({ anchor, focus });
      else editor.tf.select(elPath);
    } catch { /* ignore */ }
  }, [editor, elPath]);

  // 이미지 드래그 이동(인라인 void 재배치) — 인라인/블록/플로트 공용.
  // 활성화 후 caret 위치에 원본 제거→재삽입. 블록/플로트는 별도 이동 핸들에서 호출.
  const startInlineDrag = useCallback((e: React.PointerEvent) => {
    if (draggingRef.current || e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-cursor^='resize']")) return;
    const startX = e.clientX;
    const startY = e.clientY;
    let activated = false;
    let ghost: HTMLElement | null = null;
    const onMove = (ev: PointerEvent) => {
      if (!activated) {
        if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < 5) return;
        activated = true;
        _inlineDragPath.current = elPath;
        setIsDragging(true);
        // 드래그 ghost — 이미지 축소 복제본이 커서를 따라다님
        const imgEl = plateElRef.current?.querySelector("img") as HTMLImageElement | null;
        if (imgEl) {
          ghost = document.createElement("div");
          const w = Math.min(imgEl.getBoundingClientRect().width || 120, 160);
          ghost.style.cssText = `position:fixed;left:0;top:0;width:${w}px;pointer-events:none;z-index:var(--z-top);opacity:0.7;border-radius:6px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.35);will-change:transform;`;
          const clone = imgEl.cloneNode(true) as HTMLImageElement;
          clone.style.cssText = "width:100%;height:auto;display:block;";
          ghost.appendChild(clone);
          document.body.appendChild(ghost);
        }
      }
      if (ghost) ghost.style.transform = `translate(${ev.clientX + 14}px, ${ev.clientY + 14}px)`;
      const caret = document.getElementById("inline-drag-caret");
      if (!caret) return;
      const range = document.caretRangeFromPoint?.(ev.clientX, ev.clientY);
      if (!range) { caret.style.opacity = "0"; return; }
      const rect = range.getClientRects()[0] || range.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0 && rect.x === 0)) { caret.style.opacity = "0"; return; }
      // position:fixed → 뷰포트 좌표 그대로 사용 (부모 positioning 무관하게 정확히 표시)
      caret.style.opacity = "1";
      caret.style.left = `${rect.left}px`;
      caret.style.top = `${rect.top}px`;
      caret.style.height = `${rect.height || 18}px`;
    };
    const onUp = (ev: PointerEvent) => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      const caret = document.getElementById("inline-drag-caret");
      if (caret) caret.style.opacity = "0";
      if (ghost) { ghost.remove(); ghost = null; }
      if (!activated) return;
      _inlineDragPath.current = null;
      setIsDragging(false);
      try {
        const range = document.caretRangeFromPoint?.(ev.clientX, ev.clientY);
        if (!range) return;
        const slateRange = ReactEditor.toSlateRange(editor as unknown as ReactEditor, range, { exactMatch: false, suppressThrow: true });
        if (!slateRange) return;
        const point = slateRange.anchor;
        const freshSrcPath = editor.api.findPath(props.element);
        if (!freshSrcPath) return;
        const srcPathArr = Array.from(freshSrcPath);
        const srcEntry = editor.api.node(srcPathArr);
        if (!srcEntry) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nodeClone = JSON.parse(JSON.stringify(srcEntry[0])) as any;
        editor.tf.withoutNormalizing(() => {
          const destPointRef = editor.api.pointRef(point);
          editor.tf.removeNodes({ at: srcPathArr });
          const destPoint = destPointRef.unref();
          if (destPoint) editor.tf.insertNodes(nodeClone, { at: destPoint });
        });
      } catch { /* ignore */ }
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, elPath, props.element]);

  // float 시 Plate wrapper div 자체에 float 적용 (useEffect)
  const plateElRef = useRef<HTMLElement>(null);

  // 툴바 "캡션 추가" 버튼 → 이미지 DOM 노드에 커스텀 이벤트가 버블 → 편집 모드 진입 + input focus.
  // (버튼 클릭 시 selection 이 벗어나 input 이 아직 없어도, 여기서 먼저 렌더시킨 뒤 focus)
  useEffect(() => {
    const el = plateElRef.current;
    if (!el) return;
    const handler = () => {
      setCaptionEditing(true);
      requestAnimationFrame(() => {
        const input = el.querySelector("[data-img-caption]") as HTMLElement | null;
        if (input) {
          input.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
          setTimeout(() => input.focus(), 0);
        }
      });
    };
    el.addEventListener(CAPTION_EDIT_EVENT.image, handler);
    return () => el.removeEventListener(CAPTION_EDIT_EVENT.image, handler);
  }, []);

  useEffect(() => {
    const el = plateElRef.current;
    if (!el) return;
    // Plate가 감싸는 [data-slate-node="element"] div를 찾아서 float 적용
    const wrapper = el.closest("[data-slate-node=\"element\"]") as HTMLElement | null;
    if (!wrapper) return;
    if (imgLayout === "float-left") {
      // position:relative+z-index — 옆 블록을 -1lh 로 끌어올려 빈 줄을 덮을 때 이미지/이동핸들이 그 블록 위로 보이게
      wrapper.style.cssText = "float:left;margin:4px 20px 8px 0;padding:0;display:block;clear:none;position:relative;z-index:2;";
      wrapper.setAttribute("data-float-side", "left");
    } else if (imgLayout === "float-right") {
      wrapper.style.cssText = "float:right;margin:4px 0 8px 20px;padding:0;display:block;clear:none;position:relative;z-index:2;";
      wrapper.setAttribute("data-float-side", "right");
    } else {
      wrapper.style.cssText = "";
      wrapper.removeAttribute("data-float-side");
    }
  }, [imgLayout]);

  return (
    <PlateElement {...props} ref={plateElRef} as="span" style={{
      ...props.style,
      display: imgLayout === "block" ? "block" : "inline",
      verticalAlign: imgLayout === "inline" ? "baseline" : undefined,
      // block: 상단 margin 0 — 드래그 핸들(좌측 gutter)이 이미지 top 에 정렬되도록 (margin 이 핸들을 위로 밀어내는 것 방지)
      margin: imgLayout === "block" ? "0 0 4px" : imgLayout.startsWith("float-") ? "0" : undefined,
      ...(imgLayout.startsWith("float-") ? { lineHeight: 0, fontSize: 0 } : {}),
      position: "relative",
    }}>
      {imgLayout === "inline" ? (
        <span
          contentEditable={false}
          style={{ display: "inline-block", maxWidth: "100%", margin: "0 2px" }}
          draggable={false}
          onClick={selectImage}
          onPointerDown={startInlineDrag}
        >
          <Tooltip content={displaySize ? `${fileName ? `${fileName} · ` : ""}${displaySize.w}×${displaySize.h}px${isSmall && caption ? `\n${caption}` : ""}` : undefined} delay={300} placement="auto" wrapperStyle={{ display: "block", lineHeight: 0 }}>
              {/* 이미지 박스 — 리사이즈 핸들 기준. 캡션은 이 박스 밖이라 핸들이 캡션에 안 밀림 */}
              <span style={{ position: "relative", display: "block", lineHeight: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={displayUrl}
                  alt={alt}
                  onLoad={onImgLoad}
                  onError={() => setImgErrored(true)}
                  onClick={selectImage}
                  style={{
                    width: imgWidth > 0 ? imgWidth : undefined,
                    // lockAspect 이면 height 는 auto + aspectRatio 로 비율 유지
                    // → table 셀 같은 좁은 컨테이너에서 maxWidth: 100% 로 width 가 줄어도 비율 안 깨짐
                    height: lockAspect && imgWidth > 0 && imgHeight > 0 ? "auto" : (imgHeight > 0 ? imgHeight : undefined),
                    aspectRatio: lockAspect && imgWidth > 0 && imgHeight > 0 ? `${imgWidth} / ${imgHeight}` : undefined,
                    maxWidth: "100%",
                    display: "block",
                    outline: isActive && !isDragging ? "2px solid var(--color-accent, #3b82f6)" : undefined,
                    filter: imgFilter || undefined,
                    cursor: "grab",
                  }}
                  draggable={false}
                />
                {/* Resize live size */}
                {resizeSize && !isDragging && (
                  <span style={{ ...infoStyle, left: "50%", bottom: "auto", top: "50%", transform: "translate(-50%, -50%)", fontSize: 13, fontWeight: 600 }}>
                    {resizeSize.w}×{resizeSize.h}px
                  </span>
                )}
                {/* Resize handles */}
                {isActive && !isDragging && (
                  <>
                    <span data-cursor="resizeH" onPointerDown={onPointerDown("right")} style={{ position: "absolute", right: -5, top: 0, bottom: 0, width: 10, cursor: "ew-resize", zIndex: 4 }} />
                    <span data-cursor="resizeV" onPointerDown={onPointerDown("bottom")} style={{ position: "absolute", bottom: -5, left: 0, right: 0, height: 10, cursor: "ns-resize", zIndex: 4 }} />
                    <span data-cursor="resizeDiag" onPointerDown={onPointerDown("corner")} style={{ position: "absolute", right: -7, bottom: -7, width: 14, height: 14, cursor: "nwse-resize", zIndex: 5 }} />
                    <span style={{ ...handleStyle, width: 6, height: 32, position: "absolute", right: -4, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                    <span style={{ ...handleStyle, width: 32, height: 6, position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }} />
                    <span style={{ ...handleStyle, width: 10, height: 10, borderRadius: "var(--radius-capsule)", position: "absolute", right: -5, bottom: -5, pointerEvents: "none" }} />
                  </>
                )}
              </span>
              {/* 캡션 — 이미지 박스 밖(아래 흐름). 글자수 제한 있어 fit-content 로 충분 */}
              {!isSmall && showCaption && (
                <span style={{ display: "block", textAlign: "center", lineHeight: 1.4 }}>
                  <InlineCaption
                    caption={caption}
                    onCommit={(v) => setAttr({ caption: v || undefined })}
                    onEditingChange={setCaptionEditing}
                  />
                </span>
              )}
          </Tooltip>
          <InlineCursorTarget side="before" element={el} />
          <InlineCursorTarget side="after" element={el} />
        </span>
      ) : (
      <BlockDropZone path={elPath}>
        <div
          contentEditable={false}
          style={{ display: imgLayout.startsWith("float-") ? "block" : "inline-block", maxWidth: "100%" }}
          /* 블록 드래그는 공식 @platejs/dnd 가 담당 — 이미지 자체 네이티브 드래그는
             react-dnd(HTML5Backend) 와 충돌하므로 비활성화 */
          draggable={false}
          onClick={selectImage}
        >
          <div className={styles.imgHoverZone} style={{ position: "relative" }}>
            {/* 이미지 박스 — 리사이즈 핸들의 기준(position:relative). 캡션은 이 박스 밖이라 핸들이 캡션 높이에 안 밀림 */}
            <div style={{ position: "relative", display: "inline-block", maxWidth: "100%", lineHeight: 0 }}>
              {/* Tooltip wrapper 기본이 inline-flex → 이미지 박스에 baseline 여백이 생겨 핸들이 어긋남. block+lineHeight 0 으로 이미지에 딱 맞춤 */}
              <Tooltip content={displaySize ? `${fileName ? `${fileName} · ` : ""}${displaySize.w}×${displaySize.h}px${isSmall && caption ? `\n${caption}` : ""}` : undefined} delay={300} placement="auto" wrapperStyle={{ display: "block", lineHeight: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={displayUrl}
                  alt={alt}
                  onLoad={onImgLoad}
                  onError={() => setImgErrored(true)}
                  // float 은 normal flow 밖이라 클릭 시 Slate 가 뒤 텍스트로 caret 을 보냄.
                  // React stopPropagation 만으론 Slate 네이티브 리스너를 못 막으므로 nativeEvent 까지 차단 +
                  // preventDefault 로 네이티브 caret 차단, 그 뒤 이미지 void 노드를 직접 선택
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); selectImage(); }}
                  onClick={(e) => { e.stopPropagation(); selectImage(); }}
                  style={{
                    width: imgWidth > 0 ? imgWidth : undefined,
                    // lockAspect 이면 height 는 auto + aspectRatio 로 비율 유지
                    // → table 셀 같은 좁은 컨테이너에서 maxWidth: 100% 로 width 가 줄어도 비율 안 깨짐
                    height: lockAspect && imgWidth > 0 && imgHeight > 0 ? "auto" : (imgHeight > 0 ? imgHeight : undefined),
                    aspectRatio: lockAspect && imgWidth > 0 && imgHeight > 0 ? `${imgWidth} / ${imgHeight}` : undefined,
                    maxWidth: "100%",
                    display: "block",
                    outline: isActive && !isDragging ? "2px solid var(--color-accent, #3b82f6)" : undefined,
                    filter: imgFilter || undefined,
                    cursor: "grab",
                  }}
                  draggable={false}
                />
              </Tooltip>
              {/* Resize live size */}
              {resizeSize && !isDragging && (
                <div style={{ ...infoStyle, left: "50%", bottom: "auto", top: "50%", transform: "translate(-50%, -50%)", fontSize: 13, fontWeight: 600 }}>
                  {resizeSize.w}×{resizeSize.h}px
                </div>
              )}
              {/* Resize handles — 드래그 중 숨김 */}
              {isActive && !isDragging && (
                <>
                  {/* 히트박스 (감지 영역) */}
                  <div data-cursor="resizeH" onPointerDown={onPointerDown("right")} style={{ position: "absolute", right: -5, top: 0, bottom: 0, width: 10, cursor: "ew-resize", zIndex: 4 }} />
                  <div data-cursor="resizeV" onPointerDown={onPointerDown("bottom")} style={{ position: "absolute", bottom: -5, left: 0, right: 0, height: 10, cursor: "ns-resize", zIndex: 4 }} />
                  <div data-cursor="resizeDiag" onPointerDown={onPointerDown("corner")} style={{ position: "absolute", right: -7, bottom: -7, width: 14, height: 14, cursor: "nwse-resize", zIndex: 5 }} />
                  {/* 시각적 핸들 */}
                  <div style={{ ...handleStyle, width: 6, height: 32, position: "absolute", right: -4, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                  <div style={{ ...handleStyle, width: 32, height: 6, position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }} />
                  <div style={{ ...handleStyle, width: 10, height: 10, borderRadius: "var(--radius-capsule)", position: "absolute", right: -5, bottom: -5, pointerEvents: "none" }} />
                </>
              )}
              {/* 이동 핸들 — block/float 은 이미지 grab 드래그가 없으므로 별도 핸들 제공.
                  visibility 는 CSS :hover(자손 hover 시 유지 → 안 깜빡임) + 선택(active) 으로 제어 */}
              {!isDragging && (
                <div
                  title={t("editor.dragToMove")}
                  className={`${styles.imgMoveHandle}${isActive ? ` ${styles.imgMoveHandleActive}` : ""}`}
                  onPointerDown={startInlineDrag}
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                >
                  <GripVertical size={14} />
                </div>
              )}
            </div>
            {/* 캡션 — 이미지 박스 밖(아래). 박스 안에 두면 리사이즈 핸들이 캡션 높이만큼 밀림.
                float 일 땐 absolute 라 선택 시 박스 높이가 안 변해 옆 텍스트가 재배치되지 않음 */}
            {!isSmall && showCaption && (
              // position:relative + z-index → float 옆 wrapping 텍스트 위로 올려 클릭이 캡션에 떨어지게
              <div style={{ textAlign: "center", position: "relative", zIndex: 5 }}>
                <InlineCaption
                  caption={caption}
                  onCommit={(v) => setAttr({ caption: v || undefined })}
                  onEditingChange={setCaptionEditing}
                />
              </div>
            )}
          </div>
      </div>
      </BlockDropZone>
      )}
      {props.children}
    </PlateElement>
  );
}

/* ── Cursor target for inline void — click to place cursor before/after ── */
function InlineCursorTarget({ side, element }: { side: "before" | "after"; element: Record<string, unknown> }) {
  const editor = useEditorRef();
  return (
    <span
      contentEditable={false}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          const path = editor.api.findPath(element as Parameters<typeof editor.api.findPath>[0]);
          if (!path) return;
          if (side === "before") {
            const point = editor.api.before({ path, offset: 0 });
            if (point) editor.tf.select(point);
          } else {
            const point = editor.api.after({ path, offset: 0 });
            if (point) editor.tf.select(point);
          }
          editor.tf.focus();
        } catch { /* ignore */ }
      }}
      style={{
        position: "absolute",
        [side === "before" ? "left" : "right"]: -6,
        top: 0,
        width: 6,
        height: "100%",
        cursor: "text",
        zIndex: 5,
      }}
    />
  );
}

// ── 코드블록 엘리먼트 (줄바꿈/스크롤 토글) ──
/** 예시 하나 — 코드 + 렌더 그래프 + 확대/축소/전체화면/복사 */
function MermaidExample({ label, code, wide, ko, onCopy }: { label: string; code: string; wide?: boolean; ko: boolean; onCopy: (c: string) => void }) {
  const [zoom, setZoom] = useState(1);
  const [full, setFull] = useState(false);
  const clamp = (z: number) => Math.min(3, Math.max(0.5, Math.round(z * 10) / 10));
  // 롱프레스로 연속 확대/축소 — 누르면 즉시 1회, 계속 누르면 반복
  const repeat = useRef<{ t1: ReturnType<typeof setTimeout> | null; iv: ReturnType<typeof setInterval> | null }>({ t1: null, iv: null });
  const stopRepeat = () => {
    if (repeat.current.t1) clearTimeout(repeat.current.t1);
    if (repeat.current.iv) clearInterval(repeat.current.iv);
    repeat.current = { t1: null, iv: null };
  };
  const startRepeat = (fn: () => void) => {
    stopRepeat();
    fn();
    repeat.current.t1 = setTimeout(() => { repeat.current.iv = setInterval(fn, 90); }, 350);
  };
  useEffect(() => () => stopRepeat(), []);
  // 드래그로 차트 이동(pan) — 스크롤 위치 조작. 인라인/전체화면 두 뷰포트 공용(currentTarget 기준).
  const viewportRef = useRef<HTMLDivElement>(null);
  const fsViewportRef = useRef<HTMLDivElement>(null);
  const dragEl = useRef<HTMLElement | null>(null);
  const drag = useRef({ active: false, x: 0, y: 0, sl: 0, st: 0 });
  const onPanDown = (e: React.PointerEvent) => {
    const vp = e.currentTarget as HTMLElement;
    dragEl.current = vp;
    drag.current = { active: true, x: e.clientX, y: e.clientY, sl: vp.scrollLeft, st: vp.scrollTop };
    vp.setPointerCapture?.(e.pointerId);
  };
  const onPanMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const vp = dragEl.current; if (!vp) return;
    vp.scrollLeft = drag.current.sl - (e.clientX - drag.current.x);
    vp.scrollTop = drag.current.st - (e.clientY - drag.current.y);
  };
  const onPanUp = (e: React.PointerEvent) => {
    drag.current.active = false;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  };
  const focus = () => { setZoom(1); [viewportRef.current, fsViewportRef.current].forEach((vp) => { if (vp) { vp.scrollLeft = 0; vp.scrollTop = 0; } }); };

  // 컨트롤 버튼(축소/배율/확대/포커스/전체화면 토글) — 인라인·전체화면 공용. fs 면 전체화면 버튼→축소.
  const ctrlButtons = (fs: boolean) => (
    <>
      <button type="button" className={styles.mermaidHelpIconBtn} title={ko ? "축소 (길게 눌러 연속)" : "Zoom out (hold)"}
        onPointerDown={() => startRepeat(() => setZoom((z) => clamp(z - 0.2)))} onPointerUp={stopRepeat} onPointerLeave={stopRepeat} onPointerCancel={stopRepeat}><ZoomOut size={14} /></button>
      <span className={styles.mermaidHelpZoomVal}>{Math.round(zoom * 100)}%</span>
      <button type="button" className={styles.mermaidHelpIconBtn} title={ko ? "확대 (길게 눌러 연속)" : "Zoom in (hold)"}
        onPointerDown={() => startRepeat(() => setZoom((z) => clamp(z + 0.2)))} onPointerUp={stopRepeat} onPointerLeave={stopRepeat} onPointerCancel={stopRepeat}><ZoomIn size={14} /></button>
      <button type="button" className={styles.mermaidHelpIconBtn} title={ko ? "포커스(초기화)" : "Focus (reset)"} onClick={focus}><Maximize size={14} /></button>
      <button type="button" className={styles.mermaidHelpIconBtn} title={fs ? (ko ? "전체화면 종료 (Esc)" : "Exit fullscreen (Esc)") : (ko ? "전체화면" : "Fullscreen")} onClick={() => setFull(!fs)}>{fs ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
    </>
  );
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); setFull(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);
  return (
    <div className={`${styles.mermaidHelpExample}${wide ? ` ${styles.mermaidHelpExampleWide}` : ""}`}>
      <div className={styles.mermaidHelpLabelRow}>
        <div className={styles.mermaidHelpLabel}>{label}</div>
        <button type="button" className={styles.mermaidHelpCopy} onClick={() => onCopy(code)}><Copy size={13} />{ko ? "코드 복사" : "Copy code"}</button>
      </div>
      <div className={styles.mermaidHelpExampleBody}>
        <MermaidCode code={code} className={styles.mermaidHelpCode} />
        {/* 차트 컨테이너 — 우상단에 확대/축소/전체화면 컨트롤(스크롤에 안 딸려가게 뷰포트 밖) */}
        <div className={styles.mermaidHelpDiagramWrap}>
          <div className={styles.mermaidHelpDiagramCtrls}>
            {ctrlButtons(false)}
          </div>
          <div className={styles.mermaidHelpDiagram} ref={viewportRef}
            onPointerDown={onPanDown} onPointerMove={onPanMove} onPointerUp={onPanUp} onPointerCancel={onPanUp}>
            <div className={styles.mermaidHelpZoomInner} style={{ transform: `scale(${zoom})` }}>
              <MermaidPreview code={code} />
            </div>
          </div>
        </div>
      </div>
      {full && createPortal(
        <div className={styles.mermaidHelpFsOverlay}>
          <div className={styles.mermaidHelpFsBar}>
            <span className={styles.mermaidHelpFsTitle}>{label}</span>
            {/* X 대신 인라인과 동일한 툴바 — 전체화면 버튼만 축소로 전환 */}
            <div className={styles.mermaidHelpFsCtrls}>
              {ctrlButtons(true)}
            </div>
          </div>
          <div className={`${styles.mermaidHelpFsBody} ${styles.mermaidHelpFsViewport}`} ref={fsViewportRef}
            onPointerDown={onPanDown} onPointerMove={onPanMove} onPointerUp={onPanUp} onPointerCancel={onPanUp}>
            <div className={styles.mermaidHelpZoomInner} style={{ transform: `scale(${zoom})` }}>
              <MermaidPreview code={code} />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

/** mermaid 문법 도움말 (공통 Modal 콘텐츠) — 각 예시를 코드 + 실제 렌더 그래프로 나란히 보여준다. */
/* lowlight(hast) → React. mermaid 문법은 lowlightInstance 에서 등록해 둔다.
   도움말의 예제/치트시트도 에디터 코드블록과 **같은 팔레트**(globals/_hljs.css)를 쓰게 하려고
   같은 hljs-* 클래스를 그대로 내보낸다 — 여기서 색을 따로 정의하면 셋째 팔레트가 또 생긴다. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hastToReact(node: any, i: number): React.ReactNode {
  if (node.type === "text") return node.value;
  const cls = (node.properties?.className || []).join(" ") || undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <span key={i} className={cls}>{(node.children || []).map((c: any, j: number) => hastToReact(c, j))}</span>;
}

/** mermaid 코드 — 하이라이팅해서 보여준다. 문법을 못 읽으면 평문 그대로(색만 없음). */
function MermaidCode({ code, className, inline }: { code: string; className?: string; inline?: boolean }) {
  const nodes = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (lowlight.highlight("mermaid", code).children as any[]).map((n, i) => hastToReact(n, i));
    } catch { return null; }
  }, [code]);
  const body = <code>{nodes ?? code}</code>;
  return inline ? body : <pre className={className}>{body}</pre>;
}

function MermaidHelpModal({ language }: { language: string }) {
  const ko = language === "ko";
  type MRule = { code: string; desc: string };
  type MType = { key: string; label: string; intro: string; example: string; wide?: boolean; rules: MRule[]; advanced: MRule[] };
  const TYPES: MType[] = ko ? [
    {
      key: "flowchart", label: "플로우차트",
      intro: "순서도·프로세스·의사결정 흐름을 표현합니다.",
      example: "graph TD\n  A[시작] --> B{조건}\n  B -->|예| C[처리]\n  B -->|아니오| D[종료]",
      rules: [
        { code: "graph TD", desc: "첫 줄에 종류와 방향을 지정합니다. TD는 위에서 아래로, LR은 왼쪽에서 오른쪽으로 흐릅니다." },
        { code: "A[사각형]", desc: "id 와 [라벨]로 노드를 정의합니다. 같은 id 를 다시 쓰면 같은 노드를 가리킵니다." },
        { code: "B(둥근)", desc: "괄호 모양으로 도형이 바뀝니다. ( )는 둥근, ([ ])는 알약, (( ))는 원입니다." },
        { code: "C{조건}", desc: "{ }는 마름모(분기), {{ }}는 육각형입니다." },
        { code: "A --> B", desc: "화살표로 두 노드를 연결합니다. -.->는 점선, ==>는 굵은 선입니다." },
        { code: "A -->|예| B", desc: "화살표 중간의 |글자|는 연결선 라벨이 됩니다." },
      ],
      advanced: [
        { code: "subgraph 그룹 … end", desc: "여러 노드를 subgraph 이름 … end 로 묶어 하나의 그룹(영역)으로 표시합니다." },
        { code: "style A fill:#f9d", desc: "style 노드id 속성:값 으로 특정 노드의 색·테두리를 직접 지정합니다." },
        { code: "classDef 강조 fill:#faa", desc: "classDef 로 스타일을 정의하고 class 노드 강조 로 여러 노드에 한꺼번에 적용합니다." },
        { code: 'click A "https://…"', desc: 'click 노드 "URL" 로 노드를 클릭하면 링크가 열리게 합니다.' },
      ],
    },
    {
      key: "sequence", label: "시퀀스",
      intro: "참여자(객체) 사이에 시간 순서로 오가는 메시지를 표현합니다.",
      example: "sequenceDiagram\n  participant 사용자\n  participant 서버\n  사용자->>서버: 로그인 요청\n  서버-->>사용자: 토큰 응답",
      rules: [
        { code: "sequenceDiagram", desc: "이 줄로 시퀀스 다이어그램을 시작합니다." },
        { code: "participant 서버", desc: "참여자를 선언합니다. 생략하면 등장 순서대로 자동 생성됩니다." },
        { code: "A->>B: 메시지", desc: "실선 화살표로 A 가 B 에게 보내는 메시지입니다. 콜론 뒤가 내용입니다." },
        { code: "B-->>A: 응답", desc: "점선 화살표는 보통 응답(반환)에 사용합니다." },
        { code: "loop / alt / opt", desc: "loop(반복)·alt(분기)·opt(선택) 블록으로 구간을 묶습니다." },
      ],
      advanced: [
        { code: "A->>+B: 요청", desc: "화살표에 +/- 를 붙이면 활성 막대(activation)가 켜지고 꺼집니다." },
        { code: "Note over A,B: 메모", desc: "Note left of / right of / over 로 참여자 위에 주석을 답니다." },
        { code: "par … and … end", desc: "par 블록으로 동시에 일어나는 병렬 메시지를 표현합니다." },
        { code: "autonumber", desc: "맨 위에 넣으면 메시지에 순번이 자동으로 붙습니다." },
      ],
    },
    {
      key: "class", label: "클래스",
      intro: "클래스의 속성·메서드와 클래스 간 관계를 표현합니다.",
      example: "classDiagram\n  Animal <|-- Dog\n  Animal : +name\n  Animal : +eat()",
      rules: [
        { code: "classDiagram", desc: "이 줄로 클래스 다이어그램을 시작합니다." },
        { code: "class Animal", desc: "클래스를 정의합니다. 관계에 처음 등장하면 자동 생성됩니다." },
        { code: "Animal : +name", desc: "속성·메서드를 추가합니다. +는 public, -는 private 입니다." },
        { code: "Animal <|-- Dog", desc: "상속 관계입니다. Dog 가 Animal 을 상속합니다." },
        { code: "A *-- B / A o-- B", desc: "*--는 합성, o--는 집합 관계입니다." },
      ],
      advanced: [
        { code: "Animal : +int age", desc: "타입을 앞에 붙여 +타입 이름 형식으로 필드를 적습니다." },
        { code: "<<interface>> Shape", desc: "<<interface>>·<<abstract>> 등 스테레오타입을 표시합니다." },
        { code: 'Owner "1" --> "*" Pet', desc: '관계 양끝에 "1"·"*" 로 다중도(cardinality)를 적습니다.' },
        { code: "A ..> B : uses", desc: "..>는 의존 관계이며 : 뒤에 관계 설명을 답니다." },
      ],
    },
    {
      key: "state", label: "상태",
      intro: "상태와 상태 전이(상태 기계)를 표현합니다.",
      example: "stateDiagram-v2\n  [*] --> 대기\n  대기 --> 진행 : 시작\n  진행 --> 완료\n  완료 --> [*]",
      rules: [
        { code: "stateDiagram-v2", desc: "이 줄로 상태 다이어그램을 시작합니다." },
        { code: "[*] --> 대기", desc: "[*]는 시작·종료 지점을 나타냅니다." },
        { code: "대기 --> 진행", desc: "화살표로 상태 전이를 그립니다." },
        { code: "진행 --> 완료 : 조건", desc: "콜론 뒤에 전이 조건(이벤트)을 적습니다." },
      ],
      advanced: [
        { code: "state 진행 { … }", desc: "중괄호로 상태 안에 하위 상태를 넣어 복합 상태를 만듭니다." },
        { code: "state f <<fork>>", desc: "<<fork>>·<<join>> 으로 병렬 분기와 합류를 표현합니다." },
        { code: "note right of 대기", desc: "note right of / left of 상태 로 주석을 답니다." },
        { code: "--", desc: "복합 상태 안에서 -- 로 동시에 활성인 영역(병렬 상태)을 나눕니다." },
      ],
    },
    {
      key: "pie", label: "파이",
      intro: "전체 대비 비율을 원그래프로 표현합니다.",
      example: 'pie showData\n  title 과일 선호도\n  "사과" : 40\n  "바나나" : 35\n  "체리" : 25',
      rules: [
        { code: "pie showData", desc: "이 줄로 파이 차트를 시작합니다. showData 는 값을 함께 표시하는 옵션입니다." },
        { code: "title 제목", desc: "차트 제목을 지정합니다(선택)." },
        { code: '"사과" : 40', desc: '"항목" : 값 형식으로 조각을 추가합니다. 값의 비율로 크기가 정해집니다.' },
      ],
      advanced: [
        { code: "pie", desc: "showData 를 빼면 조각의 값 숫자는 숨기고 비율만 보여줍니다." },
        { code: "%% 주석", desc: "%% 로 시작하는 줄은 주석으로 무시됩니다(모든 다이어그램 공통)." },
      ],
    },
    {
      key: "gantt", label: "간트", wide: true,
      intro: "작업 일정을 시간축 막대로 표현합니다.",
      example: "gantt\n  title 프로젝트 일정\n  dateFormat YYYY-MM-DD\n  section 기획\n  요구분석 :a1, 2024-01-01, 3d\n  설계 :after a1, 2d\n  section 개발\n  구현 :after a1, 5d",
      rules: [
        { code: "gantt", desc: "이 줄로 간트 차트를 시작합니다." },
        { code: "dateFormat YYYY-MM-DD", desc: "날짜 입력 형식을 지정합니다." },
        { code: "section 기획", desc: "작업을 구획(섹션)으로 묶습니다." },
        { code: "작업 :a1, 2024-01-01, 3d", desc: "작업명 :아이디, 시작일, 기간 형식입니다. 3d 는 3일을 뜻합니다." },
        { code: "설계 :after a1, 2d", desc: "after 아이디로 앞 작업이 끝난 뒤에 이어붙입니다." },
      ],
      advanced: [
        { code: ":done / :active / :crit", desc: "작업 태그로 완료·진행 중·중요(critical) 상태를 표시합니다." },
        { code: "MS :milestone, m1, …, 0d", desc: "milestone 태그로 기간 0의 마일스톤을 찍습니다." },
        { code: "excludes weekends", desc: "주말이나 특정 날짜를 일정 계산에서 제외합니다." },
        { code: "axisFormat %m-%d", desc: "하단 시간축의 날짜 표시 형식을 바꿉니다." },
      ],
    },
    {
      key: "er", label: "ER",
      intro: "엔터티(테이블)와 그들 사이의 관계·다중도를 표현합니다.",
      example: "erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  ORDER ||--|{ LINE_ITEM : contains\n  CUSTOMER {\n    string name\n    string email\n  }",
      rules: [
        { code: "erDiagram", desc: "이 줄로 ER 다이어그램을 시작합니다." },
        { code: "CUSTOMER ||--o{ ORDER : places", desc: "두 엔터티를 관계선으로 잇고 : 뒤에 관계 이름을 적습니다." },
        { code: "||   o{   |{", desc: "선 끝 기호가 다중도입니다. ||=정확히 1, o{=0개 이상, |{=1개 이상." },
        { code: "CUSTOMER { string name }", desc: "중괄호 안에 타입과 속성명을 적어 엔터티의 필드를 정의합니다." },
      ],
      advanced: [
        { code: "string id PK", desc: "속성 뒤에 PK·FK 를 붙여 기본키·외래키를 표시합니다." },
        { code: 'string name "설명"', desc: "속성 끝에 따옴표로 주석(코멘트)을 답니다." },
      ],
    },
    {
      key: "journey", label: "여정",
      intro: "사용자가 목표를 이루기까지의 단계별 경험과 만족도를 표현합니다.",
      example: "journey\n  title 쇼핑 여정\n  section 방문\n    홈 접속: 5: 고객\n    검색: 3: 고객\n  section 구매\n    장바구니: 4: 고객\n    결제: 2: 고객, 시스템",
      rules: [
        { code: "journey", desc: "이 줄로 사용자 여정 다이어그램을 시작합니다." },
        { code: "title 제목", desc: "여정의 제목을 답니다." },
        { code: "section 방문", desc: "여정을 단계(구간)로 나눕니다." },
        { code: "작업: 5: 고객", desc: "작업: 점수(1~5): 참여자 형식입니다. 점수가 만족도이며 높을수록 좋습니다." },
      ],
      advanced: [
        { code: "결제: 2: 고객, 시스템", desc: "쉼표로 한 작업에 여러 참여자를 함께 적습니다." },
        { code: "%% 주석", desc: "%% 로 시작하는 줄은 주석으로 무시됩니다." },
      ],
    },
    {
      key: "git", label: "Git",
      intro: "커밋·브랜치·병합 등 git 흐름을 표현합니다.",
      example: "gitGraph\n  commit\n  branch develop\n  checkout develop\n  commit\n  checkout main\n  merge develop",
      rules: [
        { code: "gitGraph", desc: "이 줄로 git 그래프를 시작합니다." },
        { code: "commit", desc: "현재 브랜치에 커밋을 추가합니다." },
        { code: "branch develop", desc: "새 브랜치를 만듭니다." },
        { code: "checkout develop", desc: "해당 브랜치로 전환합니다." },
        { code: "merge develop", desc: "현재 브랜치에 다른 브랜치를 병합합니다." },
      ],
      advanced: [
        { code: 'commit id: "v1" tag: "release"', desc: "커밋에 id·tag 를 붙여 표시합니다." },
        { code: "commit type: HIGHLIGHT", desc: "type 으로 커밋 모양을 바꿉니다(NORMAL·REVERSE·HIGHLIGHT)." },
      ],
    },
    {
      key: "mindmap", label: "마인드맵",
      intro: "중심 주제에서 뻗어나가는 생각을 계층 구조로 표현합니다.",
      example: "mindmap\n  root((핵심))\n    기획\n      리서치\n      기획서\n    개발\n      프론트\n      백엔드",
      rules: [
        { code: "mindmap", desc: "이 줄로 마인드맵을 시작합니다." },
        { code: "  들여쓰기", desc: "들여쓰기 깊이로 계층을 만듭니다. 더 깊게 들여쓰면 하위 노드입니다." },
        { code: "root((핵심))", desc: "괄호 모양으로 노드 도형을 바꿉니다. (( ))=원, [ ]=사각, ) (=구름." },
      ],
      advanced: [
        { code: "::icon(fa fa-book)", desc: "노드 아래 줄에 아이콘을 붙입니다(폰트어썸 등)." },
        { code: ":::className", desc: "노드에 CSS 클래스를 지정해 스타일을 적용합니다." },
      ],
    },
    {
      key: "timeline", label: "타임라인",
      intro: "시간 순서로 사건을 나열해 연대기를 표현합니다.",
      example: "timeline\n  title 제품 로드맵\n  2023 : 기획 : 프로토타입\n  2024 : 베타 출시\n  2025 : 정식 출시",
      rules: [
        { code: "timeline", desc: "이 줄로 타임라인을 시작합니다." },
        { code: "title 제목", desc: "타임라인의 제목을 답니다." },
        { code: "2024 : 사건", desc: "기간 : 사건 형식으로 한 시점을 적습니다." },
        { code: "2024 : 사건A : 사건B", desc: "콜론으로 한 시점에 여러 사건을 나열합니다." },
      ],
      advanced: [
        { code: "section 1기", desc: "여러 시점을 구간(section)으로 묶어 그룹화합니다." },
        { code: "%% 주석", desc: "%% 로 시작하는 줄은 주석으로 무시됩니다." },
      ],
    },
  ] : [
    {
      key: "flowchart", label: "Flowchart",
      intro: "Shows flows, processes, and decision paths.",
      example: "graph TD\n  A[Start] --> B{Condition}\n  B -->|Yes| C[Handle]\n  B -->|No| D[End]",
      rules: [
        { code: "graph TD", desc: "The first line sets the type and direction. TD is top-to-bottom, LR is left-to-right." },
        { code: "A[Box]", desc: "Defines a node with an id and a [label]. Reusing an id refers to the same node." },
        { code: "B(Round)", desc: "The bracket sets the shape: ( ) round, ([ ]) stadium, (( )) circle." },
        { code: "C{If}", desc: "{ } is a diamond (branch); {{ }} is a hexagon." },
        { code: "A --> B", desc: "Connects two nodes. -.-> is dotted, ==> is a thick line." },
        { code: "A -->|Yes| B", desc: "The |text| in the middle becomes the connection's label." },
      ],
      advanced: [
        { code: "subgraph G … end", desc: "Wrap nodes in subgraph name … end to show a group/boundary." },
        { code: "style A fill:#f9d", desc: "style <id> prop:value sets a single node's color/border directly." },
        { code: "classDef big fill:#faa", desc: "Define a style with classDef, then apply it to many nodes via class <id> big." },
        { code: 'click A "https://…"', desc: 'click <id> "URL" opens a link when the node is clicked.' },
      ],
    },
    {
      key: "sequence", label: "Sequence",
      intro: "Shows messages exchanged between participants over time.",
      example: "sequenceDiagram\n  participant User\n  participant Server\n  User->>Server: Login request\n  Server-->>User: Token response",
      rules: [
        { code: "sequenceDiagram", desc: "Starts a sequence diagram." },
        { code: "participant Server", desc: "Declares a participant. If omitted, participants are created in order of appearance." },
        { code: "A->>B: Message", desc: "A solid arrow is a message from A to B. Text after the colon is the content." },
        { code: "B-->>A: Reply", desc: "A dotted arrow is typically used for a response/return." },
        { code: "loop / alt / opt", desc: "Group regions with loop (repeat), alt (branch), opt (optional)." },
      ],
      advanced: [
        { code: "A->>+B: req", desc: "Adding +/- to arrows turns an activation bar on and off." },
        { code: "Note over A,B: memo", desc: "Add notes with Note left of / right of / over." },
        { code: "par … and … end", desc: "A par block shows parallel messages happening at once." },
        { code: "autonumber", desc: "Put it at the top to number messages automatically." },
      ],
    },
    {
      key: "class", label: "Class",
      intro: "Shows class attributes, methods, and relationships.",
      example: "classDiagram\n  Animal <|-- Dog\n  Animal : +name\n  Animal : +eat()",
      rules: [
        { code: "classDiagram", desc: "Starts a class diagram." },
        { code: "class Animal", desc: "Defines a class (also auto-created when first used in a relation)." },
        { code: "Animal : +name", desc: "Adds an attribute/method. + is public, - is private." },
        { code: "Animal <|-- Dog", desc: "Inheritance — Dog extends Animal." },
        { code: "A *-- B / A o-- B", desc: "*-- is composition, o-- is aggregation." },
      ],
      advanced: [
        { code: "Animal : +int age", desc: "Prefix a type — fields are written as +type name." },
        { code: "<<interface>> Shape", desc: "Show stereotypes like <<interface>> or <<abstract>>." },
        { code: 'Owner "1" --> "*" Pet', desc: 'Add cardinality with "1" / "*" at each end of a relation.' },
        { code: "A ..> B : uses", desc: "..> is a dependency; text after : labels the relation." },
      ],
    },
    {
      key: "state", label: "State",
      intro: "Shows states and transitions (a state machine).",
      example: "stateDiagram-v2\n  [*] --> Idle\n  Idle --> Running : start\n  Running --> Done\n  Done --> [*]",
      rules: [
        { code: "stateDiagram-v2", desc: "Starts a state diagram." },
        { code: "[*] --> Idle", desc: "[*] marks the start/end point." },
        { code: "Idle --> Running", desc: "An arrow draws a state transition." },
        { code: "Running --> Done : cond", desc: "Text after the colon is the transition trigger." },
      ],
      advanced: [
        { code: "state Running { … }", desc: "Nest sub-states inside braces to make a composite state." },
        { code: "state f <<fork>>", desc: "Use <<fork>> / <<join>> for a parallel split and merge." },
        { code: "note right of Idle", desc: "Add notes with note right of / left of <state>." },
        { code: "--", desc: "Inside a composite state, -- separates concurrent (parallel) regions." },
      ],
    },
    {
      key: "pie", label: "Pie",
      intro: "Shows proportions of a whole as a pie chart.",
      example: 'pie showData\n  title Fruit poll\n  "Apple" : 40\n  "Banana" : 35\n  "Cherry" : 25',
      rules: [
        { code: "pie showData", desc: "Starts a pie chart. showData also prints the values." },
        { code: "title Text", desc: "Sets a chart title (optional)." },
        { code: '"Apple" : 40', desc: 'Add a slice as "label" : value. Size is proportional to the value.' },
      ],
      advanced: [
        { code: "pie", desc: "Without showData, values are hidden and only proportions show." },
        { code: "%% comment", desc: "Lines starting with %% are comments (works in every diagram)." },
      ],
    },
    {
      key: "gantt", label: "Gantt", wide: true,
      intro: "Shows a schedule as bars along a time axis.",
      example: "gantt\n  title Project plan\n  dateFormat YYYY-MM-DD\n  section Planning\n  Research :a1, 2024-01-01, 3d\n  Design :after a1, 2d\n  section Build\n  Implement :after a1, 5d",
      rules: [
        { code: "gantt", desc: "Starts a Gantt chart." },
        { code: "dateFormat YYYY-MM-DD", desc: "Sets the input date format." },
        { code: "section Planning", desc: "Groups tasks into a section." },
        { code: "Task :a1, 2024-01-01, 3d", desc: "Format is name :id, start, duration. 3d means 3 days." },
        { code: "Design :after a1, 2d", desc: "after <id> chains a task right after another." },
      ],
      advanced: [
        { code: ":done / :active / :crit", desc: "Task tags mark done, in-progress, and critical tasks." },
        { code: "MS :milestone, m1, …, 0d", desc: "The milestone tag places a zero-length milestone." },
        { code: "excludes weekends", desc: "Exclude weekends or specific dates from the schedule." },
        { code: "axisFormat %m-%d", desc: "Change the date format of the bottom time axis." },
      ],
    },
    {
      key: "er", label: "ER",
      intro: "Shows entities (tables) and the relationships and cardinality between them.",
      example: "erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  ORDER ||--|{ LINE_ITEM : contains\n  CUSTOMER {\n    string name\n    string email\n  }",
      rules: [
        { code: "erDiagram", desc: "Starts an ER diagram." },
        { code: "CUSTOMER ||--o{ ORDER : places", desc: "Connects two entities with a relation; text after : names it." },
        { code: "||   o{   |{", desc: "End symbols are cardinality: || exactly one, o{ zero-or-more, |{ one-or-more." },
        { code: "CUSTOMER { string name }", desc: "Define fields inside braces as type and attribute name." },
      ],
      advanced: [
        { code: "string id PK", desc: "Append PK / FK to an attribute to mark primary/foreign keys." },
        { code: 'string name "note"', desc: "Add a comment to an attribute with a quoted string." },
      ],
    },
    {
      key: "journey", label: "Journey",
      intro: "Shows a user's step-by-step experience and satisfaction toward a goal.",
      example: "journey\n  title Shopping journey\n  section Visit\n    Open home: 5: User\n    Search: 3: User\n  section Buy\n    Cart: 4: User\n    Checkout: 2: User, System",
      rules: [
        { code: "journey", desc: "Starts a user journey diagram." },
        { code: "title Text", desc: "Sets the journey title." },
        { code: "section Visit", desc: "Splits the journey into stages." },
        { code: "Task: 5: User", desc: "Format is Task: score(1-5): actor. The score is satisfaction (higher is better)." },
      ],
      advanced: [
        { code: "Checkout: 2: User, System", desc: "List several actors for one task, separated by commas." },
        { code: "%% comment", desc: "Lines starting with %% are comments." },
      ],
    },
    {
      key: "git", label: "Git",
      intro: "Shows a git flow — commits, branches, and merges.",
      example: "gitGraph\n  commit\n  branch develop\n  checkout develop\n  commit\n  checkout main\n  merge develop",
      rules: [
        { code: "gitGraph", desc: "Starts a git graph." },
        { code: "commit", desc: "Adds a commit to the current branch." },
        { code: "branch develop", desc: "Creates a new branch." },
        { code: "checkout develop", desc: "Switches to that branch." },
        { code: "merge develop", desc: "Merges another branch into the current one." },
      ],
      advanced: [
        { code: 'commit id: "v1" tag: "release"', desc: "Attach an id and tag to a commit." },
        { code: "commit type: HIGHLIGHT", desc: "type changes the commit style (NORMAL, REVERSE, HIGHLIGHT)." },
      ],
    },
    {
      key: "mindmap", label: "Mindmap",
      intro: "Shows ideas branching out from a central topic as a hierarchy.",
      example: "mindmap\n  root((Core))\n    Plan\n      Research\n      Spec\n    Build\n      Frontend\n      Backend",
      rules: [
        { code: "mindmap", desc: "Starts a mindmap." },
        { code: "  indentation", desc: "Indentation depth builds the hierarchy — deeper indent means a child node." },
        { code: "root((Core))", desc: "Brackets set the node shape: (( )) circle, [ ] square, ) ( cloud." },
      ],
      advanced: [
        { code: "::icon(fa fa-book)", desc: "Add an icon on the line below a node (Font Awesome, etc.)." },
        { code: ":::className", desc: "Assign a CSS class to a node for styling." },
      ],
    },
    {
      key: "timeline", label: "Timeline",
      intro: "Lists events in chronological order.",
      example: "timeline\n  title Product roadmap\n  2023 : Plan : Prototype\n  2024 : Beta launch\n  2025 : GA release",
      rules: [
        { code: "timeline", desc: "Starts a timeline." },
        { code: "title Text", desc: "Sets the timeline title." },
        { code: "2024 : Event", desc: "Write one point as period : event." },
        { code: "2024 : A : B", desc: "List several events at one point using colons." },
      ],
      advanced: [
        { code: "section Phase 1", desc: "Group several points into a section." },
        { code: "%% comment", desc: "Lines starting with %% are comments." },
      ],
    },
  ];
  const [tab, setTab] = useState(TYPES[0].key);
  const active = TYPES.find((x) => x.key === tab) ?? TYPES[0];
  const copy = (code: string) => {
    try { navigator.clipboard?.writeText(code); showToast(ko ? "코드 복사됨" : "Code copied", "success"); }
    catch { showToast(ko ? "복사 실패" : "Copy failed", "error"); }
  };
  return (
    <div className={styles.mermaidHelp}>
      <p className={styles.mermaidHelpIntro}>
        {ko ? "Mermaid 는 코드로 다이어그램을 그립니다. 종류별 문법을 확인하고, 예시 코드를 그래프 블록에 붙여넣어 시작하십시오." : "Mermaid draws diagrams from text. Check the syntax per type, then paste an example into a graph block to start."}
      </p>
      {/* 종류 탭 */}
      <div className={styles.mermaidHelpTabs}>
        <SegmentedControl<string>
          items={TYPES.map((x) => ({ value: x.key, label: x.label }))}
          value={tab} onChange={setTab} size="sm"
        />
      </div>
      {/* 선택된 종류의 설명 + 문법 + 고급 문법 + 예시 (각 섹션 label 분리) */}
      <div className={styles.mermaidHelpTabBody}>
        <p className={styles.mermaidHelpBasicsIntro}>{active.intro}</p>
        <section className={styles.mermaidHelpSection}>
          <div className={styles.mermaidHelpLabelRow}><span className={styles.mermaidHelpLabel}>{ko ? "문법" : "Syntax"}</span></div>
          <ul className={styles.mermaidHelpRules}>
            {active.rules.map((r) => (
              <li key={r.code} className={styles.mermaidHelpRule}>
                <MermaidCode code={r.code} inline />
                <span className={styles.mermaidHelpRuleDesc}>{r.desc}</span>
              </li>
            ))}
          </ul>
        </section>
        {active.advanced.length > 0 && (
          <section className={styles.mermaidHelpSection}>
            <div className={styles.mermaidHelpLabelRow}><span className={styles.mermaidHelpLabel}>{ko ? "고급 문법" : "Advanced"}</span></div>
            <ul className={styles.mermaidHelpRules}>
              {active.advanced.map((r) => (
                <li key={r.code} className={styles.mermaidHelpRule}>
                  <MermaidCode code={r.code} inline />
                  <span className={styles.mermaidHelpRuleDesc}>{r.desc}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <MermaidExample key={active.key} label={ko ? "예시" : "Example"} code={active.example} wide={active.wide} ko={ko} onCopy={copy} />
      </div>
    </div>
  );
}

// 코드블록 언어 — lowlight(all: highlight.js 전체) 지원. terms: 검색 별칭.
type CodeLang = SelectOption & { terms?: string[] };
const CODE_BLOCK_LANGS: ReadonlyArray<CodeLang> = [
  { value: "plaintext", label: "Plain text", terms: ["text", "txt"] },
  { value: "actionscript", label: "ActionScript", terms: ["as", "flash"] },
  { value: "apache", label: "Apache", terms: ["apacheconf", "httpd"] },
  { value: "applescript", label: "AppleScript", terms: ["osascript"] },
  { value: "x86asm", label: "Assembly", terms: ["asm", "nasm", "x86"] },
  { value: "autohotkey", label: "AutoHotkey", terms: ["ahk"] },
  { value: "awk", label: "AWK" },
  { value: "bash", label: "Bash", terms: ["shell", "sh", "zsh"] },
  { value: "basic", label: "BASIC" },
  { value: "c", label: "C" },
  { value: "clojure", label: "Clojure", terms: ["clj"] },
  { value: "cmake", label: "CMake" },
  { value: "coffeescript", label: "CoffeeScript", terms: ["coffee"] },
  { value: "cpp", label: "C++", terms: ["c++", "cplusplus"] },
  { value: "crystal", label: "Crystal", terms: ["cr"] },
  { value: "csharp", label: "C#", terms: ["c#", "cs", "dotnet"] },
  { value: "css", label: "CSS" },
  { value: "d", label: "D" },
  { value: "dart", label: "Dart" },
  { value: "delphi", label: "Delphi / Pascal", terms: ["pascal", "object pascal"] },
  { value: "diff", label: "Diff", terms: ["patch"] },
  { value: "django", label: "Django", terms: ["jinja", "jinja2"] },
  { value: "dockerfile", label: "Dockerfile", terms: ["docker"] },
  { value: "elixir", label: "Elixir", terms: ["ex"] },
  { value: "elm", label: "Elm" },
  { value: "erlang", label: "Erlang", terms: ["erl"] },
  { value: "fortran", label: "Fortran", terms: ["f90"] },
  { value: "fsharp", label: "F#", terms: ["f#", "fs"] },
  { value: "gherkin", label: "Gherkin", terms: ["cucumber"] },
  { value: "glsl", label: "GLSL", terms: ["shader"] },
  { value: "go", label: "Go", terms: ["golang"] },
  { value: "gradle", label: "Gradle" },
  { value: "graphql", label: "GraphQL", terms: ["gql"] },
  { value: "groovy", label: "Groovy" },
  { value: "haml", label: "Haml" },
  { value: "handlebars", label: "Handlebars", terms: ["hbs", "mustache"] },
  { value: "haskell", label: "Haskell", terms: ["hs"] },
  { value: "haxe", label: "Haxe", terms: ["hx"] },
  { value: "http", label: "HTTP" },
  { value: "ini", label: "INI", terms: ["conf", "properties"] },
  { value: "java", label: "Java" },
  { value: "javascript", label: "JavaScript", terms: ["js", "node", "jsx"] },
  { value: "json", label: "JSON" },
  { value: "julia", label: "Julia", terms: ["jl"] },
  { value: "kotlin", label: "Kotlin", terms: ["kt"] },
  { value: "latex", label: "LaTeX", terms: ["tex"] },
  { value: "less", label: "Less" },
  { value: "lisp", label: "Lisp", terms: ["commonlisp", "elisp", "clisp"] },
  { value: "livescript", label: "LiveScript", terms: ["ls"] },
  { value: "lua", label: "Lua" },
  { value: "makefile", label: "Makefile", terms: ["make"] },
  { value: "markdown", label: "Markdown", terms: ["md"] },
  { value: "mathematica", label: "Mathematica", terms: ["wolfram", "wl"] },
  { value: "matlab", label: "MATLAB" },
  { value: "mermaid", label: "Mermaid", terms: ["diagram"] },
  { value: "nginx", label: "Nginx" },
  { value: "nim", label: "Nim" },
  { value: "nix", label: "Nix" },
  { value: "objectivec", label: "Objective-C", terms: ["objc", "obj-c"] },
  { value: "ocaml", label: "OCaml", terms: ["ml"] },
  { value: "perl", label: "Perl", terms: ["pl"] },
  { value: "php", label: "PHP" },
  { value: "powershell", label: "PowerShell", terms: ["ps", "ps1"] },
  { value: "prisma", label: "Prisma" },
  { value: "prolog", label: "Prolog" },
  { value: "protobuf", label: "Protocol Buffers", terms: ["proto", "protobuf", "grpc"] },
  { value: "puppet", label: "Puppet" },
  { value: "python", label: "Python", terms: ["py"] },
  { value: "r", label: "R" },
  { value: "reasonml", label: "Reason", terms: ["re", "reason"] },
  { value: "ruby", label: "Ruby", terms: ["rb"] },
  { value: "rust", label: "Rust", terms: ["rs"] },
  { value: "scala", label: "Scala" },
  { value: "scheme", label: "Scheme" },
  { value: "scss", label: "SCSS", terms: ["sass"] },
  { value: "smalltalk", label: "Smalltalk" },
  { value: "sml", label: "Standard ML", terms: ["sml"] },
  { value: "solidity", label: "Solidity", terms: ["sol"] },
  { value: "sql", label: "SQL" },
  { value: "stylus", label: "Stylus", terms: ["styl"] },
  { value: "svelte", label: "Svelte" },
  { value: "swift", label: "Swift" },
  { value: "tcl", label: "Tcl" },
  { value: "thrift", label: "Thrift" },
  { value: "toml", label: "TOML" },
  { value: "twig", label: "Twig" },
  { value: "typescript", label: "TypeScript", terms: ["ts", "tsx"] },
  { value: "vala", label: "Vala" },
  { value: "vbnet", label: "VB.NET", terms: ["vb", "visualbasic"] },
  { value: "vbscript", label: "VBScript", terms: ["vbs"] },
  { value: "verilog", label: "Verilog", terms: ["v"] },
  { value: "vhdl", label: "VHDL" },
  { value: "vim", label: "Vim Script", terms: ["vimscript"] },
  { value: "vue", label: "Vue" },
  { value: "wasm", label: "WebAssembly", terms: ["wat"] },
  { value: "xml", label: "HTML / XML", terms: ["html", "xhtml", "svg"] },
  { value: "yaml", label: "YAML", terms: ["yml"] },
  // ── 추가 언어 (lowlight `all` 지원 = 하이라이팅 됨) ──
  { value: "ada", label: "Ada" },
  { value: "angelscript", label: "AngelScript", terms: ["asc"] },
  { value: "arduino", label: "Arduino", terms: ["ino"] },
  { value: "armasm", label: "ARM Assembly", terms: ["arm", "asm"] },
  { value: "asciidoc", label: "AsciiDoc", terms: ["adoc"] },
  { value: "autoit", label: "AutoIt", terms: ["au3"] },
  { value: "avrasm", label: "AVR Assembly", terms: ["avr", "asm"] },
  { value: "brainfuck", label: "Brainfuck", terms: ["bf"] },
  { value: "capnproto", label: "Cap'n Proto", terms: ["capnp"] },
  { value: "ceylon", label: "Ceylon" },
  { value: "coq", label: "Coq" },
  { value: "dos", label: "Batch / DOS", terms: ["bat", "cmd", "batch", "dos"] },
  { value: "dts", label: "Device Tree", terms: ["dts", "dtsi"] },
  { value: "ebnf", label: "EBNF" },
  { value: "erb", label: "ERB", terms: ["eruby", "rhtml"] },
  { value: "excel", label: "Excel", terms: ["xlsx", "formula"] },
  { value: "gcode", label: "G-code", terms: ["nc"] },
  { value: "gml", label: "GameMaker (GML)", terms: ["gamemaker"] },
  { value: "hy", label: "Hy", terms: ["hylang"] },
  { value: "llvm", label: "LLVM IR", terms: ["ll"] },
  { value: "mipsasm", label: "MIPS Assembly", terms: ["mips", "asm"] },
  { value: "moonscript", label: "MoonScript", terms: ["moon"] },
  { value: "n1ql", label: "N1QL", terms: ["couchbase"] },
  { value: "openscad", label: "OpenSCAD", terms: ["scad"] },
  { value: "pgsql", label: "PostgreSQL", terms: ["postgres", "postgresql", "psql"] },
  { value: "pony", label: "Pony" },
  { value: "processing", label: "Processing", terms: ["pde"] },
  { value: "purebasic", label: "PureBasic", terms: ["pb"] },
  { value: "q", label: "Q / kdb+", terms: ["kdb"] },
  { value: "qml", label: "QML", terms: ["qt"] },
  { value: "sas", label: "SAS" },
  { value: "scilab", label: "Scilab", terms: ["sci"] },
  { value: "smali", label: "Smali", terms: ["dalvik"] },
  { value: "stata", label: "Stata" },
  { value: "wren", label: "Wren" },
  { value: "xquery", label: "XQuery", terms: ["xq", "xqy"] },
  { value: "zephir", label: "Zephir", terms: ["zep"] },
];

// 언어별 메타 — 한글명(검색), 브랜드색·약어(아이콘 배지), popular(자주 쓰는 그룹).
const LANG_META: Record<string, { ko?: string; color?: string; abbr?: string; popular?: boolean }> = {
  javascript: { ko: "자바스크립트", color: "#f7df1e", abbr: "JS", popular: true },
  typescript: { ko: "타입스크립트", color: "#3178c6", abbr: "TS", popular: true },
  python: { ko: "파이썬", color: "#3776ab", abbr: "Py", popular: true },
  java: { ko: "자바", color: "#e76f00", abbr: "Ja", popular: true },
  cpp: { ko: "씨쁠쁠", color: "#00599c", abbr: "C+", popular: true },
  c: { ko: "씨", color: "#5c6bc0", abbr: "C", popular: true },
  csharp: { ko: "씨샵", color: "#68217a", abbr: "C#" },
  go: { ko: "고", color: "#00add8", abbr: "Go", popular: true },
  rust: { ko: "러스트", color: "#dea584", abbr: "Rs", popular: true },
  sql: { ko: "에스큐엘", color: "#e38c00", abbr: "SQL", popular: true },
  json: { ko: "제이슨", color: "#5a5a5a", abbr: "{}", popular: true },
  bash: { ko: "배시", color: "#4eaa25", abbr: "$_", popular: true },
  xml: { ko: "에이치티엠엘", color: "#e34f26", abbr: "<>", popular: true },
  css: { ko: "씨에스에스", color: "#1572b6", abbr: "CSS", popular: true },
  ruby: { ko: "루비", color: "#cc342d", abbr: "Rb" },
  php: { ko: "피에이치피", color: "#777bb4", abbr: "Php" },
  swift: { ko: "스위프트", color: "#f05138", abbr: "Sw" },
  kotlin: { ko: "코틀린", color: "#7f52ff", abbr: "Kt" },
  dart: { ko: "다트", color: "#0175c2", abbr: "Da" },
  scala: { ko: "스칼라", color: "#dc322f", abbr: "Sc" },
  haskell: { ko: "하스켈", color: "#5e5086", abbr: "Hs" },
  elixir: { ko: "엘릭서", color: "#6e4a7e", abbr: "Ex" },
  erlang: { ko: "얼랭", color: "#a90533", abbr: "Er" },
  clojure: { ko: "클로저", color: "#5881d8", abbr: "Cl" },
  lua: { ko: "루아", color: "#2c2d72", abbr: "Lu" },
  perl: { ko: "펄", color: "#39457e", abbr: "Pl" },
  r: { ko: "알", color: "#276dc3", abbr: "R" },
  julia: { ko: "줄리아", color: "#9558b2", abbr: "Jl" },
  objectivec: { ko: "오브젝티브씨", color: "#438eff", abbr: "OC" },
  scss: { ko: "에스씨에스에스", color: "#cc6699", abbr: "SC" },
  less: { ko: "레스", color: "#1d365d", abbr: "Le" },
  vue: { ko: "뷰", color: "#41b883", abbr: "Vue" },
  svelte: { ko: "스벨트", color: "#ff3e00", abbr: "Sv" },
  solidity: { ko: "솔리디티", color: "#363636", abbr: "Sol" },
  graphql: { ko: "그래프큐엘", color: "#e10098", abbr: "GQ" },
  markdown: { ko: "마크다운", color: "#5a5a5a", abbr: "Md" },
  yaml: { ko: "야믈", color: "#cb171e", abbr: "Ym" },
  toml: { ko: "토믈", color: "#9c4221", abbr: "Tm" },
  dockerfile: { ko: "도커", color: "#2496ed", abbr: "Dk" },
  nginx: { ko: "엔진엑스", color: "#009639", abbr: "Ng" },
  latex: { ko: "라텍", color: "#008080", abbr: "TeX" },
  mermaid: { ko: "머메이드", color: "#ff3670", abbr: "Mm" },
  wasm: { ko: "웹어셈블리", color: "#654ff0", abbr: "Wa" },
  fsharp: { color: "#378bba", abbr: "F#" },
  ocaml: { color: "#ec6813", abbr: "ML" },
  x86asm: { ko: "어셈블리", color: "#6e4c13", abbr: "Asm" },
  prisma: { color: "#2d3748", abbr: "Pr" },
  groovy: { color: "#4298b8", abbr: "Gr" },
  crystal: { color: "#333333", abbr: "Cr" },
  nim: { color: "#ffe953", abbr: "Nim" },
  zig: { color: "#f7a41d", abbr: "Zg" },
  arduino: { ko: "아두이노", color: "#00979d", abbr: "Ar" },
  pgsql: { ko: "포스트그레스", color: "#336791", abbr: "Pg" },
  ada: { ko: "에이다", color: "#02f88c", abbr: "Ada" },
  dos: { ko: "배치", color: "#4d4d4d", abbr: ">_" },
  erb: { ko: "이알비", color: "#cc342d", abbr: "Erb" },
  llvm: { ko: "엘엘브이엠", color: "#09627d", abbr: "LL" },
  processing: { ko: "프로세싱", color: "#006699", abbr: "Ps" },
  qml: { ko: "큐엠엘", color: "#41cd52", abbr: "QML" },
  asciidoc: { ko: "아스키닥", color: "#e40046", abbr: "Ad" },
  plaintext: { ko: "일반 텍스트", abbr: "Aa" },
};

// 한글 → 초성 (검색용). "자바" → "ㅈㅂ"
const CHO = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
function choseong(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    if (c >= 0xac00 && c <= 0xd7a3) out += CHO[Math.floor((c - 0xac00) / 588)];
    else out += ch;
  }
  return out;
}
// 언어의 전체 검색 토큰 (영문 terms + 한글명 + 초성)
function langSearchTerms(l: CodeLang): string[] {
  const ko = LANG_META[l.value]?.ko;
  return [
    l.value, l.label.toLowerCase(),
    ...(l.terms ?? []),
    ...(ko ? [ko, choseong(ko)] : []),
  ];
}
// 언어 아이콘 배지 — 브랜드색 + 약어. 색 없으면 중립 배지.
function LangIcon({ value, label }: SelectOption) {
  const meta = LANG_META[value];
  const abbr = meta?.abbr ?? (label.replace(/[^A-Za-z0-9#+.]/g, "").slice(0, 2) || "?");
  if (!meta?.color) {
    return <span className={`${styles.codeLangIcon} ${styles.codeLangIconPlain}`}>{abbr}</span>;
  }
  const c = meta.color.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return <span className={styles.codeLangIcon} style={{ background: meta.color, color: lum > 0.6 ? "#1a1a1a" : "#fff" }}>{abbr}</span>;
}

// ── 최근 사용 언어 (localStorage, 최대 5개, value 저장) ──
const RECENT_LANG_KEY = "code-lang-recent";
function readRecentLangs(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_LANG_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((v) => typeof v === "string") : [];
  } catch { return []; }
}
function pushRecentLang(value: string) {
  if (!value || value === "plaintext") return; // 기본값(plaintext)은 최근에 안 쌓음
  try {
    const cur = readRecentLangs().filter((v) => v !== value);
    cur.unshift(value);
    localStorage.setItem(RECENT_LANG_KEY, JSON.stringify(cur.slice(0, 5)));
  } catch { /* noop */ }
}

// 검색 정확도 점수 — 높을수록 우선(-1=미매치). 동점은 호출부에서 label 철자순 tie-break.
// 완전일치 > 별칭 완전일치 > 이름 접두 > 별칭/한글/초성 접두 > 부분 포함
function scoreLang(l: CodeLang, ql: string): number {
  const label = l.label.toLowerCase();
  const value = l.value.toLowerCase();
  if (value === ql || label === ql) return 100;
  let best = -1;
  if (value.startsWith(ql) || label.startsWith(ql)) best = 80;
  for (const term of langSearchTerms(l)) {
    if (term === ql) best = Math.max(best, 90);
    else if (term.startsWith(ql)) best = Math.max(best, 60);
    else if (term.includes(ql)) best = Math.max(best, 30);
  }
  return best;
}

// ── 공통 코드블록 언어 피커 — 트리거(현재 언어) + Popover(검색·최근·자주 쓰는·A–Z). 유일한 언어 선택 UI. ──
function CodeLangPicker({ value, onChange, language }: { value: string; onChange: (v: string) => void; language: string }) {
  const curLabel = CODE_BLOCK_LANGS.find((l) => l.value === value)?.label ?? "Plain text";
  return (
    <Popover placement="bottom-start" contentClassName={styles.codeMenuPopover}
      trigger={
        <button
          type="button"
          className={styles.codeLangTrigger}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          aria-label={language === "ko" ? "언어 선택" : "Select language"}
        >
          <LangIcon value={value} label={curLabel} />
          <span className={styles.codeLangName}>{curLabel}</span>
          <ChevronDown size={12} className={styles.codeLangCaret} />
        </button>
      }
    >
      {({ close }) => <CodeLangPickerBody value={value} onChange={onChange} language={language} close={close} />}
    </Popover>
  );
}

function CodeLangPickerBody({ value, onChange, language, close }: { value: string; onChange: (v: string) => void; language: string; close: () => void }) {
  const ko = language === "ko";
  const L = (k: string, e: string) => (ko ? k : e);
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();
  const searching = ql.length > 0;
  const recentVals = React.useMemo(() => readRecentLangs(), []); // popover 열릴 때 1회 스냅샷
  const listRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const [activeLetter, setActiveLetter] = useState("");
  const [railVisible, setRailVisible] = useState(false); // A–Z 영역에 들어왔을 때만 인덱스 노출
  const [active, setActive] = useState(0); // 화살표 네비게이션 활성 항목(플랫 인덱스)
  const pick = (v: string) => { onChange(v); pushRecentLang(v); close(); };

  // 리스트 스크롤 → 현재 위치 알파벳 계산 + A–Z 영역 진입 여부(그때만 인덱스 노출)
  const syncActive = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const anchors = Array.from(list.querySelectorAll<HTMLElement>("[data-letter]"));
    if (!anchors.length) { setRailVisible(false); return; }
    const firstTop = anchors[0].offsetTop;
    setRailVisible(list.scrollTop + list.clientHeight * 0.35 >= firstTop); // A–Z 그룹이 화면에 들어옴
    // 맨 아래까지 스크롤하면 마지막 글자(Z 등)를 active 로 — 안 그러면 하단 섹션이 감지선을 못 넘어 마지막 글자에 못 닿음
    const atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 2;
    let cur = anchors[0].dataset.letter || "";
    if (atBottom) {
      cur = anchors[anchors.length - 1].dataset.letter || cur;
    } else {
      const y = list.scrollTop + 44;
      anchors.forEach((a) => { if (a.offsetTop <= y) cur = a.dataset.letter || cur; });
    }
    setActiveLetter((p) => (p === cur ? p : cur));
  }, []);
  // activeLetter 바뀌면 rail 을 그 글자가 중앙에 오도록 스크롤(룰렛 회전)
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !activeLetter) return;
    const btn = rail.querySelector<HTMLElement>(`[data-rail-letter="${activeLetter}"]`);
    if (btn) rail.scrollTo({ top: btn.offsetTop - rail.clientHeight / 2 + btn.clientHeight / 2, behavior: "smooth" });
  }, [activeLetter]);
  // 브라우징 진입 시 1회 동기화(초기 active/visible)
  useEffect(() => { if (!searching) syncActive(); }, [searching, syncActive]);
  // 검색어/모드 바뀌면 활성 항목을 맨 위로 리셋
  useEffect(() => { setActive(0); }, [ql]);
  // 활성 항목이 바뀌면 리스트가 자동으로 스크롤돼 항상 보이게(scrollIntoView)
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active, ql]);
  // idx: 화살표 네비게이션용 플랫 인덱스, dataLetter: A–Z 그룹 첫 항목 앵커(rail 점프용)
  const renderItem = (l: CodeLang, idx: number, dataLetter?: string) => (
    <button key={l.value} type="button" className={styles.codeMenuItem} data-idx={idx} data-letter={dataLetter}
      data-active={idx === active ? "" : undefined} onMouseMove={() => setActive(idx)} onClick={() => pick(l.value)}>
      <LangIcon value={l.value} label={l.label} />
      <span className={styles.codeLangName}>{l.label}</span>
      {value === l.value && <Check size={13} className={styles.codeMenuTrailing} />}
    </button>
  );

  let body: React.ReactNode;
  const azLetters: string[] = [];
  let items: CodeLang[] = []; // 화살표 네비게이션 대상(렌더 순서대로 플랫)
  if (searching) {
    // 검색: 정확도순 정렬 + 동점은 철자순, 그룹 없이 플랫
    const scored = CODE_BLOCK_LANGS
      .map((l) => ({ l, s: scoreLang(l, ql) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s || a.l.label.localeCompare(b.l.label));
    items = scored.map((x) => x.l);
    body = items.length
      ? items.map((l, i) => renderItem(l, i))
      : <div className={styles.codeMenuEmpty}>{L("결과 없음", "No results")}</div>;
  } else {
    // 브라우징: 최근 → 자주 쓰는 → A–Z(철자순 + 알파벳 인덱스)
    const recentSet = new Set(recentVals);
    const recent = recentVals
      .map((v) => CODE_BLOCK_LANGS.find((l) => l.value === v))
      .filter((l): l is CodeLang => !!l);
    const popular = CODE_BLOCK_LANGS.filter((l) => LANG_META[l.value]?.popular && !recentSet.has(l.value));
    const rest = CODE_BLOCK_LANGS
      .filter((l) => !LANG_META[l.value]?.popular && !recentSet.has(l.value))
      .slice()
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
    items = [...recent, ...popular, ...rest];
    const baseAz = recent.length + popular.length;
    // 첫 글자(A–Z, 그 외는 "#") 그룹 — 각 그룹 첫 항목에만 data-letter 앵커
    const letterOf = (label: string) => { const c = (label[0] || "#").toUpperCase(); return /[A-Z]/.test(c) ? c : "#"; };
    let lastLetter = "";
    const azNodes = rest.map((l, i) => {
      const letter = letterOf(l.label);
      const isFirst = letter !== lastLetter;
      if (isFirst) { azLetters.push(letter); lastLetter = letter; }
      return renderItem(l, baseAz + i, isFirst ? letter : undefined);
    });
    body = (
      <>
        {recent.length > 0 && (<><div className={styles.codeMenuGroupLabel}>{L("최근", "Recent")}</div>{recent.map((l, i) => renderItem(l, i))}</>)}
        {popular.length > 0 && (<><div className={styles.codeMenuGroupLabel}>{L("자주 쓰는", "Popular")}</div>{popular.map((l, i) => renderItem(l, recent.length + i))}</>)}
        <div className={styles.codeMenuGroupLabel}>{L("A–Z", "A–Z")}</div>
        {azNodes}
      </>
    );
  }
  // 화살표 네비게이션 — active 이동 + Enter 선택
  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter") { const it = items[active]; if (it) { e.preventDefault(); pick(it.value); } }
  };

  // 알파벳 인덱스 클릭 → 해당 글자 첫 항목으로 리스트 스크롤(한 번에 이동) + 인덱스 갱신
  const jumpTo = (letter: string) => {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector<HTMLElement>(`[data-letter="${letter}"]`);
    // sticky "A–Z" 그룹 라벨 높이만큼 빼서 항목이 라벨 아래로 노출되게
    if (el) { list.scrollTop = Math.max(0, el.offsetTop - 30); setActiveLetter(letter); setRailVisible(true); }
  };

  return (
    <div className={styles.codeMenu} onKeyDown={onMenuKeyDown}>
      <div className={styles.codeMenuSearch}>
        <Search size={13} />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={L("언어 검색 (java, 자바, ㅈㅂ)", "Search (java, 자바, ㅈㅂ)")}
          spellCheck={false}
        />
      </div>
      {searching ? (
        <div className={styles.codeMenuLangList}>
          {/* 검색 결과는 정확도순 — Hint 표시 */}
          <div className={styles.codeMenuHint}>{L("정확도순 정렬", "Sorted by relevance")}</div>
          {body}
        </div>
      ) : (
        <div className={styles.codeMenuBrowse}>
          {/* 왼쪽 알파벳 인덱스 — 룰렛(위아래 그라데이션 마스크 + 현재 글자 중앙 정렬, circle indicator).
              A–Z 영역에 들어왔을 때만 노출. 클릭 시 해당 글자로 점프. */}
          {azLetters.length > 1 && (
            <div className={styles.codeAzRail} ref={railRef} data-visible={railVisible ? "" : undefined} aria-hidden={!railVisible}>
              {azLetters.map((lt) => (
                <button key={lt} type="button" data-rail-letter={lt} data-active={lt === activeLetter ? "" : undefined}
                  className={styles.codeAzLetter} tabIndex={railVisible ? 0 : -1}
                  onMouseDown={(e) => e.preventDefault()} onClick={() => jumpTo(lt)}>{lt}</button>
              ))}
            </div>
          )}
          <div className={styles.codeMenuLangList} ref={listRef} onScroll={syncActive}>{body}</div>
        </div>
      )}
    </div>
  );
}

export function CodeBlockElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const selected = useSelected();
  const { t, language } = useLanguage();
  const openModal = useModalStore((s) => s.openModal);
  const [uiFocused, setUiFocused] = useState(false); // 컨트롤(popover 등) 상호작용 시 바 유지
  const el = props.element as Record<string, unknown>;
  const wrap = (el.wrap as boolean) ?? false;
  const lang = el.lang as string | undefined;
  const isMermaid = lang === "mermaid";
  /* 그래프 블록 뷰 — 코드만 / 다이어그램만 / 나란히(split).
     **노드에 저장한다**(로컬 state 아님). 의도가 다른 두 경우를 갈라야 하기 때문:
       · 다이어그램을 직접 추가(슬래시/툴바) → 삽입할 때 graphView:"split" 을 박아 넣는다 → 나란히
       · 코드블록에 mermaid 를 쓰거나 붙여넣어 lang 만 mermaid 가 된 경우 → graphView 없음 → 코드만
     로컬 state 로는 이 둘이 구분이 안 돼서, 기본 split 이면 코드블록이 제멋대로 다이어그램이 되고
     기본 code 면 다이어그램을 추가해도 코드만 보였다.
     덤으로 사용자가 고른 뷰가 저장되고 다시 열어도 유지된다. */
  const graphView = ((el.graphView as "code" | "diagram" | "split") ?? "split");
  /* **다이어그램 블록인가**는 lang 이 아니라 graphView 유무로 정한다.
     다이어그램 블록은 code_block + lang:"mermaid" 로 구현돼 있어서 lang 만으로 가르면,
     코드블록에서 mermaid 를 고르거나 붙여넣기로 감지되는 순간 언어 피커가 뷰 토글로 바뀌고
     그래프까지 떠서 사실상 블록 종류가 바뀌어 버린다.
     → graphView 는 "다이어그램으로 추가했다"는 의도 표시다. 슬래시/툴바로 삽입할 때만 박힌다.
       lang:"mermaid" 만 있는 코드블록은 mermaid **하이라이팅만** 받고 코드블록으로 남는다. */
  const isDiagram = isMermaid && el.graphView != null;
  const showCode = !isDiagram || graphView !== "diagram";
  const showDiagram = isDiagram && graphView !== "code";
  const isSplit = isDiagram && graphView === "split";
  // split 시 코드/그래프 폭 비율(%) — 가운데 핸들 드래그로 조절
  const [splitPct, setSplitPct] = useState(50);
  const splitRef = useRef<HTMLDivElement>(null);
  const onSplitHandleDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const container = splitRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const onMove = (ev: PointerEvent) => {
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.min(80, Math.max(20, pct)));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = "";
    };
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  /* 빈 코드블록 판정. 자식이 code_line 이 아니라 raw 텍스트인 깨진 구조(→ plugins/code-block-kit 의
     CodeBlockStructureKit 참고)에서도 오판하지 않게 텍스트 노드도 같이 본다.
     예전엔 line.children 만 봐서, 텍스트 자식이면 undefined → "비었다"로 판정 →
     글자가 멀쩡히 있는데 placeholder 가 겹쳐 보였다. */
  const isEmpty = !el.children || (el.children as Array<{ text?: string; children?: Array<{ text?: string }> }>).every(
    (line) => !(line.text && line.text.length > 0)
      && !line.children?.some((leaf) => leaf.text && leaf.text.length > 0),
  );
  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();
  const setGraphView = (v: "code" | "diagram" | "split") => {
    if (elPath) editor.tf.setNodes({ graphView: v }, { at: elPath });
  };
  const { blockDragProps } = useBlockDrag(elPath);
  // 코드블록 위에 뜨는 floating bar 앵커 — 코드블록 DOM(pre) rect
  const getAnchorRect = () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dom = editor.api.toDOMNode(props.element as any);
      return (dom as HTMLElement | null)?.getBoundingClientRect() ?? new DOMRect();
    } catch { return new DOMRect(); }
  };
  // code_line 들을 \n 으로 join (api.string 은 줄바꿈을 안 넣음 → mermaid 파싱 실패)
  const mermaidSource = isDiagram
    ? ((el.children as Array<{ children?: Array<{ text?: string }> }>) || [])
        .map((line) => (line.children || []).map((leaf) => leaf.text || "").join(""))
        .join("\n")
    : "";

  const toggleWrap = () => {
    if (elPath) editor.tf.setNodes({ wrap: !wrap }, { at: elPath });
  };

  // ── 코드블록 "..." 메뉴 액션 핸들러 ──
  const getCodeText = () =>
    ((el.children as Array<{ children?: Array<{ text?: string }> }>) || [])
      .map((line) => (line.children || []).map((leaf) => leaf.text || "").join(""))
      .join("\n");
  const handleCopy = () => {
    navigator.clipboard?.writeText(getCodeText());
    showToast(language === "ko" ? "코드 복사됨" : "Code copied", "success");
  };
  const setLang = (v: string) => {
    if (elPath) editor.tf.setNodes({ lang: v }, { at: elPath });
  };
  // 깊은 복제 시 Plate id 충돌 방지 — id 재귀 제거(normalize 가 새 id 부여)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stripIds = (n: any): any => {
    if (Array.isArray(n)) return n.map(stripIds);
    if (n && typeof n === "object") {
      const { id: _id, ...rest } = n as Record<string, unknown>;
      void _id;
      if ("children" in rest) rest.children = stripIds(rest.children);
      return rest;
    }
    return n;
  };
  const handleDuplicate = () => {
    if (!elPath) return;
    const nextPath = [...elPath.slice(0, -1), elPath[elPath.length - 1] + 1];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try { editor.tf.insertNodes(stripIds(props.element) as any, { at: nextPath }); } catch { /* noop */ }
  };
  const handleMoveUp = () => {
    if (!elPath) return;
    const i = elPath[elPath.length - 1];
    if (i <= 0) return;
    try { editor.tf.moveNodes({ at: elPath, to: [...elPath.slice(0, -1), i - 1] }); } catch { /* noop */ }
  };
  const handleMoveDown = () => {
    if (!elPath) return;
    const i = elPath[elPath.length - 1];
    try { editor.tf.moveNodes({ at: elPath, to: [...elPath.slice(0, -1), i + 1] }); } catch { /* noop */ }
  };
  const handleDelete = () => {
    if (!elPath) return;
    try { editor.tf.removeNodes({ at: elPath }); } catch { /* noop */ }
  };
  /* 내용 제거 — 블록 노드는 **그대로 두고** 안의 텍스트만 지운다.
     예전엔 removeNodes + insertNodes 로 블록을 통째로 갈아치웠는데, removeNodes 가 selection 을
     날려서 커서가 이전 형제 블록으로 튕겨나갔다. 그 상태로 붙여넣으면 Plate 의 코드블록 붙여넣기
     핸들러가 `api.block()` 이 code_line 이 아니라며 건너뛰고 기본 붙여넣기로 떨어져서,
     내용이 코드블록이 아니라 엉뚱한 블록에 꽂히고 코드블록은 빈 채(=placeholder 그대로) 남았다.
     노드를 유지하면 lang/wrap/graphView 도 자동으로 보존된다. */
  const handleClear = () => {
    if (!elPath) return;
    try {
      const start = editor.api.start(elPath);
      const end = editor.api.end(elPath);
      if (start && end) editor.tf.delete({ at: { anchor: start, focus: end } });
      // 커서를 블록 안에 되돌려 놓는다 — 지운 직후 바로 붙여넣기/타이핑이 이어지므로.
      const caret = editor.api.start(elPath);
      if (caret) editor.tf.select(caret);
    } catch { /* noop */ }
  };
  // 코드 포맷팅 — Prettier 지연 로딩. 코드블록 전체를 포맷 결과(code_line 들)로 교체.
  const handleFormat = async () => {
    if (!elPath || !lang) return;
    const code = getCodeText();
    if (!code.trim()) return;
    try {
      const out = await formatCode(lang, code);
      if (out === code) {
        showToast(language === "ko" ? "이미 포맷되어 있습니다." : "Already formatted.", "info");
        return;
      }
      const lineType = ((el.children as Array<{ type?: string }>)[0]?.type as string) || "code_line";
      const codeType = (el.type as string) || "code_block";
      const newChildren = out.split("\n").map((line) => ({ type: lineType, children: [{ text: line }] }));
      editor.tf.withoutNormalizing(() => {
        editor.tf.removeNodes({ at: elPath });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        editor.tf.insertNodes({ type: codeType, ...(lang ? { lang } : {}), ...(wrap ? { wrap } : {}), children: newChildren } as any, { at: elPath });
      });
      showToast(language === "ko" ? "코드 포맷팅 완료" : "Code formatted", "success");
    } catch {
      showToast(language === "ko" ? "포맷팅에 실패했습니다 — 문법 오류일 수 있습니다." : "Format failed — check syntax.", "error");
    }
  };

  return (
    <BlockDropZone path={elPath}>
    {/* 언어 변경 시 code-syntax 재decoration 으로 leaf 의 hook 구조가 바뀌어 React hook 순서 에러 →
        lang 을 key 로 줘서 변경 시 subtree 를 새로 마운트(leaf 를 fresh 하게)해 비교 자체를 피한다. */}
    <div key={`cb-${lang ?? "plaintext"}`} {...blockDragProps} style={{ cursor: "default" }}>
    {/* 코드블록 floating bar — 선택/포커스 시 코드블록 위에 뜸(다른 블록과 동일 패턴).
        main: 언어 · 포맷팅 · 줄바꿈 · 복사 / ⋯: 복제·이동·삭제(블록 관리). keepInView 로 스크롤 추적. */}
    <FloatingBar open={selected || uiFocused} getAnchorRect={getAnchorRect} inline keepInView
      onFocusCapture={() => setUiFocused(true)}
      onBlurCapture={() => setUiFocused(false)}>
      {/* 다이어그램 뷰 토글(코드/다이어그램/스플릿) — 다이어그램 블록에서만.
          일반 코드블록은 언어·복사·줄바꿈이 인라인 바(창 헤더)로 이동했고, floating 엔 포맷·⋯ 만 둔다. */}
      {isDiagram && (
        <span onMouseDown={(e) => e.stopPropagation()} style={{ display: "inline-flex", marginRight: "var(--spacing-3xs)" }}>
          <SegmentedControl<"code" | "diagram" | "split">
            items={[
              { value: "code", label: language === "ko" ? "코드" : "Code" },
              { value: "diagram", label: language === "ko" ? "다이어그램" : "Diagram" },
              { value: "split", label: language === "ko" ? "스플릿" : "Split" },
            ]}
            value={graphView}
            onChange={setGraphView}
            size="sm"
          />
        </span>
      )}
      {isFormattable(lang) && (
        <button
          type="button"
          className={styles.codeBarBtn}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleFormat(); }}
        >
          <Sparkles size={13} />{language === "ko" ? "포맷" : "Format"}
        </button>
      )}
      {isDiagram && (
        <>
          <button
            type="button"
            className={styles.codeBarBtn}
            data-on={wrap ? "" : undefined}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); toggleWrap(); }}
          >
            <WrapText size={13} />{language === "ko" ? "줄바꿈" : "Wrap"}
          </button>
          <Tooltip content={language === "ko" ? "코드 복사" : "Copy code"} placement="bottom">
            <button
              type="button"
              className={styles.codeCtrlBtn}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleCopy(); }}
              aria-label={language === "ko" ? "코드 복사" : "Copy code"}
            >
              <Copy size={14} />
            </button>
          </Tooltip>
          <HelpButton
            size="sm"
            soundDisabled
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={() => openModal(<MermaidHelpModal language={language} />, {
              header: {
                title: language === "ko" ? "Mermaid 문법 도움말" : "Mermaid syntax help",
                actions: (
                  <a className={styles.mermaidHelpLink} href="https://mermaid.js.org/intro/" target="_blank" rel="noopener noreferrer">
                    {language === "ko" ? "전체 문서 보기" : "Full documentation"} <ExternalLink size={12} />
                  </a>
                ),
              },
              width: "min(56rem, 94vw)",
            })}
            aria-label={language === "ko" ? "Mermaid 문법 도움말" : "Mermaid syntax help"}
          />
        </>
      )}
      <Popover
        openOnHover
        placement="bottom-end"
        contentClassName={styles.codeMenuPopover}
        trigger={
          <button
            type="button"
            className={styles.codeCtrlBtn}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            aria-label={language === "ko" ? "더보기" : "More"}
          >
            <MoreHorizontal size={16} />
          </button>
        }
      >
        {({ close }) => (
          <BlockActionsMenu
            close={close}
            language={language}
            actions={{
              onDuplicate: handleDuplicate,
              onMoveUp: handleMoveUp,
              onMoveDown: handleMoveDown,
              onClear: handleClear,
              onDelete: handleDelete,
            }}
          />
        )}
      </Popover>
    </FloatingBar>
    {isDiagram ? (
      /* mermaid: 뷰 토글에 따라 코드/다이어그램/나란히. split 은 코드·그래프가 같은 컨테이너(동일 높이)에
         좌우로 들어가고 가운데 핸들로 폭 비율 조절(넓으면 좌우, 좁으면 위아래로 스택). */
      <div
        className={isSplit ? styles.graphSplit : showCode ? styles.graphCodeShell : undefined}
        ref={splitRef}
        style={isSplit ? ({ ["--split-pct" as string]: `${splitPct}%` } as React.CSSProperties) : undefined}
      >
        <PlateElement
          {...props}
          as="pre"
          className={isSplit ? styles.graphSplitCode : undefined}
          style={{
            ...props.style,
            position: "relative",
            ...(showCode ? {} : { display: "none" }),
            /* code-only 뷰: 마진은 graphCodeShell 이 갖고 pre 는 shell 을 꽉 채운다(오버레이 정렬용). resize 는 CSS(.slate-code_block)가 부여. */
            ...(isSplit ? { minWidth: 0, margin: 0, maxHeight: "none", resize: "none" } : { margin: 0 }),
          }}
        >
          <code
            data-code-placeholder={isEmpty ? t("editor.codeEnter") : undefined}
            style={{ position: "relative", whiteSpace: wrap ? "pre-wrap" : "pre", wordBreak: wrap ? "break-all" : undefined }}
          >
            {props.children}
          </code>
        </PlateElement>
        {/* code-only 뷰 리사이즈 오버레이 — pre(.slate-code_block)의 형제로 네이티브 resizer 위에 얹혀
            시스템 커서를 가린다(일반 코드블록 codeShell·리더 code-block-outer 와 동일). */}
        {showCode && !isSplit && (
          <div
            className={styles.codeResizeHandle}
            contentEditable={false}
            data-cursor="resizeV"
            aria-hidden
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // resize 는 pre(.slate-code_block)가 가진다 — 오버레이는 pre 의 형제(previousElementSibling).
              const pre = (e.currentTarget as HTMLElement).previousElementSibling as HTMLElement | null;
              if (!pre) return;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              const startY = e.clientY;
              const startH = pre.offsetHeight;
              const onMove = (ev: PointerEvent) => {
                pre.style.height = `${Math.max(80, Math.min(window.innerHeight * 0.8, startH + (ev.clientY - startY)))}px`;
                pre.style.maxHeight = "none";
              };
              const onUp = () => {
                document.removeEventListener("pointermove", onMove);
                document.removeEventListener("pointerup", onUp);
              };
              document.addEventListener("pointermove", onMove);
              document.addEventListener("pointerup", onUp);
            }}
          />
        )}
        {isSplit && showDiagram && (
          <div className={styles.graphSplitHandle} contentEditable={false} role="separator" aria-label="resize"
            data-cursor="resizeH"
            onMouseDown={(e) => e.stopPropagation()} onPointerDown={onSplitHandleDown}>
            <span className={styles.graphSplitHandleBar} />
          </div>
        )}
        {showDiagram && <MermaidPreview code={mermaidSource} split={isSplit} />}
      </div>
    ) : (
      /* 일반 코드블록 = 리더뷰와 같은 창(신호등 헤더 + 코드). WYSIWYG.
         언어(인터랙티브 피커)·복사·줄바꿈은 헤더 인라인 바로. 헤더는 contentEditable=false 로 Slate 밖.
         codeShell 은 리사이즈 오버레이가 창의 형제가 되게 하는 바깥 컨테이너(리더 .code-block-outer 와 동일). */
      <div className={styles.codeShell}>
      <div className={styles.codeWindow}>
        <div className={styles.codeBar} contentEditable={false} onMouseDown={(e) => e.stopPropagation()}>
          <span className={styles.codeBarLang} onMouseDown={(e) => e.stopPropagation()}>
            <CodeLangPicker value={lang ?? "plaintext"} onChange={setLang} language={language} />
          </span>
          <div className={styles.codeBarControls}>
            <button
              type="button"
              className={styles.codeBarCtrl}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleCopy(); }}
              aria-label={language === "ko" ? "코드 복사" : "Copy code"}
            >
              <Copy size={12} />{language === "ko" ? "복사" : "Copy"}
            </button>
            <button
              type="button"
              className={styles.codeBarCtrl}
              data-on={wrap ? "" : undefined}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); toggleWrap(); }}
            >
              <WrapText size={12} />{language === "ko" ? "줄바꿈" : "Wrap"}
            </button>
          </div>
        </div>
        {/* placeholder 는 DOM 노드가 아니라 ::before 로 그린다(globals/_hljs.css) — Slate 경로 매핑이 어긋나지 않게. */}
        <PlateElement {...props} as="pre" style={{ ...props.style, position: "relative" }}>
          <code
            data-code-placeholder={isEmpty ? t("editor.codeEnter") : undefined}
            style={{ position: "relative", whiteSpace: wrap ? "pre-wrap" : "pre", wordBreak: wrap ? "break-all" : undefined }}
          >
            {props.children}
          </code>
        </PlateElement>
        </div>
        {/* 커스텀 세로 리사이즈 핸들 — 창(codeWindow)의 형제(codeShell 안). 창의 자식이면 UA resizer 가
            오버레이 위에 그려져 시스템 커서가 샌다. data-cursor 로 커스텀 커서, cursor:none 로 시스템 커서 숨김. */}
        <div
          className={styles.codeResizeHandle}
          contentEditable={false}
          data-cursor="resizeV"
          aria-hidden
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // resize 는 창(codeWindow)이 가진다 — 오버레이는 창의 형제(previousElementSibling)라 창의 네이티브 resizer 위에 얹힌다.
            const win = (e.currentTarget as HTMLElement).previousElementSibling as HTMLElement | null;
            if (!win) return;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            const startY = e.clientY;
            const startH = win.offsetHeight;
            const onMove = (ev: PointerEvent) => {
              win.style.height = `${Math.max(128, Math.min(window.innerHeight * 0.8, startH + (ev.clientY - startY)))}px`;
              win.style.maxHeight = "none";
            };
            const onUp = () => {
              document.removeEventListener("pointermove", onMove);
              document.removeEventListener("pointerup", onUp);
            };
            document.addEventListener("pointermove", onMove);
            document.addEventListener("pointerup", onUp);
          }}
        />
      </div>
    )}
    </div>
    </BlockDropZone>
  );
}

// ── Paragraph 엘리먼트 (todo 체크박스 렌더링 + 블록 드롭 존) ──
// 빈 블록인지 (단일 빈 텍스트 노드) — placeholder 표시 판단용
function isEmptyBlock(element: unknown): boolean {
  const ch = (element as { children?: { text?: string }[] })?.children;
  return !!ch && ch.length === 1 && (ch[0]?.text ?? "") === "";
}
// 커서가 놓인 빈 블록에 뜨는 placeholder (contentEditable=false, 흐름 밖)
function BlockPlaceholder({ text }: { text: string }) {
  return (
    <span
      contentEditable={false}
      className={styles.blockPlaceholder}
      // right:0 + overflow ellipsis — 열 너비가 좁으면 잘리는 대신 말줄임표(…)
      style={{ position: "absolute", left: "var(--float-edge, 0px)", right: 0, top: 0, pointerEvents: "none", color: "var(--text-muted)", opacity: 0.45, userSelect: "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}
    >
      {text}
    </span>
  );
}

export function ParagraphElement(props: PlateElementProps) {
  const { t } = useLanguage();
  const editor = useEditorRef();
  const selected = useSelected();
  const el = props.element as Record<string, unknown>;
  const hasTodo = Object.hasOwn(el, "checked");
  // 포커스된 빈 문단, 또는 문서가 빈 단일 블록일 때(=빈 에디터) placeholder 표시.
  // 단 여러 블록을 선택(드래그)한 상태에선 숨김.
  const sel0 = editor.selection;
  const multiBlock = !!sel0 && sel0.anchor.path[0] !== sel0.focus.path[0];
  // 확장(range) 선택 — 표 여러 셀 선택 등. 이때는 커서가 아니므로 placeholder 숨김.
  const collapsed = !!sel0 && sel0.anchor.offset === sel0.focus.offset && sel0.anchor.path.join() === sel0.focus.path.join();
  const showPlaceholder = !hasTodo && !multiBlock && isEmptyBlock(props.element) && ((selected && collapsed) || editor.children.length === 1);

  // table 안에 Slate가 삽입하는 빈 paragraph → <div>가 <tbody> 안에 들어가면 안 됨
  const parentType = (() => {
    try {
      const path = editor.api.findPath(props.element);
      if (!path || path.length < 2) return null;
      const parentPath = path.slice(0, -1);
      const parent = editor.api.node(parentPath);
      return (parent?.[0] as Record<string, unknown>)?.type as string | undefined;
    } catch { return null; }
  })();
  const isInsideTable = parentType === "table" || parentType === "tr";
  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();

  if (!hasTodo) {
    if (isInsideTable) {
      return <PlateElement {...props} as="span" style={{ display: "none" }} />;
    }
    return (
      <BlockDropZone path={elPath}>
        <PlateElement {...props} as="div" style={{ marginBottom: "var(--spacing-xs)", ...props.style, position: "relative" }}>
          {showPlaceholder && <BlockPlaceholder text={t("editor.phParagraph")} />}
          {props.children}
        </PlateElement>
      </BlockDropZone>
    );
  }

  const checked = !!el.checked;
  const todoPath = editor.api.findPath(props.element);

  return (
    <BlockDropZone path={elPath}>
      <PlateElement
        {...props}
        as="div"
        style={{
          ...props.style,
          display: "flex",
          alignItems: "flex-start",
          gap: 6,
          listStyleType: "none",
        }}
      >
        <span
          contentEditable={false}
          onClick={() => { if (todoPath) editor.tf.setNodes({ checked: !checked }, { at: todoPath }); }}
          style={{
            flexShrink: 0,
            width: 16,
            height: 16,
            marginTop: 3,
            borderRadius: 3,
            border: checked ? "none" : "1.5px solid var(--text-tertiary)",
            background: checked ? "var(--bg-inverse)" : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background 0.15s, border-color 0.15s",
          }}
        >
          {checked && (
            <Check size={10} stroke="var(--bg-primary)" strokeWidth={2} />
          )}
        </span>
        <span style={{ flex: 1, textDecoration: checked ? "line-through" : undefined, color: checked ? "var(--text-muted)" : undefined }}>
          {props.children}
        </span>
      </PlateElement>
    </BlockDropZone>
  );
}

/** URL → embed 정보 */
type EmbedInfo =
  | { type: "iframe"; src: string; aspect?: string }
  | { type: "script"; platform: string; id: string; href: string }
  | { type: "video"; src: string }
  | null;

const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i;

function parseEmbed(url: string): EmbedInfo {
  // 직접 업로드된 비디오 파일
  if (VIDEO_EXTENSIONS.test(url)) return { type: "video", src: url };

  let m: RegExpMatchArray | null;
  // YouTube
  m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)([\w-]+)/);
  if (m) return { type: "iframe", src: `https://www.youtube.com/embed/${m[1]}` };
  // YouTube Shorts
  m = url.match(/youtube\.com\/shorts\/([\w-]+)/);
  if (m) return { type: "iframe", src: `https://www.youtube.com/embed/${m[1]}` };
  // Vimeo
  m = url.match(/vimeo\.com\/(\d+)/);
  if (m) return { type: "iframe", src: `https://player.vimeo.com/video/${m[1]}` };
  // Spotify
  m = url.match(/open\.spotify\.com\/(track|album|playlist|episode|show)\/([\w]+)/);
  if (m) return { type: "iframe", src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, aspect: m[1] === "track" ? "352/80" : "352/380" };
  // SoundCloud
  if (/soundcloud\.com\//.test(url)) return { type: "iframe", src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false`, aspect: "100/166" };
  // X (Twitter)
  m = url.match(/(?:twitter\.com|x\.com)\/.+\/status\/(\d+)/);
  if (m) return { type: "script", platform: "twitter", id: m[1], href: url };
  // Instagram
  m = url.match(/instagram\.com\/(?:p|reel)\/([\w-]+)/);
  if (m) return { type: "script", platform: "instagram", id: m[1], href: url };
  // Facebook post/video
  if (/facebook\.com\/.+\/(posts|videos|photos)\//.test(url) || /fb\.watch\//.test(url)) {
    return { type: "iframe", src: `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=true&width=500`, aspect: "500/600" };
  }
  // TikTok
  m = url.match(/tiktok\.com\/@[\w.]+\/video\/(\d+)/);
  if (m) return { type: "iframe", src: `https://www.tiktok.com/embed/v2/${m[1]}`, aspect: "325/580" };
  // Figma
  if (/figma\.com\/(file|design|proto)\//.test(url)) {
    return { type: "iframe", src: `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}` };
  }
  // CodePen
  m = url.match(/codepen\.io\/([\w-]+)\/pen\/([\w]+)/);
  if (m) return { type: "iframe", src: `https://codepen.io/${m[1]}/embed/${m[2]}?default-tab=result` };
  // CodeSandbox — /s/<id>, /embed/<id>, /p/sandbox/<id>
  m = url.match(/codesandbox\.io\/(?:s|embed)\/([\w-]+)/) || url.match(/codesandbox\.io\/p\/sandbox\/([\w-]+)/);
  if (m) return { type: "iframe", src: `https://codesandbox.io/embed/${m[1]}?view=preview&hidenavigation=1`, aspect: "16/11" };
  // StackBlitz — /edit/<slug>, /github/<owner>/<repo>
  if (/stackblitz\.com\/(edit|github)\//.test(url)) {
    const base = url.split(/[?#]/)[0];
    return { type: "iframe", src: `${base}?embed=1&view=preview`, aspect: "16/11" };
  }
  // Google Maps
  if (/google\.\w+\/maps/.test(url)) {
    return { type: "iframe", src: `https://maps.google.com/maps?q=${encodeURIComponent(url)}&output=embed` };
  }
  return null;
}

/** X/Instagram embed script 로더 */
function ScriptEmbed({ platform, href }: { platform: string; href: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (platform === "twitter") {
      // Twitter/X embed
      const blockquote = document.createElement("blockquote");
      blockquote.className = "twitter-tweet";
      blockquote.setAttribute("data-dnt", "true");
      const a = document.createElement("a");
      a.href = href;
      blockquote.appendChild(a);
      el.appendChild(blockquote);

      const script = document.createElement("script");
      script.src = "https://platform.twitter.com/widgets.js";
      script.async = true;
      el.appendChild(script);

      // twttr이 이미 로드된 경우
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).twttr?.widgets) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).twttr.widgets.load(el);
      }
    } else if (platform === "instagram") {
      const blockquote = document.createElement("blockquote");
      blockquote.className = "instagram-media";
      blockquote.setAttribute("data-instgrm-permalink", href);
      blockquote.setAttribute("data-instgrm-version", "14");
      blockquote.style.maxWidth = "540px";
      blockquote.style.width = "100%";
      el.appendChild(blockquote);

      const script = document.createElement("script");
      script.src = "https://www.instagram.com/embed.js";
      script.async = true;
      el.appendChild(script);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).instgrm?.Embeds) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).instgrm.Embeds.process();
      }
    }

    return () => { el.innerHTML = ""; };
  }, [platform, href]);

  return <div ref={containerRef} style={{ maxWidth: 550 }} />;
}

/** 미디어 임베드 — iframe / script / video 렌더링 */
export function MediaEmbedElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const selected = useSelected();
  const focused = useFocused();
  const el = props.element as Record<string, unknown>;
  const url = (el.url as string) || "";
  const nodeMediaType = (el.mediaType as string) || "";
  const embed = useMemo(
    () => (nodeMediaType === "video" ? { type: "video" as const, src: url } : parseEmbed(url)),
    [nodeMediaType, url],
  );
  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();
  const { blockDragProps } = useBlockDrag(elPath);
  const isVideo = embed?.type === "video";

  // 동영상 정렬/크기 속성
  const vidAlign = (el.align as string) || "center";
  const vidWidth = (el.width as number) || 0;
  const vidHeight = (el.height as number) || 0;
  const vidLayout = (el.layout as string) || "block";
  const vidLock = (el.lockAspect as boolean) ?? true;
  // 재생 옵션 + 캡션 + 다운로드 방지
  // vidAutoplay 는 여기서 안 읽는다 — autoplay 는 편집을 방해해서 에디터엔 일부러 미적용이고,
  // 발행 HTML 에만 직렬화기(plateSerializer)가 넣는다.
  const vidLoop = (el.vidLoop as boolean) || false;
  const vidMuted = (el.vidMuted as boolean) || false;
  const vidStart = (el.vidStart as number) || 0;
  const noDownload = (el.noDownload as boolean) ?? false;
  const caption = (el.caption as string) || "";
  const [captionEditing, setCaptionEditing] = useState(false);
  const showCaption = !!(caption || captionEditing);

  // 이미지처럼 — 선택(void 가 selection 에 포함) + 포커스면 핸들/아웃라인 표시
  const isActive = isVideo && selected && focused;

  const videoElRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 툴바 "캡션" 버튼 → 동영상 DOM 에 커스텀 이벤트 → 편집 모드 진입 + input focus (이미지와 동일)
  useEffect(() => {
    const node = videoElRef.current;
    if (!node) return;
    const handler = () => {
      setCaptionEditing(true);
      requestAnimationFrame(() => {
        const input = node.querySelector("[data-img-caption]") as HTMLElement | null;
        if (input) {
          input.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
          setTimeout(() => input.focus(), 0);
        }
      });
    };
    node.addEventListener(CAPTION_EDIT_EVENT.video, handler);
    return () => node.removeEventListener(CAPTION_EDIT_EVENT.video, handler);
  }, []);
  const [resizeSize, setResizeSize] = useState<{ w: number; h: number } | null>(null);
  const draggingRef = useRef<{ handle: "right" | "bottom" | "corner"; startX: number; startY: number; startW: number; startH: number; ratio: number } | null>(null);

  const setMediaAttr = useCallback((attrs: Record<string, unknown>) => {
    if (elPath) editor.tf.setNodes(attrs, { at: elPath });
  }, [editor, elPath]);

  // 클릭 시 media_embed void 노드를 명시적으로 선택 (이미지 selectImage 와 동일) →
  // selected 가 켜져야 리사이즈 핸들/툴바가 뜬다. preventDefault 안 해서 video 컨트롤은 그대로 동작.
  const selectVideo = useCallback(() => {
    if (!elPath) return;
    try {
      const anchor = editor.api.start(elPath);
      const focus = editor.api.end(elPath);
      editor.tf.focus();
      if (anchor && focus) editor.tf.select({ anchor, focus });
      else editor.tf.select(elPath);
    } catch { /* ignore */ }
  }, [editor, elPath]);

  // 이미지와 동일한 다중 핸들 리사이즈 (동영상은 왜곡 방지 위해 항상 비율 유지)
  const onPointerDown = useCallback((handle: "right" | "bottom" | "corner") => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    const rect = vid.getBoundingClientRect();
    draggingRef.current = { handle, startX: e.clientX, startY: e.clientY, startW: rect.width, startH: rect.height, ratio: rect.width / rect.height };

    const onPointerMove = (ev: PointerEvent) => {
      const d = draggingRef.current;
      if (!d || !vid) return;
      const dx = ev.clientX - d.startX;
      const dy = ev.clientY - d.startY;
      let newW: number, newH: number;
      if (d.handle === "right") {
        newW = Math.max(120, d.startW + dx);
        newH = vidLock ? newW / d.ratio : d.startH;
      } else if (d.handle === "bottom") {
        newH = Math.max(68, d.startH + dy);
        newW = vidLock ? newH * d.ratio : d.startW;
      } else {
        // corner — 잠금이면 비율 유지, 해제면 자유
        newW = Math.max(120, d.startW + dx);
        newH = vidLock ? newW / d.ratio : Math.max(68, d.startH + dy);
      }
      const rw = Math.round(newW);
      const rh = Math.round(newH);
      vid.style.width = `${rw}px`;
      vid.style.height = `${rh}px`;
      setResizeSize({ w: rw, h: rh });
    };

    const onPointerUp = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      if (!vid) return;
      setMediaAttr({ width: Math.round(parseFloat(vid.style.width)), height: Math.round(parseFloat(vid.style.height)) });
      draggingRef.current = null;
      setResizeSize(null);
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  }, [setMediaAttr, vidLock]);

  const justifyMap: Record<string, string> = { left: "flex-start", center: "center", right: "flex-end" };

  // iframe 타입 (YouTube 등) — 크기 조절 + 정렬 + 옵션
  const iframeAlign = (el.align as string) || "center";
  const iframeWidth = (el.width as number) || 0;
  const isIframe = embed?.type === "iframe";
  const iframeActive = isIframe && selected && focused;
  const isYouTube = isIframe && /youtube\.com\/embed\//.test((embed as { src: string }).src || "");

  // YouTube 옵션 (노드 속성에 저장)
  const ytStart = (el.ytStart as number) || 0;
  const ytAutoplay = (el.ytAutoplay as boolean) || false;
  const ytLoop = (el.ytLoop as boolean) || false;
  const ytMute = (el.ytMute as boolean) || false;
  const ytControls = el.ytControls !== false; // 기본 true

  // YouTube embed src에 옵션 파라미터 적용
  const iframeSrc = useMemo(() => {
    if (!embed || embed.type !== "iframe") return "";
    let src = embed.src;
    if (isYouTube) {
      const params = new URLSearchParams();
      if (ytStart > 0) params.set("start", String(ytStart));
      if (ytAutoplay) params.set("autoplay", "1");
      if (ytLoop) { params.set("loop", "1"); const vid = src.split("/embed/")[1]; if (vid) params.set("playlist", vid); }
      if (ytMute) params.set("mute", "1");
      if (!ytControls) params.set("controls", "0");
      const qs = params.toString();
      if (qs) src += `?${qs}`;
    }
    return src;
  }, [embed, isYouTube, ytStart, ytAutoplay, ytLoop, ytMute, ytControls]);

  const iframeRef = useRef<HTMLDivElement>(null);
  const [iframeResizeW, setIframeResizeW] = useState<number | null>(null);
  const iframeDragRef = useRef<{ startX: number; startW: number; ratio: number } | null>(null);

  const onIframeResizeDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const container = iframeRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const ratio = rect.width / rect.height;
    iframeDragRef.current = { startX: e.clientX, startW: rect.width, ratio };

    const onMove = (ev: PointerEvent) => {
      const d = iframeDragRef.current;
      if (!d) return;
      const newW = Math.max(200, d.startW + (ev.clientX - d.startX));
      setIframeResizeW(Math.round(newW));
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      if (iframeResizeW) setMediaAttr({ width: iframeResizeW });
      iframeDragRef.current = null;
      setIframeResizeW(null);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }, [iframeResizeW, setMediaAttr]);

  const iframeJustify: Record<string, string> = { left: "flex-start", center: "center", right: "flex-end" };

  if (isVideo) {
    const isFloat = vidLayout.startsWith("float-");
    const handleStyle: React.CSSProperties = { position: "absolute", background: "var(--color-accent)", borderRadius: 3, zIndex: 4, pointerEvents: "none" };
    return (
      <PlateElement {...props} ref={videoElRef} as="figure" style={{
        ...props.style,
        ...(isFloat
          ? {
              float: vidLayout === "float-left" ? "left" : "right",
              margin: vidLayout === "float-left" ? "4px 20px 8px 0" : "4px 0 8px 20px",
              display: "block", clear: "none", maxWidth: "60%",
            }
          : { display: "flex", flexDirection: "column", alignItems: justifyMap[vidAlign] || "center", margin: "var(--spacing-md, 16px) 0" }),
      }}>
        <BlockDropZone path={elPath}>
          <div {...blockDragProps} contentEditable={false} style={{ display: "inline-block", maxWidth: "100%", position: "relative", cursor: "default", lineHeight: 0, fontSize: 0 }} onClick={selectVideo}>
            <video
              ref={videoRef}
              // src 는 fragment 없이 고정 → 시작 시점을 바꿔도 reload 안 됨. 시작 프레임은 metadata 로드 후 seek.
              // (발행 HTML 엔 직렬화기가 #t= 로 시작 위치 지정. autoplay 는 편집 방해되어 에디터엔 미적용)
              src={embed.src}
              controls
              loop={vidLoop}
              muted={vidMuted}
              controlsList={noDownload ? "nodownload noplaybackrate" : undefined}
              onContextMenu={noDownload ? (e) => e.preventDefault() : undefined}
              onLoadedMetadata={(e) => { if (vidStart > 0) { try { e.currentTarget.currentTime = vidStart; } catch { /* ignore */ } } }}
              preload="metadata"
              style={{
                width: vidWidth > 0 ? vidWidth : undefined,
                // 비율 잠금이면 height 는 auto → 콘텐츠 aspect 로 딱 맞음(레터박스=위아래 여백 방지).
                // 해제 상태에서만 명시 height 로 자유 조절(왜곡 허용).
                height: vidLock ? "auto" : (vidHeight > 0 ? vidHeight : undefined),
                maxWidth: "100%",
                display: "block",
                borderRadius: 8,
                outline: isActive ? "2px solid var(--color-accent)" : undefined,
              }}
              draggable={false}
            />
            {resizeSize && (
              <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", padding: "3px 8px", background: "var(--bg-overlay)", color: "#fff", borderRadius: "var(--radius-xs)", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-mono)", pointerEvents: "none", zIndex: 3 }}>
                {resizeSize.w}×{resizeSize.h}px
              </div>
            )}
            {isActive && (
              <>
                {/* 히트박스 — 우/하/모서리 (이미지와 동일) */}
                <div data-cursor="resizeH" onPointerDown={onPointerDown("right")} data-no-drag style={{ position: "absolute", right: -5, top: 0, bottom: 0, width: 10, cursor: "ew-resize", zIndex: 5 }} />
                <div data-cursor="resizeV" onPointerDown={onPointerDown("bottom")} data-no-drag style={{ position: "absolute", bottom: -5, left: 0, right: 0, height: 10, cursor: "ns-resize", zIndex: 5 }} />
                <div data-cursor="resizeDiag" onPointerDown={onPointerDown("corner")} data-no-drag style={{ position: "absolute", right: -7, bottom: -7, width: 14, height: 14, cursor: "nwse-resize", zIndex: 6 }} />
                {/* 시각 핸들 */}
                <div style={{ ...handleStyle, width: 6, height: 32, right: -4, top: "50%", transform: "translateY(-50%)" }} />
                <div style={{ ...handleStyle, width: 32, height: 6, bottom: -4, left: "50%", transform: "translateX(-50%)" }} />
                <div style={{ ...handleStyle, width: 10, height: 10, borderRadius: "var(--radius-capsule)", right: -5, bottom: -5 }} />
              </>
            )}
          </div>
          {/* 캡션 — 이미지처럼 동영상 아래 인라인 (버튼 눌렀을 때 or 값 있을 때만) */}
          {showCaption && (
            <div contentEditable={false} style={{ width: vidWidth > 0 ? vidWidth : undefined, maxWidth: "100%" }}>
              <InlineCaption caption={caption} onCommit={(v) => setMediaAttr({ caption: v || undefined })} onEditingChange={setCaptionEditing} />
            </div>
          )}
          {/* 툴바(레이아웃/정렬/크기/재생/삭제)는 공통 VideoToolbar 가 최상위에서 렌더 */}
        </BlockDropZone>
        {props.children}
      </PlateElement>
    );
  }

  // iframe / script / link fallback
  return (
    <PlateElement {...props} style={{ margin: "16px 0", display: "flex", flexDirection: "column", alignItems: iframeWidth > 0 ? (iframeJustify[iframeAlign] || "center") : "stretch", ...props.style }}>
      <BlockDropZone path={elPath}>
        <div
          {...blockDragProps}
          ref={iframeRef}
          contentEditable={false}
          style={{
            position: "relative",
            width: iframeWidth > 0 ? iframeResizeW || iframeWidth : "100%",
            maxWidth: "100%",
            alignSelf: iframeWidth > 0 ? undefined : "stretch",
          }}
        >
          {isIframe ? (
            <>
              <iframe
                src={iframeSrc}
                style={{
                  width: "100%",
                  aspectRatio: embed.aspect || "16/9",
                  border: "none",
                  borderRadius: 8,
                  outline: iframeActive ? "2px solid var(--color-accent, #3b82f6)" : undefined,
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              {iframeActive && (
                <div onPointerDown={onIframeResizeDown} data-no-drag style={{ position: "absolute", right: -5, bottom: -5, width: 10, height: 10, background: "var(--color-accent, #3b82f6)", borderRadius: 3, zIndex: 2 }} />
              )}
            </>
          ) : embed?.type === "script" ? (
            <ScriptEmbed platform={embed.platform} href={embed.href} />
          ) : (
            <a href={url} target="_blank" rel="noopener noreferrer"
              style={{ display: "block", padding: "12px 16px", background: "var(--bg-secondary)", borderRadius: 8, color: "var(--color-accent)", wordBreak: "break-all" }}
            >
              {url}
            </a>
          )}
        </div>
      </BlockDropZone>
      {props.children}
    </PlateElement>
  );
}

/** 링크 — 밑줄 + hover 시 URL 툴팁 + 클릭 시 새창 */
export function LinkElement(props: PlateElementProps<TLinkElement>) {
  const url = props.element.url || "";
  return (
    <Tooltip content={url} delay={300} placement="top" wrapperStyle={{ display: "inline" }}>
      <PlateElement
        {...props}
        as="a"
        style={{
          color: "var(--color-accent)",
          textDecoration: "underline",
          textUnderlineOffset: 2,
          cursor: "pointer",
          ...props.style,
        }}
        attributes={{
          ...props.attributes,
          href: url,
          target: "_blank",
          rel: "noopener noreferrer",
          onClick: (e: React.MouseEvent) => {
            e.preventDefault();
          },
          onDoubleClick: (e: React.MouseEvent) => {
            e.preventDefault();
            window.open(url, "_blank", "noopener,noreferrer");
          },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any}
      >
        {props.children}
      </PlateElement>
    </Tooltip>
  );
}

/** 파일 첨부 — PDF/오디오 등 다운로드 가능한 파일 카드 */
const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|flac|aac|wma)(\?|$)/i;

const OFFICE_EXT = /\.(docx?|xlsx?|pptx?)(\?|$)/i;
const TEXT_EXT = /\.(txt|csv|json|xml|ya?ml|toml|ini|log|md)(\?|$)/i;

function FilePreviewContent({ url, fileName, isPdf, isOffice, isText }: {
  url: string; fileName: string; isPdf: boolean; isOffice: boolean; isText: boolean;
}) {
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    if (!isText) return;
    let cancelled = false;
    fetch(url).then((r) => r.text()).then((t) => {
      if (!cancelled) setTextContent(t.slice(0, 10000));
    }).catch(() => {
      if (!cancelled) setTextContent("Failed to load file.");
    });
    return () => { cancelled = true; };
  }, [url, isText]);

  if (isPdf) {
    return (
      <iframe
        src={url}
        title={fileName}
        style={{ width: "100%", height: 500, border: "none", borderRadius: 0, display: "block", margin: 0 }}
      />
    );
  }
  if (isOffice) {
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    return (
      <iframe
        src={viewerUrl}
        title={fileName}
        style={{ width: "100%", height: 500, border: "none", borderRadius: 0, display: "block", margin: 0 }}
      />
    );
  }
  if (isText) {
    return (
      <pre style={{
        margin: 0, padding: "12px 16px",
        borderRadius: "var(--radius-md)", background: "var(--bg-primary)",
        fontSize: 12, color: "var(--text-secondary)", overflow: "auto",
        maxHeight: 400, whiteSpace: "pre-wrap", wordBreak: "break-all",
        fontFamily: "var(--font-mono)",
      }}>
        {textContent === null ? "Loading..." : textContent}
      </pre>
    );
  }
  return null;
}

export function FileElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const el = props.element as Record<string, unknown>;
  const url = (el.url as string) || "";
  const fileName = (el.fileName as string) || decodeURIComponent(url.split("/").pop()?.split("?")[0] || "file");
  const fileSize = el.fileSize as number | undefined;
  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();
  const { blockDragProps } = useBlockDrag(elPath);

  const isAudio = AUDIO_EXT.test(url);
  const isPdf = /\.pdf(\?|$)/i.test(url);
  const isOffice = OFFICE_EXT.test(url);
  const isText = TEXT_EXT.test(url);
  const hasPreview = isPdf || isOffice || isText;
  const [previewOpen, setPreviewOpen] = useState(false);
  const sizeLabel = fileSize ? (fileSize < 1024 * 1024 ? `${(fileSize / 1024).toFixed(1)} KB` : `${(fileSize / (1024 * 1024)).toFixed(1)} MB`) : "";

  const FileIcon = () => {
    if (isPdf) return <FileText size={20} strokeWidth={1.5} />;
    if (isAudio) return <Music size={20} strokeWidth={1.5} />;
    if (isText) return <FileText size={20} strokeWidth={1.5} />;
    if (isOffice) return <File size={20} strokeWidth={1.5} />;
    return <Paperclip size={20} strokeWidth={1.5} />;
  };

  return (
    <PlateElement {...props} style={{ margin: "var(--spacing-sm) 0", ...props.style }}>
      <BlockDropZone path={elPath}>
        <div {...blockDragProps} contentEditable={false} style={{
          maxWidth: hasPreview ? 640 : 480, cursor: "default",
          border: "1px solid var(--border-light-color)",
          borderRadius: previewOpen ? "var(--radius-2xl)" : "var(--radius-capsule, 999px)",
          background: "var(--bg-secondary)", overflow: "hidden",
          display: "flex", flexDirection: "column" as const,
          transition: previewOpen
            ? "border-radius 0.2s ease"
            : "border-radius 0.2s ease 0.3s",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 12px",
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "var(--color-neutral-alpha-5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, color: "var(--text-secondary)",
            }}>
              <FileIcon />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</div>
              {sizeLabel && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{sizeLabel}</div>}
            </div>
            {hasPreview && (
              <Tooltip content={previewOpen ? "Close preview" : "Preview"} placement="top">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(!previewOpen)}
                  style={{
                    width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "1px solid var(--border-light-color)",
                    background: previewOpen ? "var(--bg-inverse)" : "var(--bg-primary)",
                    color: previewOpen ? "var(--text-inverse)" : "var(--text-primary)", cursor: "pointer",
                    transition: "background 0.2s, color 0.2s",
                  }}
                >
                  <Eye size={16} />
                </button>
              </Tooltip>
            )}
            <a href={url} target="_blank" rel="noopener noreferrer" download={fileName} style={{
              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid var(--border-light-color)", background: "var(--bg-primary)",
              color: "var(--text-primary)", textDecoration: "none", cursor: "pointer",
            }}>
              <Download size={16} />
            </a>
          </div>
          {isAudio && (
            <audio src={url} controls preload="metadata" style={{ width: "100%", padding: "0 12px 8px", borderRadius: "var(--radius-sm)" }} />
          )}
          {hasPreview && (
            <div style={{
              display: "grid",
              gridTemplateRows: previewOpen ? "1fr" : "0fr",
              transition: previewOpen
                ? "grid-template-rows 0.35s cubic-bezier(0.16, 1, 0.3, 1) 0.15s"
                : "grid-template-rows 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }}>
              <div style={{ overflow: "hidden" }}>
                <div>
                  <FilePreviewContent url={url} fileName={fileName} isPdf={isPdf} isOffice={isOffice} isText={isText} />
                </div>
              </div>
            </div>
          )}
        </div>
      </BlockDropZone>
      {props.children}
    </PlateElement>
  );
}

/** Heading (h1–h6) — 드롭 존 래퍼 */
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

/** Blockquote — 드롭 존 래퍼 */
export function BlockquoteElement(props: PlateElementProps) {
  const { t } = useLanguage();
  const editor = useEditorRef();
  const selected = useSelected();
  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();
  const sel0 = editor.selection;
  const multiBlock = !!sel0 && sel0.anchor.path[0] !== sel0.focus.path[0];
  // 확장(range) 선택 — 표 여러 셀 선택 등. 이때는 커서가 아니므로 placeholder 숨김.
  const collapsed = !!sel0 && sel0.anchor.offset === sel0.focus.offset && sel0.anchor.path.join() === sel0.focus.path.join();
  const showPlaceholder = selected && collapsed && !multiBlock && isEmptyBlock(props.element);
  return (
    <BlockDropZone path={elPath}>
      <PlateElement {...props} as="blockquote" style={{ ...props.style, position: "relative" }}>
        {showPlaceholder && <BlockPlaceholder text={t("editor.phQuote")} />}
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
      <PlateElement {...props} style={{ ...props.style }}>
        <div contentEditable={false} style={{
          maxWidth: 480,
          margin: "var(--spacing-sm) 0",
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
      <PlateElement {...props} style={{ ...props.style }}>
        <hr contentEditable={false} style={{ border: "none", borderTop: "1px solid var(--border-light-color)", margin: "var(--spacing-md) 0", borderRadius: 1, outline: selected && focused ? "2px solid var(--color-accent)" : "none", outlineOffset: 4 }} />
        <BlockTailClickZone path={elPath} />
        {props.children}
      </PlateElement>
    </BlockDropZone>
  );
}


// ── Column layout ──

export function ColumnGroupElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const { t } = useLanguage();
  // 최대 폭 안내 toast — 드래그 1회당 한 번만 (매 pointermove 마다 뜨면 도배된다)
  const maxToastedRef = useRef(false);
  const el = props.element as Record<string, unknown>;
  const colBg = el.columnBg as string | undefined;
  const colDivider = el.columnDivider as string | undefined;
  const columnScroll = el.columnScroll as boolean | undefined; // false = 스크롤 끔(넘치면 잘림)
  const groupRef = useRef<HTMLDivElement>(null);

  // 기본은 열 사이 가운데에 subtle 구분선 — "transparent" 로 명시하면 숨김
  const dividerColor = colDivider === "transparent" ? "transparent" : colDivider || "var(--border-light-color)";
  const colBgVal = colBg === "transparent" ? "transparent" : colBg || COLUMN_DEFAULT_BG;

  const colChildren = (el.children as unknown[]) || [];
  const colCount = colChildren.length;

  const onResizeDown = useCallback((index: number, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const group = groupRef.current;
    if (!group) return;

    const colEls = Array.from(group.querySelectorAll<HTMLElement>(":scope > [data-slate-node='element']"));
    // 마지막 열도 조절 대상 — 핸들 i 는 "열 i 의 오른쪽 모서리"라 마지막 열엔 마지막 핸들이 붙는다.
    // (예전엔 핸들이 열 "사이"에만 있어서 마지막 열은 조절할 방법이 없었다)
    if (index >= colEls.length) return;

    // 구분선을 끌면 **잡은 열만** 늘고 줄어든다 — 이웃은 그대로 두고 총폭이 같이 변한다(→ 넘치면 가로 스크롤).
    // 예전엔 이웃이 그만큼 흡수해서(zero-sum) 총폭이 두 열의 합에 묶였고, 그 합은 처음엔 화면 폭이라
    // "열을 아무리 넓혀도 총합이 화면 너비를 못 넘는" 상태였다(이웃을 MIN 까지 짜부라뜨려야 겨우 늘어남).
    // 놓으면 px 로 확정.
    const startWidths = colEls.map((el) => el.getBoundingClientRect().width);
    const startX = e.clientX;
    maxToastedRef.current = false;
    const clampPx = (w: number) => Math.min(COLUMN_MAX_PX, Math.max(COLUMN_MIN_PX, Math.round(w)));
    const applyPxWidths = (widths: number[]) => {
      colEls.forEach((el, i) => { el.style.flex = `0 0 ${clampPx(widths[i])}px`; });
    };

    // 상한은 둘 — 열 하나(COLUMN_MAX_PX)와 블록 전체(COLUMN_GROUP_MAX_PX, 나머지 열 합을 뺀 여유분).
    // 둘 중 먼저 걸리는 쪽에서 멈추되 **핸들은 계속 잡힌 채**로 두고, 왜 안 늘어나는지 toast 로 알린다.
    // (예전엔 조용히 clamp 만 해서 핸들이 죽은 것처럼 보였다)
    const othersSum = startWidths.reduce((sum, w, i) => (i === index ? sum : sum + w), 0);
    const groupRoom = COLUMN_GROUP_MAX_PX - othersSum;
    // 이미 상한을 넘긴 블록(예전 버그로 그렇게 저장된 글)이면 groupRoom 이 현재 폭보다 작거나 음수다.
    // 그대로 clamp 하면 **잡기만 해도** 손도 안 댄 열이 확 줄어든다 → 상한은 "더 못 늘린다"는 뜻일 뿐,
    // 이미 있는 폭을 강제로 깎지는 않는다. 줄이는 방향(want < 현재)은 min(cap, want) 라 그대로 먹는다.
    const cap = Math.max(startWidths[index], Math.min(COLUMN_MAX_PX, groupRoom));
    const hitGroup = groupRoom < COLUMN_MAX_PX; // 블록 상한이 먼저 걸린 경우

    let lastX = e.clientX;
    // 자동 스크롤이 대신 벌어준 폭. 포인터가 컨테이너 밖으로 나가면 더 갈 데가 없으므로
    // "포인터가 못 간 만큼"을 여기에 쌓아 폭에 더한다.
    let autoPan = 0;

    /** 현재 포인터 + autoPan 으로 폭을 다시 그린다. 상한에 걸렸으면 true. */
    const render = () => {
      // 잡은 열만 변경 → 총폭 = 기존 총폭 + dx. 이웃을 안 건드리므로 화면 너비에 묶이지 않는다.
      const want = startWidths[index] + (lastX - startX) + autoPan;
      if (want > cap && !maxToastedRef.current) {
        maxToastedRef.current = true;
        showToast(
          hitGroup
            ? t("editor.columnGroupMaxWidth").replace("{{max}}", String(COLUMN_GROUP_MAX_PX))
            : t("editor.columnMaxWidth").replace("{{max}}", String(COLUMN_MAX_PX)),
          "info",
        );
      }
      const widths = startWidths.slice();
      widths[index] = Math.max(COLUMN_MIN_PX, Math.min(cap, Math.round(want)));
      applyPxWidths(widths);
      return want > cap;
    };

    // ── 경계 밖으로 끌면 자동 스크롤 ──
    // 열을 넓히려면 핸들을 오른쪽으로 끌게 되는데, 블록이 이미 화면을 채우고 있으면 포인터가
    // 경계에서 막혀 거기서 성장이 멈춘다. 포인터가 **밖으로 나간 동안** 매 프레임 우리가 폭을
    // 대신 벌리고(autoPan) 같은 양만큼 스크롤해서, 핸들이 포인터 밑에 그대로 붙어 있게 한다.
    //
    // 순서가 중요하다: 오른쪽은 **폭을 먼저 넓혀야** scrollWidth 가 커져서 scrollLeft 가 그만큼
    // 더 갈 수 있다. 반대로 하면 이미 끝까지 스크롤된 상태라 스크롤이 안 먹고, 스크롤이 안 먹으니
    // 폭도 안 늘어 서로를 기다리는 교착이 된다.
    //
    // 경계 "근처"가 아니라 **밖**에서만 발동한다 — 마지막 열의 핸들은 블록 오른쪽 끝에 붙어 있어서,
    // 안쪽 여유를 두면 핸들을 잡기만 해도 스크롤이 튀어나간다.
    const AUTOSCROLL_MAX = 18; // px/frame — 경계에서 멀수록 빨라진다
    let rafId = requestAnimationFrame(function tick() {
      rafId = requestAnimationFrame(tick);
      const g = groupRef.current;
      if (!g) return;
      const r = g.getBoundingClientRect();
      // 그룹이 화면 밖까지 뻗어 있으면 어차피 안 보이니 뷰포트 경계로 자른다
      const right = Math.min(r.right, window.innerWidth);
      const left = Math.max(r.left, 0);
      let v = 0;
      if (lastX > right) v = Math.min(AUTOSCROLL_MAX, (lastX - right) / 2);
      else if (lastX < left) v = -Math.min(AUTOSCROLL_MAX, (left - lastX) / 2);
      if (!v) return;

      if (v > 0) {
        autoPan += v;
        render(); // DOM 에 동기 반영 → scrollWidth 갱신 → 아래 스크롤이 그만큼 더 갈 수 있다
        const before = g.scrollLeft;
        g.scrollLeft = before + v; // 브라우저가 [0, max] 로 clamp
        const moved = g.scrollLeft - before;
        // 실제로 스크롤된 만큼만 인정 — 열이 상한이거나 더 갈 데가 없으면 되돌린다.
        // (안 그러면 autoPan 만 계속 쌓여, 포인터를 되돌렸을 때 한참 끌어야 반응하는 죽은 구간이 생긴다)
        if (moved !== v) { autoPan += moved - v; render(); }
      } else {
        // 왼쪽은 반대 — 스크롤이 실제로 움직인 만큼만 폭을 줄인다(scrollLeft 가 0 이면 아무 일도 없다)
        const before = g.scrollLeft;
        g.scrollLeft = before + v;
        const moved = g.scrollLeft - before;
        if (moved) { autoPan += moved; render(); }
      }
    });

    const onMove = (ev: PointerEvent) => {
      if (!ev.buttons) { onUp(); return; } // 창 밖 릴리즈 등으로 pointerup 유실 → 버튼 안 눌린 이동은 종료(유령 리사이즈 방지)
      lastX = ev.clientX;
      render();
    };

    const onUp = () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      // px 로 확정 저장 — 합이 화면보다 넓으면 그대로 가로 스크롤. (렌더: flex:0 0 {px}px)
      // width(%) 는 지우지 않는다 — @platejs/layout normalizer 가 열 width 합=100 을 요구하므로 null 로 지우면 무한 루프.
      try {
        const path = editor.api.findPath(props.element);
        if (!path) return;
        const finalPx = colEls.map((el) => clampPx(el.getBoundingClientRect().width));
        editor.tf.withoutNormalizing(() => {
          colEls.forEach((_, i) => editor.tf.setNodes({ widthPx: finalPx[i] }, { at: [...Array.from(path), i] }));
        });
      } catch { /* ignore */ }
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
  }, [editor, props.element, t]);

  // 스크롤 ON(기본): px 열 고정 → 넘치면 가로 스크롤. OFF: px 열이 flex-shrink 로 줄어 화면 폭에 맞춤(fit).
  const scrollOn = columnScroll !== false;
  const groupStyle: React.CSSProperties = {
    ...props.style,
    display: "flex",
    gap: "var(--spacing-xs)",
    marginBlock: "var(--spacing-md)",
    // 첫 열 블록의 좌측 핸들(gutter left:-40px)이 overflow-x 에 안 잘리게 좌측 40px 공간 확보.
    // 같은 크기의 음수 margin 으로 시각적 위치는 그대로(그 40px 는 에디터 좌측 여백 안에 들어감).
    marginLeft: -40,
    paddingLeft: 40,
    // 마지막 열의 오른쪽 핸들은 콘텐츠 맨 끝에 앉는다 — translateX(-50%) 라 절반(6px)이
    // overflow 에 잘린다. 좌측과 같은 수법으로 우측에도 폭만큼 여유를 준다.
    marginRight: -8,
    paddingRight: 8,
    position: "relative",
    overflowX: scrollOn ? "auto" : "hidden",
    // 좌측 40px(핸들 확보용 paddingLeft)로 스크롤된 콘텐츠가 새어 보이던 것 차단 —
    // overflow 는 확장된 box 끝(시각 좌측 -40px)에서 잘려서 그 40px 구역에 콘텐츠가 노출됐다.
    // 시각 좌측 경계(=paddingLeft 안쪽)에서 클립. 우측 8px(핸들 여백)은 유지(right inset 0).
    clipPath: "inset(0 0 0 40px)",
    "--_col-shrink": scrollOn ? 0 : 1, // px 열의 flex-shrink — OFF 면 1(줄어들어 fit)
    "--_col-bg": colBgVal,
    "--_col-divider": dividerColor,
  } as React.CSSProperties;

  // 구분선 handle — colElement::after 위에 겹쳐서 배치
  // 핸들은 각 열의 **오른쪽 모서리**에 하나씩 — 마지막 열 포함(colCount 개).
  // 드래그하면 그 열만 넓어지고 총폭이 따라 늘어난다.
  const handles = [];
  for (let i = 0; i < colCount; i++) {
    handles.push(
      <div
        key={i}
        data-col-handle={i}
        data-cursor="resize"
        contentEditable={false}
        onPointerDown={(e) => onResizeDown(i, e)}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: 12,
          cursor: "col-resize",
          zIndex: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // JS로 위치 계산하지 않음 — useEffect에서 배치
          left: 0,
          opacity: 0,
          pointerEvents: "none",
        }}
      >
        <div className={styles.colResizeBar} style={{
          width: 3, height: 24, borderRadius: 2,
          background: "var(--text-muted)",
        }} />
      </div>,
    );
  }

  // handle 위치를 DOM 기반으로 배치
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const positionHandles = () => {
      const colEls = Array.from(group.querySelectorAll<HTMLElement>(":scope > [data-slate-node='element']"));
      const handleEls = Array.from(group.querySelectorAll<HTMLElement>("[data-col-handle]"));
      if (handleEls.length === 0) return;
      const groupRect = group.getBoundingClientRect();
      colEls.forEach((colEl, i) => {
        if (i >= handleEls.length) return;
        const colRect = colEl.getBoundingClientRect();
        // getBoundingClientRect 는 뷰포트 좌표라 스크롤된 만큼 왼쪽으로 밀려 나온다. 반면 핸들은
        // position: absolute 라 **스크롤되는 콘텐츠** 기준으로 배치된다 → scrollLeft 를 더해 보정하지 않으면
        // 블록이 넓어져 그룹이 가로 스크롤되는 순간 핸들이 딱 scrollLeft 만큼 어긋난다(= 못 잡는다).
        const left = colRect.right - groupRect.left + group.scrollLeft;
        handleEls[i].style.left = `${left}px`;
        handleEls[i].style.transform = "translateX(-50%)";
        handleEls[i].style.opacity = "";
        handleEls[i].style.pointerEvents = "";
      });
    };

    // 초기 배치 + DOM 갱신 후 재배치
    positionHandles();
    requestAnimationFrame(positionHandles);
    // 가로 스크롤/크기 변화에도 따라붙어야 한다 — 넓은 블록에서 스크롤하면 위치가 즉시 틀어지므로.
    group.addEventListener("scroll", positionHandles, { passive: true });
    const ro = new ResizeObserver(positionHandles);
    ro.observe(group);
    // **열도** 관찰한다 — 드래그 중엔 그룹(컨테이너)의 크기는 그대로고 열 폭만 변하므로
    // 그룹만 보면 콜백이 안 돈다. 그러면 핸들이 제자리에 남아 끌던 열 모서리와 어긋난다.
    group.querySelectorAll<HTMLElement>(":scope > [data-slate-node='element']").forEach((el) => ro.observe(el));
    return () => {
      group.removeEventListener("scroll", positionHandles);
      ro.disconnect();
    };
  });

  return (
    <PlateElement {...props} ref={groupRef as React.Ref<HTMLElement>} style={groupStyle} data-col-group>
      {/* handles 를 children 앞에 — 그래야 마지막 컬럼이 :last-child 가 되어 오른쪽 구분선이 숨겨짐 */}
      {handles}
      {props.children}
    </PlateElement>
  );
}

export function ColumnElement(props: PlateElementProps) {
  const el = props.element as Record<string, unknown>;
  const width = el.width as string | undefined;
  const widthPx = el.widthPx as number | undefined;
  // px 지정: 정확한 px 고정(grow/shrink 0) → 합이 컨테이너를 넘으면 가로 스크롤(= 화면보다 넓게 가능).
  // px 없음: 유동 % 채움(항상 화면에 맞음).
  const px = typeof widthPx === "number" && widthPx > 0 ? widthPx : null;
  const weight = width ? Math.max(0.001, parseFloat(width)) : 1;
  // 편집(selection 이 이 열 안)이면 selected → accent 하이라이트. hover 는 CSS(:hover)가 처리.
  const selected = useSelected();
  return (
    <PlateElement {...props} className={`${styles.colElement}${selected ? ` ${styles.colElementActive}` : ""}`} data-block-container="" style={{
      ...props.style,
      ...(px != null ? { flex: `0 var(--_col-shrink, 0) ${px}px` } : { flex: `${weight} 1 0` }),
      minWidth: COLUMN_MIN_PX,
      borderRadius: "var(--radius-2xl)",
      background: `var(--_col-bg, ${COLUMN_DEFAULT_BG})`,
      padding: "var(--spacing-sm)",
    }}>
      {props.children}
    </PlateElement>
  );
}

// ── Toggle (접기/펼치기) ──
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
      <div {...blockDragProps} style={{ margin: "var(--spacing-xs) 0" }}>
        <PlateElement {...props} style={{ ...props.style }}>
          {React.Children.map(props.children, (child, i) => {
            if (i === 0) {
              return (
                <div className="toggle-title-wrap" style={{ display: "flex", alignItems: "flex-start", gap: 4, ...titleStyle }}>
                  <button type="button" contentEditable={false} style={{
                    border: "none", background: "transparent", cursor: "pointer",
                    padding: 0, color: "var(--text-muted)",
                    transition: "transform 0.15s", transform: open ? "rotate(90deg)" : "rotate(0deg)",
                    display: "flex", alignItems: "center", flexShrink: 0,
                    height: "1.4em",
                  }} onMouseDown={(e) => e.preventDefault()} onClick={toggleOpen}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M9 6l6 6-6 6z" /></svg>
                  </button>
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
      <div {...blockDragProps} style={{ position: "relative", margin: "var(--spacing-md) 0" }}>
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
          border: bg === "var(--bg-primary)" ? "1px solid var(--border-light-color)" : "1px solid transparent",
        }}>
          {props.children}
        </PlateElement>
      </div>
    </BlockDropZone>
  );
}
