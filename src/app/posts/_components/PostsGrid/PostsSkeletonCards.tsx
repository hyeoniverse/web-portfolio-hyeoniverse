import { type CardType, getCardType } from "@/data/postsBentoTemplates";
import { SkeletonLine, SkeletonPill, SkeletonBlock } from "@/components/ui/Skeleton";
// 그리드 아이템 래퍼 클래스(gridItem · gridWide · seriesStep*)는 PostsGrid 의 것 — 실제 아이템과 같은 자리를 차지해야 해서
import grid from "./PostsGrid.module.css";
import styles from "./PostsSkeletonCards.module.css";

/* ── Skeleton ──
 * bento 카드와 동일한 variants (banner/wide/portrait/square/standard) 를 적용해
 * fetch 전후 레이아웃 height 가 같아지도록 한다. count = perPage. */
export default function PostsSkeletonCards({
  count,
  activeSeries,
  bento = true,
  compactLayout = false,
}: {
  count: number;
  activeSeries: boolean;
  bento?: boolean;
  compactLayout?: boolean;
}) {
  // compact 레이아웃 — 이미지 없이 텍스트 행 skeleton
  if (compactLayout) {
    return (
      <>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={grid.gridItem}>
            <div className={styles.skeletonCompactRow}>
              <SkeletonLine width="42%" height={18} />
              <SkeletonPill width={110} height={14} />
            </div>
          </div>
        ))}
      </>
    );
  }
  const variants: CardType[] = Array.from({ length: count }, (_, i) =>
    activeSeries || !bento ? "standard" : getCardType(i),
  );
  return (
    <>
      {variants.map((type, i) => {
        const cls =
          !activeSeries && (type === "wide" || type === "banner")
            ? grid.gridWide
            : "";
        const aspectClass =
          type === "banner"
            ? styles.skeletonAspectBanner
            : type === "square"
              ? styles.skeletonAspectSquare
              : type === "portrait"
                ? styles.skeletonAspectPortrait
                : styles.skeletonAspectDefault;
        return (
          <div
            key={i}
            className={`${grid.gridItem} ${cls} ${activeSeries ? grid.seriesStep : ""}`}
          >
            <div
              className={`${styles.skeletonCard} ${activeSeries ? grid.seriesStepBody : ""}`}
            >
              <SkeletonBlock
                className={`${styles.skeletonImage} ${aspectClass}`}
              />
              <div className={styles.skeletonCardBody}>
                {/* badge row */}
                <SkeletonPill width={60} height={20} />
                {/* title — 2 lines */}
                <SkeletonLine width="92%" height={26} />
                <SkeletonLine width="64%" height={26} />
                {/* excerpt — 2 lines */}
                <SkeletonLine width="100%" height={14} />
                <SkeletonLine width="84%" height={14} />
                {/* tags row */}
                <div className={styles.skeletonTagsRow}>
                  <SkeletonPill width={50} height={20} />
                  <SkeletonPill width={66} height={20} />
                  <SkeletonPill width={44} height={20} />
                </div>
                {/* meta row */}
                <SkeletonLine width="80%" height={14} />
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
