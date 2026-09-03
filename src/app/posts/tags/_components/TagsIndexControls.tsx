"use client";

import type { useSearchControls } from "@/hooks/useSearchControls";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import SegmentedControl from "@/components/ui/SegmentedControl";
import page from "../../_components/IndexPage.module.css";
import styles from "./TagsIndexControls.module.css";

export type TagsSortBy = "popular" | "alphabetical";

/* 태그 인덱스 헤더의 컨트롤 줄 — 정렬(제목순은 한글/영어 하위 선택) + 검색(범위 + 문법). 값과 setter 는 부모의 훅에서. */
export default function TagsIndexControls({
  sortBy,
  onSortChange,
  nameLang,
  onNameLangChange,
  searchControls,
  hasResults,
}: {
  sortBy: TagsSortBy;
  onSortChange: (v: TagsSortBy) => void;
  nameLang: "ko" | "en";
  onNameLangChange: (v: "ko" | "en") => void;
  searchControls: ReturnType<typeof useSearchControls<"all" | "title" | "desc">>;
  hasResults: boolean;
}) {
  const { search, setSearch, searchType, setSearchType, setSyntaxMode } = searchControls;
  return (
    <div className={page.searchSortRow}>
      <SegmentedControl<TagsSortBy, "ko" | "en">
        items={[
          { value: "popular", label: "인기순" },
          {
            value: "alphabetical",
            label: "제목순",
            subItems: [
              { value: "ko", label: "한글" },
              { value: "en", label: "영어" },
            ] as const,
          },
        ]}
        value={sortBy}
        onChange={(v) => onSortChange(v)}
        subValue={nameLang}
        onSubChange={(v) => onNameLangChange(v)}
        subVariant="nested"
        onBack={() => onSortChange("popular")}
      />
      <SearchCapsule
        search={search}
        onSearchChange={setSearch}
        placeholder="태그 이름 또는 설명으로 검색…"
        align="left"
        size="sm"
        className={styles.searchBar}
        routeParam="q"
        hasResults={hasResults}
        onSearchOptionsChange={(opts) => setSyntaxMode(opts.syntaxMode)}
        typeSelector={{
          value: searchType,
          options: [
            { value: "all", label: "이름+설명" },
            { value: "title", label: "이름" },
            { value: "desc", label: "설명" },
          ],
          onChange: (v) => setSearchType(v as "all" | "title" | "desc"),
        }}
        syntaxHelp
      />
    </div>
  );
}
