"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { formatPostTitle } from "@/utils/post";
import { Carousel } from "@/components/ui";
import BannerSlide from "../BannerSlide";
import type { BannerStyle } from "../BannerSlide";
import type { Post } from "@/types/post";
import styles from "./PostsBanner.module.css";

interface PostsBannerProps {
  posts: Post[];
  imgErrors: Set<string>;
  onImgError: (id: string) => void;
  /** Design System 등에서 레이아웃을 강제 지정할 때 사용 */
  overrideLayout?: BannerLayout;
}

export type BannerLayout = "fullwidth" | "split" | "cards" | "ticker";

/* ── Auto-slide hook ── */
function useAutoSlide(length: number, interval = 4000) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  const paused = useRef(false);

  const go = useCallback(
    (next: number) => {
      setDirection(next > index ? 1 : -1);
      setIndex(((next % length) + length) % length);
    },
    [index, length],
  );

  const pause = useCallback(() => { paused.current = true; }, []);
  const resume = useCallback(() => { paused.current = false; }, []);

  useEffect(() => {
    if (length <= 1) return;
    timer.current = setInterval(() => {
      if (!paused.current) setIndex((i) => { setDirection(1); return (i + 1) % length; });
    }, interval);
    return () => clearInterval(timer.current);
  }, [length, interval]);

  return { index, direction, go, pause, resume };
}

/* ════════════════════════════════════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════════════════════════════════════ */

export default function PostsBanner({ posts, imgErrors, onImgError, overrideLayout }: PostsBannerProps) {
  const siteConfig = useSiteConfig();
  const layout = overrideLayout ?? (siteConfig.posts.bannerLayout ?? "fullwidth") as BannerLayout;

  if (posts.length === 0) return null;

  switch (layout) {
    case "split":
      return <SplitBanner posts={posts} imgErrors={imgErrors} onImgError={onImgError} />;
    case "cards":
      return <CardsBanner posts={posts} imgErrors={imgErrors} onImgError={onImgError} />;
    case "ticker":
      return <TickerBanner posts={posts} imgErrors={imgErrors} onImgError={onImgError} />;
    default:
      return <FullwidthBanner posts={posts} imgErrors={imgErrors} onImgError={onImgError} />;
  }
}

/* ── 1. Fullwidth (기존 캐러셀) ── */
function FullwidthBanner({ posts, imgErrors, onImgError }: PostsBannerProps) {
  const siteConfig = useSiteConfig();
  return (
    <div className={styles.fullwidth}>
      <Carousel
        mode={siteConfig.posts.bannerTransition as "default" | "cylinder"}
        height="clamp(320px, 56vh, 640px)"
        showDots
        showArrows
      >
        {posts.map((post, i) => (
          <BannerSlide
            key={post.id}
            post={post}
            index={i}
            style={siteConfig.posts.bannerStyle as BannerStyle}
            imgError={imgErrors.has(post.id)}
            onImgError={onImgError}
          />
        ))}
      </Carousel>
    </div>
  );
}

/* ── Slide animation variants ── */
const slideVariants = {
  enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%" }),
  center: { x: 0 },
  exit: (d: number) => ({ x: d > 0 ? "-100%" : "100%" }),
};

/* ── 2. Split (좌 이미지 / 우 텍스트) ── */
function SplitBanner({ posts, imgErrors, onImgError }: PostsBannerProps) {
  const { index, direction, go, pause, resume } = useAutoSlide(posts.length, 5000);
  const post = posts[index];
  const title = formatPostTitle(post);

  return (
    <div className={styles.split} onMouseEnter={pause} onMouseLeave={resume}>
      <div className={styles.splitImage}>
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={post.id}
            className={styles.splitImageInner}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Link href={`/posts/${post.slug}`}>
              {post.cover_image && !imgErrors.has(post.id) ? (
                <Image
                  src={post.cover_image}
                  alt={title}
                  fill
                  sizes="50vw"
                  className={styles.splitImg}
                  onError={() => onImgError(post.id)}
                />
              ) : (
                <div className={styles.splitFallback} />
              )}
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className={styles.splitContent}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={post.id}
            custom={direction}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {post.category && <span className={styles.splitCategory}>{post.category}</span>}
            <Link href={`/posts/${post.slug}`} className={styles.splitTitleLink}>
              <h2 className={styles.splitTitle}>{title}</h2>
            </Link>
            {post.excerpt && <p className={styles.splitExcerpt}>{post.excerpt}</p>}
          </motion.div>
        </AnimatePresence>

        {/* dots */}
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
      </div>
    </div>
  );
}

/* ── 3. Cards (중앙 포커스 카드) ── */
function CardsBanner({ posts, imgErrors, onImgError }: PostsBannerProps) {
  const { index, go, pause, resume } = useAutoSlide(posts.length, 4000);

  const getOffset = (i: number) => {
    const diff = i - index;
    const len = posts.length;
    if (diff === 0) return 0;
    if (diff === 1 || diff === -(len - 1)) return 1;
    if (diff === -1 || diff === len - 1) return -1;
    return diff > 0 ? 2 : -2;
  };

  return (
    <div className={styles.cards} onMouseEnter={pause} onMouseLeave={resume}>
      <div className={styles.cardsTrack}>
        {posts.map((post, i) => {
          const offset = getOffset(i);
          const isCenter = offset === 0;
          const isVisible = Math.abs(offset) <= 1;
          const title = formatPostTitle(post);

          return (
            <motion.div
              key={post.id}
              className={`${styles.card} ${isCenter ? styles.cardCenter : ""}`}
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
              <Link
                href={`/posts/${post.slug}`}
                className={styles.cardLink}
                onClick={(e) => !isCenter && e.preventDefault()}
              >
                {post.cover_image && !imgErrors.has(post.id) ? (
                  <Image
                    src={post.cover_image}
                    alt={title}
                    fill
                    sizes="60vw"
                    className={styles.cardImg}
                    onError={() => onImgError(post.id)}
                  />
                ) : (
                  <div className={styles.cardFallback} />
                )}
                <div className={styles.cardOverlay} />
                <div className={styles.cardContent}>
                  {post.category && <span className={styles.cardCategory}>{post.category}</span>}
                  <h2 className={styles.cardTitle}>{title}</h2>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className={styles.cardsDots}>
        {posts.map((p, i) => (
          <button
            key={p.id}
            className={`${styles.splitDot} ${i === index ? styles.splitDotActive : ""}`}
            onClick={() => go(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ── 4. Ticker (미니멀 바) ── */
function TickerBanner({ posts, imgErrors, onImgError }: PostsBannerProps) {
  const { index, direction, go } = useAutoSlide(posts.length, 3000);
  const post = posts[index];
  const title = formatPostTitle(post);

  return (
    <div className={styles.ticker}>
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={post.id}
          className={styles.tickerInner}
          custom={direction}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <Link href={`/posts/${post.slug}`} className={styles.tickerLink}>
            <div className={styles.tickerThumb}>
              {post.cover_image && !imgErrors.has(post.id) ? (
                <Image
                  src={post.cover_image}
                  alt={title}
                  fill
                  sizes="56px"
                  className={styles.tickerThumbImg}
                  onError={() => onImgError(post.id)}
                />
              ) : (
                <div className={styles.tickerThumbFallback} />
              )}
            </div>
            {post.category && <span className={styles.tickerCategory}>{post.category}</span>}
            <span className={styles.tickerTitle}>{title}</span>
          </Link>
        </motion.div>
      </AnimatePresence>

      <div className={styles.tickerDots}>
        {posts.map((p, i) => (
          <button
            key={p.id}
            className={`${styles.splitDot} ${i === index ? styles.splitDotActive : ""}`}
            onClick={() => go(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
