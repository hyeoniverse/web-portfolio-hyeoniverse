"use client";

import { createSlatePlugin } from "platejs";
import { GalleryBlockElement } from "../GalleryBlockElement";
import { normalizeGallery } from "../gallery/model";

/** 슬라이드 갤러리 — void 요소. 데이터는 el.data(GalleryBlockData: 주소 목록 + 장마다의 대본 · 음성)로 저장. */
export const GalleryKit = [
  createSlatePlugin({
    key: "gallery",
    node: { isElement: true, isVoid: true },
    render: { node: GalleryBlockElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "DIV" }],
          query: ({ element }: { element: HTMLElement }) => element.hasAttribute("data-gallery"),
          parse: ({ element }: { element: HTMLElement }) => {
            let data: unknown = {};
            try { const raw = element.getAttribute("data-gallery"); if (raw) data = JSON.parse(raw); } catch { /* noop */ }
            return { type: "gallery", data: normalizeGallery(data), children: [{ text: "" }] };
          },
        },
      },
    },
  }),
];
