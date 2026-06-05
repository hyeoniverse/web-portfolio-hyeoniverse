"use client";

import { useCallback, useEffect, useState } from "react";
import type { SearchOptions, SyntaxMode } from "@/lib/searchQuery";

const STORAGE_PREFIX = "search-options:";
const DEFAULTS: Required<SearchOptions> = {
  syntaxMode: "prefix",
};

const VALID_MODES: SyntaxMode[] = ["prefix", "regex"];

/** localStorage 기반 검색 옵션 — key 단위로 분리. 현재 syntaxMode 만 저장. */
export function useSearchOptions(key: string) {
  const [options, setOptions] = useState<Required<SearchOptions>>(DEFAULTS);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          const mode = VALID_MODES.includes(parsed.syntaxMode) ? parsed.syntaxMode : "prefix";
          setOptions({ syntaxMode: mode });
        }
      }
    } catch { /* swallow */ }
  }, [key]);

  const update = useCallback((patch: Partial<SearchOptions>) => {
    setOptions((prev) => {
      const next = { ...prev, ...patch };
      if (typeof window !== "undefined") {
        try { localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(next)); }
        catch { /* swallow */ }
      }
      return next;
    });
  }, [key]);

  return { options, update };
}
