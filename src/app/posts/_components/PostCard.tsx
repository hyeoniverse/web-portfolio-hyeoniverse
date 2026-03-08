"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/providers/LanguageProvider";
import type { Post } from "@/types/post";
import { formatPostTitle, getPostExcerpt } from "@/utils/post";
import CategoryLabel from "@/components/ui/CategoryLabel";
import T from "@/components/ui/T";
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
  const category = post.category || null;
  const displayTitle = formatPostTitle(post, language);
  const displayExcerpt = getPostExcerpt(post, language);

  const cardClass = `${styles.card} ${isFeatured ? styles.featured : ""} ${isHero ? styles.hero : ""}`;

  /* ── Hero variant: 풀 블리드 이미지 + 하단 오버레이 ── */
  if (isHero) {
    return (
      <Link href={`/posts/${post.slug}`} className={cardClass}>
        {/* 풀 배경 이미지 */}
        {showImage ? (
          <Image
            src={post.cover_image}
            alt={post.title}
            fill
            sizes="100vw"
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
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M12 23c-3.866 0-7-3.134-7-7 0-2.2 1.1-4.1 2.5-5.5L9 9l1.5 3 3-5.5C14.5 4.5 16 2 16 2s1.5 2.5 2.5 5c.7 1.7 1.5 3.8 1.5 6 0 3.866-4.134 10-8 10z" />
            </svg>
            HOT
          </span>
        )}

        {/* 하단 콘텐츠 */}
        <div className={styles.heroContent}>
          <div className={styles.badgeRow}>
            {category && (
              <span className={styles.heroBadge}><CategoryLabel category={category} /></span>
            )}
            {language === "en" && !post.content_en && (
              <span className={styles.heroLangHint}><T k="postDetail.koOnly" /></span>
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
      </Link>
    );
  }

  /* ── Standard / Featured ── */
  return (
    <Link
      href={`/posts/${post.slug}`}
      className={cardClass}
    >
      <div className={styles.imageWrap}>
        {showImage ? (
          <Image
            src={post.cover_image}
            alt={post.title}
            fill
            sizes={isFeatured ? "(max-width: 768px) 100vw, 55vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
            className={styles.image}
            onError={() => onImgError?.(post.id)}
          />
        ) : (
          <div className={styles.placeholder}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
        {isHot && (
          <span className={styles.hotBadge}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M12 23c-3.866 0-7-3.134-7-7 0-2.2 1.1-4.1 2.5-5.5L9 9l1.5 3 3-5.5C14.5 4.5 16 2 16 2s1.5 2.5 2.5 5c.7 1.7 1.5 3.8 1.5 6 0 3.866-4.134 10-8 10z" />
            </svg>
            HOT
          </span>
        )}
        {post.is_pinned && (
          <span className={styles.pinnedOverlay}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 17v5" />
              <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h14v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1h.5a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5H8a1 1 0 0 1 1 1z" />
            </svg>
            Pinned
          </span>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.badgeRow}>
          {category && (
            <span className={styles.categoryBadge}><CategoryLabel category={category} /></span>
          )}
          {language === "en" && !post.content_en && (
            <span className={styles.langHint}><T k="postDetail.koOnly" /></span>
          )}
        </div>

        <h2 className={styles.title}>{displayTitle}</h2>

        {displayExcerpt && <p className={styles.excerpt}>{displayExcerpt}</p>}

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
    </Link>
  );
}
