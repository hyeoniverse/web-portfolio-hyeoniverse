import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";
import layoutStyles from "@/components/layout/DetailLayout/DetailLayout.module.css";
import styles from "./PostDetail.module.css";

export default function PostDetailLoading() {
  return (
    <div className={layoutStyles.page}>
      <div className={layoutStyles.heroSpacer} />
      <div className={layoutStyles.content}>
        <div className={styles.articleHeader}>
          <div className={styles.metaRow}>
            <div className={styles.meta}>
              <SkeletonLine width={80} height={12} />
              <SkeletonLine width={60} height={12} />
              <SkeletonLine width={50} height={12} />
            </div>
          </div>
          <SkeletonLine width="80%" height={40} />
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
          <div style={{ height: "var(--spacing-lg)" }} />
          <Skeleton height={1} />
        </div>

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
  );
}
