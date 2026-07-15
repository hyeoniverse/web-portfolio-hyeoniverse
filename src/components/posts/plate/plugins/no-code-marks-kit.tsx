"use client";

import { createPlatePlugin } from "platejs/react";
import { KEYS } from "platejs";

/**
 * 코드블록 안에서는 텍스트 mark(bold·color·highlight 등) 적용을 막는다.
 *
 * 이유: 코드블록은 lowlight syntax highlighting 을 위해 leaf 를 decorate 하는데,
 * 여기에 mark leaf 가 섞이면 Plate 내부 `Leaf` 컴포넌트의 hook 호출 순서가 렌더마다
 * 달라져 "change in the order of Hooks" crash 가 난다. 코드에 서식은 의미도 없으므로
 * addMark 자체를 코드블록 안에서 무시한다.
 */
export const NoCodeMarksKit = [
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createPlatePlugin({ key: "noCodeMarks" }).overrideEditor(({ editor, tf: { addMark } }: any) => ({
    transforms: {
      addMark(key: string, value: unknown) {
        try {
          if (editor.api.some({ match: { type: [KEYS.codeBlock, KEYS.codeLine] } })) return;
        } catch { /* ignore */ }
        addMark(key, value);
      },
    },
  })),
];
