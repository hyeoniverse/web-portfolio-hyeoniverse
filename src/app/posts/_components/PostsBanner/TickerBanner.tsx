"use client";

import { useState, useEffect, useRef } from "react";
import MediaThumb from "@/components/ui/MediaThumb";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/providers/LanguageProvider";
import TransitionLink from "@/components/ui/TransitionLink";
import { formatPostTitle } from "@/utils/post";
import CategoryLabel from "@/components/ui/CategoryLabel";
import { seededGradient } from "@/components/posts/CoverImagePicker/seededGradient";
import { useAutoSlide } from "./useAutoSlide";
import { ChevronLeft, ChevronRight, Play, Pause } from "@/components/icons";
import type { Post } from "@/types/post";
import styles from "./PostsBanner.module.css";
import Pressable from "@/components/ui/Pressable";

interface TickerBannerProps {
  posts: Post[];
  imgErrors: Set<string>;
  onImgError: (id: string) => void;
}

export default function TickerBanner({ posts, imgErrors, onImgError }: TickerBannerProps) {
  const { language } = useLanguage();
  const router = useRouter();
  const prefetchedRef = useRef<Set<string>>(new Set());
  const { index, go, prev, next, pause, resume, isPaused, togglePause } = useAutoSlide(posts.length, 3000);
  const len = posts.length;

  const handlePrefetch = (slug: string) => {
    if (prefetchedRef.current.has(slug)) return;
    if (process.env.NODE_ENV !== "production") return;
    prefetchedRef.current.add(slug);
    router.prefetch(`/posts/${slug}`);
  };

  const [pos, setPos] = useState(0);
  const [animate, setAnimate] = useState(true);
  const prevIndex = useRef(0);

  useEffect(() => {
    const prev = prevIndex.current;
    prevIndex.current = index;

    if (prev === len - 1 && index === 0) {
      setAnimate(true);
      setPos(len);
      const timer = setTimeout(() => {
        setAnimate(false);
        setPos(0);
      }, 420);
      return () => clearTimeout(timer);
    }

    setAnimate(true);
    setPos(index);
  }, [index, len]);

  /* 한 번에 한 줄만 보이므로, 보이지 않는 줄(과 이어 붙인 첫 줄 복제)은 inert 로 초점·보조기기에서 뺀다 */
  const renderItem = (post: Post, key: string, shown: boolean) => {
    const title = formatPostTitle(post, language);
    return (
      <div key={key} className={styles.tickerInner} inert={!shown}>
        <TransitionLink
          href={`/posts/${post.slug}`}
          image={post.cover_image || ""}
          className={styles.tickerLink}
          onMouseEnter={() => handlePrefetch(post.slug)}
          onFocus={() => handlePrefetch(post.slug)}
        >
          <div className={styles.tickerThumb}>
            {post.cover_image && !imgErrors.has(post.id) ? (
              <MediaThumb
                src={post.cover_image}
                alt={title}
                fill
                sizes="56px"
                className={styles.tickerThumbImg}
                onError={() => onImgError(post.id)}
              />
            ) : (
              <div
                className={styles.tickerThumbFallback}
                style={{ background: seededGradient(post.slug || post.id) }}
                aria-hidden="true"
              />
            )}
          </div>
          {post.category && <span className={styles.tickerCategory}><CategoryLabel category={post.category} /></span>}
          <span className={styles.tickerTitle}>{title}</span>
        </TransitionLink>
      </div>
    );
  };

  return (
    <div className={styles.ticker} onMouseEnter={pause} onMouseLeave={resume} data-cursor="stop">
      <div className={styles.tickerTrack}>
        <div
          className={`${styles.tickerReel} ${animate ? styles.tickerReelAnimated : ""}`}
          style={{ transform: `translateY(-${pos * 72}px)` }}
        >
          {posts.map((post, i) => renderItem(post, post.id, i === index))}
          {renderItem(posts[0], "clone-first", false)}
        </div>
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
