import { useState, useCallback } from "react";

const MAX_RECENT = 8;

/** localStorage 기반 최근 색상 hook — key 별로 분리 (예: "border-color", "cell-bg") */
export function useRecentColors(storageKey: string) {
  const fullKey = `editor-recent-colors:${storageKey}`;
  const [colors, setColors] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(fullKey) || "[]");
    } catch {
      return [];
    }
  });

  const addColor = useCallback((color: string) => {
    if (!color) return;
    setColors((prev) => {
      // 중복 제거, 맨 앞에 추가
      const next = [color, ...prev.filter((c) => c !== color)].slice(0, MAX_RECENT);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(fullKey, JSON.stringify(next));
        } catch { /* quota / disabled */ }
      }
      return next;
    });
  }, [fullKey]);

  return { colors, addColor };
}
