"use client";

import { ParagraphPlugin } from "platejs/react";
import {
  HeadingPlugin,
  BlockquotePlugin,
  HorizontalRulePlugin,
} from "@platejs/basic-nodes/react";
import {
  ParagraphElement,
  HeadingElement,
  BlockquoteElement,
  HrElement,
} from "../elements";

/** 기본 블록 — paragraph(todo 체크박스 렌더 포함) / heading / blockquote / hr */
export const BasicBlocksKit = [
  ParagraphPlugin.configure({
    render: { node: ParagraphElement },
  }),
  HeadingPlugin.configure({ render: { node: HeadingElement } }),
  BlockquotePlugin.configure({ render: { node: BlockquoteElement } }),
  HorizontalRulePlugin.configure({ render: { node: HrElement } }),
];
