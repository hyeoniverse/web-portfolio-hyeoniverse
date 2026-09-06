import { useState } from "react";
import type { TFunction } from "@/providers/LanguageProvider";

/** 검색 대상 — 제목만·본문만·둘 다. 글 목록·시리즈·휴지통이 모두 같은 세 가지를 쓴다. */
export type SearchType = "all" | "title" | "content";

/** 검색 대상 선택지. 세 곳에 같은 목록이 따로 적혀 있던 것을 한 곳으로 모았다. */
export const searchTypeOptions = (t: TFunction) => [
  { value: "all", label: t("admin.posts.searchAll") },
  { value: "title", label: t("admin.posts.searchTitle") },
  { value: "content", label: t("admin.posts.searchContent") },
];

/** 한 쪽에 몇 줄씩 보여줄지 고르는 선택지. 목록마다 고르는 수가 달라 인자로 받는다. */
export const pageSizeOptions = (...sizes: number[]) =>
  sizes.map((n) => ({ value: String(n), label: String(n) }));

/** 검색어가 주어졌을 때 제목/본문 중 어디를 볼지 결정한다. */
export function matchesSearch(type: SearchType, query: string, title: string, body: string) {
  const q = query.toLowerCase();
  const t = title.toLowerCase();
  const b = body.toLowerCase();
  if (type === "title") return t.includes(q);
  if (type === "content") return b.includes(q);
  return t.includes(q) || b.includes(q);
}

/**
 * 접었다 펴는 목록 패널이 공통으로 쓰는 조작 상태 — 쪽 번호, 한 쪽 줄 수, 검색어,
 * 검색 대상, 선택 항목. 시리즈와 휴지통이 같은 다섯 가지를 쓴다.
 */
export function useSubTableControls(initialPerPage: number) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(initialPerPage);
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  /**
   * 목록을 다시 거르는 조작은 항상 첫 쪽으로 돌아간다.
   * 효과로 뒤늦게 되돌리면 걸러지기 전 쪽 번호로 한 번 그린 뒤 다시 그리게 된다.
   */
  const andResetPage = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  /** 한 쪽에 몇 줄 볼지 바꿀 때도 첫 쪽으로 돌아간다. */
  const changePerPage = (v: string) => { setPerPage(Number(v)); setPage(1); };

  return { page, setPage, perPage, changePerPage, search, setSearch, searchType, setSearchType, selected, setSelected, andResetPage };
}
