"use client";

import ProgressiveImage from "@/components/ui/ProgressiveImage";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import { formatPostTitle, getPostExcerpt } from "@/utils/post";
import CategoryLabel from "@/components/ui/CategoryLabel";
import { PlaceholderIcon } from "./PlaceholderIcon";
import { useAutoSlide } from "./useAutoSlide";
import type { Post } from "@/types/post";
import styles from "./PostsBanner.module.css";

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
  const { index, go, prev, next, pause, resume, isPaused, togglePause } = useAutoSlide(posts.length, 5000);

  const post = posts[index];
  const title = formatPostTitle(post, language);
  const excerpt = getPostExcerpt(post, language);

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
                  <div className={styles.splitFallback}><PlaceholderIcon /></div>
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
        <button className={styles.splitArrowBtn} onClick={prev} aria-label="Previous slide">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div className={styles.splitDots}>
          {posts.map((p, i) => (
            <button key={p.id} className={`${styles.splitDot} ${i === index ? styles.splitDotActive : ""}`} onClick={() => go(i)} aria-label={`Slide ${i + 1}`} />
          ))}
        </div>
        <button className={styles.splitArrowBtn} onClick={next} aria-label="Next slide">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
        <button className={styles.splitPlayBtn} onClick={togglePause} aria-label={isPaused ? "Play" : "Pause"}>
          {isPaused ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21" /></svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
          )}
        </button>
      </div>
    </div>
  );
}
