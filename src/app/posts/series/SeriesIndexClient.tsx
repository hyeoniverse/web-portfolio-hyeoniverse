"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MediaThumb from "@/components/ui/MediaThumb";
import HighlightedText from "@/components/ui/HighlightedText";
import { SearchHighlightProvider } from "@/providers/SearchHighlightProvider";
import { parseSearchQuery, matchesQuery, type SyntaxMode } from "@/lib/searchQuery";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Sparkles, X, ArrowRight, Settings } from "lucide-react";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Button from "@/components/ui/Button";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useLanguage } from "@/providers/LanguageProvider";
import type { Series } from "@/types/post";
import styles from "./SeriesIndex.module.css";

const loadSupabaseClient = () =>
  import("@/lib/supabase/client").then((m) => m.createClient());

type SeriesEntry = Series & { post_count: number; first_cover: string | null };

interface Props {
  series: SeriesEntry[];
}

type SortBy = "popular" | "alphabetical" | "newest";
const FEATURED_COUNT = 3;

export default function SeriesIndexClient({ series }: Props) {
  const { language } = useLanguage();
  const [search, setSearch] = useState("");
  const [syntaxMode, setSyntaxMode] = useState<SyntaxMode>("prefix");
  const [sortBy, setSortBy] = useState<SortBy>("popular");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sheetSeries, setSheetSeries] = useState<SeriesEntry | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { isTouch } = useIsMobile();

  // 로그인 사용자 = admin (단일 운영자 가정)
  useEffect(() => {
    let cancelled = false;
    loadSupabaseClient().then((supabase) => {
      supabase.auth.getUser().then(({ data }) => {
        if (!cancelled) setIsAdmin(!!data.user);
      });
    });
    return () => { cancelled = true; };
  }, []);

  // 시트 ESC + body scroll lock
  useEffect(() => {
    if (!sheetSeries) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSheetSeries(null); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [sheetSeries]);

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
        const haystack = [s.title, s.title_en, s.description, s.description_en]
          .filter(Boolean)
          .join("\n");
        return matchesQuery(haystack, parsed);
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
  }, [series, search, syntaxMode, activeCategory, sortBy]);

  const totalPosts = useMemo(
    () => series.reduce((sum, s) => sum + s.post_count, 0),
    [series],
  );

  return (
    <SearchHighlightProvider query={search} mode={syntaxMode}>
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitleRow}>
          <h1 className={styles.title}>
            <BookOpen size={22} strokeWidth={1.8} aria-hidden />
            시리즈 모음
          </h1>
          {isAdmin && (
            <Button
              href="/admin/settings?tab=content&sub=posts"
              size="xs"
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
            items={[
              { value: "popular", label: "인기순" },
              { value: "newest", label: "최신순" },
              { value: "alphabetical", label: "제목순" },
            ]}
            value={sortBy}
            onChange={(v) => setSortBy(v)}
          />
          <SearchCapsule
            search={search}
            onSearchChange={setSearch}
            placeholder="시리즈 제목 또는 설명으로 검색…"
            align="left"
            className={styles.searchBar}
            routeParam="q"
            hasResults={filtered.length > 0}
            onSearchOptionsChange={(opts) => setSyntaxMode(opts.syntaxMode)}
          />
        </div>
      </header>

      {/* 카테고리 필터 */}
      {categoryBuckets.size > 0 && (
        <div className={styles.categoryRow}>
          <button
            type="button"
            className={`${styles.categoryBtn} ${activeCategory === null ? styles.categoryBtnActive : ""}`}
            onClick={() => setActiveCategory(null)}
            data-clickable="true"
          >
            전체
            <span className={styles.categoryCount}>{series.length}</span>
          </button>
          {Array.from(categoryBuckets.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([cat, count]) => {
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  className={`${styles.categoryBtn} ${active ? styles.categoryBtnActive : ""}`}
                  onClick={() => setActiveCategory(active ? null : cat)}
                  data-clickable="true"
                >
                  {cat}
                  <span className={styles.categoryCount}>{count}</span>
                </button>
              );
            })}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className={styles.empty}>일치하는 시리즈가 없습니다.</p>
      ) : (
        <ul className={styles.grid}>
          {filtered.map((s) => {
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
                    <span className={styles.cardFeaturedBadge}>
                      <Sparkles size={10} strokeWidth={2} aria-hidden />
                      인기
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
        <p className={styles.endNote}>— 모든 시리즈를 다 표시했습니다. ({filtered.length}개) —</p>
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
              <button
                type="button"
                className={styles.sheetClose}
                onClick={() => setSheetSeries(null)}
                aria-label="닫기"
              >
                <X size={18} aria-hidden />
              </button>
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
