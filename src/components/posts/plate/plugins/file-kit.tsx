"use client";

import { createSlatePlugin } from "platejs";
import { FileElement, AudioElement } from "../elements";

/** 파일 임베드(PDF 등) + 오디오 플레이어 — 커스텀 void 노드 */
export const FileKit = [
  createSlatePlugin({
    key: "file_embed",
    node: { isElement: true, isVoid: true },
    render: { node: FileElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "DIV" }],
          query: ({ element }: { element: HTMLElement }) => element.hasAttribute("data-file-embed"),
          parse: ({ element }: { element: HTMLElement }) => ({
            type: "file_embed",
            url: element.getAttribute("data-url") || "",
            fileName: element.getAttribute("data-filename") || "",
            fileSize: parseInt(element.getAttribute("data-filesize") || "0", 10) || undefined,
            children: [{ text: "" }],
          }),
        },
      },
    },
  }),
  createSlatePlugin({
    key: "audio_embed",
    node: { isElement: true, isVoid: true },
    render: { node: AudioElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "DIV" }],
          query: ({ element }: { element: HTMLElement }) => element.hasAttribute("data-audio-embed"),
          parse: ({ element }: { element: HTMLElement }) => ({
            type: "audio_embed",
            url: element.getAttribute("data-url") || "",
            title: element.getAttribute("data-title") || "",
            children: [{ text: "" }],
          }),
        },
      },
    },
  }),
];
