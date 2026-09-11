"use client";

import { useMemo, useState } from "react";
import { useSearchControls } from "@/hooks/useSearchControls";
import { usePageControls } from "@/hooks/usePageControls";
import { useSheet } from "@/hooks/useSheet";
import { useIsAuthenticated } from "@/hooks/useIsAuthenticated";
import PostsSubnav from "../_components/PostsSubnav";
import { SearchHighlightProvider } from "@/providers/SearchHighlightProvider";
import { parseSearchQuery, matchesQuery } from "@/lib/searchQuery";
import { BookOpen, Settings } from "@/components/icons";
import Pagination from "@/components/ui/Pagination";
import Button from "@/components/ui/Button";
import BackLink from "@/components/ui/BackLink";
import PageTitle from "@/components/ui/PageTitle";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useLanguage } from "@/providers/LanguageProvider";
import index from "../_components/IndexPage.module.css";
import IndexSheet from "../_components/IndexSheet/IndexSheet";
import SeriesIndexControls, { type SeriesSortBy } from "./_components/SeriesIndexControls";
import SeriesCategoryFilter from "./_components/SeriesCategoryFilter";
import SeriesCardGrid from "./_components/SeriesCardGrid";
import type { SeriesEntry } from "./types";
import styles from "./SeriesIndex.module.css";
import BoldMarks from "@/components/ui/BoldMarks";
import { fillCount } from "@/utils/format";


interface Props {
  series: SeriesEntry[];
}

const FEATURED_COUNT = 3;
export default function SeriesIndexClient({ series }: Props) {
  const { language, t } = useLanguage();
  const searchControls = useSearchControls<"all" | "title" | "desc">("all");
  const { search, searchType, syntaxMode } = searchControls;
  const [sortBy, setSortBy] = useState<SeriesSortBy>("popular");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  // 필터/정렬/perPage 변경 시 1페이지로
  const { page, setPage, perPage, setPerPage } = usePageControls({ defaultPerPage: 20, resetOn: [search, searchType, syntaxMode, activeCategory, sortBy] });
  // 시트 — ESC 닫기 + body 스크롤 잠금
  const [sheetSeries, setSheetSeries] = useSheet<SeriesEntry>();
  // 로그인 사용자 = admin (단일 운영자 가정)
  const isAdmin = useIsAuthenticated();
  const { isTouch } = useIsMobile();


  // 카테고리 bucket — 카운트 표시 + 비활성 처리
  const categoryBuckets = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of series) {
      if (s.category) map.set(s.category, (map.get(s.category) ?? 0) + 1);
    }
    return map;
  }, [series]);

  // featured (인기 top N — post_count desc)
  const featuredSet = useMemo(() => {
    const sorted = series.slice().sort((a, b) => b.post_count - a.post_count).slice(0, FEATURED_COUNT);
    return new Set(sorted.map((s) => s.id));
  }, [series]);

  // 검색 + 카테고리 필터 + 정렬
  const filtered = useMemo(() => {
    let list = series;
    const q = search.trim();
    if (q) {
      const parsed = parseSearchQuery(q, syntaxMode);
      list = list.filter((s) => {
        const fields =
          searchType === "title"
            ? [s.title, s.title_en]
            : searchType === "desc"
              ? [s.description, s.description_en]
              : [s.title, s.title_en, s.description, s.description_en];
        return matchesQuery(fields.filter(Boolean).join("\n"), parsed);
      });
    }
    if (activeCategory) {
      list = list.filter((s) => s.category === activeCategory);
    }
    list = list.slice();
    if (sortBy === "alphabetical") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "newest") {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      // popular = post_count desc
      list.sort((a, b) => b.post_count - a.post_count);
    }
    return list;
  }, [series, search, searchType, syntaxMode, activeCategory, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  // page 가 범위를 벗어난 프레임(perPage 증가·검색 축소 등, reset effect 반영 전)에 빈 그리드 방지
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * perPage, (safePage - 1) * perPage + perPage);

  const totalPosts = useMemo(
    () => series.reduce((sum, s) => sum + s.post_count, 0),
    [series],
  );

  return (
    <SearchHighlightProvider query={search} mode={syntaxMode}>
    <div className={index.container}>
      <PostsSubnav />
      <div className={index.backRow}>
        <BackLink href="/posts" label={language === "en" ? "Posts" : "글 목록"} />
      </div>
      <header className={index.header}>
        <div className={index.headerTitleRow}>
          <PageTitle icon={<BookOpen size={40} strokeWidth={1.6} aria-hidden />}>
            Series.
          </PageTitle>
          {isAdmin && (
            <Button
              href="/admin/settings?tab=content&sub=posts"
              size="sm"
              icon={<Settings size={12} strokeWidth={1.8} aria-hidden />}
              title={t("postsPage.seriesManage")}
            >
              {t("postsPage.seriesManage")}
            </Button>
          )}
        </div>
        <p className={index.meta}>
          <BoldMarks text={fillCount(t, "postsPage.countSeries", filtered.length)} />
          {" · "}
          <BoldMarks text={fillCount(t, "postsPage.countTotalPosts", totalPosts)} />
        </p>
        <SeriesIndexControls
          sortBy={sortBy}
          onSortChange={setSortBy}
          perPage={perPage}
          onPerPageChange={setPerPage}
          searchControls={searchControls}
          hasResults={filtered.length > 0}
        />
      </header>

      <SeriesCategoryFilter buckets={categoryBuckets} total={series.length} active={activeCategory} onChange={setActiveCategory} />

      {filtered.length === 0 ? (
        <p className={index.empty}>{t("postsPage.noMatchingSeries")}</p>
      ) : (
        <SeriesCardGrid items={paged} featuredSet={featuredSet} isTouch={isTouch} onTap={setSheetSeries} />
      )}

      {filtered.length > 0 && (
        <Pagination
          page={safePage}
          totalPages={totalPages}
          onChange={setPage}
          className={styles.pagination}
        />
      )}

      {/* 터치 디바이스 — 탭 시 바텀 시트로 detail */}
      <IndexSheet
        show={!!sheetSeries}
        onClose={() => setSheetSeries(null)}
        title={sheetSeries ? (language === "en" ? (sheetSeries.title_en || sheetSeries.title) : sheetSeries.title) : null}
        count={sheetSeries ? fillCount(t, "postsPage.countPosts", sheetSeries.post_count) : null}
        description={sheetSeries ? (language === "en" ? (sheetSeries.description_en || sheetSeries.description) : sheetSeries.description) : null}
        cta={{ href: `/posts?series=${sheetSeries?.id}`, label: t("postsPage.viewSeriesPosts") }}
      />
    </div>
    </SearchHighlightProvider>
  );
}
