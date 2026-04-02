"use client";

import Link from "next/link";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
import { useLanguage } from "@/providers/LanguageProvider";
import { formatPostTitle, getPostExcerpt } from "@/utils/post";
import type { Post } from "@/types/post";
import CategoryLabel from "@/components/ui/CategoryLabel";
import T from "@/components/ui/T";
import styles from "./BannerSlide.module.css";

export type BannerStyle = "editorial" | "minimal" | "cinematic" | "magazine";

interface BannerSlideProps {
  post: Post;
  index: number;
  style?: BannerStyle;
  imgError: boolean;
  onImgError: (id: string) => void;
}

export default function BannerSlide({
  post,
  index,
  style = "editorial",
  imgError,
  onImgError,
}: BannerSlideProps) {
  const { language } = useLanguage();
  const title = formatPostTitle(post, language);
  const excerpt = getPostExcerpt(post, language);
  const showLangHint = language === "en" && !post.content_en;

  const image = post.cover_image && !imgError ? (
    <ProgressiveImage
      src={post.cover_image}
      alt={title}
      fill
      sizes="(max-width: 768px) 100vw, 80vw"
      className={styles.slideImg}
      priority={index === 0}
      loading={index === 0 ? "eager" : "lazy"}
      onError={() => onImgError(post.id)}
    />
  ) : (
    <div className={styles.slideFallback}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    </div>
  );

  /* ── Editorial ── */
  if (style === "editorial") {
    return (
      <Link href={`/posts/${post.slug}`} className={styles.slideLink}>
        {image}
        <div className={styles.overlayEditorial} />
        <div className={styles.contentEditorial}>
          <span className={styles.slideIndex}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className={styles.meta}>
            {(post.category || showLangHint) && (
              <span className={styles.badgeRow}>
                {post.category && (
                  <span className={styles.category}><CategoryLabel category={post.category} /></span>
                )}
                {post.category && showLangHint && <span className={styles.badgeSep}>|</span>}
                {showLangHint && (
                  <span className={styles.langHint}><T k="postDetail.koOnly" /></span>
                )}
              </span>
            )}
            <h2 className={styles.title}>{title}</h2>
            {excerpt && (
              <p className={styles.excerpt}>{excerpt}</p>
            )}
          </div>
        </div>
      </Link>
    );
  }

  /* ── Minimal ── */
  if (style === "minimal") {
    return (
      <Link href={`/posts/${post.slug}`} className={styles.slideLink}>
        {image}
        <div className={styles.overlayMinimal} />
        <div className={styles.contentMinimal}>
          {(post.category || showLangHint) && (
            <span className={styles.badgeRow}>
              {post.category && (
                <span className={styles.categoryBadge}><CategoryLabel category={post.category} /></span>
              )}
              {post.category && showLangHint && <span className={styles.badgeSep}>|</span>}
              {showLangHint && (
                <span className={styles.langHint}><T k="postDetail.koOnly" /></span>
              )}
            </span>
          )}
          <h2 className={styles.titleMinimal}>{title}</h2>
          <div className={styles.divider} />
        </div>
      </Link>
    );
  }

  /* ── Cinematic ── */
  if (style === "cinematic") {
    return (
      <Link href={`/posts/${post.slug}`} className={styles.slideLink}>
        {image}
        <div className={styles.overlayCinematic} />
        <div className={styles.contentCinematic}>
          {(post.category || showLangHint) && (
            <span className={styles.badgeRow}>
              {post.category && (
                <span className={styles.categoryCinematic}><CategoryLabel category={post.category} /></span>
              )}
              {post.category && showLangHint && <span className={styles.badgeSep}>|</span>}
              {showLangHint && (
                <span className={styles.langHint}><T k="postDetail.koOnly" /></span>
              )}
            </span>
          )}
          <h2 className={styles.titleCinematic}>{title}</h2>
          {post.excerpt && (
            <p className={styles.excerptCinematic}>{post.excerpt}</p>
          )}
        </div>
      </Link>
    );
  }

  /* ── Magazine ── */
  return (
    <Link href={`/posts/${post.slug}`} className={styles.slideLink}>
      {image}
      <div className={styles.overlayMagazine} />
      <div className={styles.contentMagazine}>
        <div className={styles.magazineCard}>
          {(post.category || showLangHint) && (
            <span className={styles.badgeRow}>
              {post.category && (
                <span className={styles.category}><CategoryLabel category={post.category} /></span>
              )}
              {post.category && showLangHint && <span className={styles.badgeSep}>|</span>}
              {showLangHint && (
                <span className={styles.langHint}><T k="postDetail.koOnly" /></span>
              )}
            </span>
          )}
          <h2 className={styles.title}>{title}</h2>
          {post.excerpt && (
            <p className={styles.excerpt}>{post.excerpt}</p>
          )}
          <span className={styles.readMore}>Read →</span>
        </div>
      </div>
    </Link>
  );
}
