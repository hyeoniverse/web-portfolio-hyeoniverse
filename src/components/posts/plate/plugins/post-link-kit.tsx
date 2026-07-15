"use client";

import { createSlatePlugin } from "platejs";
import { PostLinkElement } from "../PostLinkElement";
import { genShortId } from "../dateUtils";

/** 다른 게시물 링크 — inline void. 리더 직렬화는 <a data-post-link=slug href="/posts/slug"> */
export const PostLinkKit = [
  createSlatePlugin({
    key: "post_link",
    node: { isElement: true, isInline: true, isVoid: true },
    render: { node: PostLinkElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "A" }],
          query: ({ element }: { element: HTMLElement }) => element.hasAttribute("data-post-link"),
          parse: ({ element }: { element: HTMLElement }) => ({
            type: "post_link",
            slug: element.getAttribute("data-post-link") || "",
            postId: element.getAttribute("data-post-id") || "",
            icon: element.getAttribute("data-post-icon") || "",
            title: element.textContent || element.getAttribute("data-post-title") || "",
            id: element.getAttribute("data-id") || genShortId(),
            children: [{ text: "" }],
          }),
        },
      },
    },
  }),
];
