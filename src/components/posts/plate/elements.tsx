import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  PlateElement,
  type PlateElementProps,
  useEditorRef,
  useSelected,
  useFocused,
} from "platejs/react";
import { useLanguage } from "@/providers/LanguageProvider";
import Tooltip from "@/components/ui/Tooltip";
import { BlockDropZone, useBlockDrag } from "./BlockDragHandle";
import { _blockDragPath, _imageUploadFn } from "./utils";
import EmojiPickerPopup, { EmojiIcon } from "@/components/ui/EmojiPicker";
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
export function InlineCaption({ caption, onCommit, onEditingChange, autoEdit, overlayMode }: { caption: string; onCommit: (v: string) => void; onEditingChange?: (editing: boolean) => void; autoEdit?: boolean; overlayMode?: boolean }) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const setEditingWrapped = useCallback((v: boolean) => { setEditing(v); onEditingChange?.(v); }, [onEditingChange]);
  const [draft, setDraft] = useState(caption);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoEditDone = useRef(false);

  useEffect(() => { setDraft(caption); }, [caption]);

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
    <input
      ref={inputRef}
      contentEditable={false}
      value={editing ? draft : caption}
      readOnly={!editing}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { if (editing) setTimeout(() => commit(), 0); }}
      onMouseDown={(e) => { if (!editing) { e.preventDefault(); setEditingWrapped(true); setDraft(caption); setTimeout(() => { inputRef.current?.focus(); }, 0); } }}
      onKeyDown={(e) => {
        if (!editing) return;
        if (e.key === "Enter") { e.preventDefault(); commit(); }
        if (e.key === "Escape") { setDraft(caption); setEditingWrapped(false); }
      }}
      placeholder={editing ? t("editor.captionInput") : (caption || t("editor.captionAdd"))}
      autoFocus={editing}
      style={{
        width: "100%",
        border: "none",
        outline: "none",
        background: "transparent",
        fontSize: overlayMode ? 11 : "var(--font-size-xs)",
        lineHeight: 1.4,
        padding: overlayMode ? "0" : "var(--spacing-3xs) var(--spacing-3xs) 0",
        fontFamily: "inherit",
        color: overlayMode
          ? (editing ? "#fff" : "rgba(255,255,255,0.9)")
          : (caption || editing ? "var(--text-muted)" : "var(--text-disabled, var(--text-muted))"),
        cursor: editing ? "text" : "pointer",
        opacity: caption || editing ? 1 : 0,
        transition: "opacity 0.15s",
      }}
      onMouseEnter={(e) => { if (!caption && !editing) e.currentTarget.style.opacity = "0.5"; }}
      onMouseLeave={(e) => { if (!caption && !editing) e.currentTarget.style.opacity = "0"; }}
    />
  );
}

export function ImageElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const selected = useSelected();
  const focused = useFocused();
  const [clicked, setClicked] = useState(false);
  const [captionEditing, setCaptionEditing] = useState(false);
  const isActive = selected && focused && clicked;

  // 선택 해제 시 clicked도 리셋 (캡션 편집 중이면 유지)
  useEffect(() => { if (!selected && !captionEditing) setClicked(false); }, [selected, captionEditing]);

  const el = props.element as Record<string, unknown>;
  const url = (el.url as string) || "";
  const alt = (el.alt as string) || "";
  const imgWidth = (el.width as number) || 0;   // px, 0 = auto
  const imgHeight = (el.height as number) || 0;  // px, 0 = auto
  const caption = (el.caption as string) || "";
  const lockAspect = (el.lockAspect as boolean) ?? true;
  const imgFilter = (el.filter as string) || "";

  const imgRef = useRef<HTMLImageElement>(null);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [resizeSize, setResizeSize] = useState<{ w: number; h: number } | null>(null);
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
      img.style.height = `${rh}px`;
      setResizeSize({ w: rw, h: rh });
    };

    const onPointerUp = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      if (!img) return;
      const w = Math.round(parseFloat(img.style.width));
      const h = Math.round(parseFloat(img.style.height));
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
    borderRadius: 2,
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

  const showCaption = !!(caption || isActive || captionEditing);
  const badgeHeight = 22;
  const infoStyle: React.CSSProperties = {
    position: "absolute", left: 4,
    bottom: showCaption ? badgeHeight + 10 : 4,
    padding: "2px 10px",
    background: "var(--bg-overlay)", color: "#fff",
    borderRadius: "var(--radius-capsule)", fontSize: 11,
    fontFamily: "var(--font-mono)", lineHeight: 1.4,
    height: badgeHeight, display: "flex", alignItems: "center",
    pointerEvents: "none", whiteSpace: "nowrap", zIndex: 4,
    maxWidth: "calc(100% - 8px)", overflow: "hidden", textOverflow: "ellipsis",
  };

  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();

  return (
    <PlateElement {...props} as="span" style={{ ...props.style, display: "inline-block", verticalAlign: "baseline", margin: "2px 4px" }}>
      <BlockDropZone path={elPath}>
        <div
          contentEditable={false}
          style={{ display: "inline-block", maxWidth: "100%" }}
          draggable={!draggingRef.current}
          onDragStart={(e) => {
            if (draggingRef.current) { e.preventDefault(); return; }
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", "block-dnd");
            _blockDragPath.current = elPath;
            // 오프스크린 클론으로 이미지만 고스트 표시
            if (imgRef.current) {
              const img = imgRef.current;
              const clone = img.cloneNode(true) as HTMLImageElement;
              clone.style.cssText = `width:${img.offsetWidth}px;height:${img.offsetHeight}px;position:fixed;top:-9999px;left:-9999px;pointer-events:none;outline:none;filter:none;`;
              document.body.appendChild(clone);
              const rect = img.getBoundingClientRect();
              e.dataTransfer.setDragImage(clone, e.clientX - rect.left, e.clientY - rect.top);
              requestAnimationFrame(() => clone.remove());
            }
            setIsDragging(true);
          }}
          onDragEnd={() => { _blockDragPath.current = null; setIsDragging(false); }}
        >
          <div
            style={{ position: "relative" }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
            ref={imgRef}
            src={url}
            alt={alt}
            onLoad={onImgLoad}
            onClick={() => setClicked(true)}
            style={{
              width: imgWidth > 0 ? imgWidth : undefined,
              height: imgHeight > 0 ? imgHeight : undefined,
              maxWidth: "100%",
              display: "block",
              outline: isActive && !isDragging ? "2px solid var(--color-accent, #3b82f6)" : undefined,
              filter: imgFilter || undefined,
              cursor: "grab",
            }}
            draggable={false}
          />
          {/* Hover info — 드래그 중 숨김 */}
          {displaySize && (
            <div style={{
              ...infoStyle,
              opacity: hovered && !isDragging && !resizeSize ? 1 : 0,
              transform: hovered && !isDragging && !resizeSize ? "translateY(0)" : "translateY(4px)",
              transition: "opacity 0.2s ease, transform 0.2s ease, bottom 0.2s ease",
            }}>
              {fileName && <span>{fileName} · </span>}
              <span>{displaySize.w}×{displaySize.h}px</span>
            </div>
          )}
          {/* Resize live size */}
          {resizeSize && !isDragging && (
            <div style={{ ...infoStyle, left: "50%", bottom: "auto", top: "50%", transform: "translate(-50%, -50%)", fontSize: 13, fontWeight: 600 }}>
              {resizeSize.w}×{resizeSize.h}px
            </div>
          )}
          {/* Resize handles — 드래그 중 숨김 */}
          {isActive && !isDragging && (
            <>
              <div onPointerDown={onPointerDown("right")} style={{ ...handleStyle, right: -4, top: "50%", transform: "translateY(-50%)", width: 6, height: 32, cursor: "ew-resize" }} />
              <div onPointerDown={onPointerDown("bottom")} style={{ ...handleStyle, bottom: -4, left: "50%", transform: "translateX(-50%)", width: 32, height: 6, cursor: "ns-resize" }} />
              <div onPointerDown={onPointerDown("corner")} style={{ ...handleStyle, right: -5, bottom: -5, width: 10, height: 10, borderRadius: 3, cursor: "nwse-resize" }} />
            </>
          )}
          {/* 캡션 — 이미지 하단 오버레이 */}
          <div style={{
            position: "absolute", bottom: 4, left: 4, right: 4,
            background: "var(--bg-overlay)",
            borderRadius: "var(--radius-capsule)",
            height: badgeHeight, display: "flex", alignItems: "center",
            padding: "0 10px", zIndex: 3,
            opacity: showCaption ? 1 : 0,
            transform: showCaption ? "translateY(0)" : "translateY(4px)",
            transition: "opacity 0.2s ease, transform 0.2s ease",
            pointerEvents: showCaption ? "auto" : "none",
          }}>
            <InlineCaption
              caption={caption}
              onCommit={(v) => setAttr({ caption: v || undefined })}
              onEditingChange={setCaptionEditing}
              overlayMode
            />
          </div>
        </div>
      </div>
      </BlockDropZone>
      {props.children}
    </PlateElement>
  );
}

// ── 코드블록 엘리먼트 (줄바꿈/스크롤 토글) ──
export function CodeBlockElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const { t } = useLanguage();
  const el = props.element as Record<string, unknown>;
  const wrap = (el.wrap as boolean) ?? false;
  const [justClicked, setJustClicked] = React.useState(false);
  const isEmpty = !el.children || (el.children as Array<{ children?: Array<{ text?: string }> }>).every(
    (line) => !line.children?.some((leaf) => leaf.text && leaf.text.length > 0),
  );
  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();
  const { blockDragProps } = useBlockDrag(elPath);

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
    </div>
    </BlockDropZone>
  );
}

// ── Paragraph 엘리먼트 (todo 체크박스 렌더링 + 블록 드롭 존) ──
export function ParagraphElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const el = props.element as Record<string, unknown>;
  const hasTodo = Object.hasOwn(el, "checked");

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
        <PlateElement {...props} as="div" style={{ ...props.style }} />
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
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="var(--bg-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2.5 6.5 5 9 9.5 3.5" />
            </svg>
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
  m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
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
  const editor = useEditorRef();
  const selected = useSelected();
  const focused = useFocused();
  const el = props.element as Record<string, unknown>;
  const url = (el.url as string) || "";
  const embed = parseEmbed(url);
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
            <div contentEditable={false} style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 4 }}>
              {(["left", "center", "right"] as const).map((a) => (
                <button key={a} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setMediaAttr({ align: a })} style={{ padding: "2px 8px", fontSize: 11, border: "1px solid var(--border-light-color)", borderRadius: "var(--radius-xs)", background: vidAlign === a ? "var(--bg-tertiary)" : "transparent", cursor: "pointer" }}>
                  {a === "left" ? "◧" : a === "center" ? "◻" : "◨"}
                </button>
              ))}
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setMediaAttr({ width: 0, height: 0 }); }} style={{ padding: "2px 8px", fontSize: 11, border: "1px solid var(--border-light-color)", borderRadius: "var(--radius-xs)", background: "transparent", cursor: "pointer" }}>
                ↺
              </button>
            </div>
          )}
        </BlockDropZone>
        {props.children}
      </PlateElement>
    );
  }

  // iframe / script / link fallback
  return (
    <PlateElement {...props} style={{ margin: "16px 0", ...props.style }}>
      <BlockDropZone path={elPath}>
        <div {...blockDragProps} contentEditable={false} style={{ position: "relative", width: "100%", maxWidth: 640, cursor: "default" }}>
          {embed?.type === "iframe" ? (
            <iframe
              src={embed.src}
              style={{ width: "100%", aspectRatio: embed.aspect || "16/9", border: "none", borderRadius: 8 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
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
export function LinkElement(props: PlateElementProps) {
  const url = ((props.element as Record<string, unknown>).url as string) || "";
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
  const sizeLabel = fileSize ? (fileSize < 1024 * 1024 ? `${(fileSize / 1024).toFixed(1)} KB` : `${(fileSize / (1024 * 1024)).toFixed(1)} MB`) : "";

  const FileIcon = () => {
    if (isPdf) return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M10 13h4"/><path d="M10 17h4"/><path d="M10 9h1"/>
      </svg>
    );
    if (isAudio) return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
      </svg>
    );
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
      </svg>
    );
  };

  return (
    <PlateElement {...props} style={{ margin: "var(--spacing-sm) 0", ...props.style }}>
      <BlockDropZone path={elPath}>
        <div {...blockDragProps} contentEditable={false} style={{ maxWidth: 480, cursor: "default" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 12px", borderRadius: "var(--radius-capsule, 999px)",
            border: "1px solid var(--border-light-color)",
            background: "var(--bg-secondary)",
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
            <a href={url} target="_blank" rel="noopener noreferrer" download style={{
              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid var(--border-light-color)", background: "var(--bg-primary)",
              color: "var(--text-primary)", textDecoration: "none", cursor: "pointer",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12m0 0l-4-4m4 4l4-4"/><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/>
              </svg>
            </a>
          </div>
          {isAudio && (
            <audio src={url} controls preload="metadata" style={{ width: "100%", marginTop: 6, borderRadius: "var(--radius-sm)" }} />
          )}
        </div>
      </BlockDropZone>
      {props.children}
    </PlateElement>
  );
}

/** Heading (h1–h6) — 드롭 존 래퍼 */
export function HeadingElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const el = props.element as Record<string, unknown>;
  const tag = (el.type as string) || "h1";
  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();
  return (
    <BlockDropZone path={elPath}>
      <PlateElement {...props} as={tag as "h1"} style={{ ...props.style }} />
    </BlockDropZone>
  );
}

/** Blockquote — 드롭 존 래퍼 */
export function BlockquoteElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();
  return (
    <BlockDropZone path={elPath}>
      <PlateElement {...props} as="blockquote" style={{ ...props.style }} />
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
        <div contentEditable={false} style={{ maxWidth: 480, padding: "10px 14px", borderRadius: 8, margin: "8px 0" }}>
          {title && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>🎵</span>
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
  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();
  return (
    <BlockDropZone path={elPath}>
      <PlateElement {...props} style={{ ...props.style }}>
        <hr contentEditable={false} style={{ border: "none", borderTop: "1px solid var(--border-light-color)", margin: "var(--spacing-md) 0" }} />
        <BlockTailClickZone path={elPath} />
        {props.children}
      </PlateElement>
    </BlockDropZone>
  );
}

// ── Column resize handle ──
function ColumnResizeHandle({ onResize, dividerColor }: { onResize: (deltaPercent: number) => void; dividerColor?: string }) {
  const handleRef = useRef<HTMLDivElement>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const container = handleRef.current?.closest("[data-col-group]") as HTMLElement | null;
    const containerWidth = container?.getBoundingClientRect().width || 600;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const deltaPercent = (dx / containerWidth) * 100;
      onResize(deltaPercent);
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }, [onResize]);

  return (
    <div
      ref={handleRef}
      contentEditable={false}
      onPointerDown={onPointerDown}
      style={{
        width: 8,
        flexShrink: 0,
        alignSelf: "stretch",
        cursor: "col-resize",
        display: "flex",
        alignItems: dividerColor ? "stretch" : "center",
        justifyContent: "center",
        userSelect: "none",
        touchAction: "none",
      }}
      onMouseEnter={(e) => {
        const h = e.currentTarget.querySelector<HTMLElement>("[data-handle]");
        if (h && !dividerColor) h.style.background = "var(--text-muted)";
      }}
      onMouseLeave={(e) => {
        const h = e.currentTarget.querySelector<HTMLElement>("[data-handle]");
        if (h && !dividerColor) h.style.background = "var(--border-light-color)";
      }}
    >
      <div data-handle style={{
        width: 3,
        height: 24,
        borderRadius: 2,
        background: "var(--border-light-color)",
        transition: "background 0.15s",
      }} />
    </div>
  );
}

// ── Column layout ──
export function ColumnGroupElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const el = props.element as Record<string, unknown>;
  const colBg = el.columnBg as string | undefined;
  const colDivider = el.columnDivider as string | undefined;
  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const colChildren = (el.children as any[]) || [];
  const startWidthsRef = useRef<number[]>([]);

  const groupStyle: React.CSSProperties = {
    ...props.style,
    display: "flex",
    gap: "var(--spacing-xs)",
    margin: "var(--spacing-md) 0",
    borderRadius: "var(--radius-sm)",
    "--_col-bg": colBg || "",
    "--_col-divider": colDivider || "",
    "--_col-bg-base": colBg || "color-mix(in srgb, var(--text-primary) 3%, transparent)",
  } as React.CSSProperties;

  // children 사이에 리사이즈 핸들 + 선택적 구분선 삽입
  const childArr = React.Children.toArray(props.children);
  const slateChildren = childArr.filter((child) =>
    React.isValidElement(child) && (child as React.ReactElement<{ "data-slate-node"?: string }>).props?.["data-slate-node"]
  );
  const nonSlateChildren = childArr.filter((child) =>
    !React.isValidElement(child) || !(child as React.ReactElement<{ "data-slate-node"?: string }>).props?.["data-slate-node"]
  );

  const withHandles = slateChildren.reduce<React.ReactNode[]>((acc, child, i) => {
    if (i > 0) {
      acc.push(
        <ColumnResizeHandle
          key={`handle-${i}`}
          dividerColor={colDivider}
          onResize={(deltaPercent) => {
            if (!elPath) return;
            // 첫 드래그 시 현재 너비 기록
            if (startWidthsRef.current.length === 0) {
              startWidthsRef.current = colChildren.map((c: { width?: string }) => {
                const w = c.width ? parseInt(c.width) : Math.round(100 / colChildren.length);
                return w;
              });
            }
            const widths = [...startWidthsRef.current];
            const leftIdx = i - 1;
            const rightIdx = i;
            const newLeft = Math.max(10, Math.min(90, widths[leftIdx] + deltaPercent));
            const newRight = Math.max(10, Math.min(90, widths[rightIdx] - deltaPercent));
            editor.tf.setNodes({ width: `${Math.round(newLeft)}%` }, { at: [...elPath, leftIdx] });
            editor.tf.setNodes({ width: `${Math.round(newRight)}%` }, { at: [...elPath, rightIdx] });
          }}
        />
      );
    }
    acc.push(child);
    return acc;
  }, []);

  // pointerup 시 startWidths 리셋
  useEffect(() => {
    const reset = () => { startWidthsRef.current = []; };
    document.addEventListener("pointerup", reset);
    return () => document.removeEventListener("pointerup", reset);
  }, []);

  return (
    <BlockDropZone path={elPath}>
      <PlateElement {...props} style={groupStyle} data-col-group>
        {withHandles}
        {nonSlateChildren}
      </PlateElement>
    </BlockDropZone>
  );
}

export function ColumnElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const selected = useSelected();
  const focused = useFocused();
  const el = props.element as Record<string, unknown>;
  const width = el.width as string | undefined;

  // 마지막 열인지 확인
  const isLast = (() => {
    try {
      const path = editor.api.findPath(props.element);
      if (!path || path.length < 2) return false;
      const parentPath = path.slice(0, -1);
      const parent = editor.api.node(parentPath);
      if (!parent) return false;
      const siblings = (parent[0] as Record<string, unknown>).children as unknown[];
      return path[path.length - 1] === siblings.length - 1;
    } catch { return false; }
  })();

  // 내용이 비어있는지 확인
  const isEmpty = (() => {
    const children = (el.children as { children?: { text?: string }[] }[]) || [];
    return children.every((child) =>
      !child.children || child.children.every((leaf) => !leaf.text || leaf.text.length === 0)
    );
  })();

  // 이 열에 커서가 있는지 (개별 감지)
  const isEditing = selected && focused;

  const showBg = isEmpty && !isEditing;

  return (
    <PlateElement {...props} style={{
      ...props.style, flex: width ? `${parseFloat(width)} 0 0` : "1 0 0", minWidth: 0,
      borderRadius: "var(--radius-sm)", overflow: "visible",
      background: showBg ? "var(--_col-bg, var(--_col-bg-base))" : "var(--_col-bg, transparent)",
      padding: "var(--spacing-sm)", transition: "background-color 0.15s",
      position: "relative",
    }}>
      {props.children}
      {!isLast && <div contentEditable={false} style={{
        position: "absolute",
        top: 0, bottom: 0,
        right: "calc(-1 * var(--spacing-xs) / 2)",
        width: 1,
        background: "var(--_col-divider, transparent)",
        pointerEvents: "none",
        transform: "scaleX(0.5)",
      }} />}
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
                transition: "max-height 0.25s ease-out, opacity 0.2s ease-out", paddingLeft: 24,
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
          borderRadius: "var(--radius-md)", background: bg,
          border: bg === "var(--bg-primary)" ? "1px solid var(--border-light-color)" : "1px solid transparent",
        }}>
          {props.children}
        </PlateElement>
      </div>
    </BlockDropZone>
  );
}
