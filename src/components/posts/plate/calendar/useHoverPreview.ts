"use client";

// ── 이벤트 hover 미리보기 lifecycle (지연 닫힘 + 카드 위로 커서 이동 허용) ──
import { useCallback, useEffect, useRef, useState } from "react";
import type { HoverState } from "./EventPreview";

const HIDE_DELAY = 260; // 칩 → 카드 이동 유예(ms)

export function useHoverPreview() {
  const [hover, setHoverRaw] = useState<HoverState>(null);
  const timer = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (timer.current != null) { window.clearTimeout(timer.current); timer.current = null; }
  }, []);

  // 즉시 표시 (예약된 닫힘 취소)
  const show = useCallback((h: HoverState) => { clear(); setHoverRaw(h); }, [clear]);
  // 유예 후 닫힘 — 카드로 커서 이동 시 keepOpen 이 취소
  const hideSoon = useCallback(() => {
    clear();
    timer.current = window.setTimeout(() => { setHoverRaw(null); timer.current = null; }, HIDE_DELAY);
  }, [clear]);
  // 즉시 닫힘 (클릭/드래그 시작 등)
  const hideNow = useCallback(() => { clear(); setHoverRaw(null); }, [clear]);
  // 카드 위 커서 — 닫힘 취소
  const keepOpen = clear;

  useEffect(() => clear, [clear]);

  return { hover, show, hideSoon, hideNow, keepOpen };
}
