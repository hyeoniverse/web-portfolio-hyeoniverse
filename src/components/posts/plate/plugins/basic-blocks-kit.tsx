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
import { BlockquoteElement, HeadingElement, HrElement } from "../elements/BasicElements";
import { ParagraphElement } from "../elements/ParagraphElement";

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
  /* h5·h6 는 만들지 않는다 — 편집기에서 고를 수 있는 단계는 h1~h4 다. 예전 글/붙여넣은 HTML 의 h5·h6 는 그대로 그리도록
     플러그인은 남기고 마크다운 변환("##### ")만 뺀다 */
  H5Plugin.configure({ render: { node: HeadingElement } }),
  H6Plugin.configure({ render: { node: HeadingElement } }),
  BlockquotePlugin.configure({ render: { node: BlockquoteElement }, inputRules: [BlockquoteRules.markdown()] }),
  HorizontalRulePlugin.configure({ render: { node: HrElement }, inputRules: [HorizontalRuleRules.markdown()] }),
];
