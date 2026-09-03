"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { Series } from "@/types/post";
import { useLanguage } from "@/providers/LanguageProvider";
import { useIsAuthenticated } from "@/hooks/useIsAuthenticated";
import T from "@/components/ui/T";
import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
import Pressable from "@/components/ui/Pressable";
import SegmentedControl from "@/components/ui/SegmentedControl";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import { BookOpen, ChevronLeft, ChevronRight, Settings, Shuffle } from "@/components/icons";
import SeriesCard from "../SeriesCard/SeriesCard";
import { useSeriesFeed } from "./useSeriesFeed";
import { useSeriesRowScroll } from "./useSeriesRowScroll";
// 섹션 헤더 골격(sectionHeader · sortWrap · shuffleBtn · seriesSegmented)은 글 목록 툴바(PostsToolbar)와 공유
import header from "../SectionHeader.module.css";
import styles from "./SeriesSection.module.css";

/* /posts 상단 시리즈 섹션 — 헤더(관리 버튼 · 정렬 · 셔플 · 검색) + 책 표지 가로 row + 선택된 시리즈 메타.
   목록 fetch/정렬은 useSeriesFeed, row 스크롤(휠·드래그·화살표·끝 감지)은 useSeriesRowScroll.
   검색·스코프·셔플 seed 는 client-side 필터라 여기 로컬 state. activeSeries(글 목록 필터)는 부모 것. */
export default function SeriesSection({
  initialList,
  initialTotal,
  perPage,
  activeCategoryKey,
  activeTagsKey,
  activeSeries,
  onSeriesClick,
}: {
  initialList: Series[];
  initialTotal: number;
  perPage: number;
  activeCategoryKey: string | null;
  activeTagsKey: string | null;
  activeSeries: string | null;
  onSeriesClick: (seriesId: string) => void;
}) {
  const { t, language } = useLanguage();
  const [seriesSearch, setSeriesSearch] = useState("");
  const [seriesScope, setSeriesScope] = useState<"all" | "title" | "desc">("all");
  const [seriesRandomSeed, setSeriesRandomSeed] = useState(0);
  // 로그인 사용자 = admin (단일 운영자 가정) — 시리즈 관리 바로가기 노출용
  const isAdmin = useIsAuthenticated();

  const { seriesList, seriesSortBy, setSeriesSortBy, seriesSortDir, handleSeriesSortClick, loadMoreSeries } =
    useSeriesFeed({ initialList, initialTotal, perPage, activeCategoryKey, activeTagsKey });
  const seriesRowRef = useRef<HTMLDivElement>(null);
  const { startScroll: startSeriesScroll, stopScroll: stopSeriesScroll } =
    useSeriesRowScroll(seriesRowRef, loadMoreSeries, seriesList.length);

  const activeSeriesObj = useMemo(() => {
    if (!activeSeries) return null;
    return seriesList.find((s) => s.id === activeSeries) ?? null;
  }, [activeSeries, seriesList]);

  const q = seriesSearch.trim().toLowerCase();
  const scopeFields = (s: Series) =>
    seriesScope === "title"
      ? [s.title, s.title_en]
      : seriesScope === "desc"
        ? [s.description, s.description_en]
        : [s.title, s.title_en, s.description, s.description_en];
  const baseFiltered = q
    ? seriesList.filter((s) =>
        scopeFields(s)
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(q)),
      )
    : seriesList;
  // seriesSortBy="random" 이면 seed 기반 client-side 셔플
  const filtered =
    seriesSortBy === "random"
      ? baseFiltered
          .map((s, i) => ({ s, k: ((seriesRandomSeed + i * 9301) * 49297) % 233280 }))
          .sort((a, b) => a.k - b.k)
          .map(({ s }) => s)
      : baseFiltered;

  return (
    <div className={styles.seriesSection}>
      <div className={header.sectionHeader}>
        <div className={header.sectionHeaderMain}>
          <Link href="/posts/series" className={`${header.sectionHeaderTitle} ${styles.sectionHeaderTitleLink}`}>
            <BookOpen size={14} />
            <span className={header.sectionHeaderText}>
              <T
                k="postsPage.series"
                tooltip={t("postsPage.seriesTooltip")}
              />
            </span>
            <ChevronRight size={12} className={styles.sectionHeaderChevron} aria-hidden />
          </Link>
          {isAdmin && (
            <Button
              href="/admin/settings?tab=content&sub=posts"
              external
              size="sm"
              variant="outline"
              className={styles.seriesManageBtn}
              icon={<Settings size={12} strokeWidth={1.8} aria-hidden />}
              title={t("postsPage.seriesManage")}
            >
              {t("postsPage.seriesManage")}
            </Button>
          )}
        </div>
        <div className={header.sortWrap}>
          <SegmentedControl
            size="sm"
            className={header.seriesSegmented}
            items={[
              { value: "default", label: t("postsPage.seriesSortDefault") },
              { value: "newest", label: t("postsPage.seriesSortNewest") },
              { value: "title", label: t("postsPage.seriesSortTitle") },
            ]}
            value={seriesSortBy === "random" ? "default" : seriesSortBy}
            onChange={(v) =>
              handleSeriesSortClick(v as "default" | "newest" | "title")
            }
            sortDir={seriesSortDir}
          />
          <Tooltip
            content={
              <>
                <div>{t("postsPage.sortRandom")}</div>
                <div>{t("postsPage.sortRandomTooltip")}</div>
              </>
            }
          >
            <Button
              variant={seriesSortBy === "random" ? "primary" : "outline"}
              shape="circle"
              size="sm"
              icon={<Shuffle size={12} />}
              onClick={() => {
                if (seriesSortBy === "random") {
                  setSeriesRandomSeed(Math.floor(Math.random() * 1e9));
                } else {
                  setSeriesSortBy("random");
                  setSeriesRandomSeed(Math.floor(Math.random() * 1e9));
                }
              }}
              aria-label={t("postsPage.sortRandom")}
              className={header.shuffleBtn}
            />
          </Tooltip>
        </div>
        {/* 검색창 — 공통 SearchCapsule collapsible(morph) + 스코프 typeSelector */}
        <SearchCapsule
          search={seriesSearch}
          onSearchChange={setSeriesSearch}
          placeholder="시리즈 제목·설명 검색"
          size="sm"
          align="left"
          collapsible
          historyKey={null}
          showHelp={false}
          className={styles.seriesSearchCapsule}
          typeSelector={{
            value: seriesScope,
            options: [
              { value: "all", label: t("postsPage.seriesSearchAll") },
              { value: "title", label: t("postsPage.seriesSearchTitle") },
              { value: "desc", label: t("postsPage.seriesSearchDesc") },
            ],
            onChange: (v) => setSeriesScope(v as "all" | "title" | "desc"),
          }}
        />
      </div>
      <div className={styles.seriesRowWrap}>
        <Pressable
          className={`${styles.seriesScrollBtn} ${styles.seriesScrollBtnLeft}`}
          onMouseDown={(e) => { e.preventDefault(); startSeriesScroll(-1); }}
          onMouseUp={stopSeriesScroll}
          onMouseLeave={stopSeriesScroll}
          onTouchStart={(e) => { e.preventDefault(); startSeriesScroll(-1); }}
          onTouchEnd={stopSeriesScroll}
          aria-label="이전"
          data-clickable="true"
          data-cursor="prev"
        >
          <span className={styles.seriesScrollBadge}>
            <ChevronLeft size={16} />
          </span>
        </Pressable>
        <div
          ref={seriesRowRef}
          className={styles.seriesRow}
          data-lenis-prevent
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {filtered.map((series, idx) => (
              <motion.div
                key={series.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.92 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -80, scale: 0.9 }}
                transition={{
                  layout: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
                  opacity: { duration: 0.28 },
                  x: { duration: 0.35, ease: [0.4, 0, 0.6, 1] },
                  scale: { duration: 0.28 },
                }}
                style={{ display: "flex" }}
              >
                <SeriesCard
                  series={series}
                  onClick={onSeriesClick}
                  active={activeSeries === series.id}
                  index={idx}
                  scrollContainerRef={seriesRowRef}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {/* Empty state — seriesRow 밖에 두어 mask-image / overflow 영향 없이 가운데 표시 */}
        <AnimatePresence>
          {filtered.length === 0 && (
            <motion.p
              key="empty"
              className={styles.seriesEmpty}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.35, duration: 0.25 }}
            >
              {t("postsPage.noSeriesYet")}
            </motion.p>
          )}
        </AnimatePresence>
        <Pressable
          className={`${styles.seriesScrollBtn} ${styles.seriesScrollBtnRight}`}
          onMouseDown={(e) => { e.preventDefault(); startSeriesScroll(1); }}
          onMouseUp={stopSeriesScroll}
          onMouseLeave={stopSeriesScroll}
          onTouchStart={(e) => { e.preventDefault(); startSeriesScroll(1); }}
          onTouchEnd={stopSeriesScroll}
          aria-label="다음"
          data-clickable="true"
          data-cursor="next"
        >
          <span className={styles.seriesScrollBadge}>
            <ChevronRight size={16} />
          </span>
        </Pressable>
      </div>
      <AnimatePresence>
        {activeSeriesObj && (
          <motion.div
            className={styles.activeSeriesMeta}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={styles.activeSeriesMetaTop}>
              <h3 className={styles.activeSeriesMetaTitle}>
                {language === "en" ? (activeSeriesObj.title_en || activeSeriesObj.title) : activeSeriesObj.title}
              </h3>
              <div className={styles.activeSeriesMetaInfo}>
                {activeSeriesObj.category && (
                  <span className={styles.activeSeriesMetaCategory}>{activeSeriesObj.category}</span>
                )}
                <span className={styles.activeSeriesMetaCount}>
                  {activeSeriesObj.post_count ?? 0} {t("postsPage.postsCount")}
                </span>
              </div>
            </div>
            {(() => {
              const d = language === "en"
                ? (activeSeriesObj.description_en || activeSeriesObj.description)
                : activeSeriesObj.description;
              return d ? <p className={styles.activeSeriesMetaDesc}>{d}</p> : null;
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
