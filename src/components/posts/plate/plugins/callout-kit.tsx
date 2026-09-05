"use client";

import { createSlatePlugin } from "platejs";
import { CalloutElement } from "../elements/ToggleCalloutElements";

/** 콜아웃 — 커스텀 노드 (bg + 이모지 아이콘) */
export const CalloutKit = [
  createSlatePlugin({
    key: "callout",
    node: { isElement: true },
    render: { node: CalloutElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "DIV" }],
          query: ({ element }: { element: HTMLElement }) => element.hasAttribute("data-callout"),
          parse: ({ element }: { element: HTMLElement }) => {
            // 아이콘 visual span 제거 (children에 중복 삽입 방지)
            element.querySelectorAll("[data-callout-icon-visual]").forEach((el) => el.remove());
            // flex wrapper div 안의 내용을 바로 callout children으로
            const contentDiv = element.querySelector("div[style*='flex:1']") || element.querySelector("div[style*='flex: 1']");
            if (contentDiv) {
              element.innerHTML = contentDiv.innerHTML;
            }
            return {
              type: "callout",
              bg: element.getAttribute("data-callout-bg") || "var(--bg-tertiary)",
              icon: element.getAttribute("data-callout-icon") || "💡",
            };
          },
        },
      },
    },
  }),
];
