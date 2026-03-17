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
import { BlockDragHandle, BlockDropZone } from "./BlockDragHandle";
import { _blockDragPath } from "./utils";
import styles from "../RichTextEditor.module.css";

/** 인라인 캡션 입력 — 이미지/표 공용 */
export function InlineCaption({ caption, onCommit, onEditingChange, autoEdit }: { caption: string; onCommit: (v: string) => void; onEditingChange?: (editing: boolean) => void; autoEdit?: boolean }) {
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

  if (editing) {
    return (
      <input
        ref={inputRef}
        contentEditable={false}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setDraft(caption); setEditingWrapped(false); }
        }}
        placeholder={t("editor.captionInput")}
        autoFocus
        style={{
          width: "100%",
          border: "none",
          outline: "none",
          background: "transparent",
          fontSize: "var(--font-size-xs)",
          color: "var(--text-muted)",
          padding: "var(--spacing-3xs) var(--spacing-3xs) 0",
          fontFamily: "inherit",
        }}
      />
    );
  }

  return (
    <div
      contentEditable={false}
      onClick={() => { setEditingWrapped(true); setTimeout(() => inputRef.current?.focus(), 0); }}
      style={{
        fontSize: "var(--font-size-xs)",
        color: caption ? "var(--text-muted)" : "var(--text-disabled, var(--text-muted))",
        padding: "var(--spacing-3xs) var(--spacing-3xs) 0",
        cursor: "text",
        opacity: caption ? 1 : 0,
        transition: "opacity 0.15s",
        userSelect: "none",
      }}
      onMouseEnter={(e) => { if (!caption) (e.currentTarget as HTMLElement).style.opacity = "0.5"; }}
      onMouseLeave={(e) => { if (!caption) (e.currentTarget as HTMLElement).style.opacity = "0"; }}
    >
      {caption || t("editor.captionAdd")}
    </div>
  );
}

export function ImageElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const selected = useSelected();
  const focused = useFocused();
  const isActive = selected && focused;

  const el = props.element as Record<string, unknown>;
  const url = (el.url as string) || "";
  const alt = (el.alt as string) || "";
  const imgWidth = (el.width as number) || 0;   // px, 0 = auto
  const imgHeight = (el.height as number) || 0;  // px, 0 = auto
  const align = (el.align as string) || "center";
  const caption = (el.caption as string) || "";
  const lockAspect = (el.lockAspect as boolean) ?? true;
  const imgFilter = (el.filter as string) || "";

  const imgRef = useRef<HTMLImageElement>(null);
  const [hovered, setHovered] = useState(false);
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

  const justifyMap: Record<string, string> = { left: "flex-start", center: "center", right: "flex-end" };

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

  const infoStyle: React.CSSProperties = {
    position: "absolute", left: 6, bottom: 6,
    padding: "3px 8px",
    background: "rgba(0,0,0,0.7)", color: "#fff",
    borderRadius: "var(--radius-xs)", fontSize: 11,
    fontFamily: "var(--font-mono)", lineHeight: 1.3,
    pointerEvents: "none", whiteSpace: "nowrap", zIndex: 3,
    maxWidth: "calc(100% - 12px)", overflow: "hidden", textOverflow: "ellipsis",
  };

  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();

  return (
    <PlateElement {...props} as="figure" style={{ ...props.style, display: "flex", flexDirection: "column", alignItems: justifyMap[align] || "center", margin: "var(--spacing-md, 16px) 0" }}>
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
          }}
          onDragEnd={() => { _blockDragPath.current = null; }}
        >
          <div
            style={{ position: "relative" }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <img
            ref={imgRef}
            src={url}
            alt={alt}
            onLoad={onImgLoad}
            style={{
              width: imgWidth > 0 ? imgWidth : undefined,
              height: imgHeight > 0 ? imgHeight : undefined,
              maxWidth: "100%",
              display: "block",
              outline: isActive ? "2px solid var(--color-accent, #3b82f6)" : undefined,
              filter: imgFilter || undefined,
              cursor: "grab",
            }}
            draggable={false}
          />
          {/* Hover info */}
          {hovered && !resizeSize && displaySize && (
            <div style={infoStyle}>
              {fileName && <span>{fileName} · </span>}
              <span>{displaySize.w}×{displaySize.h}px</span>
            </div>
          )}
          {/* Resize live size */}
          {resizeSize && (
            <div style={{ ...infoStyle, left: "50%", bottom: "auto", top: "50%", transform: "translate(-50%, -50%)", fontSize: 13, fontWeight: 600 }}>
              {resizeSize.w}×{resizeSize.h}px
            </div>
          )}
          {isActive && (
            <>
              <div onPointerDown={onPointerDown("right")} style={{ ...handleStyle, right: -4, top: "50%", transform: "translateY(-50%)", width: 6, height: 32, cursor: "ew-resize" }} />
              <div onPointerDown={onPointerDown("bottom")} style={{ ...handleStyle, bottom: -4, left: "50%", transform: "translateX(-50%)", width: 32, height: 6, cursor: "ns-resize" }} />
              <div onPointerDown={onPointerDown("corner")} style={{ ...handleStyle, right: -5, bottom: -5, width: 10, height: 10, borderRadius: 3, cursor: "nwse-resize" }} />
            </>
          )}
        </div>
        <InlineCaption
          caption={caption}
          onCommit={(v) => setAttr({ caption: v || undefined })}
        />
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

  const toggleWrap = () => {
    if (elPath) editor.tf.setNodes({ wrap: !wrap }, { at: elPath });
  };

  return (
    <BlockDropZone path={elPath}>
    <BlockDragHandle path={elPath} />
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

/** 미디어 임베드 — iframe / script 렌더링 */
export function MediaEmbedElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const url = ((props.element as Record<string, unknown>).url as string) || "";
  const embed = parseEmbed(url);
  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();

  return (
    <PlateElement {...props} style={{ margin: "16px 0", ...props.style }}>
      <BlockDropZone path={elPath}>
        <BlockDragHandle path={elPath} />
        <div contentEditable={false} style={{ position: "relative", width: "100%", maxWidth: 640 }}>
          {embed?.type === "video" ? (
            <video
              src={embed.src}
              controls
              preload="metadata"
              style={{ width: "100%", maxHeight: 480, borderRadius: 8, background: "#000" }}
            />
          ) : embed?.type === "iframe" ? (
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
export function HrElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();
  return (
    <BlockDropZone path={elPath}>
      <PlateElement {...props} style={{ ...props.style }}>
        <hr contentEditable={false} style={{ border: "none", borderTop: "1px solid var(--border-light-color)", margin: "var(--spacing-md) 0" }} />
        {props.children}
      </PlateElement>
    </BlockDropZone>
  );
}
