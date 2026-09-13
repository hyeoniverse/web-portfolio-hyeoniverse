"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 요소가 뷰포트 근처에 들어왔는지 한 번만 알려준다 (latch — true 가 되면 유지).
 *
 * About 페이지는 무한 가로 스크롤을 위해 패널 세트를 REPETITIONS(3) 벌 렌더한다.
 * 대부분의 패널은 그래도 싸지만 ERD 는 React Flow 인스턴스 + 노드 23개라
 * 3 벌이면 store·ResizeObserver 까지 3 배로 들고 DOM 이 3 만 개를 넘는다.
 * Code Highlights 의 코드 데모 미리보기는 한 벌마다 CodeSandbox 에서 3 MB 가까이 받는다.
 * 실제로 볼 때만 마운트해서 그 비용을 보이는 한 벌로 줄인다.
 *
 * 한 번 true 가 되면 되돌리지 않는다 — 다시 언마운트하면 사용자가 맞춰둔
 * 줌·팬·선택 상태가 스크롤할 때마다 날아간다.
 *
 * 관찰의 기준(root)은 가장 가까운 `[data-near-root]` 조상이다(#921). 가로 트랙의 섹션이 화면 폭으로 넘치는 부분을
 * 잘라서, 화면을 기준으로 보면 rootMargin 과 상관없이 패널이 화면에 들어올 때에야 알렸다(ERD 가 보이는 순간
 * 마운트됐다). 그 섹션을 기준으로 삼으면 rootMargin 이 섹션 밖까지 넓어진다. 여유는 한 화면이다 — 무거운 패널을
 * 보이기 전에 준비한다. 표시가 없으면(모바일) 화면을 기준으로 본다.
 */
export function useNearViewport<T extends HTMLElement>(rootMargin = "100%") {
  const ref = useRef<T | null>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;

    /* IntersectionObserver 를 못 쓰는 환경이면 그냥 바로 켠다 —
       지연 마운트는 최적화지 기능이 아니다. */
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
      { root: el.closest("[data-near-root]"), rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, near]);

  return { ref, near };
}
