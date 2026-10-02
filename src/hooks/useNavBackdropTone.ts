"use client";

import { useEffect, useState, type RefObject } from "react";
import { backdropToneUnder, type Tone } from "@/lib/navBackdrop";

/**
 * nav 로고 바로 밑 배경의 밝기(lib/navBackdrop) — 스크롤 · 화면 크기 · 경로가 바뀔 때, 그리고 덮개(로딩 · 페이지 전환)가
 * 걷힐 때(covered 가 바뀔 때) 다시 잰다.
 * 모르면 null(테마를 따른다). enabled 가 false 면 재지 않는다(글자 로고는 blend 로 충분하다).
 */
export function useNavBackdropTone(
  logoRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  pathname: string,
  covered: boolean,
): Tone | null {
  const [tone, setTone] = useState<Tone | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    let alive = true;
    const sample = () => {
      frame = 0;
      const el = logoRef.current;
      if (!el || !alive) return;
      /* 로고와 같은 상단 막대(header — 메뉴 · 버튼)는 건너뛴다. 그 밑의 페이지를 잰다 */
      const next = backdropToneUnder(el.getBoundingClientRect(), el.closest("header") ?? el, schedule);
      if (next !== "pending") setTone(next); // 이미지를 재는 동안은 앞의 값을 둔다 — 깜빡이지 않게
    };
    const schedule = () => { if (!frame && alive) frame = requestAnimationFrame(sample); };
    schedule();
    /* 페이지가 바뀐 직후에는 새 화면이 아직 그려지는 중이라 한 번 더 잰다 */
    const settle = window.setTimeout(schedule, 400);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      alive = false;
      if (frame) cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [logoRef, enabled, pathname, covered]);

  return enabled ? tone : null;
}
