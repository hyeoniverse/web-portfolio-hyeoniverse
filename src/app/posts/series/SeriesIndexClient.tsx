"use client";

import { useMemo, useState } from "react";
import { PER_PAGE_OPTIONS } from "@/constants";
import { useSearchControls } from "@/hooks/useSearchControls";
import { usePageControls } from "@/hooks/usePageControls";
import { useSheet } from "@/hooks/useSheet";
import { useIsAuthenticated } from "@/hooks/useIsAuthenticated";
import Link from "next/link";
import MediaThumb from "@/components/ui/MediaThumb";
import PostsSubnav from "../_components/PostsSubnav";
import HighlightedText from "@/components/ui/HighlightedText";
import { SearchHighlightProvider } from "@/providers/SearchHighlightProvider";
import { parseSearchQuery, matchesQuery } from "@/lib/searchQuery";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Flame, X, ArrowRight, Settings, List } from "@/components/icons";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Select from "@/components/ui/Select";
import Pagination from "@/components/ui/Pagination";
import Button from "@/components/ui/Button";
import BackLink from "@/components/ui/BackLink";
import PageTitle from "@/components/ui/PageTitle";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useLanguage } from "@/providers/LanguageProvider";
import type { Series } from "@/types/post";
import styles from "./SeriesIndex.module.css";
import Pressable from "@/components/ui/Pressable";


type SeriesEntry = Series & { post_count: number; first_cover: string | null };

interface Props {
  series: SeriesEntry[];
}

type SortBy = "popular" | "alphabetical" | "newest";
const FEATURED_COUNT = 3;
export default function SeriesIndexClient({ series }: Props) {
  const { language } = useLanguage();
  const { search, setSearch, searchType, setSearchType, syntaxMode, setSyntaxMode } =
    useSearchControls<"all" | "title" | "desc">("all");
  const [sortBy, setSortBy] = useState<SortBy>("popular");
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
    <div className={styles.container}>
      <PostsSubnav />
      <div className={styles.backRow}>
        <BackLink href="/posts" label={language === "en" ? "Posts" : "글 목록"} />
      </div>
      <header className={styles.header}>
        <div className={styles.headerTitleRow}>
          <PageTitle icon={<BookOpen size={40} strokeWidth={1.6} aria-hidden />}>
            Series.
          </PageTitle>
          {isAdmin && (
            <Button
              href="/admin/settings?tab=content&sub=posts"
              size="sm"
              icon={<Settings size={12} strokeWidth={1.8} aria-hidden />}
              title="시리즈 관리"
            >
              시리즈 관리
            </Button>
          )}
        </div>
        <p className={styles.meta}>
          <strong>{filtered.length.toLocaleString()}</strong>개의 시리즈
          {" · "}
          총 <strong>{totalPosts.toLocaleString()}</strong>개의 글
        </p>
        <div className={styles.searchSortRow}>
          <SegmentedControl<SortBy>
            className={styles.sortControl}
            size="sm"
            items={[
              { value: "popular", label: "인기순" },
              { value: "newest", label: "최신순" },
              { value: "alphabetical", label: "제목순" },
            ]}
            value={sortBy}
            onChange={(v) => setSortBy(v)}
          />
          <div className={styles.searchTools}>
            <div className={styles.perPageGroup}>
              <List size={14} strokeWidth={1.8} className={styles.perPageIcon} aria-hidden />
              <Select
                className={styles.perPageSelect}
                size="sm"
                value={String(perPage)}
                options={PER_PAGE_OPTIONS}
                onChange={(v) => setPerPage(Number(v))}
              />
            </div>
            <SearchCapsule
              search={search}
              onSearchChange={setSearch}
              placeholder="시리즈 제목 또는 설명으로 검색…"
              align="left"
              size="sm"
              className={styles.searchBar}
              routeParam="q"
              hasResults={filtered.length > 0}
              onSearchOptionsChange={(opts) => setSyntaxMode(opts.syntaxMode)}
              typeSelector={{
                value: searchType,
                options: [
                  { value: "all", label: "제목+설명" },
                  { value: "title", label: "제목" },
                  { value: "desc", label: "설명" },
                ],
                onChange: (v) => setSearchType(v as "all" | "title" | "desc"),
              }}
              syntaxHelp
            />
          </div>
        </div>
      </header>

      {/* 카테고리 필터 */}
      {categoryBuckets.size > 0 && (
        <div className={styles.categoryRow}>
          <Button
            type="button"
            variant="outline"
            size="xs"
            active={activeCategory === null}
            onClick={() => setActiveCategory(null)}
            data-clickable="true"
          >
            전체
            <span className={styles.categoryCount}>{series.length}</span>
          </Button>
          {Array.from(categoryBuckets.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([cat, count]) => {
              const active = activeCategory === cat;
              return (
                <Button
                  key={cat}
                  type="button"
                  variant="outline"
                  size="xs"
                  active={active}
                  onClick={() => setActiveCategory(active ? null : cat)}
                  data-clickable="true"
                >
                  {cat}
                  <span className={styles.categoryCount}>{count}</span>
                </Button>
              );
            })}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className={styles.empty}>일치하는 시리즈가 없습니다.</p>
      ) : (
        <ul className={styles.grid}>
          {paged.map((s) => {
            const title = language === "en" ? (s.title_en || s.title) : s.title;
            const description = language === "en" ? (s.description_en || s.description) : s.description;
            const cover = s.cover_image || s.first_cover || s.auto_cover_url;
            const isFeatured = featuredSet.has(s.id);
            return (
              <li key={s.id}>
                <Link
                  href={`/posts?series=${s.id}`}
                  className={`${styles.card} ${isFeatured ? styles.cardFeatured : ""}`}
                  onClick={isTouch ? (e) => {
                    e.preventDefault();
                    setSheetSeries(s);
                  } : undefined}
                >
                  {isFeatured && (
                    <span className={styles.cardHotBadge}>
                      <Flame size={11} fill="currentColor" stroke="none" aria-hidden />
                      HOT
                    </span>
                  )}
                  <div className={styles.cover}>
                    {cover ? (
                      <MediaThumb
                        src={cover}
                        fill
                        sizes="(max-width: 768px) 50vw, 240px"
                        className={styles.coverImg}
                        unoptimized
                      />
                    ) : (
                      <span className={styles.coverPlaceholder}>{(title || "?").charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className={styles.body}>
                    <span className={styles.meta2}>
                      {s.category && <span className={styles.category}>{s.category}</span>}
                      <span>{s.post_count}개의 글</span>
                    </span>
                    <span className={styles.cardTitle}><HighlightedText text={title} /></span>
                    {description && <span className={styles.cardDesc}><HighlightedText text={description} /></span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
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
      <AnimatePresence>
        {sheetSeries && (
          <>
            <motion.div
              className={styles.sheetBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSheetSeries(null)}
            />
            <motion.div
              className={styles.sheet}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              role="dialog"
              aria-modal="true"
            >
              <Pressable
                className={styles.sheetClose}
                onClick={() => setSheetSeries(null)}
                aria-label="닫기"
              >
                <X size={18} aria-hidden />
              </Pressable>
              <div className={styles.sheetHeader}>
                <h2 className={styles.sheetTitle}>
                  {language === "en" ? (sheetSeries.title_en || sheetSeries.title) : sheetSeries.title}
                </h2>
                <span className={styles.sheetCount}>{sheetSeries.post_count}개의 글</span>
              </div>
              {(() => {
                const d = language === "en" ? (sheetSeries.description_en || sheetSeries.description) : sheetSeries.description;
                return d ? <p className={styles.sheetDesc}>{d}</p> : null;
              })()}
              <Link
                href={`/posts?series=${sheetSeries.id}`}
                className={styles.sheetCta}
                onClick={() => setSheetSeries(null)}
              >
                이 시리즈의 글 보기
                <ArrowRight size={14} aria-hidden />
              </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
    </SearchHighlightProvider>
  );
}
