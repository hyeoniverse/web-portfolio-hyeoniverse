"use client";

import { createSlatePlugin } from "platejs";
import { TabsElement, TabPanelElement } from "../TabsElements";

/** 탭 — 커스텀 노드. tabs(activeTab) > tab_panel(label) > 내용 */
export const TabsKit = [
  createSlatePlugin({
    key: "tabs",
    node: { isElement: true },
    render: { node: TabsElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "DIV" }],
          query: ({ element }: { element: HTMLElement }) => element.hasAttribute("data-tabs"),
          parse: ({ element }: { element: HTMLElement }) => ({
            type: "tabs",
            activeTab: Number(element.getAttribute("data-active") || 0),
          }),
        },
      },
    },
  }),
  createSlatePlugin({
    key: "tab_panel",
    node: { isElement: true },
    render: { node: TabPanelElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "DIV" }],
          query: ({ element }: { element: HTMLElement }) => element.hasAttribute("data-tab-panel"),
          parse: ({ element }: { element: HTMLElement }) => ({
            type: "tab_panel",
            label: element.getAttribute("data-label") || "",
            ...(element.getAttribute("data-tab-icon") ? { icon: element.getAttribute("data-tab-icon") } : {}),
          }),
        },
      },
    },
  }),
];
