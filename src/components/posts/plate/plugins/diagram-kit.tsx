"use client";

import { createSlatePlugin } from "platejs";
import { DiagramElement } from "../DiagramElement";
import { normalizeDiagram } from "../diagram/model";

/** 비주얼 다이어그램 — void 요소. 데이터는 el.data(DiagramData: 위치 보존 노드/엣지)로 저장. */
export const DiagramKit = [
  createSlatePlugin({
    key: "diagram",
    node: { isElement: true, isVoid: true },
    render: { node: DiagramElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "DIV" }],
          query: ({ element }: { element: HTMLElement }) => element.hasAttribute("data-diagram"),
          parse: ({ element }: { element: HTMLElement }) => {
            let data: unknown = {};
            try { const raw = element.getAttribute("data-diagram"); if (raw) data = JSON.parse(raw); } catch { /* noop */ }
            return { type: "diagram", data: normalizeDiagram(data), children: [{ text: "" }] };
          },
        },
      },
    },
  }),
];
