"use client";

import { ColumnPlugin, ColumnItemPlugin } from "@platejs/layout/react";
import { ColumnElement, ColumnGroupElement } from "../elements/ColumnElements";

/** 다단 컬럼 레이아웃 */
export const ColumnKit = [
  ColumnPlugin.configure({
    render: { node: ColumnGroupElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "DIV" }],
          query: ({ element }: { element: HTMLElement }) => element.hasAttribute("data-column-group"),
          parse: ({ element }: { element: HTMLElement }) => ({
            type: "column_group",
            layout: element.getAttribute("data-layout") || undefined,
            columnBg: element.getAttribute("data-column-bg") || undefined,
            columnDivider: element.getAttribute("data-column-divider") || undefined,
            columnScroll: element.getAttribute("data-column-scroll") === "false" ? false : undefined,
          }),
        },
      },
    },
  }),
  ColumnItemPlugin.configure({
    render: { node: ColumnElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "DIV" }],
          query: ({ element }: { element: HTMLElement }) => element.hasAttribute("data-column"),
          parse: ({ element }: { element: HTMLElement }) => ({
            type: "column",
            width: element.getAttribute("data-width") || undefined,
            widthPx: element.getAttribute("data-width-px") ? Number(element.getAttribute("data-width-px")) : undefined,
          }),
        },
      },
    },
  }),
];
