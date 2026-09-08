"use client";

import { useCallback, useState } from "react";

/* 요소가 화면 근처에 들어왔는지. 한 번 들어오면 그대로 유지한다.

   ref 콜백으로 관찰하는 이유: effect 로 하면 관찰 대상이 아직 없을 수 있고, 초기값을
   `typeof IntersectionObserver` 로 정하면 서버(없음)와 브라우저(있음)가 갈려
   하이드레이션이 어긋난다. ref 콜백은 요소가 붙는 시점에 정확히 한 번 돌고,
   서버·브라우저 모두 false 로 시작하므로 어긋날 일이 없다. */
export function useNearViewport(enabled: boolean, rootMargin = "300px") {
  const [near, setNear] = useState(!enabled);

  const observe = useCallback(
    (el: Element | null) => {
      if (!el || near) return;
      // 아주 오래된 브라우저 — 관찰할 수 없으면 미루지 않고 그냥 받는다
      if (typeof IntersectionObserver === "undefined") {
        setNear(true);
        return;
      }
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            setNear(true);
            io.disconnect();
          }
        },
        { rootMargin },
      );
      io.observe(el);
      return () => io.disconnect();
    },
    [near, rootMargin],
  );

  return [observe, near] as const;
}
