"use client";

import { useLanguage } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import Button from "@/components/ui/Button";
import { Sparkles, SearchEmptyIcon } from "@/components/icons";
import type { PostsQuery } from "../../_hooks/usePostsQuery";
import styles from "./PostsEmptyState.module.css";

/* 글 0개 — 시리즈를 골랐는데 글이 없으면 "Coming Soon"(시리즈는 있고 콘텐츠 준비 중), 아니면 검색/필터 결과 없음 + 필터 초기화. */
export default function PostsEmptyState({ query }: { query: PostsQuery }) {
  const { t } = useLanguage();
  const {
    activeSeries, setActiveSeries,
    search, setSearch, setSearchType,
    activeTags, clearActiveTags,
    activeCategories, setActiveCategories,
  } = query;

  if (activeSeries) {
    /* 시리즈 선택 + posts 0개 — "Coming Soon" 톤. 시리즈가 존재하지만 콘텐츠 준비중인 케이스. */
    return (
      <div className={`${styles.emptyState} ${styles.emptyStateComingSoon}`}>
        <span className={styles.comingSoonIconWrap} aria-hidden>
          <Sparkles size={28} className={styles.comingSoonIconA} />
          <Sparkles size={16} className={styles.comingSoonIconB} />
          <Sparkles size={12} className={styles.comingSoonIconC} />
        </span>
        <p className={styles.comingSoonTitle}>{t("postsPage.comingSoon")}</p>
        <p className={styles.comingSoonSub}>
          {t("postsPage.noPostsInSeriesYet")} {t("postsPage.comingSoonSub")}
        </p>
        <Button
          variant="outline"
          size="xs"
          onClick={() => setActiveSeries(null)}
        >
          <T k="postsPage.clearSeries" />
        </Button>
      </div>
    );
  }
  return (
    <div className={styles.emptyState}>
      <SearchEmptyIcon />
      <p className={styles.emptyTitle}>{t("postsPage.noPostsYet")}</p>
      {(search ||
        activeTags.size > 0 ||
        activeCategories.length > 0) && (
        <Button
          variant="outline"
          size="xs"
          onClick={() => {
            setSearch("");
            setSearchType("all");
            clearActiveTags();
            setActiveCategories([]);
          }}
        >
          <T
            k="postsPage.clearFilters"
            tooltip={t("postsPage.clearFiltersTooltip")}
          />
        </Button>
      )}
    </div>
  );
}
