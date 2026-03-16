"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useLenis } from "@/providers/LenisProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import ScrollButtons from "@/components/ui/ScrollButtons/ScrollButtons";
import styles from "./DetailLayout.module.css";

export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

export interface LikeConfig {
  count: number;
  liked: boolean;
  onToggle: () => void;
}

interface DetailLayoutProps {
  backHref: string;
  backLabel: string;
  heroImage?: string;
  heroAlt?: string;
  onHeroError?: () => void;
  heroFallback?: ReactNode;
  headings?: TocHeading[];
  likeConfig?: LikeConfig;
  /** Where to render the like button: "content" (after children, default) or "bottom" (after afterContent) */
  likePosition?: "content" | "bottom";
  children: ReactNode;
  afterContent?: ReactNode;
}

export default function DetailLayout({
  backHref,
  backLabel,
  heroImage,
  heroAlt = "",
  onHeroError,
  heroFallback,
  headings = [],
  likeConfig,
  likePosition = "content",
  children,
  afterContent,
}: DetailLayoutProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const { setInfinite, lenis, stop, start } = useLenis();
  const [activeHeadingId, setActiveHeadingId] = useState("");
  const pageRef = useRef<HTMLDivElement>(null);

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

  // Scroll spy
  useEffect(() => {
    if (headings.length === 0) return;

    let rafId: number;
    const OFFSET = 120;

    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        let current = "";
        for (const { id } of headings) {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top <= OFFSET) {
            current = id;
          }
        }
        if (current) setActiveHeadingId(current);
      });
    };

    const timer = setTimeout(() => {
      handleScroll();
      window.addEventListener("scroll", handleScroll, { passive: true });
    }, 500);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [headings]);

  const handleTocClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      const el = document.getElementById(id);
      if (!el) return;
      if (lenis) {
        lenis.scrollTo(el, { offset: -100 });
      } else {
        el.scrollIntoView({ behavior: "smooth" });
      }
    },
    [lenis],
  );

  return (
    <div ref={pageRef} className={styles.page}>
      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <a
          href={backHref}
          className={`${styles.backBtn} ${backHidden ? styles.backBtnHidden : ""}`}
          onClick={(e) => {
            const ref = document.referrer;
            try {
              const refUrl = ref ? new URL(ref) : null;
              if (
                refUrl &&
                refUrl.origin === window.location.origin &&
                !refUrl.pathname.startsWith("/admin")
              ) {
                e.preventDefault();
                router.back();
                return;
              }
            } catch {
              /* invalid referrer — fall through */
            }
            e.preventDefault();
            router.push(backHref);
          }}
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
      </motion.div>

      {/* Hero */}
      {heroImage ? (
        <motion.div
          className={styles.hero}
          initial={{ opacity: 0 }}
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

      {/* TOC */}
      {headings.length > 0 && (
        <nav className={styles.toc}>
          <p className={styles.tocTitle}>Contents</p>
          <ul className={styles.tocList}>
            {headings.map(({ id, text, level }, idx) => (
              <li key={`${id}-${idx}`}>
                <a
                  href={`#${id}`}
                  className={`${styles.tocLink} ${styles[`tocLevel${level}` as keyof typeof styles] ?? ""} ${activeHeadingId === id ? styles.tocActive : ""}`}
                  onClick={(e) => handleTocClick(e, id)}
                >
                  {text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Content */}
      <div className={styles.content}>
        {children}

        {/* Like button (content position) */}
        {likeConfig && likePosition === "content" && (
          <motion.div
            className={styles.likeWrapper}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <button
              type="button"
              className={`${styles.likeBtn} ${likeConfig.liked ? styles.likeBtnActive : ""}`}
              onClick={likeConfig.onToggle}
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
              <span>{likeConfig.count}</span>
            </button>
          </motion.div>
        )}
      </div>

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
            className={`${styles.likeBtn} ${likeConfig.liked ? styles.likeBtnActive : ""}`}
            onClick={likeConfig.onToggle}
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
            <span>{likeConfig.count}</span>
          </button>
        </motion.div>
      )}

      <ScrollButtons />
    </div>
  );
}
