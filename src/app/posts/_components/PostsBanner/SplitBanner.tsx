"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
import { useLanguage } from "@/providers/LanguageProvider";
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
