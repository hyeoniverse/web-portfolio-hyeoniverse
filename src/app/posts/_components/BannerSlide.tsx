"use client";

import Link from "next/link";
import Image from "next/image";
import { formatPostTitle } from "@/utils/post";
import type { Post } from "@/types/post";
import CategoryLabel from "@/components/ui/CategoryLabel";
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
  const title = formatPostTitle(post);

  const image = post.cover_image && !imgError ? (
    <Image
      src={post.cover_image}
      alt={title}
      fill
      sizes="100vw"
      className={styles.slideImg}
      priority={index === 0}
      onError={() => onImgError(post.id)}
    />
  ) : (
    <div className={styles.slideFallback} />
  );

  /* ── Editorial ── */
  if (style === "editorial") {
    return (
      <Link href={`/posts/${post.slug}`} className={styles.slideLink}>
        {image}
        <div className={styles.overlayEditorial} />
        <div className={styles.contentEditorial}>
          <span className={styles.idx}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className={styles.meta}>
            {post.category && (
              <span className={styles.category}><CategoryLabel category={post.category} /></span>
            )}
            <h2 className={styles.title}>{title}</h2>
            {post.excerpt && (
              <p className={styles.excerpt}>{post.excerpt}</p>
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
          {post.category && (
            <span className={styles.categoryBadge}><CategoryLabel category={post.category} /></span>
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
          {post.category && (
            <span className={styles.categoryCinematic}><CategoryLabel category={post.category} /></span>
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
          {post.category && (
            <span className={styles.category}><CategoryLabel category={post.category} /></span>
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
