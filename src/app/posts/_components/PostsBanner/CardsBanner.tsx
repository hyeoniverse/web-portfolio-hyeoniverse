"use client";

import ProgressiveImage from "@/components/ui/ProgressiveImage";
import { motion } from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import { formatPostTitle, getPostExcerpt } from "@/utils/post";
import CategoryLabel from "@/components/ui/CategoryLabel";
import { PlaceholderIcon } from "./PlaceholderIcon";
import { useAutoSlide } from "./useAutoSlide";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import type { Post } from "@/types/post";
import styles from "./PostsBanner.module.css";

interface CardsBannerProps {
  posts: Post[];
  imgErrors: Set<string>;
  onImgError: (id: string) => void;
}

export default function CardsBanner({ posts, imgErrors, onImgError }: CardsBannerProps) {
  const { language } = useLanguage();
  const { navigateWithTransition } = usePageTransition();
  const { index, go, prev, next, pause, resume, isPaused, togglePause } = useAutoSlide(posts.length, 4000);

  const getOffset = (i: number) => {
    const diff = i - index;
    const len = posts.length;
    if (diff === 0) return 0;
    if (diff === 1 || diff === -(len - 1)) return 1;
    if (diff === -1 || diff === len - 1) return -1;
    return diff > 0 ? 2 : -2;
  };

  return (
    <div className={styles.cards} onMouseEnter={pause} onMouseLeave={resume} data-cursor="stop">
      <div className={styles.cardsTrack}>
        {posts.map((post, i) => {
          const offset = getOffset(i);
          const isCenter = offset === 0;
          const isVisible = Math.abs(offset) <= 1;
          const title = formatPostTitle(post, language);
          const excerpt = getPostExcerpt(post, language);

          return (
            <motion.div
              key={post.id}
              className={`${styles.card} ${isCenter ? styles.cardCenter : ""}`}
              initial={false}
              animate={{
                x: `${offset * 85}%`,
                scale: isCenter ? 1 : 0.85,
                opacity: isVisible ? 1 : 0,
                zIndex: isCenter ? 2 : 1,
              }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              onClick={() => !isCenter && go(i)}
              style={{ cursor: isCenter ? "default" : "pointer" }}
            >
              <div
                className={styles.cardLink}
                style={{ cursor: isCenter ? "pointer" : "default" }}
                onClick={(e) => {
                  if (!isCenter) return;
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  navigateWithTransition(`/posts/${post.slug}`, post.cover_image || "", rect);
                }}
              >
                {post.cover_image && !imgErrors.has(post.id) ? (
                  <ProgressiveImage
                    src={post.cover_image}
                    alt={title}
                    fill
                    sizes="(max-width: 768px) 90vw, 60vw"
                    className={styles.cardImg}
                    loading="lazy"
                    onError={() => onImgError(post.id)}
                  />
                ) : (
                  <div className={styles.cardFallback}><PlaceholderIcon /></div>
                )}
                <div className={styles.cardOverlay} />
                <div className={styles.cardContent}>
                  {post.category && <span className={styles.cardCategory}><CategoryLabel category={post.category} /></span>}
                  <h2 className={styles.cardTitle}>{title}</h2>
                  {isCenter && excerpt && <p className={styles.cardExcerpt}>{excerpt}</p>}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className={styles.splitControls}>
        <button className={styles.splitArrowBtn} onClick={prev} aria-label="Previous slide">
          <ChevronLeft size={14} />
        </button>
        <div className={styles.splitDots}>
          {posts.map((p, i) => (
            <button
              key={p.id}
              className={`${styles.splitDot} ${i === index ? styles.splitDotActive : ""}`}
              onClick={() => go(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
        <button className={styles.splitArrowBtn} onClick={next} aria-label="Next slide">
          <ChevronRight size={14} />
        </button>
        <button className={styles.splitPlayBtn} onClick={togglePause} aria-label={isPaused ? "Play" : "Pause"}>
          {isPaused ? (
            <Play size={12} fill="currentColor" />
          ) : (
            <Pause size={12} fill="currentColor" />
          )}
        </button>
      </div>
    </div>
  );
}
