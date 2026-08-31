"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import { formatPostTitle, getPostExcerpt } from "@/utils/post";
import CategoryLabel from "@/components/ui/CategoryLabel";
import { seededGradient } from "@/components/posts/CoverImagePicker/seededGradient";
import { useAutoSlide } from "./useAutoSlide";
import { ChevronLeft, ChevronRight, Play, Pause } from "@/components/icons";
import type { Post } from "@/types/post";
import styles from "./PostsBanner.module.css";
import Pressable from "@/components/ui/Pressable";

interface SplitBannerProps {
  posts: Post[];
  imgErrors: Set<string>;
  onImgError: (id: string) => void;
}

const imgVariants = {
  enter: { y: "100%", position: "absolute" as const },
  center: { y: 0, position: "relative" as const },
  exit: { y: "-100%", position: "absolute" as const },
};

export default function SplitBanner({ posts, imgErrors, onImgError }: SplitBannerProps) {
  const { language } = useLanguage();
  const { navigateWithTransition } = usePageTransition();
  const router = useRouter();
  const prefetchedRef = useRef<Set<string>>(new Set());
  const { index, go, prev, next, pause, resume, isPaused, togglePause } = useAutoSlide(posts.length, 5000);

  const post = posts[index];
  const title = formatPostTitle(post, language);
  const excerpt = getPostExcerpt(post, language);

  /* split 은 한 번에 1개 슬라이드만 보여줌 → 현재 슬라이드는 항상 prefetch (hover 없어도) */
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (prefetchedRef.current.has(post.slug)) return;
    prefetchedRef.current.add(post.slug);
    router.prefetch(`/posts/${post.slug}`);
  }, [post.slug, router]);

  const handleNav = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    navigateWithTransition(`/posts/${post.slug}`, post.cover_image || "", rect);
  };

  return (
    <div className={styles.splitWrap} onMouseEnter={pause} onMouseLeave={resume} data-cursor="stop">
      <div className={styles.splitSlide}>
        {/* 이미지 — 세로 슬라이드 */}
        <div className={styles.splitImageTrack}>
          <AnimatePresence initial={false}>
            <motion.div
              key={post.id}
              className={styles.splitImageSlide}
              variants={imgVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className={styles.splitImageLink} style={{ cursor: "pointer" }} onClick={handleNav}>
                {post.cover_image && !imgErrors.has(post.id) ? (
                  <ProgressiveImage
                    src={post.cover_image}
                    alt={title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className={styles.splitImg}
                    loading="lazy"
                    onError={() => onImgError(post.id)}
                  />
                ) : (
                  <div
                    className={styles.splitFallback}
                    style={{ background: seededGradient(post.slug || post.id) }}
                    aria-hidden="true"
                  />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 텍스트 — fade */}
        <div className={styles.splitContent}>
          <AnimatePresence mode="wait">
            <motion.div
              key={post.id}
              className={styles.splitContentInner}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {post.category && <span className={styles.splitCategory}><CategoryLabel category={post.category} /></span>}
              <div className={styles.splitTitleLink} style={{ cursor: "pointer" }} onClick={handleNav}>
                <h2 className={styles.splitTitle}>{title}</h2>
              </div>
              {excerpt && <p className={styles.splitExcerpt}>{excerpt}</p>}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className={styles.splitControls}>
        <Pressable noTapScale className={styles.splitArrowBtn} onClick={prev} aria-label="Previous slide" data-cursor="prev">
          <ChevronLeft size={14} />
        </Pressable>
        <div className={styles.splitDots}>
          {posts.map((p, i) => (
            <Pressable noTapScale key={p.id} className={`${styles.splitDot} ${i === index ? styles.splitDotActive : ""}`} onClick={() => go(i)} aria-label={`Slide ${i + 1}`} />
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
