import Image from "next/image";
import T from "@/components/ui/T";
import type { Series } from "@/types/post";
import styles from "./SeriesCard.module.css";

interface SeriesCardProps {
  series: Series;
  onClick: (seriesId: string) => void;
  active?: boolean;
}

export default function SeriesCard({ series, onClick, active }: SeriesCardProps) {
  return (
    <button
      className={`${styles.book} ${active ? styles.active : ""}`}
      onClick={() => onClick(series.id)}
      data-clickable="true"
    >
      <div className={styles.inner}>
        {/* Spine */}
        <div className={styles.spine} />

        {/* Bookmark ribbon */}
        <div className={styles.ribbon} />

        {/* Cover Image */}
        {series.cover_image && (
          <Image
            src={series.cover_image}
            alt=""
            fill
            sizes="120px"
            className={styles.coverImage}
            unoptimized
          />
        )}

        {/* Cover */}
        <div className={styles.cover}>
          <span className={styles.title}>{series.title}</span>
          <span className={styles.count}>
            {series.post_count ?? 0}
            <span className={styles.countLabel}> posts</span>
          </span>
          {active && <span className={styles.deselectHint}><T k="posts.deselectSeries" /></span>}
        </div>
      </div>
    </button>
  );
}
