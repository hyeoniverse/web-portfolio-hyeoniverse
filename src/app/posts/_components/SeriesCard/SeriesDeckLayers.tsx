"use client";

import MediaThumb from "@/components/ui/MediaThumb";
import { useLanguage } from "@/providers/LanguageProvider";
import { useTheme } from "@/providers/ThemeProvider";
import TransitionLink from "@/components/ui/TransitionLink";
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
        /* preview + slug 있으면 링크로 — 그냥 누르면 cover 이미지(있으면) 또는 layerBg 색을 morph 시드로 넘기는 연출로 가고,
           ⌘·가운데 클릭은 브라우저가 새 탭으로 연다(TransitionLink, #933). 카드(role="button")가 한 번 더 받지 않게 멈춘다.

           단 덱이 닫혀 있을 때는 링크로 만들지 않는다. 닫힌 뒷장은 화면에 3px 만 보여서
           누를 수 없는 크기인데, 링크라서 키보드 초점은 받고 카드(role="button") 안의
           중첩 조작 요소로도 잡혔다. 닫힌 동안은 장식이므로 span 으로 둔다. */
        if (open && preview?.slug) {
          const slug = preview.slug;
          return (
            <TransitionLink
              key={postIndex}
              href={`/posts/${slug}`}
              prefetch="auto"
              image={previewCover || ""}
              color={layerBg || ""}
              className={className}
              style={layerStyle}
              data-deck-layer="true"
              data-deck-slug={slug}
              data-clickable="true"
              onClick={(e) => e.stopPropagation()}
            >
              {layerContent}
            </TransitionLink>
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
