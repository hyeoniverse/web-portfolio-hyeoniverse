import React, { useState, useCallback, useRef, useEffect } from "react";
import { useImageFallback } from "@/hooks/useImageFallback";

import type { Size } from "@/types";
import { CAPTION_EDIT_EVENT } from "../constants";
import {
  PlateElement,
  type PlateElementProps,
  useEditorRef,
  useSelected,
  useFocused,
} from "platejs/react";

import { useLanguage } from "@/providers/LanguageProvider";
import { useIsMobile } from "@/hooks/useIsMobile";

import Tooltip from "@/components/ui/Tooltip";
import { ReactEditor } from "slate-react";

import { BlockDropZone } from "../BlockDragHandle";

import { _inlineDragPath } from "../utils";

import { GripVertical } from "@/components/icons";

import base from "../../RichTextEditor.module.css";
import code from "../../EditorCode.module.css";
import diagram from "../../EditorDiagram.module.css";
import media from "../../EditorMedia.module.css";
const styles = { ...base, ...code, ...diagram, ...media };

import { InlineCaption, InlineCursorTarget } from "./shared";

/* 이미지 요소 — 리사이즈 · 정렬 · 캡션 · 확대 보기 — elements.tsx 에서 분리 (#680). */

export function ImageElement(props: PlateElementProps) {
  const { t } = useLanguage();
  const { isTouch } = useIsMobile();
  const editor = useEditorRef();
  const selected = useSelected();
  const focused = useFocused();
  const [captionEditing, setCaptionEditing] = useState(false);
  // 선택(이미지 void 가 selection 에 포함) + 포커스면 활성 — 핸들/툴바 표시.
  // 선택은 PlateEditor capture 핸들러가 처리하므로 별도 clicked 플래그 불필요.
  const isActive = selected && focused;
  /* 고른 이미지 위에는 편집 막대가 뜬다 — 크기·파일 이름 툴팁까지 위로 나오면 그 막대를 덮는다.
     그때만 아래로 내린다(고르지 않았으면 자리가 넉넉한 쪽을 알아서 고른다) */
  const tipPlacement = isActive ? "bottom" : "auto";

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
  const [resizeSize, setResizeSize] = useState<Size | null>(null);
  // 이미지 로드 실패 시 공용 placeholder 로 swap — url 변경 리셋까지 훅이 담당
  const { src: displayUrl, markBroken } = useImageFallback(url);
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
  const [naturalSize, setNaturalSize] = useState<Size | null>(null);
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
          <Tooltip content={displaySize ? `${fileName ? `${fileName} · ` : ""}${displaySize.w}×${displaySize.h}px${isSmall && caption ? `\n${caption}` : ""}` : undefined} delay={300} placement={tipPlacement} wrapperStyle={{ display: "block", lineHeight: 0 }}>
              {/* 이미지 박스 — 리사이즈 핸들 기준. 캡션은 이 박스 밖이라 핸들이 캡션에 안 밀림 */}
              <span style={{ position: "relative", display: "block", lineHeight: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={displayUrl}
                  alt={alt}
                  onLoad={onImgLoad}
                  onError={markBroken}
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
                {/* Resize handles — 터치에선 손가락으로 못 잡는 얇은 핸들이라 숨김 */}
                {isActive && !isDragging && !isTouch && (
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
              <Tooltip content={displaySize ? `${fileName ? `${fileName} · ` : ""}${displaySize.w}×${displaySize.h}px${isSmall && caption ? `\n${caption}` : ""}` : undefined} delay={300} placement={tipPlacement} wrapperStyle={{ display: "block", lineHeight: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={displayUrl}
                  alt={alt}
                  onLoad={onImgLoad}
                  onError={markBroken}
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
              {/* Resize handles — 드래그 중 숨김. 터치에선 얇은 핸들 숨김 */}
              {isActive && !isDragging && !isTouch && (
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
