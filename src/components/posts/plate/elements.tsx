import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
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
import TBtn from "./TBtn";
import { ReactEditor } from "slate-react";
import { BlockDropZone, useBlockDrag } from "./BlockDragHandle";
import { _blockDragPath, _inlineDragPath, _imageUploadFn } from "./utils";
import EmojiPickerPopup, { EmojiIcon } from "@/components/ui/EmojiPicker";
import { RxReset } from "react-icons/rx";
import { Check, FileText, File, Music, Paperclip, Eye, Download, GripVertical } from "lucide-react";
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

  // textarea 높이 자동 조절 — 긴 캡션은 줄바꿈되어 여러 줄로 늘어남
  const autoGrow = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);
  const shownValue = editing ? draft : caption;
  useEffect(() => { autoGrow(); }, [shownValue, autoGrow]);

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
      onMouseDown={(e) => { if (!editing) { e.preventDefault(); setEditingWrapped(true); setDraft(caption); setTimeout(() => { inputRef.current?.focus(); }, 0); } }}
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
      const entry = editor.api.above({ match: { type: "img" } });
      return entry ? entry[1] : null;
    } catch { return null; }
  }, [editor]);

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
  const showCaption = !!(caption || isActive || captionEditing);
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
    const onMove = (ev: PointerEvent) => {
      if (!activated) {
        if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < 5) return;
        activated = true;
        _inlineDragPath.current = elPath;
        setIsDragging(true);
      }
      const caret = document.getElementById("inline-drag-caret");
      if (!caret) return;
      const range = document.caretRangeFromPoint?.(ev.clientX, ev.clientY);
      if (!range) { caret.style.opacity = "0"; return; }
      const rect = range.getClientRects()[0] || range.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0 && rect.x === 0)) { caret.style.opacity = "0"; return; }
      const container = caret.parentElement;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      caret.style.opacity = "1";
      caret.style.left = `${rect.left - containerRect.left}px`;
      caret.style.top = `${rect.top - containerRect.top}px`;
      caret.style.height = `${rect.height || 18}px`;
    };
    const onUp = (ev: PointerEvent) => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      const caret = document.getElementById("inline-drag-caret");
      if (caret) caret.style.opacity = "0";
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
  useEffect(() => {
    const el = plateElRef.current;
    if (!el) return;
    // Plate가 감싸는 [data-slate-node="element"] div를 찾아서 float 적용
    const wrapper = el.closest("[data-slate-node=\"element\"]") as HTMLElement | null;
    if (!wrapper) return;
    if (imgLayout === "float-left") {
      wrapper.style.cssText = "float:left;margin:4px 20px 12px 0;padding:0;display:block;clear:none;";
      wrapper.setAttribute("data-float-side", "left");
    } else if (imgLayout === "float-right") {
      wrapper.style.cssText = "float:right;margin:4px 0 12px 20px;padding:0;display:block;clear:none;";
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
      margin: imgLayout === "block" ? "0 0 20px" : imgLayout.startsWith("float-") ? "0" : undefined,
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
              <div style={imgLayout.startsWith("float-")
                ? { position: "absolute", top: "100%", left: 0, right: 0, textAlign: "center" }
                : { textAlign: "center" }}>
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
/** ```mermaid 코드블록 → 다이어그램 미리보기 (mermaid 동적 import) */
function MermaidPreview({ code }: { code: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const src = code.trim();
    if (!src) {
      setError(null);
      if (ref.current) ref.current.innerHTML = "";
      return;
    }
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose" });
        const id = "mmd-" + Math.floor(Math.random() * 1e9).toString(36);
        const { svg } = await mermaid.render(id, src);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "mermaid render error");
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  return (
    <div contentEditable={false} className={styles.mermaidPreview}>
      {error ? <div className={styles.mermaidError}>{error}</div> : <div ref={ref} />}
    </div>
  );
}

export function CodeBlockElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const { t } = useLanguage();
  const el = props.element as Record<string, unknown>;
  const wrap = (el.wrap as boolean) ?? false;
  const lang = el.lang as string | undefined;
  const [justClicked, setJustClicked] = React.useState(false);
  const isEmpty = !el.children || (el.children as Array<{ children?: Array<{ text?: string }> }>).every(
    (line) => !line.children?.some((leaf) => leaf.text && leaf.text.length > 0),
  );
  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();
  const { blockDragProps } = useBlockDrag(elPath);
  // code_line 들을 \n 으로 join (api.string 은 줄바꿈을 안 넣음 → mermaid 파싱 실패)
  const mermaidSource = lang === "mermaid"
    ? ((el.children as Array<{ children?: Array<{ text?: string }> }>) || [])
        .map((line) => (line.children || []).map((leaf) => leaf.text || "").join(""))
        .join("\n")
    : "";

  const toggleWrap = () => {
    if (elPath) editor.tf.setNodes({ wrap: !wrap }, { at: elPath });
  };

  return (
    <BlockDropZone path={elPath}>
    <div {...blockDragProps} style={{ cursor: "default" }}>
    <PlateElement
      {...props}
      as="pre"
      style={{
        ...props.style,
        position: "relative",
        overflowX: wrap ? "visible" : "auto",
        whiteSpace: wrap ? "pre-wrap" : "pre",
        wordBreak: wrap ? "break-all" : undefined,
      }}
    >
      <button
        type="button"
        contentEditable={false}
        onMouseDown={(e) => {
          e.preventDefault(); e.stopPropagation();
          setJustClicked(true);
          toggleWrap();
        }}
        onMouseLeave={() => setJustClicked(false)}
        className={`${styles.codeWrapToggle}${justClicked ? " just-clicked" : ""}`}
        title={wrap ? t("common.codeScrollTitle") : t("common.codeWrapTitle")}
      >
        <span className="toggle-label-default">{wrap ? `↔ ${t("common.codeScroll")}` : `↩ ${t("common.codeWrap")}`}</span>
        <span className="toggle-label-hover">{wrap ? `↩ ${t("common.codeWrap")}` : `↔ ${t("common.codeScroll")}`}</span>
      </button>
      <code style={{ position: "relative" }}>
        {isEmpty && (
          <span contentEditable={false} style={{
            position: "absolute", top: 0, left: 0, color: "var(--text-tertiary)",
            fontStyle: "italic", pointerEvents: "none", userSelect: "none",
          }}>{t("editor.codeEnter")}</span>
        )}
        {props.children}
      </code>
    </PlateElement>
    {lang === "mermaid" && <MermaidPreview code={mermaidSource} />}
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
      style={{ position: "absolute", left: "var(--float-edge, 0px)", top: 0, pointerEvents: "none", color: "var(--text-muted)", opacity: 0.45, userSelect: "none", whiteSpace: "nowrap" }}
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
  const showPlaceholder = !hasTodo && !multiBlock && isEmptyBlock(props.element) && (selected || editor.children.length === 1);

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
        <PlateElement {...props} as="div" style={{ marginBottom: "var(--spacing-sm)", ...props.style, position: "relative" }}>
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
  const { t } = useLanguage();
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

  const [clicked, setClicked] = useState(false);
  const isActive = isVideo && selected && focused && clicked;
  useEffect(() => { if (!selected) setClicked(false); }, [selected]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [resizeSize, setResizeSize] = useState<{ w: number; h: number } | null>(null);
  const draggingRef = useRef<{ startX: number; startY: number; startW: number; startH: number; ratio: number } | null>(null);

  const setMediaAttr = useCallback((attrs: Record<string, unknown>) => {
    if (elPath) editor.tf.setNodes(attrs, { at: elPath });
  }, [editor, elPath]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    const rect = vid.getBoundingClientRect();
    draggingRef.current = { startX: e.clientX, startY: e.clientY, startW: rect.width, startH: rect.height, ratio: rect.width / rect.height };

    const onPointerMove = (ev: PointerEvent) => {
      const d = draggingRef.current;
      if (!d || !vid) return;
      const newW = Math.max(120, d.startW + (ev.clientX - d.startX));
      const newH = Math.round(newW / d.ratio);
      vid.style.width = `${newW}px`;
      vid.style.height = `${newH}px`;
      setResizeSize({ w: Math.round(newW), h: newH });
    };

    const onPointerUp = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      if (!vid) return;
      const w = Math.round(parseFloat(vid.style.width));
      const h = Math.round(parseFloat(vid.style.height));
      setMediaAttr({ width: w, height: h });
      draggingRef.current = null;
      setResizeSize(null);
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  }, [setMediaAttr]);

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
    const handleStyle: React.CSSProperties = { position: "absolute", background: "var(--color-accent, #3b82f6)", borderRadius: 3, zIndex: 2, cursor: "nwse-resize" };
    return (
      <PlateElement {...props} as="figure" style={{ ...props.style, display: "flex", flexDirection: "column", alignItems: justifyMap[vidAlign] || "center", margin: "var(--spacing-md, 16px) 0" }}>
        <BlockDropZone path={elPath}>
          <div {...blockDragProps} contentEditable={false} style={{ display: "inline-block", maxWidth: "100%", position: "relative", cursor: "default" }} onClick={() => setClicked(true)}>
            <video
              ref={videoRef}
              src={embed.src}
              controls
              preload="metadata"
              style={{
                width: vidWidth > 0 ? vidWidth : undefined,
                height: vidHeight > 0 ? vidHeight : undefined,
                maxWidth: "100%",
                display: "block",
                borderRadius: 8,
                outline: isActive ? "2px solid var(--color-accent, #3b82f6)" : undefined,
              }}
              draggable={false}
            />
            {resizeSize && (
              <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", padding: "3px 8px", background: "var(--bg-overlay)", color: "#fff", borderRadius: "var(--radius-xs)", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-mono)", pointerEvents: "none", zIndex: 3 }}>
                {resizeSize.w}×{resizeSize.h}px
              </div>
            )}
            {isActive && (
              <div onPointerDown={onPointerDown} data-no-drag style={{ ...handleStyle, right: -5, bottom: -5, width: 10, height: 10 }} />
            )}
          </div>
          {/* 정렬 버튼 */}
          {isActive && (
            <div contentEditable={false} className={styles.floatingToolbar} style={{ display: "inline-flex", gap: 4, marginTop: 4 }}>
              {(["left", "center", "right"] as const).map((a) => (
                <TBtn key={a} square active={vidAlign === a} onClick={() => setMediaAttr({ align: a })}>
                  {a === "left" ? "◧" : a === "center" ? "◻" : "◨"}
                </TBtn>
              ))}
              <TBtn square onClick={() => { setMediaAttr({ width: 0, height: 0 }); }} tooltip={t("editor.restoreOriginal")}><RxReset size={14} /></TBtn>
            </div>
          )}
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
              background: "var(--color-neutral-alpha-6)",
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
                title={previewOpen ? "Close preview" : "Preview"}
              >
                <Eye size={16} />
              </button>
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
  const showPlaceholder = selected && !multiBlock && isEmptyBlock(props.element);
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
  const showPlaceholder = selected && !multiBlock && isEmptyBlock(props.element);
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
  const el = props.element as Record<string, unknown>;
  const colBg = el.columnBg as string | undefined;
  const colDivider = el.columnDivider as string | undefined;
  const groupRef = useRef<HTMLDivElement>(null);

  const dividerColor = colDivider === "transparent" ? "transparent" : colDivider || "var(--text-muted)";
  const colBgVal = colBg === "transparent" ? "transparent" : colBg || "var(--bg-primary)";

  const colChildren = (el.children as unknown[]) || [];
  const colCount = colChildren.length;

  const onResizeDown = useCallback((index: number, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const group = groupRef.current;
    if (!group) return;

    const colEls = Array.from(group.querySelectorAll<HTMLElement>(":scope > [data-slate-node='element']"));
    if (colEls.length < 2 || index >= colEls.length - 1) return;

    const groupW = group.getBoundingClientRect().width;
    const startLeftW = colEls[index].getBoundingClientRect().width;
    const startRightW = colEls[index + 1].getBoundingClientRect().width;
    const totalW = startLeftW + startRightW;
    const startX = e.clientX;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const newLeftW = Math.max(groupW * 0.1, Math.min(totalW - groupW * 0.1, startLeftW + dx));
      const newRightW = totalW - newLeftW;
      colEls[index].style.flex = `${(newLeftW / groupW) * 100} 0 0`;
      colEls[index + 1].style.flex = `${(newRightW / groupW) * 100} 0 0`;
    };

    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      // 최종 비율 Slate에 저장
      try {
        const path = editor.api.findPath(props.element);
        if (!path) return;
        const finalGroupW = group.getBoundingClientRect().width;
        editor.tf.withoutNormalizing(() => {
          colEls.forEach((colEl, i) => {
            const pct = Math.round((colEl.getBoundingClientRect().width / finalGroupW) * 100);
            editor.tf.setNodes({ width: `${pct}%` }, { at: [...Array.from(path), i] });
          });
        });
      } catch { /* ignore */ }
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }, [editor, props.element]);

  const groupStyle: React.CSSProperties = {
    ...props.style,
    display: "flex",
    gap: "var(--spacing-xs)",
    margin: "var(--spacing-md) 0",
    position: "relative",
    "--_col-bg": colBgVal,
    "--_col-divider": dividerColor,
  } as React.CSSProperties;

  // 구분선 handle — colElement::after 위에 겹쳐서 배치
  const handles = [];
  for (let i = 0; i < colCount - 1; i++) {
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
        const left = colRect.right - groupRect.left;
        handleEls[i].style.left = `${left}px`;
        handleEls[i].style.transform = "translateX(-50%)";
        handleEls[i].style.opacity = "";
        handleEls[i].style.pointerEvents = "";
      });
    };

    // 초기 배치 + DOM 갱신 후 재배치
    positionHandles();
    requestAnimationFrame(positionHandles);
  });

  return (
    <PlateElement {...props} ref={groupRef as React.Ref<HTMLElement>} style={groupStyle} data-col-group>
      {props.children}
      {handles}
    </PlateElement>
  );
}

export function ColumnElement(props: PlateElementProps) {
  const el = props.element as Record<string, unknown>;
  const width = el.width as string | undefined;
  return (
    <PlateElement {...props} className={styles.colElement} style={{
      ...props.style,
      flex: width ? `${parseFloat(width)} 0 0` : "1 0 0",
      minWidth: 0,
      borderRadius: "var(--radius-sm)",
      background: "var(--_col-bg, var(--bg-primary))",
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
  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();
  const { blockDragProps } = useBlockDrag(elPath);

  return (
    <BlockDropZone path={elPath}>
      <div {...blockDragProps} style={{ position: "relative", margin: "var(--spacing-md) 0" }}>
        {hasIcon && (
          <span contentEditable={false} style={{
            position: "absolute", left: 12, top: "calc(var(--spacing-md) + 2px)", zIndex: 1,
            fontSize: 20, lineHeight: 1, cursor: "pointer", userSelect: "none",
          }} onMouseDown={(e) => e.preventDefault()} onClick={() => setShowIconPicker(!showIconPicker)} data-clickable="true">
            <EmojiIcon value={icon} />
          </span>
        )}
        <EmojiPickerPopup
          open={showIconPicker}
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
