"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
import { useLanguage } from "@/providers/LanguageProvider";
import TransitionLink from "@/components/ui/TransitionLink";
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
  const router = useRouter();
  const prefetchedRef = useRef(false);
  const title = formatPostTitle(post, language);
  const excerpt = getPostExcerpt(post, language);
  const showLangHint = language === "en" && !post.content_en;

  /* hover/focus 시 destination prefetch — 링크의 자동 prefetch 는 끄고(TransitionLink) 수동으로 (dev 모드는 RSC compile 미완 route 건드리면 에러나서 skip) */
  const handlePrefetch = () => {
    if (prefetchedRef.current) return;
    if (process.env.NODE_ENV !== "production") return;
    prefetchedRef.current = true;
    router.prefetch(`/posts/${post.slug}`);
  };
  // 슬라이드 전체가 글 링크다 — 그냥 누르면 커버가 커지는 연출로, 새 탭 클릭은 브라우저가 연다(#933)
  const linkProps = {
    href: `/posts/${post.slug}`,
    image: post.cover_image || "",
    onMouseEnter: handlePrefetch,
    onFocus: handlePrefetch,
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
      <TransitionLink {...linkProps}>
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
      </TransitionLink>
    );
  }

  /* ── Minimal ── */
  if (style === "minimal") {
    return (
      <TransitionLink {...linkProps}>
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
      </TransitionLink>
    );
  }

  /* ── Cinematic ── */
  if (style === "cinematic") {
    return (
      <TransitionLink {...linkProps}>
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
      </TransitionLink>
    );
  }

  /* ── Magazine ── */
  return (
    <TransitionLink {...linkProps}>
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
    </TransitionLink>
  );
}
