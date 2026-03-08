"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { formatPostTitle, getPostExcerpt } from "@/utils/post";
import { Carousel } from "@/components/ui";
import BannerSlide from "../BannerSlide";
import type { BannerStyle } from "../BannerSlide";
import type { Post } from "@/types/post";
import CategoryLabel from "@/components/ui/CategoryLabel";
import styles from "./PostsBanner.module.css";

const PlaceholderIcon = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

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

/* ── 2. Split (가로 슬라이드 카드 — 무한 루프) ── */
function SplitBanner({ posts, imgErrors, onImgError }: PostsBannerProps) {
  const { language } = useLanguage();
  const { index, go, pause, resume } = useAutoSlide(posts.length, 5000);
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
          <Link href={`/posts/${post.slug}`} className={styles.splitImageLink}>
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
              <div className={styles.splitFallback}><PlaceholderIcon /></div>
            )}
          </Link>
        </div>
        <div className={styles.splitContent}>
          {post.category && <span className={styles.splitCategory}><CategoryLabel category={post.category} /></span>}
          <Link href={`/posts/${post.slug}`} className={styles.splitTitleLink}>
            <h2 className={styles.splitTitle}>{title}</h2>
          </Link>
          {excerpt && <p className={styles.splitExcerpt}>{excerpt}</p>}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.splitWrap} onMouseEnter={pause} onMouseLeave={resume}>
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
  );
}

/* ── 3. Cards (중앙 포커스 카드) ── */
function CardsBanner({ posts, imgErrors, onImgError }: PostsBannerProps) {
  const { language } = useLanguage();
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
          const title = formatPostTitle(post, language);

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
                  <div className={styles.cardFallback}><PlaceholderIcon /></div>
                )}
                <div className={styles.cardOverlay} />
                <div className={styles.cardContent}>
                  {post.category && <span className={styles.cardCategory}><CategoryLabel category={post.category} /></span>}
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

/* ── 4. Ticker (미니멀 바 — 무한 루프) ── */
function TickerBanner({ posts, imgErrors, onImgError }: PostsBannerProps) {
  const { language } = useLanguage();
  const { index, go } = useAutoSlide(posts.length, 3000);
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
              <div className={styles.tickerThumbFallback}><PlaceholderIcon size={24} /></div>
            )}
          </div>
          {post.category && <span className={styles.tickerCategory}><CategoryLabel category={post.category} /></span>}
          <span className={styles.tickerTitle}>{title}</span>
        </Link>
      </div>
    );
  };

  return (
    <div className={styles.ticker}>
      <div className={styles.tickerTrack}>
        <div
          className={`${styles.tickerReel} ${animate ? styles.tickerReelAnimated : ""}`}
          style={{ transform: `translateY(-${pos * 72}px)` }}
        >
          {posts.map((post) => renderItem(post, post.id))}
          {renderItem(posts[0], "clone-first")}
        </div>
      </div>

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
