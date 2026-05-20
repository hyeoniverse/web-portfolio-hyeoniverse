"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/providers/LanguageProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import T from "@/components/ui/T";
import type { Series } from "@/types/post";
import { generateSeededColor } from "@/utils/seededColor";
import styles from "./SeriesCard.module.css";

const MAX_DECK_LAYERS = 4;
const HOVER_OPEN_MS = 800; // 카드 위에서 머물러야 deck 이 펼쳐지는 시간
// SeriesCard.module.css 의 deck 펼침 폭과 동일 (160px card + 16px gap)
const DECK_LAYER_WIDTH = 176;
// scroll 후 deck 우측에 남길 여유
const SCROLL_EDGE_PADDING = 24;

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
  const { navigateWithTransition } = usePageTransition();
  const [open, setOpen] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  // auto-scroll 이 진행되는 동안 카드가 cursor 밑에서 빠져나가 mouseleave 가 false-positive 로 fire 되어도 무시.
  // 스크롤이 끝난 뒤 :hover 상태를 한번 더 확인해 cursor 가 진짜로 떠났으면 닫음.
  const autoScrollingRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  /**
   * deck 펼침 시 우측이 scroll container 밖이면 자동 스크롤.
   * 핵심: 카드의 margin-right 가 0.5s CSS transition 으로 점차 늘어나면서 container.scrollWidth 도
   * 점차 커진다. 그래서 scrollBy({ behavior: "smooth" }) 한 번 호출은 시작 시점의 작은 maxScrollLeft 에
   * 즉시 clamp 되어 충분한 거리를 못 간다. 대신 rAF 루프로 매 프레임 scrollLeft 를 직접 증가시키면
   * 새로 늘어난 scrollWidth 가 그때그때 반영되어 deck 펼침 진행과 동기화된 스크롤이 가능.
   */
  const scrollDeckIntoView = (deckCount: number) => {
    const card = cardRef.current;
    const container = scrollContainerRef?.current;
    if (!card || !container || deckCount === 0) return;
    const cardRect = card.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const deckEndRight = cardRect.right + deckCount * DECK_LAYER_WIDTH;
    const overflow = deckEndRight - (containerRect.right - SCROLL_EDGE_PADDING);
    if (overflow <= 0) return;

    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);

    autoScrollingRef.current = true;
    const startScroll = container.scrollLeft;
    const startTime = performance.now();
    const DURATION = 520; // CSS margin-right transition (0.5s) 살짝 넘김
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / DURATION);
      // easeOutCubic — 시작 빠르고 끝 부드럽게
      const eased = 1 - Math.pow(1 - t, 3);
      // 매 프레임 scrollLeft 를 직접 set — 이 시점의 scrollWidth 기준으로 brower 가 알아서 clamp.
      // 다음 프레임엔 margin-right 가 더 늘어나 scrollWidth 가 커지므로 scrollLeft 도 더 커질 수 있음
      container.scrollLeft = startScroll + overflow * eased;
      if (t < 1) {
        scrollRafRef.current = requestAnimationFrame(tick);
      } else {
        scrollRafRef.current = null;
        autoScrollingRef.current = false;
        // 스크롤 끝난 시점에 cursor 가 카드(hit-area 포함)에 더 이상 없으면 닫는다.
        // matches(":hover") 는 ::after pseudo 까지 포함한 paint area 의 hover 를 본다.
        if (!card.matches(":hover")) {
          setOpen(false);
        }
      }
    };
    scrollRafRef.current = requestAnimationFrame(tick);
  };

  // 활성(선택된) 시리즈가 부분적으로라도 가려져 있으면 부드럽게 scroll into view
  // mask gradient 영역 (28px) 도 고려해서 visible 판정
  useEffect(() => {
    if (!active) return;
    const card = cardRef.current;
    const container = scrollContainerRef?.current;
    if (!card || !container) return;
    const cardRect = card.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const MASK = 28; // .seriesRow --_mask-l / --_mask-r
    const leftHidden = (containerRect.left + MASK) - cardRect.left;
    const rightHidden = cardRect.right - (containerRect.right - MASK);
    if (leftHidden <= 0 && rightHidden <= 0) return; // 이미 다 보임
    let delta = 0;
    if (leftHidden > 0) delta = -leftHidden;
    else if (rightHidden > 0) delta = rightHidden;
    container.scrollBy({ left: delta, behavior: "smooth" });
  }, [active, scrollContainerRef]);

  const handleEnter = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => {
      setOpen(true);
      // setOpen 은 비동기 — 다음 프레임이 돼야 deckOpen 클래스가 붙고 margin-right transition 이 시작됨.
      // rAF 한 번 기다렸다 스크롤 루프 시작 → 첫 프레임부터 scrollWidth 가 늘기 시작
      requestAnimationFrame(() => scrollDeckIntoView(deckCount));
    }, HOVER_OPEN_MS);
  };
  const handleLeave = () => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    // auto-scroll 진행 중에는 mouseleave 가 카드 이동 때문에 잘못 발화될 수 있으니 무시.
    // 스크롤 종료 시점에 정상적으로 :hover 재확인해 닫을지 결정.
    if (autoScrollingRef.current) return;
    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
    setOpen(false);
  };
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
  const postCount = series.post_count ?? 0;
  const previews = series.previews ?? [];
  const deckCount = Math.min(postCount, MAX_DECK_LAYERS);

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
            </>
          );
          const className = `${styles.deckLayer} ${!previewCover ? styles.deckLayerNoCover : ""}`;
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
    </div>
  );
}
