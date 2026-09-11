"use client";

import { useMemo, useState } from "react";
import { useSheet } from "@/hooks/useSheet";
import Link from "next/link";
import MediaThumb from "@/components/ui/MediaThumb";
import { LayoutGrid, Sparkles } from "@/components/icons";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { useIsMobile } from "@/hooks/useIsMobile";
import page from "../_components/IndexPage.module.css";
import card from "../_components/IndexCard.module.css";
import IndexSheet from "../_components/IndexSheet/IndexSheet";
import { useLanguage } from "@/providers/LanguageProvider";
import BoldMarks from "@/components/ui/BoldMarks";
import { fillCount, fillTemplate } from "@/utils/format";

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
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("popular");
  // 시트 — ESC 닫기 + body 스크롤 잠금
  const [sheetCat, setSheetCat] = useSheet<CategoryEntry>();
  const { isTouch } = useIsMobile();

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
    <div className={page.container}>
      <header className={page.header}>
        <div className={page.headerTitleRow}>
          <h1 className={page.title}>
            <LayoutGrid size={22} strokeWidth={1.8} aria-hidden />
            {t("postsPage.categoriesTitle")}
          </h1>
        </div>
        <p className={page.meta}>
          <BoldMarks text={fillCount(t, "postsPage.countCategories", filtered.length)} />
          {" · "}
          <BoldMarks text={fillCount(t, "postsPage.countTotalPosts", totalPosts)} />
        </p>
        <div className={page.searchSortRow}>
          <SegmentedControl<SortBy>
            items={[
              { value: "popular", label: t("postsPage.sortPopular") },
              { value: "alphabetical", label: t("postsPage.sortTitle") },
            ]}
            value={sortBy}
            onChange={(v) => setSortBy(v)}
          />
          <SearchCapsule
            search={search}
            onSearchChange={setSearch}
            placeholder={t("postsPage.categorySearch")}
            align="left"
            size="sm"
            className={page.searchBar}
            routeParam="q"
          />
        </div>
      </header>

      {filtered.length === 0 ? (
        <p className={page.empty}>{t("postsPage.noMatchingCategories")}</p>
      ) : (
        <ul className={card.grid}>
          {filtered.map((c) => {
            const isFeatured = featuredSet.has(c.name);
            return (
              <li key={c.name}>
                <Link
                  href={`/posts?category=${encodeURIComponent(c.name)}`}
                  className={`${card.card} ${isFeatured ? card.cardFeatured : ""}`}
                  onClick={isTouch ? (e) => {
                    e.preventDefault();
                    setSheetCat(c);
                  } : undefined}
                >
                  {isFeatured && (
                    <span className={card.cardFeaturedBadge}>
                      <Sparkles size={10} strokeWidth={2} aria-hidden />
                      {t("postsPage.featuredBadge")}
                    </span>
                  )}
                  <div className={card.cover}>
                    {c.first_cover ? (
                      <MediaThumb
                        src={c.first_cover}
                        fill
                        sizes="(max-width: 768px) 50vw, 240px"
                        className={card.coverImg}
                      />
                    ) : (
                      <span className={card.coverPlaceholder}>{c.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className={card.body}>
                    <span className={card.meta2}>
                      <span>{fillCount(t, "postsPage.countPosts", c.count)}</span>
                    </span>
                    <span className={card.cardTitle}>{c.name}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {filtered.length > 0 && (
        <p className={page.endNote}>{fillTemplate(t("postsPage.allCategoriesShown"), { n: filtered.length })}</p>
      )}

      <IndexSheet
        show={!!sheetCat}
        onClose={() => setSheetCat(null)}
        title={sheetCat?.name}
        count={sheetCat ? fillCount(t, "postsPage.countPosts", sheetCat.count) : null}
        cta={{ href: `/posts?category=${encodeURIComponent(sheetCat?.name ?? "")}`, label: t("postsPage.viewCategoryPosts") }}
      />
    </div>
  );
}
