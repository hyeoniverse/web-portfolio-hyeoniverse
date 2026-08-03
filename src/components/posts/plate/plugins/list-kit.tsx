"use client";

import { ListPlugin } from "@platejs/list/react";
import { IndentPlugin } from "@platejs/indent/react";
import { BulletedListRules, OrderedListRules } from "@platejs/list";
import { createPlatePlugin } from "platejs/react";
import { KEYS } from "platejs";

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

// [] / [ ] / [x] → 체크리스트. 라이브러리 TaskListRules 는 라이브러리 리스트(ol/li)를 만들어
// 프로젝트 체크박스(ParagraphElement 의 checked 렌더)를 안 거치고 li 번호만 나온다.
// 슬래시/툴바 todo 와 동일하게 { checked, listStyleType:"todo" } 를 세팅해 실제 체크박스가 되게.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const todoMarkdownRule: any = {
  target: "insertText",
  trigger: " ",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolve: ({ editor, text }: any) => {
    if (text !== " " || !editor.selection || !editor.api.isCollapsed()) return;
    const entry = editor.api.block();
    if (!entry) return;
    const path = entry[1];
    const before = editor.api.string({ anchor: editor.api.start(path), focus: editor.selection.anchor });
    const m = /^\[([ xX]?)\]$/.exec(before);
    if (!m) return;
    return { path, checked: /x/i.test(m[1] ?? "") };
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apply: ({ editor }: any, match: any) => {
    editor.tf.delete({ at: { anchor: editor.api.start(match.path), focus: editor.api.end(match.path) } });
    editor.tf.setNodes({ checked: match.checked, listStyleType: "todo" }, { at: match.path });
    return true;
  },
};

/** 리스트 + 들여쓰기 — 마크다운 입력: "- " 불릿, "1. " 번호, "[] " 체크(체크박스) */
export const ListKit = [
  ListPlugin.configure({
    inputRules: [
      BulletedListRules.markdown(),
      OrderedListRules.markdown(),
      todoMarkdownRule,
    ],
  }),
  // Tab 들여쓰기 — 리스트뿐 아니라 문단·제목·인용도 대상.
  IndentPlugin.configure({
    options: { offset: 24, unit: "px" },
    inject: {
      targetPlugins: [KEYS.p, KEYS.h1, KEYS.h2, KEYS.h3, KEYS.blockquote],
      nodeProps: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transformNodeValue: ({ getOptions, nodeValue, element }: any) => {
          const { offset, unit } = getOptions();
          // 리스트 아이템: 첫 단계(1)는 들여쓰기 0 (base level). 일반 블록: 첫 Tab 부터 한 단계씩.
          const level = element?.listStyleType ? Math.max(0, nodeValue - 1) : nodeValue;
          return level * offset + unit;
        },
      },
    },
    // 재로드(HTML 역직렬화) 시 margin-left → indent 복원. 일반 블록(p·heading·blockquote)만.
    // 리스트는 <li>+data-indent 경로라 여기 안 걸림.
    parsers: {
      html: {
        deserializer: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          parse: ({ element }: any) => {
            const ml = parseInt(element?.style?.marginLeft || "", 10);
            return ml > 0 ? { indent: Math.round(ml / 24) } : {};
          },
        },
      },
    },
  }),
  ListMarkerCycleKit,
];
