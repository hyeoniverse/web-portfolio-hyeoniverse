"use client";

/* 첫 화면 준비 신호 — 로딩 덮개(LoadingScreen)가 페이지의 무거운 부분(3D · 하늘)이 실제로 그려질 때까지 기다리게 한다.
   1. 기다릴 자리에 <ReadyWait id="…" /> 를 둔다. 서버 HTML 에 실려야 덮개가 처음부터 그 자리를 안다 —
      ssr: false 로 불러오는 부품이면 dynamic 의 loading 자리와 부품 안 둘 다에 같은 id 로 둔다(바뀌는 순간에도 끊기지 않게).
   2. 그 부분이 첫 화면을 그렸으면 markReady(id) — three.js 장면이면 Canvas 안 Suspense 안쪽에 <ReadySignal id="…" /> 를 둔다
      (모델 · 텍스처를 다 받아 Suspense 가 풀린 뒤 두 프레임 지나 알린다).
   덮개는 남은 자리의 수로 진행률을 세고, 모두 준비되면(또는 상한 시간이 지나면) 걷힌다. 덮개가 걷힌 뒤에 생긴 자리는 아무 일도 하지 않는다 */
import { useEffect } from "react";

/** step — 그 자리가 이미 어디까지 왔는지(0~1). 서버 HTML 의 받는 동안 자리는 0, 코드를 받아 붙은 부품 안의 자리는 0.5 처럼 */
export function ReadyWait({ id, step }: { id: string; step?: number }) {
  return <i data-ready-wait={id} data-ready-step={step} hidden />;
}

export function markReady(id: string) {
  if (typeof document === "undefined") return;
  for (const el of document.querySelectorAll<HTMLElement>(`[data-ready-wait="${CSS.escape(id)}"]`)) el.setAttribute("data-ready", "");
}

/** three.js 장면 안에 둔다 — Suspense 가 풀려 이 부품이 그려지면 두 프레임 뒤(화면에 실제로 나온 뒤) 준비를 알린다 */
export function ReadySignal({ id }: { id: string }) {
  useEffect(() => {
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => markReady(id));
    });
    return () => cancelAnimationFrame(raf);
  }, [id]);
  return null;
}
