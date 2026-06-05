"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { SyntaxMode } from "@/lib/searchQuery";

interface SearchHighlightValue {
  query: string;
  mode: SyntaxMode;
}

const SearchHighlightContext = createContext<SearchHighlightValue>({ query: "", mode: "prefix" });

interface ProviderProps extends SearchHighlightValue {
  children: ReactNode;
}

/** 페이지가 현재 search query + mode 를 자손에게 제공 — HighlightedText 가 자동으로 사용. */
export function SearchHighlightProvider({ query, mode, children }: ProviderProps) {
  const value = useMemo(() => ({ query, mode }), [query, mode]);
  return <SearchHighlightContext.Provider value={value}>{children}</SearchHighlightContext.Provider>;
}

export function useSearchHighlight(): SearchHighlightValue {
  return useContext(SearchHighlightContext);
}
