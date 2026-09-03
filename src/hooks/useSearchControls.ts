"use client";

import { useState } from "react";
import type { SyntaxMode } from "@/lib/searchQuery";

/* 검색 컨트롤 3종 — 검색어 · 검색 범위(searchType) · 문법(prefix/regex). SearchCapsule 이 받는 값 그대로.
   posts 목록 · 태그 페이지 · 시리즈/태그 인덱스가 같은 셋을 들고 있어서 묶었다. 범위 값의 종류는 호출부가 정한다. */
export function useSearchControls<T extends string>(defaultType: T) {
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState<T>(defaultType);
  const [syntaxMode, setSyntaxMode] = useState<SyntaxMode>("prefix");
  return { search, setSearch, searchType, setSearchType, syntaxMode, setSyntaxMode };
}
