"use client";

import { ListPlugin } from "@platejs/list/react";
import { IndentPlugin } from "@platejs/indent/react";
import { BulletedListRules, OrderedListRules, TaskListRules } from "@platejs/list";
import { createPlatePlugin } from "platejs/react";

// 들여쓰기 레벨별 마커 — Google Docs / 한글 처럼 단계마다 자동 전환
const UL_CYCLE = ["disc", "circle", "square"];
const OL_CYCLE = ["decimal", "lower-alpha", "lower-roman"];

function cycleListStyle(current: string, level: number): string | null {
  const i = (Math.max(1, level) - 1) % 3;
  if (UL_CYCLE.includes(current)) return UL_CYCLE[i];
  if (OL_CYCLE.includes(current)) return OL_CYCLE[i];
  return null; // 체크리스트(todo) 등은 건드리지 않음
}

/**
 * 리스트 마커를 들여쓰기 단계에 맞춰 자동 전환.
 * 불릿: disc → circle → square, 번호: decimal → lower-alpha → lower-roman (3단계 순환)
 */
const ListMarkerCycleKit = createPlatePlugin({
  key: "listMarkerCycle",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}).overrideEditor(({ editor, tf: { normalizeNode } }: any) => {
  return {
    transforms: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      normalizeNode(entry: any) {
        const [node, path] = entry;
        const cur = node?.listStyleType;
        if (typeof cur === "string") {
          const level = (node.indent as number) || 1;
          const desired = cycleListStyle(cur, level);
          if (desired && desired !== cur) {
            editor.tf.setNodes({ listStyleType: desired }, { at: path });
            return;
          }
        }
        normalizeNode(entry);
      },
    },
  };
});

/** 리스트 + 들여쓰기 — 마크다운 입력: "- " 불릿, "1. " 번호, "[] " 체크 */
export const ListKit = [
  ListPlugin.configure({
    inputRules: [
      BulletedListRules.markdown(),
      OrderedListRules.markdown(),
      TaskListRules.markdown(),
    ],
  }),
  // 첫 단계(level 1)는 들여쓰기 0, 그 다음 단계부터 24px 씩.
  IndentPlugin.configure({
    options: { offset: 24, unit: "px" },
    inject: {
      nodeProps: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transformNodeValue: ({ getOptions, nodeValue }: any) => {
          const { offset, unit } = getOptions();
          return Math.max(0, nodeValue - 1) * offset + unit;
        },
      },
    },
  }),
  ListMarkerCycleKit,
];
