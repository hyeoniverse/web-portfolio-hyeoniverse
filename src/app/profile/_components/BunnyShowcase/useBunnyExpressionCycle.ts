"use client";

import { useEffect } from "react";
import { useProfileSectionStore } from "@/stores/profileSectionStore";

const EXPR_CYCLE = ["normal", "surprised", "happy"] as const;
const CYCLE_INTERVAL = 3000;

/**
 * MEET 패널에 머무는 동안 몽이 표정을 돌린다.
 *
 * **한 번만 부른다.** 무한 스크롤에서 패널이 여러 벌 그려지는데 각 사본이 타이머를 돌리면
 * 서로 다른 표정을 밀어 넣어 몽이가 깜빡인다. 그래서 패널이 아니라 ProfileMeSection 이 부른다.
 *
 * 패널을 벗어나면 표정을 비운다 — 그래야 떠다니는 몽이가 원래의 반응(부딪히면 >< , 말풍선 뜰
 * 때 ^^)으로 돌아간다.
 */
export function useBunnyExpressionCycle(active: boolean) {
  useEffect(() => {
    const { setBunnyExpression } = useProfileSectionStore.getState();
    if (!active) {
      setBunnyExpression(null);
      return;
    }
    setBunnyExpression(useProfileSectionStore.getState().bunnyExpression ?? "normal");
    const id = setInterval(() => {
      /* 만지고 있는 동안에는 넘기지 않는다. 볼을 잡히면 놀란 표정, 쓰다듬으면 좋아하는 표정이
         그 손짓에 붙은 반응인데, 3초마다 다음 표정으로 넘어가면 만진 것과 무관해 보인다. */
      const touch = useProfileSectionStore.getState().bunnyTouch;
      if (touch.cheek !== 0 || touch.petting) return;
      /* 매번 지금 값에서 이어간다 — 버튼으로 표정을 바꿔도 그 자리에서 자연스럽게 이어진다. */
      const cur = useProfileSectionStore.getState().bunnyExpression ?? "normal";
      const idx = EXPR_CYCLE.indexOf(cur as (typeof EXPR_CYCLE)[number]);
      setBunnyExpression(EXPR_CYCLE[(idx + 1) % EXPR_CYCLE.length]);
    }, CYCLE_INTERVAL);
    return () => clearInterval(id);
  }, [active]);
}
