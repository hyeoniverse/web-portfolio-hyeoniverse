"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import type { L10n } from "./data";

/** 지금 화면(창)에 threshold 만큼 들어와 있는지 — 들어오면 true, 나가면 다시 false. 저절로 도는 움직임을 켜고 끄는 데 쓴다 */
export function useInView<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/** 움직임 줄이기를 켰는지 — 저절로 넘어가는 대본을 돌리지 않는다 */
export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** 문구 고르기 — {ko, en} 에서 지금 언어를 고르고, {name} 같은 자리를 채운다 */
export function useT() {
  const { language } = useLanguage();
  const t = useCallback(
    (v: L10n, vars?: Record<string, string | number>) => {
      let s = v[language] ?? v.ko;
      if (vars) for (const [k, val] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(val));
      return s;
    },
    [language],
  );
  return { t, language };
}
