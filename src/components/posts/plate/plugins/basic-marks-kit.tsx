"use client";

import {
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  SuperscriptPlugin,
  SubscriptPlugin,
  HighlightPlugin,
  CodePlugin,
  KbdPlugin,
} from "@platejs/basic-nodes/react";
import {
  BoldRules,
  ItalicRules,
  UnderlineRules,
  StrikethroughRules,
  CodeRules,
  HighlightRules,
} from "@platejs/basic-nodes";

// 마크 규칙은 자기가 붙은 플러그인 key 를 마크 타입으로 쓰므로(config.mark ?? pluginKey)
// 반드시 owner 플러그인에 부착. super/sub( ^ / ~ )는 strikethrough(~~)·일반 입력과 충돌
// 소지가 있어 마크다운 입력 규칙은 생략(버튼/단축키로는 계속 사용 가능).

/** 기본 인라인 마크 — bold / italic / underline / strike / super·subscript / highlight / code / kbd */
export const BasicMarksKit = [
  BoldPlugin.configure({ inputRules: [BoldRules.markdown()] }), // **굵게**
  ItalicPlugin.configure({ inputRules: [ItalicRules.markdown()] }), // *기울임*
  UnderlinePlugin.configure({ inputRules: [UnderlineRules.markdown()] }), // __밑줄__
  StrikethroughPlugin.configure({ inputRules: [StrikethroughRules.markdown()] }), // ~~취소~~
  SuperscriptPlugin,
  SubscriptPlugin,
  HighlightPlugin.configure({ inputRules: [HighlightRules.markdown()] }), // ==형광==
  CodePlugin.configure({ inputRules: [CodeRules.markdown()] }), // `코드`
  KbdPlugin,
];
