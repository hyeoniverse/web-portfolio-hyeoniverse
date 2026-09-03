"use client";

import { useState, useEffect } from "react";

/* 바텀 시트/오버레이 하나의 열림 state — 열려 있는 동안 ESC 로 닫고 body 스크롤을 잠근다.
   useState 와 같은 [값, setter] 튜플이라 열기/닫기는 setter 로. 시리즈·태그·카테고리 인덱스가 같은 효과를 셋 들고 있었다. */
export function useSheet<T>() {
  const [sheet, setSheet] = useState<T | null>(null);
  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSheet(null); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [sheet]);
  return [sheet, setSheet] as const;
}
