"use client";

import { type RefObject } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PER_PAGE_OPTIONS } from "@/constants";
import type { useSearchControls } from "@/hooks/useSearchControls";
import { Hash, ArrowLeft, List } from "@/components/icons";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import styles from "./TagPageToolbar.module.css";

export type TagSort = "newest" | "popular" | "title";

/* 태그 페이지 상단 sticky 줄 — 뒤로(태그 목록) · TAG 배지 · 정렬 · perPage · 검색.
   sticky 판정(useStickyFilterBar)은 부모가 하고 ref/isStuck/barHidden 을 받는다. 정렬·perPage 변경은 부모가 page 도 1 로 되돌린다. */
export default function TagPageToolbar({
  ref,
  isStuck,
  barHidden,
  sort,
  sortDir,
  onSortChange,
  perPage,
  onPerPageChange,
  searchControls,
  hasResults,
}: {
  ref: RefObject<HTMLDivElement | null>;
  isStuck: boolean;
  barHidden: boolean;
  sort: TagSort;
  sortDir: "asc" | "desc";
  onSortChange: (v: TagSort) => void;
  perPage: number;
  onPerPageChange: (v: number) => void;
  searchControls: ReturnType<typeof useSearchControls<"all" | "title" | "content">>;
  hasResults: boolean;
}) {
  const router = useRouter();
  const { search, setSearch, searchType, setSearchType, setSyntaxMode } = searchControls;
  return (
    <div
      ref={ref}
      className={`${styles.heroTopRow} ${isStuck ? styles.heroTopRowStuck : ""} ${barHidden ? styles.heroTopRowHidden : ""}`}
    >
      <Button
        variant="ghost"
        size="sm"
        className={styles.backBtn}
        icon={<ArrowLeft size={16} strokeWidth={1.8} />}
        onClick={() => router.push("/posts/tags")}
        title="태그 목록으로"
      >
        태그 목록
      </Button>
      <Link href="/posts/tags" className={styles.heroBadge} title="전체 태그 보기">
        <Hash size={18} strokeWidth={1.8} />
        <span>TAG</span>
      </Link>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <SegmentedControl<TagSort>
            className={styles.sortControl}
            items={[
              { value: "newest", label: "최신순" },
              { value: "popular", label: "인기순" },
              { value: "title", label: "제목순" },
            ]}
            value={sort}
            onChange={onSortChange}
            sortDir={sortDir}
            size="sm"
          />
        </div>
        <div className={styles.searchPerPageGroup}>
          <div className={styles.perPageGroup}>
            <List size={14} strokeWidth={1.8} className={styles.perPageIcon} aria-hidden />
            <Select
              className={styles.perPageSelect}
              size="sm"
              value={String(perPage)}
              options={PER_PAGE_OPTIONS}
              onChange={(v) => onPerPageChange(Number(v))}
            />
          </div>
          <SearchCapsule
            search={search}
            onSearchChange={setSearch}
            align="right"
            size="sm"
            placeholder="이 태그 안에서 검색…"
            className={styles.heroSearch}
            routeParam="q"
            hasResults={hasResults}
            onSearchOptionsChange={(opts) => setSyntaxMode(opts.syntaxMode)}
            typeSelector={{
              value: searchType,
              options: [
                { value: "all", label: "제목+내용" },
                { value: "title", label: "제목" },
                { value: "content", label: "내용" },
              ],
              onChange: (v) => setSearchType(v as "all" | "title" | "content"),
            }}
            syntaxHelp
          />
        </div>
      </div>
    </div>
  );
}
