"use client";

import { ParagraphPlugin } from "platejs/react";
import {
  H1Plugin,
  H2Plugin,
  H3Plugin,
  H4Plugin,
  H5Plugin,
  H6Plugin,
  BlockquotePlugin,
  HorizontalRulePlugin,
} from "@platejs/basic-nodes/react";
import {
  HeadingRules,
  BlockquoteRules,
  HorizontalRuleRules,
} from "@platejs/basic-nodes";
import {
  ParagraphElement,
  HeadingElement,
  BlockquoteElement,
  HrElement,
} from "../elements";

// 노션식 마크다운 입력(autoformat)은 v53 에서 각 플러그인의 inputRules 로 등록한다.
// 규칙은 자기가 붙은 플러그인의 pluginKey 를 읽어 동작하므로(예: heading 은 h1/h2/h3
// 에서 #/##/### prefix 결정), 반드시 "소유 플러그인"에 부착해야 한다. → heading 은
// 단일 HeadingPlugin 이 아니라 레벨별 H1~H6 플러그인으로 분리해 각각 부착.

/** 기본 블록 — paragraph / heading(h1~h6) / blockquote / hr + 마크다운 입력 규칙 */
export const BasicBlocksKit = [
  ParagraphPlugin.configure({
    render: { node: ParagraphElement },
  }),
  H1Plugin.configure({ render: { node: HeadingElement }, inputRules: [HeadingRules.markdown()] }),
  H2Plugin.configure({ render: { node: HeadingElement }, inputRules: [HeadingRules.markdown()] }),
  H3Plugin.configure({ render: { node: HeadingElement }, inputRules: [HeadingRules.markdown()] }),
  H4Plugin.configure({ render: { node: HeadingElement }, inputRules: [HeadingRules.markdown()] }),
  H5Plugin.configure({ render: { node: HeadingElement }, inputRules: [HeadingRules.markdown()] }),
  H6Plugin.configure({ render: { node: HeadingElement }, inputRules: [HeadingRules.markdown()] }),
  BlockquotePlugin.configure({ render: { node: BlockquoteElement }, inputRules: [BlockquoteRules.markdown()] }),
  HorizontalRulePlugin.configure({ render: { node: HrElement }, inputRules: [HorizontalRuleRules.markdown()] }),
];
