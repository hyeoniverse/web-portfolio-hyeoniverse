"use client";

import { useState, useEffect, useRef, useId, type ReactNode } from "react";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useLenis } from "@/providers/LenisProvider";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import TOC from "@/components/ui/TOC/TOC";
import { useLanguage } from "@/providers/LanguageProvider";
import ScrollButtons from "@/components/ui/ScrollButtons/ScrollButtons";
import styles from "./DetailLayout.module.css";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

interface LikeConfig {
  count: number;
  liked: boolean;
  busy?: boolean;
  onToggle: () => void;
}

interface DetailLayoutProps {
  backHref?: string;
  backLabel: string;
  onBack?: () => void;
  heroImage?: string;
  heroAlt?: string;
  onHeroError?: () => void;
  heroFallback?: ReactNode;
  headings?: TocHeading[];
  likeConfig?: LikeConfig;
  /** Where to render the like button: "content" (after children, default) or "bottom" (after afterContent) */
  likePosition?: "content" | "bottom";
  contentClassName?: string;
  /** Full-width header slot (title, meta) rendered above content+TOC row */
  header?: ReactNode;
  children: ReactNode;
  afterContent?: ReactNode;
}

export default function DetailLayout({
  backHref,
  backLabel,
  onBack,
  heroImage,
  heroAlt = "",
  onHeroError,
  heroFallback,
  headings = [],
  likeConfig,
  likePosition = "content",
  contentClassName,
  header,
  children,
  afterContent,
}: DetailLayoutProps) {
  const { t } = useLanguage();
  const { setInfinite, lenis, stop, start } = useLenis();
  const { endTransition, isTransitioning } = usePageTransition();
  const pageRef = useRef<HTMLDivElement>(null);
  const heartClipId = useId();

  /* 좋아요 wave 애니메이션 최소 시간 보장 — DB 응답이 빨라도 animation 이 끝까지 재생되도록 busy state 를 wrap */
  const [animBusy, setAnimBusy] = useState(false);
  const busyStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (likeConfig?.busy) {
      // 매 toggle 시작마다 startRef 갱신 — 빠른 연속 toggle 시에도 마지막 toggle 기준 minDuration 보장
      busyStartRef.current = Date.now();
      setAnimBusy(true);
      return;
    }
    if (busyStartRef.current === null) return;
    const elapsed = Date.now() - busyStartRef.current;
    const minDuration = 2000; // heartFillX (1.8s) + delay (0.2s)
    const remaining = Math.max(0, minDuration - elapsed);
    const id = setTimeout(() => {
      setAnimBusy(false);
      busyStartRef.current = null;
    }, remaining);
    return () => clearTimeout(id);
  }, [likeConfig?.busy]);

  // 새 페이지가 마운트되면 오버레이 morph 블록을 fade out.
  // 80ms 대기 — real hero/heroSpacer 가 페인트된 다음 morph 블록이 사라지게 (paint 직전에 닫으면 깜빡임).
  useEffect(() => {
    if (!isTransitioning) return;
    const t = setTimeout(() => endTransition(), 80);
    return () => clearTimeout(t);
  }, [isTransitioning, endTransition]);

  // Lenis setup
  useEffect(() => {
    stop();
    setInfinite(false);
    window.scrollTo(0, 0);

    const timer = setTimeout(() => {
      if (lenis) lenis.scrollTo(0, { immediate: true });
      start();
    }, 50);

    return () => {
      clearTimeout(timer);
    };
  }, [setInfinite, lenis, stop, start]);

  // Back button hide on scroll down
  const [backHidden, setBackHidden] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY;
    let rafId: number;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const y = window.scrollY;
        setBackHidden(y > 100 && y > lastY);
        lastY = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);


  return (
    <div ref={pageRef} className={styles.page}>
      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className={`${styles.backBtn} ${backHidden ? styles.backBtnHidden : ""}`}
          >
            <ArrowLeft size={24} />
            <span className={styles.backBtnLabel}>{backLabel}</span>
          </button>
        ) : (
          <a
            href={backHref}
            className={`${styles.backBtn} ${backHidden ? styles.backBtnHidden : ""}`}
          >
            <ArrowLeft size={24} />
            <span className={styles.backBtnLabel}>{backLabel}</span>
          </a>
        )}
      </motion.div>

      {/* Hero */}
      {heroImage ? (
        <motion.div
          className={styles.hero}
          initial={{ opacity: isTransitioning ? 1 : 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <ProgressiveImage
            src={heroImage}
            alt={heroAlt}
            fill
            sizes="100vw"
            priority
            className={styles.heroCover}
            onError={onHeroError}
          />
          <div className={styles.heroOverlay} />
        </motion.div>
      ) : heroFallback ? (
        heroFallback
      ) : (
        <div className={styles.heroSpacer} />
      )}

      {/* Header — full width */}
      {header && (
        <div className={`${styles.headerSection} ${!heroImage ? styles.contentNoHero : ""}`}>
          {header}
        </div>
      )}

      {/* Content + TOC row */}
      <div className={`${styles.contentRow} ${!heroImage && !header ? styles.contentNoHero : ""}`}>
        <div className={`${styles.content}${contentClassName ? ` ${contentClassName}` : ""}`}>
          {children}
        </div>

        {/* TOC — sticky sidebar */}
        {headings.length > 0 && (
          <aside className={styles.tocSidebar}>
            <TOC items={headings} title="Contents" position="right" />
          </aside>
        )}
      </div>

      {/* Like button (content position — full width) */}
      {likeConfig && likePosition === "content" && (
        <motion.div
          className={styles.likeWrapper}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <button
            type="button"
            className={`${styles.likeBtn} ${likeConfig.liked ? styles.likeBtnActive : ""} ${animBusy ? styles.likeBtnBusy : ""}`}
            onClick={likeConfig.onToggle}
            title={t("common.like")}
            data-clickable="true"
          >
            <svg
              className={styles.heartIcon}
              viewBox="0 0 24 24"
              width="20"
              height="20"
              aria-hidden="true"
            >
              <defs>
                <clipPath id={heartClipId}>
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </clipPath>
              </defs>
              {/* Heart outline — stroke only, fill 은 wave 가 담당 */}
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Wave fill — Heart 모양 clip 안에서 3 layer path 의 d 자체를 CSS keyframes 로 변화.
                  cubic bezier 곡선이라 부드러운 wave. rise + swell 동시 진행, 끝나면 fully filled */}
              <g clipPath={`url(#${heartClipId})`}>
                <path className={styles.heartWaveBack} d="M-2 28 C 6 28 18 28 30 28 L 30 28 L -2 28 Z" />
                <path className={styles.heartWaveMid} d="M-2 28 C 6 28 18 28 30 28 L 30 28 L -2 28 Z" />
                <path className={styles.heartWaveFront} d="M-2 28 C 6 28 18 28 30 28 L 30 28 L -2 28 Z" />
              </g>
            </svg>
            <span className={styles.likeCount}>{formatCount(likeConfig.count)}</span>
          </button>
        </motion.div>
      )}

      {/* After content (gallery, adjacent nav, comments, etc.) */}
      {afterContent && (
        <div className={styles.afterContent}>{afterContent}</div>
      )}

      {/* Like button (bottom position) */}
      {likeConfig && likePosition === "bottom" && (
        <motion.div
          className={styles.likeWrapper}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <button
            type="button"
            className={`${styles.likeBtn} ${likeConfig.liked ? styles.likeBtnActive : ""} ${animBusy ? styles.likeBtnBusy : ""}`}
            onClick={likeConfig.onToggle}
            data-clickable="true"
          >
            <svg
              className={styles.heartIcon}
              viewBox="0 0 24 24"
              width="20"
              height="20"
              aria-hidden="true"
            >
              <defs>
                <clipPath id={heartClipId}>
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </clipPath>
              </defs>
              {/* Heart outline — stroke only, fill 은 wave 가 담당 */}
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Wave fill — Heart 모양 clip 안에서 3 layer path 의 d 자체를 CSS keyframes 로 변화.
                  cubic bezier 곡선이라 부드러운 wave. rise + swell 동시 진행, 끝나면 fully filled */}
              <g clipPath={`url(#${heartClipId})`}>
                <path className={styles.heartWaveBack} d="M-2 28 C 6 28 18 28 30 28 L 30 28 L -2 28 Z" />
                <path className={styles.heartWaveMid} d="M-2 28 C 6 28 18 28 30 28 L 30 28 L -2 28 Z" />
                <path className={styles.heartWaveFront} d="M-2 28 C 6 28 18 28 30 28 L 30 28 L -2 28 Z" />
              </g>
            </svg>
            <span className={styles.likeCount}>{formatCount(likeConfig.count)}</span>
          </button>
        </motion.div>
      )}

      <ScrollButtons />
    </div>
  );
}
