"use client";

// ── 휠 스크롤로 기간 페이지 넘김 (월/주/일 뷰) ──
// 반환한 ref 를 스크롤 대상에 붙이면, 휠 델타 누적이 임계(threshold)를 넘을 때 onPrev/onNext 호출.
// - scrollSelector: 안쪽 스크롤 컨테이너가 그 방향으로 더 스크롤 가능하면 양보(체이닝).
// - onPull: 경계에서 "당김" 진행도를 (방향, 0~1)로 보고 → 뷰가 인디케이터를 그려 명시적 의도를 유도.
//   임계를 채워야만 넘어가고, 스크롤을 멈추면(손 뗌) 진행도는 사라진다.
import { useEffect, useRef } from "react";

type PagerOpts = {
  scrollSelector?: string;
  onPull?: (dir: -1 | 0 | 1, progress: number) => void;
  threshold?: number;
};

export function useWheelPager(onPrev: () => void, onNext: () => void, enabled = true, opts: PagerOpts = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef({ onPrev, onNext, enabled, opts });
  cb.current = { onPrev, onNext, enabled, opts };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let lock = 0;
    let acc = 0;
    let lastTs = 0;
    let decay = 0;
    // 이 제스처가 내부 스크롤에서 이어졌는지 — 그리드를 스크롤하다 경계에 닿은 "첫 스크롤"에선 넘기지 않음.
    // 손을 뗀 뒤(입력 끊김) 다시 스크롤해야 링이 차오르고 넘어감.
    let innerScrolled = false;
    let pulled = false; // 이 제스처에서 링이 한 번이라도 떴는지 — 첫 접촉에 곧바로 넘어가지 않게
    const threshold = () => cb.current.opts.threshold ?? 120;
    const emit = () => cb.current.opts.onPull?.(acc === 0 ? 0 : acc > 0 ? 1 : -1, Math.min(1, Math.abs(acc) / threshold()));
    const clearPull = () => { if (acc !== 0) { acc = 0; cb.current.opts.onPull?.(0, 0); } window.clearTimeout(decay); };

    const onWheel = (e: WheelEvent) => {
      if (!cb.current.enabled) return;
      // 페이징 제외 영역(예: 일뷰 우측 사이드바) 안에서의 휠은 날짜를 넘기지 않음
      if ((e.target as HTMLElement | null)?.closest("[data-no-pager]")) return;
      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (!delta) return;
      const now = Date.now();
      if (now - lastTs > 150) { clearPull(); innerScrolled = false; pulled = false; } // 입력이 끊기면(손 뗌) 제스처 리셋
      lastTs = now;

      // 내부 스크롤 양보 — 리스트가 그 방향으로 더 스크롤 가능하면 페이지 넘김 안 함(당김도 없음)
      const sel = cb.current.opts.scrollSelector;
      if (sel) {
        const sc = (e.target as HTMLElement | null)?.closest(sel) as HTMLElement | null;
        if (sc && sc.scrollHeight > sc.clientHeight + 1) {
          const canUp = delta < 0 && sc.scrollTop > 0;
          const canDown = delta > 0 && sc.scrollTop + sc.clientHeight < sc.scrollHeight - 1;
          if (canUp || canDown) { clearPull(); innerScrolled = true; return; }
          // 경계 도달 — 이 제스처가 내부 스크롤에서 이어졌다면(첫 스크롤) 넘기지도 당기지도 않음
          if (innerScrolled) { e.preventDefault(); return; }
        }
      }

      // 여기부턴 경계(또는 스크롤 없는 뷰) — 당김 누적
      e.preventDefault();
      if (now < lock) return;
      if ((acc > 0 && delta < 0) || (acc < 0 && delta > 0)) acc = 0; // 방향 바꾸면 리셋
      acc += delta;

      // 첫 접촉엔 넘기지 않음 — 링이 최소 한 번 뜬(pulled) 뒤에야 넘김 허용(큰 델타 한 방에 즉시 넘어가는 것 방지)
      if (pulled && Math.abs(acc) >= threshold()) {
        const dir = acc > 0 ? 1 : -1;
        acc = 0;
        window.clearTimeout(decay);
        cb.current.opts.onPull?.(0, 0);
        lock = now + 600; // 연속 넘김 방지 쿨다운
        innerScrolled = true; // 넘긴 직후 같은 제스처가 이어서 또 당기지 못하게(손 떼야 다시 가능)
        if (dir > 0) cb.current.onNext(); else cb.current.onPrev();
        return;
      }
      pulled = true;
      emit();
      // 스크롤이 멎으면 부분 당김은 사라지게(자동 감쇠)
      window.clearTimeout(decay);
      decay = window.setTimeout(() => { acc = 0; cb.current.opts.onPull?.(0, 0); }, 220);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => { el.removeEventListener("wheel", onWheel); window.clearTimeout(decay); };
  }, []);

  return ref;
}
