"use client";

import { useState, useEffect, useRef } from "react";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
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

export default function SplitBanner({ posts, imgErrors, onImgError }: SplitBannerProps) {
  const { language } = useLanguage();
  const { navigateWithTransition } = usePageTransition();
  const { index, go, prev, next, pause, resume, isPaused, togglePause } = useAutoSlide(posts.length, 5000);
  const len = posts.length;

  // 릴 위치: 마지막→처음 이동 시 복제 슬라이드(len번째)로 이동 후 점프
  const [pos, setPos] = useState(0);
  const [animate, setAnimate] = useState(true);
  const prevIndex = useRef(0);

  useEffect(() => {
    const prev = prevIndex.current;
    prevIndex.current = index;

    // 마지막→처음 (순방향 순환)
    if (prev === len - 1 && index === 0) {
      setAnimate(true);
      setPos(len); // 복제 슬라이드로 슬라이드
      // 트랜지션 완료 후 0으로 점프
      const timer = setTimeout(() => {
        setAnimate(false);
        setPos(0);
      }, 620);
      return () => clearTimeout(timer);
    }

    setAnimate(true);
    setPos(index);
  }, [index, len]);

  const renderSlide = (post: Post, key: string) => {
    const title = formatPostTitle(post, language);
    const excerpt = getPostExcerpt(post, language);
    return (
      <div key={key} className={styles.split}>
        <div className={styles.splitImage}>
          <div
            className={styles.splitImageLink}
            style={{ cursor: "pointer" }}
            onClick={(e) => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              navigateWithTransition(`/posts/${post.slug}`, post.cover_image || "", rect);
            }}
          >
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
        </div>
        <div className={styles.splitContent}>
          {post.category && <span className={styles.splitCategory}><CategoryLabel category={post.category} /></span>}
          <div
            className={styles.splitTitleLink}
            style={{ cursor: "pointer" }}
            onClick={(e) => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              navigateWithTransition(`/posts/${post.slug}`, post.cover_image || "", rect);
            }}
          >
            <h2 className={styles.splitTitle}>{title}</h2>
          </div>
          {excerpt && <p className={styles.splitExcerpt}>{excerpt}</p>}
        </div>
      </div>
    );
  };

  return (
    <div
      className={styles.splitWrap}
      onMouseEnter={pause}
      onMouseLeave={resume}
      data-cursor="stop"
    >
      <div className={styles.splitTrack}>
        <div
          className={`${styles.splitReel} ${animate ? styles.splitReelAnimated : ""}`}
          style={{ transform: `translateX(-${pos * 100}%)` }}
        >
          {posts.map((post) => renderSlide(post, post.id))}
          {/* 첫 번째 복제본 — 무한 루프용 */}
          {renderSlide(posts[0], "clone-first")}
        </div>
      </div>

      {/* Controls: arrows + dots + play/pause */}
      <div className={styles.splitControls}>
        <button
          className={styles.splitArrowBtn}
          onClick={prev}
          aria-label="Previous slide"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
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

        <button
          className={styles.splitArrowBtn}
          onClick={next}
          aria-label="Next slide"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <button
          className={styles.splitPlayBtn}
          onClick={togglePause}
          aria-label={isPaused ? "Play" : "Pause"}
        >
          {isPaused ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
