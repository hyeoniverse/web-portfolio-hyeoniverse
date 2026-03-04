import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";
import styles from "./Posts.module.css";

export default function PostsLoading() {
  return (
    <div className={styles.page}>
      {/* Header skeleton */}
      <div className={styles.header}>
        <SkeletonLine width={180} height={48} />
        <SkeletonLine width={320} height={16} />
      </div>

      {/* Banner skeleton */}
      <div className={styles.bannerSlider}>
        <Skeleton width="100%" height={280} borderRadius="var(--radius-lg)" />
      </div>

      {/* Category nav skeleton */}
      <div style={{ maxWidth: 1100, margin: "0 auto var(--spacing-lg)", display: "flex", gap: "var(--spacing-xs)" }}>
        {[70, 90, 80, 100, 75, 80, 70].map((w, i) => (
          <Skeleton key={i} width={w} height={36} borderRadius="var(--radius-capsule)" />
        ))}
      </div>

      {/* Toolbar skeleton */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarTop}>
          <Skeleton width={300} height={40} borderRadius="var(--radius-capsule)" />
          <div style={{ display: "flex", gap: "var(--spacing-2xs)" }}>
            <Skeleton width={60} height={32} borderRadius="var(--radius-capsule)" />
            <Skeleton width={60} height={32} borderRadius="var(--radius-capsule)" />
            <Skeleton width={60} height={32} borderRadius="var(--radius-capsule)" />
          </div>
        </div>
      </div>

      {/* Grid skeleton */}
      <div className={styles.grid}>
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className={styles.skeletonCard}>
            <Skeleton height={0} borderRadius="0" />
            <div className={styles.skeletonCardBody}>
              <SkeletonLine width={60} height={14} />
              <SkeletonLine width="90%" height={20} />
              <SkeletonLine width="100%" />
              <SkeletonLine width="40%" height={12} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
