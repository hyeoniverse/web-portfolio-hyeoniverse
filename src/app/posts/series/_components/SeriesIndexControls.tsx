"use client";

import { perPageOptions } from "@/constants";
import type { useSearchControls } from "@/hooks/useSearchControls";
import { List } from "@/components/icons";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Select from "@/components/ui/Select";
import page from "../../_components/IndexPage.module.css";
import styles from "./SeriesIndexControls.module.css";
import { useLanguage } from "@/providers/LanguageProvider";

export type SeriesSortBy = "popular" | "alphabetical" | "newest";

/* 시리즈 인덱스 헤더의 컨트롤 줄 — 정렬 · perPage · 검색(범위 선택 + 문법). 값과 setter 는 부모의 훅에서. */
export default function SeriesIndexControls({
  sortBy,
  onSortChange,
  perPage,
  onPerPageChange,
  searchControls,
  hasResults,
}: {
  sortBy: SeriesSortBy;
  onSortChange: (v: SeriesSortBy) => void;
  perPage: number;
  onPerPageChange: (v: number) => void;
  searchControls: ReturnType<typeof useSearchControls<"all" | "title" | "desc">>;
  hasResults: boolean;
}) {
  const { t } = useLanguage();
  const { search, setSearch, searchType, setSearchType, setSyntaxMode } = searchControls;
  return (
    <div className={page.searchSortRow}>
      <SegmentedControl<SeriesSortBy>
        className={styles.sortControl}
        size="sm"
        items={[
          { value: "popular", label: t("postsPage.sortPopular") },
          { value: "newest", label: t("postsPage.sortNewest") },
          { value: "alphabetical", label: t("postsPage.sortTitle") },
        ]}
        value={sortBy}
        onChange={(v) => onSortChange(v)}
      />
      <div className={styles.searchTools}>
        <div className={styles.perPageGroup}>
          <List size={14} strokeWidth={1.8} className={styles.perPageIcon} aria-hidden />
          <Select
            className={styles.perPageSelect}
            size="sm"
            value={String(perPage)}
            options={perPageOptions(t)}
            onChange={(v) => onPerPageChange(Number(v))}
          />
        </div>
        <SearchCapsule
          search={search}
          onSearchChange={setSearch}
          placeholder={t("postsPage.seriesSearchPlaceholder")}
          align="left"
          size="sm"
          className={page.searchBar}
          routeParam="q"
          hasResults={hasResults}
          onSearchOptionsChange={(opts) => setSyntaxMode(opts.syntaxMode)}
          typeSelector={{
            value: searchType,
            options: [
              { value: "all", label: t("postsPage.seriesSearchAll") },
              { value: "title", label: t("postsPage.seriesSearchTitle") },
              { value: "desc", label: t("postsPage.seriesSearchDesc") },
            ],
            onChange: (v) => setSearchType(v as "all" | "title" | "desc"),
          }}
          syntaxHelp
        />
      </div>
    </div>
  );
}
