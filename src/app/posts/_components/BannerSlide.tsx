"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
import { useLanguage } from "@/providers/LanguageProvider";
import { usePageTransition } from "@/providers/PageTransitionProvider";
import { formatPostTitle, getPostExcerpt } from "@/utils/post";
import type { Post } from "@/types/post";
import CategoryLabel from "@/components/ui/CategoryLabel";
import T from "@/components/ui/T";
import { getFallbackCoverGradient } from "@/lib/coverFallback";
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
  const { navigateWithTransition } = usePageTransition();
  const router = useRouter();
  const prefetchedRef = useRef(false);
  const title = formatPostTitle(post, language);
  const excerpt = getPostExcerpt(post, language);
  const showLangHint = language === "en" && !post.content_en;

  /* hover/focus 시 destination prefetch — div onClick 라 Link 자동 prefetch 가 없으므로 수동 (dev 모드는 RSC compile 미완 route 건드리면 에러나서 skip) */
  const handlePrefetch = () => {
    if (prefetchedRef.current) return;
    if (process.env.NODE_ENV !== "production") return;
    prefetchedRef.current = true;
    router.prefetch(`/posts/${post.slug}`);
  };
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    navigateWithTransition(`/posts/${post.slug}`, post.cover_image || "", rect);
  };
  const clickProps = {
    onClick: handleClick,
    onMouseEnter: handlePrefetch,
    onFocus: handlePrefetch,
    style: { cursor: "pointer" as const },
    className: styles.slideLink,
  };

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
    <div
      className={styles.slideFallback}
      style={{ background: getFallbackCoverGradient(post.slug || post.id) }}
    />
  );

  /* ── Editorial ── */
  if (style === "editorial") {
    return (
      <div {...clickProps}>
        {image}
        <div className={styles.overlayEditorial} />
        <div className={styles.contentEditorial}>
          <span className={styles.slideIndex}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className={styles.meta}>
            {(post.category || showLangHint) && (
              <span className="tw:inline-flex tw:items-center tw:gap-xs">
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
      </div>
    );
  }

  /* ── Minimal ── */
  if (style === "minimal") {
    return (
      <div {...clickProps}>
        {image}
        <div className={styles.overlayMinimal} />
        <div className={styles.contentMinimal}>
          {(post.category || showLangHint) && (
            <span className="tw:inline-flex tw:items-center tw:gap-xs">
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
      </div>
    );
  }

  /* ── Cinematic ── */
  if (style === "cinematic") {
    return (
      <div {...clickProps}>
        {image}
        <div className={styles.overlayCinematic} />
        <div className={styles.contentCinematic}>
          {(post.category || showLangHint) && (
            <span className="tw:inline-flex tw:items-center tw:gap-xs">
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
      </div>
    );
  }

  /* ── Magazine ── */
  return (
    <div {...clickProps}>
      {image}
      <div className={styles.overlayMagazine} />
      <div className={styles.contentMagazine}>
        <div className={styles.magazineCard}>
          {(post.category || showLangHint) && (
            <span className="tw:inline-flex tw:items-center tw:gap-xs">
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
    </div>
  );
}
