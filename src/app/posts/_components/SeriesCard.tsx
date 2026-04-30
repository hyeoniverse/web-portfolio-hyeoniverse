"use client";

import { useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { useLanguage } from "@/providers/LanguageProvider";
import { useTheme } from "@/providers/ThemeProvider";
import T from "@/components/ui/T";
import type { Series } from "@/types/post";
import { generateSeededColor } from "@/utils/seededColor";
import styles from "./SeriesCard.module.css";

const MAX_DECK_LAYERS = 4;
const HOVER_OPEN_MS = 800; // 카드 위에서 머물러야 deck 이 펼쳐지는 시간

interface SeriesCardProps {
  series: Series;
  onClick: (seriesId: string) => void;
  active?: boolean;
  index?: number;
}

/**
 * /posts 시리즈 카드 — 에디토리얼 스타일
 * 이미지 위 라벨: 좌측 시리얼 번호 + 우측 #카테고리 태그
 */
export default function SeriesCard({ series, onClick, active, index = 0 }: SeriesCardProps) {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => setOpen(true), HOVER_OPEN_MS);
  };
  const handleLeave = () => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    setOpen(false);
  };
  const number = String(index + 1).padStart(2, "0");
  const title = language === "ko" ? series.title : (series.title_en || series.title);
  const tag = series.category || "SERIES";
  const placeholderBg = generateSeededColor(series.id, theme === "dark", index);

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
  const postCount = series.post_count ?? 0;
  const previews = series.previews ?? [];
  const deckCount = Math.min(postCount, MAX_DECK_LAYERS);

  return (
    <button
      className={`${styles.card} ${active ? styles.active : ""} ${useTypoCover ? styles.typoCover : ""} ${open ? styles.deckOpen : ""}`}
      onClick={() => onClick(series.id)}
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
        {Array.from({ length: deckCount }).map((_, idx) => {
          // 깊은 layer 부터 렌더 (DOM-first = 가장 뒤, DOM-last = main 바로 뒤).
          // postIndex 0 = post 1(가장 가까이/마지막 렌더), postIndex deckCount-1 = post N(가장 깊이/먼저 렌더)
          const postIndex = deckCount - 1 - idx;
          const deckI = deckCount - idx; // deckCount → 1 (가장 깊은 → 가장 가까운)
          const preview = previews[postIndex];
          const previewTitle = preview ? (language === "ko" ? preview.title : (preview.title_en || preview.title)) : `Post ${postIndex + 1}`;
          const previewCover = preview?.cover_image;
          // cover 없는 layer 는 seeded color bg — 단색 회색 방지
          const layerBg = !previewCover
            ? generateSeededColor(preview?.id ?? `${series.id}:${postIndex}`, theme === "dark", index + postIndex + 1)
            : undefined;
          return (
            <span
              key={postIndex}
              className={`${styles.deckLayer} ${!previewCover ? styles.deckLayerNoCover : ""}`}
              style={{
                "--deck-i": deckI,
                ...(layerBg ? { "--_layer-bg": layerBg } : {}),
              } as CSSProperties}
              aria-hidden="true"
            >
              <span className={styles.deckLayerLabel}>
                <span className={styles.deckLayerNumber}>
                  {String(postIndex + 1).padStart(2, "0")}
                </span>
                <span className={styles.deckLayerTag}>#{tag}</span>
              </span>
              <span className={styles.deckLayerMedia}>
                {previewCover && (
                  <Image
                    src={previewCover}
                    alt=""
                    fill
                    sizes="160px"
                    className={styles.deckLayerImage}
                    unoptimized
                  />
                )}
              </span>
              <span className={styles.deckLayerInfo}>
                <span className={styles.deckLayerTitle}>{previewTitle}</span>
              </span>
            </span>
          );
        })}
      <span
        className={`${styles.thumb} ${useMosaic ? mosaicClass : ""}`}
        style={useTypoCover ? { background: placeholderBg } : undefined}
      >
        {(hasCover || useAutoCover) && (
          <Image
            src={displayCover}
            alt=""
            fill
            sizes="160px"
            className={styles.image}
            unoptimized
          />
        )}
        {useMosaic && thumbs.slice(0, 4).map((src, i) => (
          <span key={i} className={styles.tile}>
            <Image
              src={src}
              alt=""
              fill
              sizes="80px"
              className={styles.tileImage}
              unoptimized
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
    </button>
  );
}
