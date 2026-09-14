import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";
import layoutStyles from "@/components/layout/DetailLayout/DetailLayout.module.css";
import styles from "@/components/works/WorkArticleHeader.module.css";

export default function WorkDetailLoading() {
  return (
    <div className={layoutStyles.page}>
      {/* 커버는 레이아웃이 셸에서 그려 이 뼈대 위에 이미 있다(#946). 커버가 없으면 이 여백이 머리 자리를 둔다 */}
      <div className={layoutStyles.skeletonNoHeroGap} />
      <div className={layoutStyles.content}>
        {/* Meta: category + year */}
        <div className={styles.meta}>
          <Skeleton width={90} height={28} borderRadius="var(--radius-capsule)" />
          <SkeletonLine width={40} height={14} />
        </div>

        {/* Title */}
        <SkeletonLine width="70%" height={52} />
        <div style={{ height: "var(--spacing-3xl)" }} />

        {/* Description */}
        <SkeletonLine width="100%" height={16} />
        <div style={{ height: "var(--spacing-xs)" }} />
        <SkeletonLine width="90%" height={16} />
        <div style={{ height: "var(--spacing-xs)" }} />
        <SkeletonLine width="65%" height={16} />
        <div style={{ height: "var(--spacing-4xl)" }} />

        {/* Info row: Role + Tech */}
        <div className={styles.infoGrid}>
          <div className={styles.infoBlock}>
            <SkeletonLine width={40} height={10} />
            <SkeletonLine width={120} height={14} />
          </div>
          <div className={styles.infoBlock}>
            <SkeletonLine width={30} height={10} />
            <div style={{ display: "flex", gap: "var(--spacing-xs)" }}>
              <Skeleton width={60} height={24} borderRadius="var(--radius-capsule)" />
              <Skeleton width={70} height={24} borderRadius="var(--radius-capsule)" />
              <Skeleton width={55} height={24} borderRadius="var(--radius-capsule)" />
            </div>
          </div>
        </div>

        {/* Sections */}
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ marginBottom: "var(--spacing-4xl)" }}>
            <SkeletonLine width={140} height={22} />
            <div style={{ height: "var(--spacing-lg)" }} />
            <SkeletonLine width="100%" height={14} />
            <div style={{ height: "var(--spacing-xs)" }} />
            <SkeletonLine width="95%" height={14} />
            <div style={{ height: "var(--spacing-xs)" }} />
            <SkeletonLine width="80%" height={14} />
          </div>
        ))}
      </div>
    </div>
  );
}
