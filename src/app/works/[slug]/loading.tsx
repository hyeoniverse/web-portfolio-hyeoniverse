import { SkeletonLine } from "@/components/ui/Skeleton";
import styles from "@/components/works/landing/kit/LandingKit.module.css";

/** 작업물 상세(랜딩)를 받는 동안 — 랜딩 머리(머리 한 줄 · 큰 제목 · 역할 · 기간)와 같은 자리에 뼈대 */
export default function WorkDetailLoading() {
  return (
    <div className={styles.landing}>
      <div className={styles.hero}>
        <SkeletonLine width={320} height={16} />
        <SkeletonLine width="min(720px, 80%)" height={96} />
        <div className={styles.meta}>
          <SkeletonLine width={120} height={14} />
          <SkeletonLine width={120} height={14} />
          <SkeletonLine width={120} height={14} />
        </div>
      </div>
    </div>
  );
}
