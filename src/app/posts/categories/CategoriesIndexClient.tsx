"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MediaThumb from "@/components/ui/MediaThumb";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Sparkles, X, ArrowRight } from "@/components/icons";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { useIsMobile } from "@/hooks/useIsMobile";
import styles from "../series/SeriesIndex.module.css";

interface CategoryEntry {
  name: string;
  count: number;
  first_cover: string | null;
}

interface Props {
  categories: CategoryEntry[];
}

type SortBy = "popular" | "alphabetical";
const FEATURED_COUNT = 3;

export default function CategoriesIndexClient({ categories }: Props) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("popular");
  const [sheetCat, setSheetCat] = useState<CategoryEntry | null>(null);
  const { isTouch } = useIsMobile();

  useEffect(() => {
    if (!sheetCat) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSheetCat(null); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [sheetCat]);

  const featuredSet = useMemo(() => {
    const sorted = categories.slice().sort((a, b) => b.count - a.count).slice(0, FEATURED_COUNT);
    return new Set(sorted.map((c) => c.name));
  }, [categories]);

  const filtered = useMemo(() => {
    let list = categories;
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q));
    list = list.slice();
    if (sortBy === "alphabetical") list.sort((a, b) => a.name.localeCompare(b.name));
    else list.sort((a, b) => b.count - a.count);
    return list;
  }, [categories, search, sortBy]);

  const totalPosts = useMemo(
    () => categories.reduce((sum, c) => sum + c.count, 0),
    [categories],
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className="tw:flex tw:items-center tw:justify-between tw:gap-md">
          <h1 className={styles.title}>
            <LayoutGrid size={22} strokeWidth={1.8} aria-hidden />
            카테고리 모음
          </h1>
        </div>
        <p className={styles.meta}>
          <strong>{filtered.length.toLocaleString()}</strong>개의 카테고리
          {" · "}
          총 <strong>{totalPosts.toLocaleString()}</strong>개의 글
        </p>
        <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-sm">
          <SegmentedControl<SortBy>
            items={[
              { value: "popular", label: "인기순" },
              { value: "alphabetical", label: "제목순" },
            ]}
            value={sortBy}
            onChange={(v) => setSortBy(v)}
          />
          <SearchCapsule
            search={search}
            onSearchChange={setSearch}
            placeholder="카테고리 검색…"
            align="left"
            size="sm"
            className={styles.searchBar}
            routeParam="q"
          />
        </div>
      </header>

      {filtered.length === 0 ? (
        <p className={styles.empty}>일치하는 카테고리가 없습니다.</p>
      ) : (
        <ul className={styles.grid}>
          {filtered.map((c) => {
            const isFeatured = featuredSet.has(c.name);
            return (
              <li key={c.name}>
                <Link
                  href={`/posts?category=${encodeURIComponent(c.name)}`}
                  className={`${styles.card} ${isFeatured ? styles.cardFeatured : ""}`}
                  onClick={isTouch ? (e) => {
                    e.preventDefault();
                    setSheetCat(c);
                  } : undefined}
                >
                  {isFeatured && (
                    <span className={styles.cardFeaturedBadge}>
                      <Sparkles size={10} strokeWidth={2} aria-hidden />
                      인기
                    </span>
                  )}
                  <div className={styles.cover}>
                    {c.first_cover ? (
                      <MediaThumb
                        src={c.first_cover}
                        fill
                        sizes="(max-width: 768px) 50vw, 240px"
                        className={styles.coverImg}
                        unoptimized
                      />
                    ) : (
                      <span className={styles.coverPlaceholder}>{c.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className={styles.body}>
                    <span className={styles.meta2}>
                      <span>{c.count}개의 글</span>
                    </span>
                    <span className={styles.cardTitle}>{c.name}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {filtered.length > 0 && (
        <p className={styles.endNote}>— 모든 카테고리를 다 표시했습니다. ({filtered.length}개) —</p>
      )}

      <AnimatePresence>
        {sheetCat && (
          <>
            <motion.div
              className={styles.sheetBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSheetCat(null)}
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
                onClick={() => setSheetCat(null)}
                aria-label="닫기"
              >
                <X size={18} aria-hidden />
              </button>
              <div className="tw:flex tw:items-baseline tw:gap-sm">
                <h2 className={styles.sheetTitle}>{sheetCat.name}</h2>
                <span className={styles.sheetCount}>{sheetCat.count}개의 글</span>
              </div>
              <Link
                href={`/posts?category=${encodeURIComponent(sheetCat.name)}`}
                className={styles.sheetCta}
                onClick={() => setSheetCat(null)}
              >
                이 카테고리의 글 보기
                <ArrowRight size={14} aria-hidden />
              </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
