import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { ALIGN_TO_JUSTIFY } from "../constants";
import type { Size } from "@/types";
import { CAPTION_EDIT_EVENT } from "../constants";
import {
  PlateElement,
  type PlateElementProps,
  useEditorRef,
  useSelected,
  useFocused,
} from "platejs/react";

import { useIsMobile } from "@/hooks/useIsMobile";

import { BlockDropZone, useBlockDrag } from "../BlockDragHandle";

import { InlineCaption } from "./shared";

type EmbedInfo =
  | { type: "iframe"; src: string; aspect?: string }
  | { type: "script"; platform: string; id: string; href: string }
  | { type: "video"; src: string }
  | null;

/* 미디어 임베드 — 영상 · 외부 스크립트 임베드 — elements.tsx 에서 분리 (#680). */

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
  const { isTouch } = useIsMobile();
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
  const [resizeSize, setResizeSize] = useState<Size | null>(null);
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

  const justifyMap = ALIGN_TO_JUSTIFY;

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

  const iframeJustify = ALIGN_TO_JUSTIFY;

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
          : { display: "flex", flexDirection: "column", alignItems: justifyMap[vidAlign] || "center", margin: "var(--prose-block-gap) 0" }),
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
              <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", padding: "3px 8px", background: "var(--bg-overlay)", color: "#fff", borderRadius: "var(--radius-capsule)", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-mono)", pointerEvents: "none", zIndex: 3 }}>
                {resizeSize.w}×{resizeSize.h}px
              </div>
            )}
            {isActive && !isTouch && (
              <>
                {/* 히트박스 — 우/하/모서리 (이미지와 동일). 터치에선 얇은 핸들 숨김 */}
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
    <PlateElement {...props} style={{ margin: "var(--prose-block-gap) 0", display: "flex", flexDirection: "column", alignItems: iframeWidth > 0 ? (iframeJustify[iframeAlign] || "center") : "stretch", ...props.style }}>
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
              {iframeActive && !isTouch && (
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
