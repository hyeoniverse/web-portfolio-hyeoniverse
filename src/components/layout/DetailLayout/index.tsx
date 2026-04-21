"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
import { motion } from "framer-motion";
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

export interface LikeConfig {
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

  useEffect(() => {
    if (isTransitioning && !heroImage) {
      endTransition();
    }
  }, [isTransitioning, heroImage, endTransition]);

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
      setInfinite(true);
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 12H5M5 12L12 19M5 12L12 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className={styles.backBtnLabel}>{backLabel}</span>
          </button>
        ) : (
          <a
            href={backHref}
            className={`${styles.backBtn} ${backHidden ? styles.backBtnHidden : ""}`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 12H5M5 12L12 19M5 12L12 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
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
          onAnimationStart={() => {
            if (isTransitioning) endTransition();
          }}
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
            className={`${styles.likeBtn} ${likeConfig.liked ? styles.likeBtnActive : ""} ${likeConfig.busy ? styles.likeBtnBusy : ""}`}
            onClick={likeConfig.onToggle}
            disabled={likeConfig.busy}
            title={t("common.like")}
            data-clickable="true"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={likeConfig.liked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
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
            className={`${styles.likeBtn} ${likeConfig.liked ? styles.likeBtnActive : ""} ${likeConfig.busy ? styles.likeBtnBusy : ""}`}
            onClick={likeConfig.onToggle}
            disabled={likeConfig.busy}
            data-clickable="true"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={likeConfig.liked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className={styles.likeCount}>{formatCount(likeConfig.count)}</span>
          </button>
        </motion.div>
      )}

      <ScrollButtons />
    </div>
  );
}
