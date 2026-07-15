"use client";

import { createSlatePlugin } from "platejs";
import { DateMentionElement } from "../DateMentionElement";
import { genShortId } from "../dateUtils";

/** 날짜/시간 멘션 — inline void. 리더 직렬화는 <span data-date-mention> */
export const DateMentionKit = [
  createSlatePlugin({
    key: "date_mention",
    node: { isElement: true, isInline: true, isVoid: true },
    render: { node: DateMentionElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "SPAN" }],
          query: ({ element }: { element: HTMLElement }) => element.hasAttribute("data-date-mention"),
          parse: ({ element }: { element: HTMLElement }) => {
            const time = element.getAttribute("data-time");
            return {
              type: "date_mention",
              date: element.getAttribute("data-date-mention") || "",
              ...(time ? { time } : {}),
              id: element.getAttribute("data-id") || genShortId(),
              children: [{ text: "" }],
            };
          },
        },
      },
    },
  }),
];
