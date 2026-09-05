"use client";

import { useEffect } from "react";

/* 플로트 이미지 가장자리 보정 — PlateEditor.tsx 에서 분리 (#680). */

export function FloatEdgeAdjust() {
  useEffect(() => {
    const root = document.querySelector('[data-slate-editor="true"]') as HTMLElement | null;
    if (!root) return;
    const MARGIN = 20; // float 이미지 margin-right — 텍스트 입력 시작 위치와 일치
    const update = () => {
      const blocks = Array.from(root.children) as HTMLElement[];
      blocks.forEach((b) => b.style.removeProperty("--float-edge"));
      const floats = Array.from(root.querySelectorAll('[data-float-side="left"]')) as HTMLElement[];
      if (!floats.length) return;
      for (const f of floats) {
        const fr = f.getBoundingClientRect();
        for (const b of blocks) {
          const br = b.getBoundingClientRect();
          if (fr.right > br.left && fr.left < br.right && fr.bottom > br.top + 2 && fr.top < br.bottom - 2) {
            const edge = Math.max(0, fr.right - br.left) + MARGIN;
            const prev = parseFloat(b.style.getPropertyValue("--float-edge")) || 0;
            if (edge > prev) b.style.setProperty("--float-edge", `${edge}px`);
          }
        }
      }
    };
    update();
    // 레이아웃 변화(리사이즈/이미지 로드)·구조 변화(블록 추가삭제) 시 갱신.
    // (style 변경은 attributeFilter 에서 제외 → --float-edge 설정이 무한 루프 안 일으킴)
    const ro = new ResizeObserver(update);
    ro.observe(root);
    const mo = new MutationObserver(update);
    mo.observe(root, { childList: true, subtree: true });
    const onLoad = () => update();
    root.querySelectorAll("img").forEach((img) => img.addEventListener("load", onLoad));
    return () => { ro.disconnect(); mo.disconnect(); root.querySelectorAll("img").forEach((img) => img.removeEventListener("load", onLoad)); };
  }, []);
  return null;
}

// ── Main component ──
