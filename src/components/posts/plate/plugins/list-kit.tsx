"use client";

import { ListPlugin } from "@platejs/list/react";
import { IndentPlugin } from "@platejs/indent/react";
import { BulletedListRules, OrderedListRules, TaskListRules } from "@platejs/list";

/** 리스트 + 들여쓰기 — 마크다운 입력: "- " 불릿, "1. " 번호, "[] " 체크 */
export const ListKit = [
  ListPlugin.configure({
    inputRules: [
      BulletedListRules.markdown(),
      OrderedListRules.markdown(),
      TaskListRules.markdown(),
    ],
  }),
  IndentPlugin,
];
