"use client";

import { createSlatePlugin } from "platejs";
import { ToggleElement } from "../elements/ToggleCalloutElements";

/** 토글 (접기/펼치기) — 커스텀 노드 */
export const ToggleKit = [
  createSlatePlugin({
    key: "toggle",
    node: { isElement: true },
    render: { node: ToggleElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "DIV" }],
          query: ({ element }: { element: HTMLElement }) => element.hasAttribute("data-toggle"),
          parse: ({ element }: { element: HTMLElement }) => ({
            type: "toggle",
            open: element.hasAttribute("data-open"),
          }),
        },
      },
    },
  }),
];
