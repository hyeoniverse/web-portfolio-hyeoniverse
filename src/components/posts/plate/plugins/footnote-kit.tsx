"use client";

import { createSlatePlugin } from "platejs";
import { FootnoteRefElement, FootnoteContentElement } from "../FootnoteElements";

/** 각주 — 인라인 참조(sup) + 블록 정의 */
export const FootnoteKit = [
  createSlatePlugin({
    key: "footnote_ref",
    node: { isElement: true, isInline: true, isVoid: true },
    render: { node: FootnoteRefElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "SUP" }],
          query: ({ element }: { element: HTMLElement }) => element.hasAttribute("data-footnote-ref"),
          parse: ({ element }: { element: HTMLElement }) => ({
            type: "footnote_ref",
            footnoteId: element.getAttribute("data-footnote-ref") || "",
            children: [{ text: "" }],
          }),
        },
      },
    },
  }),
  createSlatePlugin({
    key: "footnote_content",
    node: { isElement: true },
    render: { node: FootnoteContentElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "DIV" }],
          query: ({ element }: { element: HTMLElement }) => element.hasAttribute("data-footnote-content"),
          parse: ({ element }: { element: HTMLElement }) => ({
            type: "footnote_content",
            footnoteId: element.getAttribute("data-footnote-content") || "",
          }),
        },
      },
    },
  }),
];
