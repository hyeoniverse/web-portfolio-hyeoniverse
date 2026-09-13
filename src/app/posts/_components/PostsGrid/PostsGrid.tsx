"use client";

import { useRef, type ReactNode } from "react";
import { type CardType, getCardType } from "@/data/postsBentoTemplates";
import type { Post } from "@/types/post";
import { useIsMobile } from "@/hooks/useIsMobile";
import BeforeHydrationScript from "@/components/common/BeforeHydrationScript";
import { useMasonryRowSpans, ROW_SPANS_SCRIPT } from "../../_hooks/useMasonryRowSpans";
import PostsSkeletonCards from "./PostsSkeletonCards";
import PostsGridItem from "./PostsGridItem";
import styles from "./PostsGrid.module.css";

export type PostsLayout = "magazine" | "grid" | "list" | "compact" | "masonry" | "timeline" | "featured";

/* 글 목록 그리드 — 레이아웃 변형 클래스(설정 posts.layout · 시리즈 · 타임라인), magazine 의 masonry row-span(useMasonryRowSpans),
   fetch 전 skeleton, 아이템(PostsGridItem). 타임라인의 [연월 인덱스 | 그리드] 2단은 aside 슬롯으로 받는다.
   monthKey/monthLabel 은 useTimeline 의 것 — 인덱스와 같은 함수여야 마커 id 와 점프가 맞는다. */
export default function PostsGrid({
  posts,
  loading,
  perPage,
  activeSeries,
  postsLayout,
  popularIds,
  imgErrors,
  onImgError,
  monthKey,
  monthLabel,
  aside,
}: {
  posts: Post[];
  loading: boolean;
  perPage: number;
  activeSeries: string | null;
  postsLayout: PostsLayout;
  popularIds: Set<string>;
  imgErrors: Set<string>;
  onImgError: (id: string) => void;
  monthKey: (p: Post) => string;
  monthLabel: (p: Post) => string;
  aside?: ReactNode;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  // 타임라인 지그재그 단일컬럼 전환(640px) — 리빌 x 이동 on/off 판단용
  const { isMobile: tlSingleCol } = useIsMobile(640);
  // magazine 만 grid-auto-rows:1px 위 JS row-span(사이즈 변주 packing) 사용, 나머지는 미사용
  const usesRowSpan = postsLayout === "magazine";
  const layoutClass =
    postsLayout === "grid" ? styles.gridUniform
      : postsLayout === "list" ? styles.gridList
        : postsLayout === "compact" ? styles.gridCompact
          : postsLayout === "masonry" ? styles.gridMasonry
            : postsLayout === "timeline" ? styles.gridTimeline
              : postsLayout === "featured" ? styles.gridFeatured
                : ""; // magazine = base .grid
  // Bento masonry row-span — 시리즈 timeline 모드는 flex 레이아웃이라 패스
  const rowSpans = !activeSeries && usesRowSpan;
  useMasonryRowSpans(gridRef, rowSpans, [posts, loading]);
  // magazine 만 사이즈 변주(wide/banner/square/portrait). grid·list·compact 는 균일 카드.
  const variants: CardType[] = posts.map((_, i) =>
    activeSeries || postsLayout !== "magazine" ? "standard" : getCardType(i),
  );

  return (
    <div className={`${styles.gridWrap} ${postsLayout === "timeline" ? styles.gridWrapTimeline : ""}`}>
      {aside}
      <div
        ref={gridRef}
        className={`${styles.grid} ${activeSeries ? styles.gridSeries : layoutClass} ${loading ? styles.gridLoading : ""}`}
        data-row-spans={rowSpans || undefined}
      >
        {posts.length === 0 ? (
          <PostsSkeletonCards
            count={perPage}
            activeSeries={!!activeSeries}
            bento={postsLayout === "magazine"}
            compactLayout={postsLayout === "compact"}
          />
        ) : (
          posts.map((post, idx) => {
            const type: CardType = variants[idx];
            // featured — 첫 카드만 대형 hero. masonry/timeline 은 균일 표준 카드.
            const isFeaturedHero =
              !activeSeries && postsLayout === "featured" && idx === 0;
            // timeline — 월(연-월) 이 이전 카드와 다르면 앞에 날짜 마커 삽입
            const timelineMarker =
              !activeSeries &&
              postsLayout === "timeline" &&
              monthKey(post) !== (idx > 0 ? monthKey(posts[idx - 1]) : "")
                ? monthLabel(post)
                : null;
            // 시리즈 필터링 시 — DB 의 series_order 값이 비연속/중복일 수 있어 sort 후 idx+1 로 1-based 일관 표시
            const stepNumber = activeSeries
              ? String(idx + 1).padStart(2, "0")
              : null;
            // 지그재그 — 인덱스로 좌/우 교차 (마커가 껴도 idx 기준이라 일관)
            const tlSide: "left" | "right" = idx % 2 === 0 ? "left" : "right";
            return (
              <PostsGridItem
                key={post.id}
                post={post}
                type={type}
                postsLayout={postsLayout}
                activeSeries={!!activeSeries}
                isFeaturedHero={isFeaturedHero}
                stepNumber={stepNumber}
                timelineMarker={timelineMarker}
                markerId={`tl-m-${monthKey(post)}`}
                tlSide={tlSide}
                tlSingleCol={tlSingleCol}
                isHot={popularIds.has(post.id)}
                imgError={imgErrors.has(post.id)}
                onImgError={onImgError}
              />
            );
          })
        )}
      </div>
      {/* 미리 그린 HTML 에서 하이드레이션 전까지 줄 수를 넣는다 — 그리드 바로 뒤에 있어야 한다 */}
      {rowSpans && <BeforeHydrationScript code={ROW_SPANS_SCRIPT} />}
    </div>
  );
}
