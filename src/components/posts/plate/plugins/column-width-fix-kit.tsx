"use client";

import { createPlatePlugin } from "platejs/react";
import { ElementApi } from "platejs";

/**
 * 열블록(column_group) 너비를 항상 "정수 합 = 100%" 로 결정적으로 정규화.
 *
 * 배경: @platejs/layout 의 기본 normalizer 는 열 개수가 바뀌거나(추가·빈 열 자동 제거)
 * 너비 합이 100 이 아니면 `(100 - 합) / 열수` 로 재분배하는데, 100/3 처럼 딱 안 떨어지는
 * 값이면 부동소수점상 합이 정확히 100 에 수렴하지 못해 normalize 무한루프(→ 에디터 crash)에 빠진다.
 *
 * 이 플러그인은 ColumnKit 뒤에 등록되어 그 normalizeNode 를 감싼다. column_group 의 너비가
 * "정수 & 합 100" 이 아니면 → 비율 유지 정수 재분배(오차는 가장 큰 열이 흡수)로 한 번에 고치고 종료.
 * 이미 정수-100 이면 원래 normalize(빈 열 제거·unwrap 등)를 그대로 통과시킨다.
 * 우리 fix 는 항상 정확한 정수 100 을 만들므로 다음 pass 에서 조건이 풀려 루프가 발생하지 않는다.
 */
export const ColumnWidthFixKit = [
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createPlatePlugin({ key: "columnWidthFix" }).overrideEditor(({ editor, tf: { normalizeNode } }: any) => ({
    transforms: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      normalizeNode(entry: any, options?: any) {
        const [node, path] = entry;
        if (ElementApi.isElement(node) && node.type === "column_group") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cols = (node.children as any[]) || [];
          const n = cols.length;
          if (n >= 2) {
            const widths = cols.map((c) => {
              const p = parseFloat(c?.width);
              return Number.isFinite(p) ? p : 0;
            });
            const sum = widths.reduce((a, b) => a + b, 0);
            const allInt = widths.every((w) => Number.isInteger(w));
            if (!allInt || sum !== 100) {
              // 비율 유지 정수 재분배 (각 열 최소 1, 오차는 가장 큰 열이 흡수 → 합 정확히 100)
              const ints = widths.map((w) => Math.max(1, Math.round((sum > 0 ? w / sum : 1 / n) * 100)));
              const s = ints.reduce((a, b) => a + b, 0);
              if (s !== 100) {
                let maxIdx = 0;
                for (let i = 1; i < ints.length; i++) if (ints[i] > ints[maxIdx]) maxIdx = i;
                ints[maxIdx] = Math.max(1, ints[maxIdx] + (100 - s));
              }
              editor.tf.withoutNormalizing(() => {
                ints.forEach((w, i) => {
                  const val = `${w}%`;
                  if (cols[i]?.width !== val) editor.tf.setNodes({ width: val }, { at: [...path, i] });
                });
              });
              return; // 이번 pass 종료 — 다음 pass 에서 정수-100 확인되면 원래 normalize 진행
            }
          }
        }
        normalizeNode(entry, options);
      },
    },
  })),
];
