"use client";

import Link from "next/link";
import MediaThumb from "@/components/ui/MediaThumb";
import { useLanguage } from "@/providers/LanguageProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import { generateSeededColor } from "@/utils/seededColor";
import type { Series } from "@/types/post";
import type { CSSProperties } from "react";
import styles from "./SeriesDeckLayers.module.css";

/* 시리즈 카드 뒤에 겹쳐 둔 글 레이어 — hover 로 펼쳐지면(open) stagger 로 좌→우로 나온다.
   펼침 상태는 부모(useSeriesDeck)가 들고 open 으로 내려준다. 원래는 `.card.deckOpen .deckLayer` 처럼
   카드 클래스에서 내려가는 후손 선택자였는데 모듈이 갈려 쓸 수 없어 레이어에 클래스를 붙이는 방식으로 바꿨다. */
export default function SeriesDeckLayers({
  series,
  index,
  deckCount,
  tag,
  open,
}: {
  series: Series;
  index: number;
  deckCount: number;
  tag: string;
  open: boolean;
}) {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const { navigateWithTransition } = usePageTransition();
  const previews = series.previews ?? [];

  return (
    <>
      {Array.from({ length: deckCount }).map((_, idx) => {
        // 깊은 layer 부터 렌더 (DOM-first = 가장 뒤, DOM-last = main 바로 뒤).
        // postIndex 0 = post 1(가장 가까이/마지막 렌더), postIndex deckCount-1 = post N(가장 깊이/먼저 렌더)
        const postIndex = deckCount - 1 - idx;
        const deckI = deckCount - idx; // deckCount → 1 (가장 깊은 → 가장 가까운)
        const preview = previews[postIndex];
        const previewTitle = preview ? (language === "ko" ? preview.title : (preview.title_en || preview.title)) : `Post ${postIndex + 1}`;
        const previewCover = preview?.cover_image;
        // cover 없는 layer 는 seeded color bg. tone "soft" 통일.
        // anchor 12개 중 postIndex × 3 step 으로 멀리 분산 → 같은 시리즈 안 layer 들이 빨강/파랑/보라 처럼 spectrum 전체 cover
        // (index 더해 시리즈마다 starting anchor 도 다름)
        const layerAnchorIdx = postIndex * 3 + index;
        const layerBg = !previewCover
          ? generateSeededColor(preview?.id ?? `${series.id}:${postIndex}`, theme === "dark", layerAnchorIdx, "soft")
          : undefined;
        const layerContent = (
          <>
            <span className={`${styles.deckLayerLabel} ${open ? styles.deckLayerLabelOpen : ""}`}>
              <span className={styles.deckLayerNumber}>
                {String(postIndex + 1).padStart(2, "0")}
              </span>
              <span className={styles.deckLayerTag}>#{tag}</span>
            </span>
            <span className={styles.deckLayerMedia}>
              {previewCover && (
                <MediaThumb
                  src={previewCover}
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
          </>
        );
        const className = [
          styles.deckLayer,
          !previewCover ? styles.deckLayerNoCover : "",
          open ? styles.deckLayerOpen : "",
          open && !previewCover ? styles.deckLayerNoCoverOpen : "",
        ].filter(Boolean).join(" ");
        const layerStyle = {
          "--deck-i": deckI,
          ...(layerBg ? { "--_layer-bg": layerBg } : {}),
        } as CSSProperties;
        // preview + slug 있으면 Link 로 — onClick 에서 navigateWithTransition 으로 가로채서
        // cover 이미지(있으면) 또는 layerBg 색을 morph 시드로 전달. preventDefault 로 native nav 차단.
        if (preview?.slug) {
          const slug = preview.slug;
          return (
            <Link
              key={postIndex}
              href={`/posts/${slug}`}
              className={className}
              style={layerStyle}
              data-deck-layer="true"
              data-deck-slug={slug}
              data-clickable="true"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                navigateWithTransition(`/posts/${slug}`, previewCover || "", rect, layerBg || "");
              }}
            >
              {layerContent}
            </Link>
          );
        }
        return (
          <span
            key={postIndex}
            className={className}
            style={layerStyle}
            data-deck-layer="true"
          >
            {layerContent}
          </span>
        );
      })}
    </>
  );
}
