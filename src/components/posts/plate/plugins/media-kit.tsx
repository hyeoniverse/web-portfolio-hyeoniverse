"use client";

import { ImagePlugin, MediaEmbedPlugin } from "@platejs/media/react";
import { createPlatePlugin } from "platejs/react";
import { ImageElement, MediaEmbedElement } from "../elements";

// 마크다운 입력: `![alt](url)` 을 치고 닫는 `)` 를 누르면 이미지 노드로 변환.
// (@platejs/media 엔 이미지용 markdown 규칙이 없어 직접 구현 — img 는 inline void 노드)
const ImageMarkdownKit = createPlatePlugin({ key: "imageMarkdown" }).overrideEditor(
  ({ editor, tf: { insertText } }) => ({
    transforms: {
      insertText(text, options) {
        if (text === ")" && editor.api.isCollapsed() && editor.selection) {
          const focus = editor.selection.focus;
          const leaf = editor.api.node(focus.path);
          const raw = typeof leaf?.[0]?.text === "string" ? (leaf[0].text as string) : "";
          const before = raw.slice(0, focus.offset);
          const m = /!\[([^\]]*)\]\(([^)\s]+)$/.exec(before);
          if (m && m[2]) {
            editor.tf.delete({ unit: "character", reverse: true, distance: m[0].length });
            editor.tf.insertNodes({ type: "img", url: m[2], ...(m[1] ? { alt: m[1] } : {}), children: [{ text: "" }] });
            return;
          }
        }
        insertText(text, options);
      },
    },
  }),
);

/** <video> → media_embed 노드 복원 (크기·정렬·float·재생옵션·시작위치·다운로드방지·캡션).
 *  figure 로 감싼 경우(=대부분) figureEl 로 정렬/캡션을 읽는다. */
function parseVideo(videoEl: HTMLElement, figureEl: HTMLElement | null): Record<string, unknown> {
  const vStyle = videoEl.getAttribute("style") || "";
  const rawSrc = videoEl.getAttribute("src") || "";
  const tMatch = rawSrc.match(/#t=(\d+)/);
  const node: Record<string, unknown> = {
    type: "media_embed",
    url: rawSrc.replace(/#t=\d+$/, ""),
    mediaType: "video",
    children: [{ text: "" }],
  };
  const vw = vStyle.match(/width:\s*(\d+)px/);
  if (vw) node.width = Number(vw[1]);
  const vh = vStyle.match(/height:\s*(\d+)px/);
  if (vh) node.height = Number(vh[1]);
  if (tMatch) node.vidStart = Number(tMatch[1]);
  if (videoEl.hasAttribute("loop")) node.vidLoop = true;
  if (videoEl.hasAttribute("autoplay")) node.vidAutoplay = true;
  if (videoEl.hasAttribute("muted")) node.vidMuted = true;
  if ((videoEl.getAttribute("controlsList") || "").includes("nodownload")) node.noDownload = true;
  const cap = videoEl.getAttribute("data-caption") || figureEl?.querySelector("figcaption")?.textContent?.trim();
  if (cap) node.caption = cap;
  const wrapStyle = figureEl?.getAttribute("style") || "";
  if (/float:\s*left/.test(vStyle) || /float:\s*left/.test(wrapStyle)) node.layout = "float-left";
  else if (/float:\s*right/.test(vStyle) || /float:\s*right/.test(wrapStyle)) node.layout = "float-right";
  else if (wrapStyle.includes("flex-end")) node.align = "right";
  else if (wrapStyle.includes("flex-start")) node.align = "left";
  return node;
}

/** 미디어 — 이미지(크기/정렬/캡션 커스텀) + iframe embed(YouTube 옵션 복원) */
export const MediaKit = [
  ImagePlugin.configure({
    node: { isElement: true, isInline: true, isVoid: true },
    render: { node: ImageElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: ["IMG", "FIGURE"] }],
          parse: ({ element }: { element: HTMLElement }) => {
            // FIGURE 는 이미지·동영상 모두 감쌀 수 있음 → 동영상이면 media_embed 로 (figcaption 중복 방지)
            if (element.nodeName === "FIGURE") {
              const vEl = element.querySelector("video");
              if (vEl) return parseVideo(vEl as HTMLElement, element);
            }
            // FIGURE → 내부 IMG를 찾아서 처리
            const imgEl = element.nodeName === "FIGURE"
              ? element.querySelector("img")
              : element;
            if (!imgEl) return { text: "" };
            const figureEl = element.nodeName === "FIGURE" ? element : element.parentElement;
            const url = imgEl.getAttribute("src") || "";
            const alt = imgEl.getAttribute("alt") || undefined;
            const style = imgEl.getAttribute("style") || "";
            const wMatch = imgEl.getAttribute("data-width") || style.match(/width:\s*(\d+)px/)?.[1];
            const hMatch = imgEl.getAttribute("data-height") || style.match(/height:\s*(\d+)px/)?.[1];
            const filterMatch = imgEl.getAttribute("data-filter") || style.match(/filter:\s*([^;]+)/)?.[1] || undefined;
            const caption = imgEl.getAttribute("data-caption")
              || figureEl?.querySelector("figcaption")?.textContent
              || undefined;
            const layout = imgEl.getAttribute("data-layout") || undefined;
            const align = imgEl.getAttribute("data-align") || undefined;
            const lockAspect = imgEl.getAttribute("data-lock-aspect") === "false" ? false : undefined;
            return {
              type: "img",
              url,
              ...(alt && { alt }),
              ...(wMatch && { width: parseInt(String(wMatch), 10) }),
              ...(hMatch && { height: parseInt(String(hMatch), 10) }),
              ...(caption && { caption }),
              ...(layout && { layout }),
              ...(align && { align }),
              ...(lockAspect !== undefined && { lockAspect }),
              ...(filterMatch && { filter: filterMatch }),
              children: [{ text: "" }],
            };
          },
        },
      },
    },
  }),
  MediaEmbedPlugin.configure({
    render: { node: MediaEmbedElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: ["IFRAME", "VIDEO"] }],
          parse: ({ element }: { element: HTMLElement }) => {
            // ── 동영상 <video> (figure 로 안 감싼 bare 케이스) → media_embed ──
            if (element.tagName === "VIDEO") {
              return parseVideo(element, element.parentElement);
            }

            const url = element.getAttribute("data-original-url") || element.getAttribute("src") || "";
            const node: Record<string, unknown> = { type: "media_embed", url, children: [{ text: "" }] };
            // width from inline style (style="width:400px") or parent div style
            const style = element.getAttribute("style") || "";
            const wMatch = style.match(/width:\s*(\d+)px/);
            if (wMatch) node.width = Number(wMatch[1]);
            // align from parent div (justify-content)
            const parent = element.parentElement;
            if (parent?.tagName === "DIV") {
              const pStyle = parent.getAttribute("style") || "";
              if (pStyle.includes("flex-end")) node.align = "right";
              else if (pStyle.includes("flex-start")) node.align = "left";
            }
            // YouTube 옵션 복원 from embed src params
            const src = element.getAttribute("src") || "";
            try {
              const u = new URL(src);
              const start = u.searchParams.get("start");
              if (start) node.ytStart = Number(start);
              if (u.searchParams.get("autoplay") === "1") node.ytAutoplay = true;
              if (u.searchParams.get("loop") === "1") node.ytLoop = true;
              if (u.searchParams.get("mute") === "1") node.ytMute = true;
              if (u.searchParams.get("controls") === "0") node.ytControls = false;
            } catch { /* not a valid URL */ }
            return node;
          },
        },
      },
    },
  }),
  ImageMarkdownKit, // ![alt](url) → 이미지 자동변환
];
