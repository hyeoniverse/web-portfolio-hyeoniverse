import type { Series } from "@/types/post";
import styles from "./SeriesCard.module.css";

interface SeriesCardProps {
  series: Series;
  onClick: (seriesId: string) => void;
  active?: boolean;
}

/* 카테고리별 책등 컬러 */
const SPINE_COLORS: Record<string, string> = {
  Tech: "var(--color-accent)",
  Design: "#a855f7",
  Life: "#22c55e",
  General: "var(--text-muted)",
};

function getSpineColor(category?: string) {
  return SPINE_COLORS[category ?? ""] ?? "var(--text-muted)";
}

export default function SeriesCard({ series, onClick, active }: SeriesCardProps) {
  const spineColor = getSpineColor(series.category);

  return (
    <button
      className={`${styles.book} ${active ? styles.active : ""}`}
      onClick={() => onClick(series.id)}
      data-clickable="true"
      style={{ "--_spine-color": spineColor } as React.CSSProperties}
    >
      {/* Spine */}
      <div className={styles.spine} />

      {/* Cover */}
      <div className={styles.cover}>
        <span className={styles.title}>{series.title}</span>
        <span className={styles.count}>
          {series.post_count ?? 0}
          <span className={styles.countLabel}> posts</span>
        </span>
      </div>
    </button>
  );
}
