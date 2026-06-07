"use client";

import { ImagePlugin, MediaEmbedPlugin } from "@platejs/media/react";
import { ImageElement, MediaEmbedElement } from "../elements";

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
          rules: [{ validNodeName: "IFRAME" }],
          parse: ({ element }: { element: HTMLElement }) => {
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
];
