"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
import { motion } from "framer-motion";
import { ArrowLeft, Heart } from "lucide-react";
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
            className={`${styles.likeBtn} ${likeConfig.liked ? styles.likeBtnActive : ""} ${likeConfig.busy ? styles.likeBtnBusy : ""}`}
            onClick={likeConfig.onToggle}
            disabled={likeConfig.busy}
            title={t("common.like")}
            data-clickable="true"
          >
            <Heart size={20} fill={likeConfig.liked ? "currentColor" : "none"} />
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
            <Heart size={20} fill={likeConfig.liked ? "currentColor" : "none"} />
            <span className={styles.likeCount}>{formatCount(likeConfig.count)}</span>
          </button>
        </motion.div>
      )}

      <ScrollButtons />
    </div>
  );
}
