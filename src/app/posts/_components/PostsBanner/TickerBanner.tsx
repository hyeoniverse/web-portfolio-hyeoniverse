"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useLanguage } from "@/providers/LanguageProvider";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import { formatPostTitle } from "@/utils/post";
import CategoryLabel from "@/components/ui/CategoryLabel";
import { PlaceholderIcon } from "./PlaceholderIcon";
import { useAutoSlide } from "./useAutoSlide";
import type { Post } from "@/types/post";
import styles from "./PostsBanner.module.css";

interface TickerBannerProps {
  posts: Post[];
  imgErrors: Set<string>;
  onImgError: (id: string) => void;
}

export default function TickerBanner({ posts, imgErrors, onImgError }: TickerBannerProps) {
  const { language } = useLanguage();
  const { navigateWithTransition } = usePageTransition();
  const { index, go, prev, next, pause, resume, isPaused, togglePause } = useAutoSlide(posts.length, 3000);
  const len = posts.length;

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

  const renderItem = (post: Post, key: string) => {
    const title = formatPostTitle(post, language);
    return (
      <div key={key} className={styles.tickerInner}>
        <div
          className={styles.tickerLink}
          style={{ cursor: "pointer" }}
          onClick={(e) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            navigateWithTransition(`/posts/${post.slug}`, post.cover_image || "", rect);
          }}
        >
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
              <div className={styles.tickerThumbFallback}><PlaceholderIcon size={24} /></div>
            )}
          </div>
          {post.category && <span className={styles.tickerCategory}><CategoryLabel category={post.category} /></span>}
          <span className={styles.tickerTitle}>{title}</span>
        </div>
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
          {posts.map((post) => renderItem(post, post.id))}
          {renderItem(posts[0], "clone-first")}
        </div>
      </div>

      <div className={styles.splitControls}>
        <button className={styles.splitArrowBtn} onClick={prev} aria-label="Previous slide">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
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
