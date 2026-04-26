"use client";

import { useRef } from "react";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
import { useLanguage } from "@/providers/LanguageProvider";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import type { Post } from "@/types/post";
import { formatPostTitle, getPostExcerpt } from "@/utils/post";
import CategoryLabel from "@/components/ui/CategoryLabel";
import T from "@/components/ui/T";
import { ImageIcon, Flame, Pin } from "lucide-react";
import styles from "./PostCard.module.css";

interface PostCardProps {
  post: Post;
  variant?: "featured" | "standard" | "hero";
  isHot?: boolean;
  onImgError?: (id: string) => void;
  imgError?: boolean;
}

export default function PostCard({
  post,
  variant = "standard",
  isHot,
  onImgError,
  imgError,
}: PostCardProps) {
  const date = new Date(post.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const readTime = Math.max(1, Math.ceil(post.content.length / 1000));
  const isFeatured = variant === "featured";
  const isHero = variant === "hero";
  const showImage = post.cover_image && !imgError;
  const { language } = useLanguage();
  const { navigateWithTransition } = usePageTransition();
  const cardRef = useRef<HTMLDivElement>(null);
  const category = post.category || null;

  // 언어 단독 여부 판단 — 없는 언어는 있는 쪽으로 강제
  const hasKo = !!post.content;
  const hasEn = !!post.content_en;
  const displayLang: "ko" | "en" =
    !hasEn ? "ko" : !hasKo ? "en" : language;
  const langBadge: "koOnly" | "enOnly" | null =
    !hasEn ? "koOnly" : !hasKo ? "enOnly" : null;

  const displayTitle = formatPostTitle(post, displayLang);
  const displayExcerpt = getPostExcerpt(post, displayLang);

  const cardClass = `${styles.card} ${isFeatured ? styles.featured : ""} ${isHero ? styles.hero : ""}`;

  const handleClick = () => {
    const el = cardRef.current;
    if (!el) return;
    const img = post.cover_image || "";
    const rect = el.getBoundingClientRect();
    navigateWithTransition(`/posts/${post.slug}`, img, rect);
  };

  /* ── Hero variant: 풀 블리드 이미지 + 하단 오버레이 ── */
  if (isHero) {
    return (
      <div ref={cardRef} className={cardClass} onClick={handleClick} role="link" data-more="true" data-clickable="true">
        {/* 풀 배경 이미지 */}
        {showImage ? (
          <ProgressiveImage
            src={post.cover_image}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 55vw"
            className={`${styles.image} ${styles.heroBgImg}`}
            priority
            onError={() => onImgError?.(post.id)}
          />
        ) : (
          <div className={styles.heroPlaceholder} />
        )}

        {/* 하단 그라데이션 */}
        <div className={styles.heroOverlay} />

        {/* HOT 뱃지 */}
        {isHot && (
          <span className={styles.hotBadge}>
            <Flame size={10} fill="currentColor" stroke="none" />
            HOT
          </span>
        )}

        {/* 하단 콘텐츠 */}
        <div className={styles.heroContent}>
          <div className={styles.badgeRow}>
            {category && (
              <span className={styles.heroBadge}><CategoryLabel category={category} /></span>
            )}
            {langBadge && (
              <span className={styles.heroLangHint}><T k={`postDetail.${langBadge}`} /></span>
            )}
          </div>
          <h2 className={styles.heroTitle}>{displayTitle}</h2>
          {displayExcerpt && <p className={styles.heroExcerpt}>{displayExcerpt}</p>}
          <div className={styles.heroMeta}>
            <span>{date}</span>
            <span className={styles.heroDot}>&middot;</span>
            <span>{readTime} min read</span>
            {post.view_count > 0 && (
              <>
                <span className={styles.heroDot}>&middot;</span>
                <span>{post.view_count} views</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Standard / Featured ── */
  return (
    <div
      ref={cardRef}
      className={cardClass}
      onClick={handleClick}
      role="link"
      data-more="true"
      data-clickable="true"
    >
      <div className={styles.imageWrap}>
        {showImage ? (
          <ProgressiveImage
            src={post.cover_image}
            alt={post.title}
            fill
            sizes={isFeatured ? "(max-width: 768px) 100vw, 55vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
            className={styles.image}
            loading={isFeatured ? "eager" : "lazy"}
            onError={() => onImgError?.(post.id)}
          />
        ) : (
          <div className={styles.placeholder}>
            <ImageIcon size={32} strokeWidth={1} />
          </div>
        )}
        {isHot && (
          <span className={styles.hotBadge}>
            <Flame size={10} fill="currentColor" stroke="none" />
            HOT
          </span>
        )}
        {post.is_pinned && (
          <span className={styles.pinnedOverlay}>
            <Pin size={10} />
            Pinned
          </span>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.badgeRow}>
          {category && (
            <span className={styles.categoryBadge}><CategoryLabel category={category} /></span>
          )}
          {langBadge && (
            <span className={styles.langHint}><T k={`postDetail.${langBadge}`} /></span>
          )}
        </div>

        <h2 className={styles.title}>{displayTitle}</h2>

        <p className={styles.excerpt}>{displayExcerpt}</p>

        <div className={styles.meta}>
          <span>{date}</span>
          <span className={styles.dot}>&middot;</span>
          <span>{readTime} min read</span>
          {post.view_count > 0 && (
            <>
              <span className={styles.dot}>&middot;</span>
              <span>{post.view_count} views</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
