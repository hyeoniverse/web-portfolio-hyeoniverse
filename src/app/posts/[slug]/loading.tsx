import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";
import layoutStyles from "@/components/layout/DetailLayout/DetailLayout.module.css";
import header from "@/components/posts/PostArticleHeader.module.css";

/* DetailLayout 의 커버 아래 구조와 1:1 매칭:
   .page > .headerSection + .contentRow > .content
   커버(hero)는 레이아웃이 셸에서 그려 이 뼈대 위에 이미 있다(#946). image-ful 전환은 image overlay 가 hero 크기로
   morph 후 fade out — 그 fade 중에 이 뼈대가 잠깐 비치는데, 커버가 같은 자리에 있어 위치 점프가 없다.
   image-less 전환은 backdrop 이 끝까지 덮어 뼈대가 안 보인다. 전환 연출 없이 들어올 때를 위해, 커버가 없는 글은
   skeletonNoHeroGap 이 커버 없는 머리 여백을 둔다(커버가 앞에 있으면 CSS 가 접는다). */
export default function PostDetailLoading() {
  return (
    <div className={layoutStyles.page}>
      <div className={layoutStyles.skeletonNoHeroGap} />
      <div className={layoutStyles.headerSection}>
        <div className={header.articleHeader}>
          <div className={header.metaRow}>
            <div className={header.meta}>
              <SkeletonLine width={80} height={12} />
              <SkeletonLine width={60} height={12} />
              <SkeletonLine width={50} height={12} />
            </div>
          </div>
          <SkeletonLine width="80%" height={48} />
          <div style={{ height: "var(--spacing-md)" }} />
          <SkeletonLine width="100%" height={18} />
          <div style={{ height: "var(--spacing-xs)" }} />
          <SkeletonLine width="60%" height={18} />
          <div style={{ height: "var(--spacing-md)" }} />
          <div style={{ display: "flex", gap: "var(--spacing-xs)" }}>
            <Skeleton width={60} height={24} borderRadius="var(--radius-capsule)" />
            <Skeleton width={80} height={24} borderRadius="var(--radius-capsule)" />
            <Skeleton width={50} height={24} borderRadius="var(--radius-capsule)" />
          </div>
          <div className={header.headerDivider} />
        </div>
      </div>

      <div className={layoutStyles.contentRow}>
        <div className={layoutStyles.content}>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "var(--spacing-md)" }}>
            <SkeletonLine width="100%" height={14} />
            <SkeletonLine width="95%" height={14} />
            <SkeletonLine width="88%" height={14} />
            <SkeletonLine width="100%" height={14} />
            <SkeletonLine width="70%" height={14} />
            <div style={{ height: "var(--spacing-lg)" }} />
            <SkeletonLine width="40%" height={24} />
            <SkeletonLine width="100%" height={14} />
            <SkeletonLine width="92%" height={14} />
            <SkeletonLine width="85%" height={14} />
          </div>
        </div>
      </div>
    </div>
  );
}
