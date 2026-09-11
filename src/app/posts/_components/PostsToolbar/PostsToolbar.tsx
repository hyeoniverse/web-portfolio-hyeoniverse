"use client";

import { perPageOptions } from "@/constants";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import T from "@/components/ui/T";
import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
import Select from "@/components/ui/Select";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { LayoutGrid, Shuffle, List } from "@/components/icons";
import type { PostsQuery } from "../../_hooks/usePostsQuery";
import header from "../SectionHeader.module.css";
import styles from "./PostsToolbar.module.css";

/* 글 목록 섹션 헤더 — 제목 + [저자 필터 | 정렬 SegmentedControl(popular 세부) | 셔플] + perPage select.
   타임라인(history)은 월 그룹이라 날짜순만 유효 — 정렬은 date 하나, 셔플과 perPage 는 숨긴다.
   헤더 골격(header.*)은 SeriesSection 과 공유하는 SectionHeader.module.css. 빈 상태에서도 항상 보인다(컨트롤 접근 유지). */
export default function PostsToolbar({ query, timeline }: { query: PostsQuery; timeline: boolean }) {
  const { t, language } = useLanguage();
  const siteConf = useSiteConfig();
  // 작성자 — 2명 이상일 때만 필터/정렬 노출(1명이면 옵션이 무의미). 카드 표시는 무조건.
  const authors = siteConf.authors ?? [];
  const multiAuthor = authors.length >= 2;
  const {
    activeAuthor, setActiveAuthor, setPage,
    sortBy, sortDir, popularSort, setPopularSort, handleSortChange, shuffle, resetSort,
    perPage, setPerPage,
  } = query;

  return (
    <div className={header.sectionHeader}>
      <div className={header.sectionHeaderMain}>
        <span className={header.sectionHeaderTitle}>
          <LayoutGrid size={14} />
          <span className={header.sectionHeaderText}>
            <T k="postsPage.posts" tooltip={t("postsPage.postsTooltip")} />
          </span>
        </span>
      </div>
      <div className={header.sortWrap}>
        {/* 작성자 필터 — 저자 2명 이상일 때만. 레이아웃 무관하게 필터로 동작. */}
        {multiAuthor && (
          <Select
            value={activeAuthor ?? ""}
            options={[{ value: "", label: language === "ko" ? "작성자 전체" : "All authors" }, ...authors.map((a) => ({ value: a.id, label: a.name }))]}
            size="sm"
            onChange={(v) => { setActiveAuthor(v || null); setPage(1); }}
          />
        )}
        {/* sort + shuffle 한 묶음 — shuffle 은 sort 의 random 변형 (오른쪽 인접). */}
        <SegmentedControl<"date" | "popular" | "title" | "author", "score" | "views" | "comments" | "likes">
          size="sm"
          className={header.seriesSegmented}
          items={
            /* 타임라인은 월 그룹이라 날짜순만 유효 → date(newest/oldest 토글)만 노출 */
            timeline
              ? [{ value: "date", label: <T k="postsPage.sortDate" tooltip={t("postsPage.sortDateTooltip")} /> }]
              : [
                  { value: "date", label: <T k="postsPage.sortDate" tooltip={t("postsPage.sortDateTooltip")} /> },
                  {
                    value: "popular",
                    label: <T k="postsPage.sortPopular" tooltip={t("postsPage.sortPopularTooltip")} />,
                    subItems: [
                      { value: "score", label: <T k="postsPage.popularScore" /> },
                      { value: "views", label: <T k="postsPage.popularViews" /> },
                      { value: "comments", label: <T k="postsPage.popularComments" /> },
                      { value: "likes", label: <T k="postsPage.popularLikes" /> },
                    ],
                  },
                  { value: "title", label: <T k="postsPage.sortTitle" tooltip={t("postsPage.sortTitleTooltip")} /> },
                  // 저자 정렬 — 2명 이상일 때만
                  ...(multiAuthor ? [{ value: "author" as const, label: language === "ko" ? "저자" : "Author" }] : []),
                ]
          }
          value={(timeline || sortBy === "random" ? "date" : sortBy) as "date" | "popular" | "title" | "author"}
          onChange={handleSortChange}
          sortDir={sortBy !== "popular" && sortBy !== "random" ? sortDir : undefined}
          subValue={popularSort}
          onSubChange={setPopularSort}
          subVariant="nested"
          onBack={resetSort}
        />
        {/* 타임라인에선 랜덤 정렬도 무의미 → shuffle 숨김 */}
        {!timeline && (
          <Tooltip
            content={
              <>
                <div>{t("postsPage.sortRandom")}</div>
                <div>{t("postsPage.sortRandomTooltip")}</div>
              </>
            }
          >
            <Button
              variant={sortBy === "random" ? "primary" : "outline"}
              shape="circle"
              size="sm"
              icon={<Shuffle size={12} />}
              onClick={shuffle}
              aria-label={t("postsPage.sortRandom")}
              className={header.shuffleBtn}
            />
          </Tooltip>
        )}
      </div>
      {/* 페이지당 개수 select — 가장 오른쪽 (margin-left: auto). shuffle/sort 와 분리.
         history(timeline)는 무한스크롤이라 페이지 개념이 없어 숨김. */}
      {!timeline && (
        <div className={styles.pageSizeGroup}>
          <List size={14} strokeWidth={1.8} className={styles.pageSizeIcon} aria-hidden />
          <Select
            value={String(perPage)}
            options={perPageOptions(t)}
            size="sm"
            onChange={(v) => {
              setPerPage(Number(v));
              setPage(1);
            }}
            className={styles.pageSizeSelect}
          />
        </div>
      )}
    </div>
  );
}
