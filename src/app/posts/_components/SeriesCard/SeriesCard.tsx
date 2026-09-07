"use client";

import { type CSSProperties, type RefObject } from "react";
import MediaThumb from "@/components/ui/MediaThumb";
import { useLanguage } from "@/providers/LanguageProvider";
import { useTheme } from "@/providers/ThemeProvider";
import T from "@/components/ui/T";
import type { Series } from "@/types/post";
import { generateSeededColor } from "@/utils/seededColor";
import { useSeriesDeck } from "./useSeriesDeck";
import SeriesDeckLayers from "./SeriesDeckLayers";
import styles from "./SeriesCard.module.css";

const MAX_DECK_LAYERS = 4;

interface SeriesCardProps {
  series: Series;
  onClick: (seriesId: string) => void;
  active?: boolean;
  index?: number;
  /** 가로 스크롤 컨테이너 — deck 펼침 시 deck 이 viewport 밖이면 자동 스크롤 */
  scrollContainerRef?: RefObject<HTMLElement | null>;
}

/**
 * /posts 시리즈 카드 — 에디토리얼 스타일
 * 이미지 위 라벨: 좌측 시리얼 번호 + 우측 #카테고리 태그
 */
export default function SeriesCard({ series, onClick, active, index = 0, scrollContainerRef }: SeriesCardProps) {
  const { language } = useLanguage();
  const { theme } = useTheme();

  const number = String(index + 1).padStart(2, "0");
  const title = language === "ko" ? series.title : (series.title_en || series.title);
  const tag = series.category || "SERIES";
  // tone "soft" 강제 — 페이지 전체 시리즈 카드들 사이 톤 통일 (hue 만 anchor cycle 로 다양)
  const placeholderBg = generateSeededColor(series.id, theme === "dark", index, "soft");

  const hasCover = !!series.cover_image;
  const thumbs = series.thumbs ?? [];
  const useMosaic = !hasCover && thumbs.length > 0;
  const useAutoCover = !hasCover && thumbs.length === 0 && !!series.auto_cover_url;
  const useTypoCover = !hasCover && thumbs.length === 0 && !series.auto_cover_url;
  const displayCover = hasCover ? series.cover_image : useAutoCover ? series.auto_cover_url! : "";
  const mosaicClass =
    thumbs.length === 1 ? styles.mosaic1
    : thumbs.length === 2 ? styles.mosaic2
    : thumbs.length === 3 ? styles.mosaic3
    : styles.mosaic4;

  // 게시물 수만큼 deck 레이어 — post 1 부터 표시
  const deckCount = Math.min(series.post_count ?? 0, MAX_DECK_LAYERS);
  // deck 펼침(hover 800ms) · 펼침 따라가는 가로 스크롤 · active 카드 scroll into view
  const { open, cardRef, handleEnter, handleLeave } = useSeriesDeck({ deckCount, active, scrollContainerRef });

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      className={`${styles.card} ${active ? styles.active : ""} ${useTypoCover ? styles.typoCover : ""} ${open ? styles.deckOpen : ""}`}
      onClick={(e) => {
        // deck Link 의 onClick 에서 stopPropagation 으로 처리되므로 여기서는 deck 외 영역만 도달.
        // (cover thumb / label / 빈 영역) → series filter
        void e;
        onClick(series.id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(series.id);
        }
      }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      title={title}
      data-clickable="true"
      style={{ "--deck-count": deckCount } as CSSProperties}
    >
      <span className={styles.label}>
        <span className={styles.number}>{number}</span>
        <span className={styles.tag}>#{tag}</span>
      </span>
      <span className={styles.thumbStack}>
        <SeriesDeckLayers series={series} index={index} deckCount={deckCount} tag={tag} open={open} />
      <span
        className={`${styles.thumb} ${useMosaic ? mosaicClass : ""}`}
        style={useTypoCover ? { background: placeholderBg } : undefined}
      >
        {(hasCover || useAutoCover) && (
          <MediaThumb
            src={displayCover}
            fill
            sizes="160px"
            className={styles.image}
          />
        )}
        {useMosaic && thumbs.slice(0, 4).map((src, i) => (
          <span key={i} className={styles.tile}>
            <MediaThumb
              src={src}
              fill
              sizes="80px"
              className={styles.tileImage}
            />
          </span>
        ))}
        {useTypoCover && (
          <span className={styles.typoContent}>
            <span className={styles.typoTitle}>{title}</span>
          </span>
        )}
        {!useTypoCover && (
          <span className={styles.overlay}>
            <span className={styles.title}>{title}</span>
            <span className={styles.meta}>
              {series.post_count ?? 0} <T k="postsPage.postsCount" />
            </span>
          </span>
        )}
      </span>
      </span>
    </div>
  );
}
