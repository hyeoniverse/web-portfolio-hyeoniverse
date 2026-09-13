"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
import { motion } from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import TransitionLink from "@/components/ui/TransitionLink";
import { formatPostTitle, getPostExcerpt } from "@/utils/post";
import CategoryLabel from "@/components/ui/CategoryLabel";
import { seededGradient } from "@/components/posts/CoverImagePicker/seededGradient";
import { useAutoSlide } from "./useAutoSlide";
import { ChevronLeft, ChevronRight, Play, Pause } from "@/components/icons";
import type { Post } from "@/types/post";
import styles from "./PostsBanner.module.css";
import Pressable from "@/components/ui/Pressable";

interface CardsBannerProps {
  posts: Post[];
  imgErrors: Set<string>;
  onImgError: (id: string) => void;
}

export default function CardsBanner({ posts, imgErrors, onImgError }: CardsBannerProps) {
  const { language } = useLanguage();
  const router = useRouter();
  const prefetchedRef = useRef<Set<string>>(new Set());
  const { index, go, prev, next, pause, resume, isPaused, togglePause } = useAutoSlide(posts.length, 4000);

  const handlePrefetch = (slug: string) => {
    if (prefetchedRef.current.has(slug)) return;
    if (process.env.NODE_ENV !== "production") return;
    prefetchedRef.current.add(slug);
    router.prefetch(`/posts/${slug}`);
  };

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
              inert={!isVisible}
            >
              {/* 가운데 카드만 글로 넘어간다. 옆 카드는 누르면 가운데로 오도록 이동을 막고 바깥(motion.div)이 받는다 */}
              <TransitionLink
                href={`/posts/${post.slug}`}
                image={post.cover_image || ""}
                className={styles.cardLink}
                style={{ cursor: isCenter ? "pointer" : "default" }}
                onMouseEnter={() => isCenter && handlePrefetch(post.slug)}
                onFocus={() => isCenter && handlePrefetch(post.slug)}
                onClick={(e) => { if (!isCenter) e.preventDefault(); }}
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
                  <div
                    className={styles.cardFallback}
                    style={{ background: seededGradient(post.slug || post.id) }}
                    aria-hidden="true"
                  />
                )}
                <div className={styles.cardOverlay} />
                <div className={styles.cardContent}>
                  {post.category && <span className={styles.cardCategory}><CategoryLabel category={post.category} /></span>}
                  <h2 className={styles.cardTitle}>{title}</h2>
                  {isCenter && excerpt && <p className={styles.cardExcerpt}>{excerpt}</p>}
                </div>
              </TransitionLink>
            </motion.div>
          );
        })}
      </div>

      <div className={styles.splitControls}>
        <Pressable noTapScale className={styles.splitArrowBtn} onClick={prev} aria-label="Previous slide" data-cursor="prev">
          <ChevronLeft size={14} />
        </Pressable>
        <div className={styles.splitDots}>
          {posts.map((p, i) => (
            <Pressable noTapScale
              key={p.id}
              className={`${styles.splitDot} ${i === index ? styles.splitDotActive : ""}`}
              onClick={() => go(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
        <Pressable noTapScale className={styles.splitArrowBtn} onClick={next} aria-label="Next slide" data-cursor="next">
          <ChevronRight size={14} />
        </Pressable>
        <Pressable noTapScale className={styles.splitPlayBtn} onClick={togglePause} aria-label={isPaused ? "Play" : "Pause"}>
          {isPaused ? (
            <Play size={12} fill="currentColor" />
          ) : (
            <Pause size={12} fill="currentColor" />
          )}
        </Pressable>
      </div>
    </div>
  );
}
