"use client";

import { createSlatePlugin } from "platejs";
import { PollElement, genPollId } from "../PollElements";

/** 투표 — void 요소. 옵션은 el.options 배열로 저장(라벨은 순수 React input 으로 편집). */
export const PollKit = [
  createSlatePlugin({
    key: "poll",
    node: { isElement: true, isVoid: true },
    render: { node: PollElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "DIV" }],
          query: ({ element }: { element: HTMLElement }) => element.hasAttribute("data-poll"),
          parse: ({ element }: { element: HTMLElement }) => {
            const options = Array.from(element.querySelectorAll(":scope > [data-poll-option]")).map((d) => ({
              optionId: d.getAttribute("data-option-id") || genPollId(),
              label: (d.textContent || "").trim(),
            }));
            return {
              type: "poll",
              pollId: element.getAttribute("data-poll-id") || "",
              multiple: element.getAttribute("data-multiple") === "true",
              options,
              ...(element.getAttribute("data-start") ? { startAt: element.getAttribute("data-start") } : {}),
              ...(element.getAttribute("data-end") ? { endAt: element.getAttribute("data-end") } : {}),
              ...(element.getAttribute("data-results-before") === "true" ? { resultsBeforeVote: true } : {}),
              children: [{ text: "" }],
            };
          },
        },
      },
    },
  }),
];
