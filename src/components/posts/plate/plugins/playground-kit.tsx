"use client";

import { createSlatePlugin } from "platejs";
import { PlaygroundElement } from "../PlaygroundElement";
import { normalizePlayground } from "../playground/model";

/** 코드 플레이그라운드 — void 요소. 데이터는 el.data(PlaygroundData: html/css/js)로 저장. */
export const PlaygroundKit = [
  createSlatePlugin({
    key: "playground",
    node: { isElement: true, isVoid: true },
    render: { node: PlaygroundElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "DIV" }],
          query: ({ element }: { element: HTMLElement }) => element.hasAttribute("data-playground"),
          parse: ({ element }: { element: HTMLElement }) => {
            let data: unknown = {};
            try { const raw = element.getAttribute("data-playground"); if (raw) data = JSON.parse(raw); } catch { /* noop */ }
            return { type: "playground", data: normalizePlayground(data), children: [{ text: "" }] };
          },
        },
      },
    },
  }),
];
